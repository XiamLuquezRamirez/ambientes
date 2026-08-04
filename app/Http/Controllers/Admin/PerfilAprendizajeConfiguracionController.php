<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajeOrden;
use App\Models\Estudiante;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PerfilAprendizajeConfiguracionController extends Controller
{
    public function index(Request $request)
    {
        $institucionId = $this->institucionId();
        $this->asegurarPersonalizacion($institucionId);

        $consulta = PerfilAprendizajeOrden::query()
            ->where('condiciones_orden.institucion_id', $institucionId)
            ->with('condicion');

        if ($request->filled('buscar')) {
            $buscar = trim($request->get('buscar'));
            $consulta->whereHas('condicion', function ($q) use ($buscar) {
                $q->where('nombre', 'like', "%{$buscar}%")
                    ->orWhere('codigo', 'like', "%{$buscar}%");
            });
        }

        if ($request->filled('activa') && in_array($request->activa, ['1', '0'], true)) {
            $consulta->where('condiciones_orden.activa', (int) $request->activa);
        }

        if ($request->filled('ordenar') && in_array($request->ordenar, ['nombre', 'codigo'], true)) {
            $consulta->join('condiciones', 'condiciones.id', '=', 'condiciones_orden.condicion_id')
                ->orderBy('condiciones.'.$request->ordenar)
                ->select('condiciones_orden.*');
        } else {
            $consulta->orderBy('condiciones_orden.orden');
        }

        $consulta->whereHas('condicion', function ($q) {
            $q->where('eliminado', 0);
        });

        $items = $consulta->get();
        $conteos = $this->conteoEstudiantesPorCondicion($institucionId);

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('admin.configuracion.perfil-aprendizaje._lista', compact('items', 'conteos'))->render(),
            ]);
        }

        return view('admin.configuracion.perfil-aprendizaje.index', compact('items', 'conteos'));
    }

    public function actualizarEstado(Request $request, PerfilAprendizajeOrden $condicionOrden)
    {
        $this->autorizarOrden($condicionOrden);

        $condicionOrden->update([
            'activa' => ! $condicionOrden->activa,
        ]);

        return response()->json([
            'success' => true,
            'message' => $condicionOrden->activa
                ? 'perfil de aprendizaje activado para la institución.'
                : 'perfil de aprendizaje desactivado para la institución.',
            'activa' => (bool) $condicionOrden->activa,
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

        $validos = PerfilAprendizajeOrden::query()
            ->where('institucion_id', $institucionId)
            ->whereIn('id', $ids)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (count($validos) !== count($ids)) {
            return response()->json([
                'success' => false,
                'message' => 'Hay condiciones inválidas en el orden enviado.',
            ], 422);
        }

        DB::transaction(function () use ($ids, $institucionId) {
            foreach ($ids as $posicion => $id) {
                PerfilAprendizajeOrden::query()
                    ->where('institucion_id', $institucionId)
                    ->where('id', $id)
                    ->update(['orden' => $posicion]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Orden actualizado correctamente.',
        ]);
    }

    public function estudiantesAsociados(PerfilAprendizajeInclusion $condicionInclusion)
    {
        $institucionId = $this->institucionId();

        $estudiantes = Estudiante::query()
            ->where('institucion_id', $institucionId)
            ->where('condicion_id', $condicionInclusion->id)
            ->where('activo', true)
            ->with(['matriculaActiva.grado', 'matriculaActiva.grupo'])
            ->orderBy('nombre')
            ->orderBy('apellido')
            ->get()
            ->map(fn (Estudiante $e) => [
                'estudiante_id' => $e->id,
                'nombre' => $e->nombre_completo,
                'grado' => $e->matriculaActiva?->grado?->nombre,
                'grupo' => $e->matriculaActiva?->grupo?->nombre,
                'ficha_url' => route('admin.estudiantes.show', $e),
            ])
            ->values();

        return response()->json([
            'success' => true,
            'condicion' => [
                'id' => $condicionInclusion->id,
                'codigo' => $condicionInclusion->codigo,
                'nombre' => $condicionInclusion->nombre,
            ],
            'estudiantes' => $estudiantes,
        ]);
    }

    private function asegurarPersonalizacion(int $institucionId): void
    {
        $catalogoIds = PerfilAprendizajeInclusion::query()->pluck('id');
        $existentes = PerfilAprendizajeOrden::query()
            ->where('institucion_id', $institucionId)
            ->pluck('condicion_id');

        $faltantes = $catalogoIds->diff($existentes);
        if ($faltantes->isEmpty()) {
            return;
        }

        $orden = (int) (PerfilAprendizajeOrden::query()
            ->where('institucion_id', $institucionId)
            ->max('orden') ?? -1);
        $ahora = now();
        $filas = [];

        foreach ($faltantes as $condicionId) {
            $orden++;
            $filas[] = [
                'institucion_id' => $institucionId,
                'condicion_id' => (int) $condicionId,
                'orden' => $orden,
                'activa' => 1,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ];
        }

        PerfilAprendizajeOrden::query()->insert($filas);
    }

    /**
     * @return array<int, array{total:int,activos:int}>
     */
    private function conteoEstudiantesPorCondicion(int $institucionId): array
    {
        $filas = Estudiante::query()
            ->selectRaw('condicion_id, COUNT(*) as total, SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos')
            ->where('institucion_id', $institucionId)
            ->whereNotNull('condicion_id')
            ->groupBy('condicion_id')
            ->get();

        $mapa = [];
        foreach ($filas as $fila) {
            $mapa[(int) $fila->condicion_id] = [
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

    private function autorizarOrden(PerfilAprendizajeOrden $orden): void
    {
        if ((int) $orden->institucion_id !== $this->institucionId()) {
            abort(403, 'No autorizado.');
        }
    }
}
