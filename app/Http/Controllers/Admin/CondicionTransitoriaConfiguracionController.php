<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CondicionInclusion;
use App\Models\CondicionTransitoria;
use App\Models\CondicionTransitoriaOrden;
use App\Models\Estudiante;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class CondicionTransitoriaConfiguracionController extends Controller
{
    public function index(Request $request)
    {
        $institucionId = $this->institucionId();
        $this->asegurarPersonalizacion($institucionId);

        $consulta = CondicionTransitoriaOrden::query()
            ->where('condiciones_transitorias_orden.id_institucion', $institucionId)
            ->with(['condicionTransitoria.condicionBase']);

        if ($request->filled('buscar')) {
            $buscar = trim($request->get('buscar'));
            $consulta->whereHas('condicionTransitoria', function ($q) use ($buscar) {
                $q->where('etiqueta', 'like', "%{$buscar}%")
                    ->orWhere('codigo', 'like', "%{$buscar}%");
            });
        }

        if ($request->filled('condicion_base_id')) {
            $baseId = (int) $request->condicion_base_id;
            $consulta->whereHas('condicionTransitoria', function ($q) use ($baseId) {
                $q->where('condicion_base_id', $baseId);
            });
        }

        if ($request->filled('activa') && in_array($request->activa, ['1', '0'], true)) {
            $consulta->where('condiciones_transitorias_orden.activa', (int) $request->activa);
        }

        if ($request->filled('ordenar') && in_array($request->ordenar, ['nombre', 'codigo'], true)) {
            $columna = $request->ordenar === 'nombre' ? 'etiqueta' : 'codigo';
            $consulta->join(
                'condiciones_transitorias',
                'condiciones_transitorias.id',
                '=',
                'condiciones_transitorias_orden.id_condicion_transitoria'
            )
                ->orderBy('condiciones_transitorias.'.$columna)
                ->select('condiciones_transitorias_orden.*');
        } else {
            $consulta->orderBy('condiciones_transitorias_orden.orden');
        }

        $items = $consulta->get();
        $conteos = $this->conteoEstudiantesPorTransitoria($institucionId);
        $condicionesBase = CondicionInclusion::query()->ordenadas()->get(['id', 'codigo', 'nombre', 'color_hex']);
        $esSuperAdmin = false;

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('admin.configuracion.condiciones-transitorias._lista', compact('items', 'conteos'))->render(),
            ]);
        }

        return view('admin.configuracion.condiciones-transitorias.index', compact(
            'items',
            'conteos',
            'condicionesBase',
            'esSuperAdmin'
        ));
    }

    public function mostrar(CondicionTransitoria $condicionTransitoria)
    {
        $this->autorizarGestion($condicionTransitoria);
        $condicionTransitoria->load('condicionBase:id,codigo,nombre,color_hex');

        return response()->json([
            'success' => true,
            'condicion' => [
                'id' => $condicionTransitoria->id,
                'codigo' => $condicionTransitoria->codigo,
                'etiqueta' => $condicionTransitoria->etiqueta,
                'descripcion_interna' => $condicionTransitoria->descripcion_interna,
                'condicion_base_id' => $condicionTransitoria->condicion_base_id,
                'es_sistema' => (bool) $condicionTransitoria->es_sistema,
                'estado' => (int) $condicionTransitoria->estado,
                'condicion_base' => $condicionTransitoria->condicionBase,
            ],
        ]);
    }

    public function guardar(Request $request)
    {
        $institucionId = $this->institucionId();
        $usuario = Auth::guard('docente')->user();
        $datos = $this->validar($request);

        $condicion = DB::transaction(function () use ($datos, $institucionId, $usuario) {
            $condicion = CondicionTransitoria::create([
                'codigo' => CondicionTransitoria::generarCodigo(),
                'etiqueta' => $datos['etiqueta'],
                'descripcion_interna' => $datos['descripcion_interna'] ?? null,
                'condicion_base_id' => $datos['condicion_base_id'] ?? null,
                'es_sistema' => false,
                'estado' => 1,
                'id_institucion' => $institucionId,
                'usuario_crea' => $usuario?->id,
            ]);

            $orden = (int) (CondicionTransitoriaOrden::query()
                ->where('id_institucion', $institucionId)
                ->max('orden') ?? -1) + 1;

            CondicionTransitoriaOrden::create([
                'id_institucion' => $institucionId,
                'id_condicion_transitoria' => $condicion->id,
                'orden' => $orden,
                'activa' => true,
            ]);

            return $condicion;
        });

        return response()->json([
            'success' => true,
            'message' => 'Condición transitoria creada correctamente.',
            'condicion' => $condicion,
        ]);
    }

    public function actualizar(Request $request, CondicionTransitoria $condicionTransitoria)
    {
        $this->autorizarGestion($condicionTransitoria);
        $datos = $this->validar($request, $condicionTransitoria->id);

        $condicionTransitoria->update([
            'etiqueta' => $datos['etiqueta'],
            'descripcion_interna' => $datos['descripcion_interna'] ?? null,
            'condicion_base_id' => $datos['condicion_base_id'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Condición transitoria actualizada correctamente.',
            'condicion' => $condicionTransitoria->fresh(),
        ]);
    }

    public function eliminar(CondicionTransitoria $condicionTransitoria)
    {
        $this->autorizarGestion($condicionTransitoria);
        $institucionId = $this->institucionId();

        $estudiantesAsignados = Schema::hasColumn('estudiantes', 'condicion_transitoria_id')
            ? $condicionTransitoria->estudiantes()->where('institucion_id', $institucionId)->count()
            : 0;

        if ($estudiantesAsignados > 0) {
            return response()->json([
                'success' => false,
                'estudiantes_asignados' => $estudiantesAsignados,
                'message' => "No se puede eliminar: tiene {$estudiantesAsignados} estudiante(s) asociados. Puede desactivarla en su lugar.",
            ], 422);
        }

        DB::transaction(function () use ($condicionTransitoria, $institucionId) {
            CondicionTransitoriaOrden::query()
                ->where('id_institucion', $institucionId)
                ->where('id_condicion_transitoria', $condicionTransitoria->id)
                ->delete();

            $condicionTransitoria->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Condición transitoria eliminada correctamente.',
        ]);
    }

    public function actualizarEstado(Request $request, CondicionTransitoriaOrden $condicionTransitoriaOrden)
    {
        $this->autorizarOrden($condicionTransitoriaOrden);

        $condicionTransitoriaOrden->update([
            'activa' => ! $condicionTransitoriaOrden->activa,
        ]);

        return response()->json([
            'success' => true,
            'message' => $condicionTransitoriaOrden->activa
                ? 'Opción activada para la institución.'
                : 'Opción desactivada para la institución.',
            'activa' => (bool) $condicionTransitoriaOrden->activa,
        ]);
    }

    public function actualizarOrden(Request $request)
    {
        $institucionId = $this->institucionId();

        $datos = $request->validate([
            'orden' => 'required|array|min:1',
            'orden.*' => 'integer|distinct',
        ]);

        $ids = array_map('intval', $datos['orden']);

        $validos = CondicionTransitoriaOrden::query()
            ->where('id_institucion', $institucionId)
            ->whereIn('id', $ids)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (count($validos) !== count($ids)) {
            return response()->json([
                'success' => false,
                'message' => 'Hay opciones inválidas en el orden enviado.',
            ], 422);
        }

        DB::transaction(function () use ($ids, $institucionId) {
            foreach ($ids as $posicion => $id) {
                CondicionTransitoriaOrden::query()
                    ->where('id_institucion', $institucionId)
                    ->where('id', $id)
                    ->update(['orden' => $posicion]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Orden actualizado correctamente.',
        ]);
    }

    private function validar(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'etiqueta' => 'required|string|max:150|min:10',
            'descripcion_interna' => 'nullable|string',
            'condicion_base_id' => [
                'nullable',
                'integer',
                Rule::exists('condiciones', 'id'),
            ],
        ]);
    }

    private function asegurarPersonalizacion(int $institucionId): void
    {
        $catalogoIds = CondicionTransitoria::query()
            ->where(function ($q) use ($institucionId) {
                $q->whereNull('id_institucion')
                    ->orWhere('id_institucion', $institucionId);
            })
            ->pluck('id');

        $existentes = CondicionTransitoriaOrden::query()
            ->where('id_institucion', $institucionId)
            ->pluck('id_condicion_transitoria');

        $faltantes = $catalogoIds->diff($existentes);
        if ($faltantes->isEmpty()) {
            return;
        }

        $orden = (int) (CondicionTransitoriaOrden::query()
            ->where('id_institucion', $institucionId)
            ->max('orden') ?? -1);
        $ahora = now();
        $filas = [];

        foreach ($faltantes as $transitoriaId) {
            $orden++;
            $filas[] = [
                'id_institucion' => $institucionId,
                'id_condicion_transitoria' => (int) $transitoriaId,
                'orden' => $orden,
                'activa' => 1,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ];
        }

        CondicionTransitoriaOrden::query()->insert($filas);
    }

    /**
     * @return array<int, array{total:int,activos:int}>
     */
    private function conteoEstudiantesPorTransitoria(int $institucionId): array
    {
        if (! Schema::hasColumn('estudiantes', 'condicion_transitoria_id')) {
            return [];
        }

        $filas = Estudiante::query()
            ->selectRaw('condicion_transitoria_id, COUNT(*) as total, SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos')
            ->where('institucion_id', $institucionId)
            ->whereNotNull('condicion_transitoria_id')
            ->groupBy('condicion_transitoria_id')
            ->get();

        $mapa = [];
        foreach ($filas as $fila) {
            $mapa[(int) $fila->condicion_transitoria_id] = [
                'total' => (int) $fila->total,
                'activos' => (int) $fila->activos,
            ];
        }

        return $mapa;
    }

    private function institucionId(): int
    {
        $id = session('institucion_id');

        if (! $id) {
            abort(403, 'No se encontró la institución en sesión.');
        }

        return (int) $id;
    }

    private function autorizarOrden(CondicionTransitoriaOrden $orden): void
    {
        if ((int) $orden->id_institucion !== $this->institucionId()) {
            abort(403, 'No autorizado.');
        }
    }

    private function autorizarGestion(CondicionTransitoria $condicion): void
    {
        if (
            $condicion->es_sistema
            || (int) $condicion->id_institucion !== $this->institucionId()
        ) {
            abort(403, 'No autorizado para gestionar esta condición.');
        }
    }
}
