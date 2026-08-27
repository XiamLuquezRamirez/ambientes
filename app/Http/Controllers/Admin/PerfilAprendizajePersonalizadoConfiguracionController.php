<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajePersonalizado;
use App\Models\PerfilAprendizajePersonalizadoOrden;
use App\Models\Estudiante;
use App\Models\EstudiantePerfilAprendizajePersonalizado;
use App\Services\EstudiantePerfilAprendizajePersonalizadoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class PerfilAprendizajePersonalizadoConfiguracionController extends Controller
{
    public function index(Request $request)
    {
        $institucionId = $this->institucionId();
        $this->asegurarPersonalizacion($institucionId);

        $consulta = PerfilAprendizajePersonalizadoOrden::query()
            ->where('perfil_aprendizaje_personalizado_orden.institucion_id', $institucionId)
            ->with(['perfilAprendizajePersonalizado.perfilAprendizaje', 'perfilAprendizajePersonalizado.creador']);

        if ($request->filled('buscar')) {
            $buscar = trim($request->get('buscar'));
            $consulta->whereHas('perfilAprendizajePersonalizado', function ($q) use ($buscar) {
                $q->where('etiqueta', 'like', "%{$buscar}%")
                    ->orWhere('codigo', 'like', "%{$buscar}%");
            });
        }

        if ($request->filled('perfil_aprendizaje_id')) {
            $baseId = (int) $request->perfil_aprendizaje_id;
            $consulta->whereHas('perfilAprendizajePersonalizado', function ($q) use ($baseId) {
                $q->where('perfil_aprendizaje_id', $baseId);
            });
        }

        if ($request->filled('activa') && in_array($request->activa, ['1', '0'], true)) {
            $consulta->where('perfil_aprendizaje_personalizado_orden.activa', (int) $request->activa);
        }

        if ($request->filled('ordenar') && in_array($request->ordenar, ['nombre', 'codigo'], true)) {
            $columna = $request->ordenar === 'nombre' ? 'etiqueta' : 'codigo';
            $consulta->join(
                'perfil_aprendizaje_personalizado',
                'perfil_aprendizaje_personalizado.id',
                '=',
                'perfil_aprendizaje_personalizado_orden.perfil_aprendizaje_personalizado_id'
            )
                ->orderBy('perfil_aprendizaje_personalizado.'.$columna)
                ->select('perfil_aprendizaje_personalizado_orden.*');
        } else {
            $consulta->orderBy('perfil_aprendizaje_personalizado_orden.orden');
        }

        $consulta->whereHas('perfilAprendizajePersonalizado', function ($q) {
            $q->where('eliminado', 0);
        });

        $items = $consulta->get();
        $conteos = app(EstudiantePerfilAprendizajePersonalizadoService::class)
            ->conteoActivosPorPerfilAprendizajePersonalizado($institucionId);
        $perfilesAprendizajeBase = PerfilAprendizajeInclusion::query()->ordenadas()->get(['id', 'codigo', 'nombre', 'color_hex']);
        $esSuperAdmin = false;

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('admin.configuracion.perfil-aprendizaje-personalizado._lista', compact('items', 'conteos'))->render(),
            ]);
        }

        return view('admin.configuracion.perfil-aprendizaje-personalizado.index', compact(
            'items',
            'conteos',
            'perfilesAprendizajeBase',
            'esSuperAdmin'
        ));
    }

    public function mostrar(PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado)
    {
        $this->autorizarGestion($perfilAprendizajePersonalizado);
        $perfilAprendizajePersonalizado->load('perfilAprendizaje:id,codigo,nombre,color_hex');

        return response()->json([
            'success' => true,
            'perfil_aprendizaje_personalizado' => [
                'id' => $perfilAprendizajePersonalizado->id,
                'codigo' => $perfilAprendizajePersonalizado->codigo,
                'etiqueta' => $perfilAprendizajePersonalizado->etiqueta,
                'descripcion_interna' => $perfilAprendizajePersonalizado->descripcion_interna,
                'perfil_aprendizaje_id' => $perfilAprendizajePersonalizado->perfil_aprendizaje_id,
                'es_sistema' => (bool) $perfilAprendizajePersonalizado->es_sistema,
                'estado' => (int) $perfilAprendizajePersonalizado->estado,
                'perfil_aprendizaje' => $perfilAprendizajePersonalizado->perfilAprendizaje,
            ],
        ]);
    }

    public function guardar(Request $request)
    {
        $institucionId = $this->institucionId();
        $usuario = Auth::guard('docente')->user();
        $datos = $this->validar($request);

        $perfilAprendizajePersonalizado = DB::transaction(function () use ($datos, $institucionId, $usuario) {
            $perfilAprendizajePersonalizado = PerfilAprendizajePersonalizado::create([
                'codigo' => PerfilAprendizajePersonalizado::generarCodigo(),
                'etiqueta' => $datos['etiqueta'],
                'descripcion_interna' => $datos['descripcion_interna'] ?? null,
                'perfil_aprendizaje_id' => $datos['perfil_aprendizaje_id'] ?? null,
                'es_sistema' => false,
                'estado' => 1,
                'institucion_id' => $institucionId,
                'usuario_crea' => $usuario?->id,
            ]);

            $orden = (int) (PerfilAprendizajePersonalizadoOrden::query()
                ->where('institucion_id', $institucionId)
                ->max('orden') ?? -1) + 1;

            PerfilAprendizajePersonalizadoOrden::create([
                'institucion_id' => $institucionId,
                'perfil_aprendizaje_personalizado_id' => $perfilAprendizajePersonalizado->id,
                'orden' => $orden,
                'activa' => true,
            ]);

            return $perfilAprendizajePersonalizado;
        });

        return response()->json([
            'success' => true,
            'message' => 'perfil de aprendizaje personalizado creado correctamente.',
            'perfil_aprendizaje_personalizado' => $perfilAprendizajePersonalizado,
        ]);
    }

    public function actualizar(Request $request, PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado)
    {
        $this->autorizarGestion($perfilAprendizajePersonalizado);
        $datos = $this->validar($request, $perfilAprendizajePersonalizado->id);

        $perfilAprendizajePersonalizado->update([
            'etiqueta' => $datos['etiqueta'],
            'descripcion_interna' => $datos['descripcion_interna'] ?? null,
            'perfil_aprendizaje_id' => $datos['perfil_aprendizaje_id'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'perfil de aprendizaje personalizado actualizado correctamente.',
            'perfil_aprendizaje_personalizado' => $perfilAprendizajePersonalizado->fresh(),
        ]);
    }

    public function eliminar(PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado)
    {
        $this->autorizarGestion($perfilAprendizajePersonalizado);
        $institucionId = $this->institucionId();

        $estudiantesAsignados = app(EstudiantePerfilAprendizajePersonalizadoService::class)
            ->conteoActivosPerfilAprendizajePersonalizado($perfilAprendizajePersonalizado->id, $institucionId);

        if ($estudiantesAsignados > 0) {
            return response()->json([
                'success' => false,
                'estudiantes_asignados' => $estudiantesAsignados,
                'message' => "No se puede eliminar: tiene {$estudiantesAsignados} estudiante(s) asociados. Puede desactivarla en su lugar.",
            ], 422);
        }

        DB::transaction(function () use ($perfilAprendizajePersonalizado, $institucionId) {
            PerfilAprendizajePersonalizadoOrden::query()
                ->where('institucion_id', $institucionId)
                ->where('perfil_aprendizaje_personalizado_id', $perfilAprendizajePersonalizado->id)
                ->delete();

            $perfilAprendizajePersonalizado->update(['eliminado' => true]);
        });

        return response()->json([
            'success' => true,
            'message' => 'perfil de aprendizaje personalizado eliminado correctamente.',
        ]);
    }

    public function actualizarEstado(Request $request, PerfilAprendizajePersonalizadoOrden $personalizadoOrden)
    {
        $this->autorizarOrden($personalizadoOrden);
        $personalizadoOrden->load('perfilAprendizajePersonalizado.creador');

        if ($personalizadoOrden->perfilAprendizajePersonalizado?->creadaPorDocente()) {
            abort(403, 'No puedes activar ni desactivar perfiles de aprendizaje personalizados creados por docentes.');
        }

        $personalizadoOrden->update([
            'activa' => ! $personalizadoOrden->activa,
        ]);

        return response()->json([
            'success' => true,
            'message' => $personalizadoOrden->activa
                ? 'perfil de aprendizaje personalizado activado para la institución.'
                : 'perfil de aprendizaje personalizado desactivado para la institución.',
            'activa' => (bool) $personalizadoOrden->activa,
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

        $validos = PerfilAprendizajePersonalizadoOrden::query()
            ->where('institucion_id', $institucionId)
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
                PerfilAprendizajePersonalizadoOrden::query()
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

    public function estudiantesAsociados(PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado)
    {
        $institucionId = $this->institucionId();
        $servicio = app(EstudiantePerfilAprendizajePersonalizadoService::class);
        $servicio->autorizarPerfilAprendizajePersonalizadoInstitucion($perfilAprendizajePersonalizado, $institucionId);

        $asignaciones = $servicio->asignacionesActivas($perfilAprendizajePersonalizado, $institucionId);

        return response()->json([
            'success' => true,
            'perfil_aprendizaje_personalizado' => [
                'id' => $perfilAprendizajePersonalizado->id,
                'codigo' => $perfilAprendizajePersonalizado->codigo,
                'etiqueta' => $perfilAprendizajePersonalizado->etiqueta,
            ],
            'estudiantes' => $asignaciones->map(
                fn ($a) => $servicio->serializarAsignacion($a, true)
            )->values(),
        ]);
    }

    public function desasociarEstudiante(Request $request, EstudiantePerfilAprendizajePersonalizado $asignacion)
    {
        $institucionId = $this->institucionId();
        $servicio = app(EstudiantePerfilAprendizajePersonalizadoService::class);

        $asignacion->load('perfilAprendizajePersonalizado', 'estudiante');
        $servicio->autorizarPerfilAprendizajePersonalizadoInstitucion($asignacion->perfilAprendizajePersonalizado, $institucionId);

        if ((int) $asignacion->estudiante?->institucion_id !== $institucionId) {
            abort(403, 'No autorizado.');
        }

        $datos = $request->validate([
            'motivo_cierre' => 'required|in:diagnostico_formal,perfil_aprendizaje_no_confirmado,otro',
            'observacion_cierre' => 'required|string|min:20|max:2000',
        ]);

        $servicio->desasociar($asignacion, $datos['motivo_cierre'], $datos['observacion_cierre']);

        return response()->json([
            'success' => true,
            'message' => 'Estudiante desvinculado de perfil de aprendizaje personalizado correctamente.',
        ]);
    }

    private function validar(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'etiqueta' => 'required|string|max:150|min:10',
            'descripcion_interna' => 'nullable|string',
            'perfil_aprendizaje_id' => [
                'nullable',
                'integer',
                Rule::exists('perfil_aprendizaje', 'id'),
            ],
        ]);
    }

    private function asegurarPersonalizacion(int $institucionId): void
    {
        $catalogoIds = PerfilAprendizajePersonalizado::query()
            ->where(function ($q) use ($institucionId) {
                $q->whereNull('institucion_id')
                    ->orWhere('institucion_id', $institucionId);
            })
            ->pluck('id');

        $existentes = PerfilAprendizajePersonalizadoOrden::query()
            ->where('institucion_id', $institucionId)
            ->pluck('perfil_aprendizaje_personalizado_id');

        $faltantes = $catalogoIds->diff($existentes);
        if ($faltantes->isEmpty()) {
            return;
        }

        $orden = (int) (PerfilAprendizajePersonalizadoOrden::query()
            ->where('institucion_id', $institucionId)
            ->max('orden') ?? -1);
        $ahora = now();
        $filas = [];

        foreach ($faltantes as $transitoriaId) {
            $orden++;
            $filas[] = [
                'institucion_id' => $institucionId,
                'perfil_aprendizaje_personalizado_id' => (int) $transitoriaId,
                'orden' => $orden,
                'activa' => 1,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ];
        }

        PerfilAprendizajePersonalizadoOrden::query()->insert($filas);
    }

    /**
     * @return array<int, array{total:int,activos:int}>
     */
    private function conteoEstudiantesPorTransitoria(int $institucionId): array
    {
        return app(EstudiantePerfilAprendizajePersonalizadoService::class)
            ->conteoActivosPorPerfilAprendizajePersonalizado($institucionId);
    }

    private function institucionId(): int
    {
        $id = session('institucion_id');

        if (! $id) {
            abort(403, 'No se encontró la institución en sesión.');
        }

        return (int) $id;
    }

    private function autorizarOrden(PerfilAprendizajePersonalizadoOrden $orden): void
    {
        if ((int) $orden->institucion_id !== $this->institucionId()) {
            abort(403, 'No autorizado.');
        }
    }

    private function autorizarGestion(PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado): void
    {
        if (
            $perfilAprendizajePersonalizado->es_sistema
            || (int) $perfilAprendizajePersonalizado->institucion_id !== $this->institucionId()
        ) {
            abort(403, 'No autorizado para gestionar este perfil de aprendizaje personalizado.');
        }

        if ($perfilAprendizajePersonalizado->creadaPorDocente()) {
            abort(403, 'No puedes editar ni eliminar perfiles de aprendizaje personalizados creados por docentes.');
        }
    }
}
