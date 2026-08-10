<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajePersonalizado;
use App\Models\PerfilAprendizajePersonalizadoOrden;
use App\Models\Estudiante;
use App\Models\EstudiantePerfilAprendizajePersonalizado;
use App\Services\EstudiantePerfilAprendizajePersonalizadoService;
use App\Services\EstudiantePerfilAprendizajeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class PerfilAprendizajePersonalizadoPanelController extends Controller
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

        if ($request->filled('origen') && in_array($request->origen, ['propias', 'institucion'], true)) {
            $userId = Auth::guard('docente')->id();
            if ($request->origen === 'propias') {
                $consulta->whereHas('perfilAprendizajePersonalizado', fn ($q) => $q->where('usuario_crea', $userId));
            } else {
                $consulta->whereHas('perfilAprendizajePersonalizado', fn ($q) => $q->where(function ($sub) use ($userId) {
                    $sub->whereNull('usuario_crea')
                        ->orWhere('usuario_crea', '!=', $userId);
                }));
            }
        }

        $consulta->orderBy('perfil_aprendizaje_personalizado_orden.orden');

        $items = $consulta->get();
        $docenteId = Auth::guard('docente')->user()->docente?->id;
        $servicio = app(EstudiantePerfilAprendizajePersonalizadoService::class);
        $conteos = $docenteId
            ? $servicio->conteoActivosPorPerfilAprendizajePersonalizadoDocente($institucionId, $docenteId)
            : [];
        $perfilesAprendizajeBase = PerfilAprendizajeInclusion::query()->ordenadas()->get(['id', 'codigo', 'nombre', 'color_hex']);
        $usuarioId = Auth::guard('docente')->id();

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('panel.inclusion.perfil-aprendizaje-personalizado._lista', compact(
                    'items',
                    'conteos',
                    'usuarioId'
                ))->render(),
            ]);
        }

        return view('panel.inclusion.perfil-aprendizaje-personalizado.index', compact(
            'items',
            'conteos',
            'perfilesAprendizajeBase',
            'usuarioId'
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
            ->conteoActivosPerfilAprendizajePersonalizado($perfilAprendizajePersonalizado->id, $institucionId, Auth::guard('docente')->user()->docente?->id);

        if ($estudiantesAsignados > 0) {
            return response()->json([
                'success' => false,
                'estudiantes_asignados' => $estudiantesAsignados,
                'puede_desactivar' => true,
                'message' => "No se puede eliminar: tiene {$estudiantesAsignados} estudiante(s) asociados. Puede desactivarla en su lugar.",
            ], 422);
        }

        DB::transaction(function () use ($perfilAprendizajePersonalizado, $institucionId) {
            PerfilAprendizajePersonalizadoOrden::query()
                ->where('institucion_id', $institucionId)
                ->where('perfil_aprendizaje_personalizado_id', $perfilAprendizajePersonalizado->id)
                ->delete();

            $perfilAprendizajePersonalizado->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'perfil de aprendizaje personalizado eliminado correctamente.',
        ]);
    }

    public function actualizarEstado(Request $request, PerfilAprendizajePersonalizadoOrden $personalizadoOrden)
    {
        $this->autorizarOrdenPropia($personalizadoOrden);

        $nuevoEstado = $request->has('activa')
            ? (bool) $request->boolean('activa')
            : ! $personalizadoOrden->activa;

        $personalizadoOrden->update([
            'activa' => $nuevoEstado,
        ]);

        return response()->json([
            'success' => true,
            'message' => $personalizadoOrden->activa
                ? 'perfil de aprendizaje personalizado activado correctamente.'
                : 'perfil de aprendizaje personalizado desactivado correctamente.',
            'activa' => (bool) $personalizadoOrden->activa,
        ]);
    }

    public function estudiantesAsociados(PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado)
    {
        $institucionId = $this->institucionId();
        $docente = Auth::guard('docente')->user()->docente;
        if (! $docente) {
            abort(403);
        }

        $servicio = app(EstudiantePerfilAprendizajePersonalizadoService::class);
        $servicio->autorizarPerfilAprendizajePersonalizadoInstitucion($perfilAprendizajePersonalizado, $institucionId);

        $asignaciones = $servicio->asignacionesActivas($perfilAprendizajePersonalizado, $institucionId, $docente->id);

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

    public function asignarEstudiante(Request $request, Estudiante $estudiante)
    {
        $docente = Auth::guard('docente')->user()->docente;
        if (! $docente) {
            abort(403);
        }

        if (! $this->docenteTieneAccesoAlEstudiante($docente->id, $estudiante->id)) {
            abort(403, 'No tienes acceso a este estudiante.');
        }

        $tienePerfilNormal = ($estudiante->perfil_aprendizaje_id ?? null)
            && (int) $estudiante->perfil_aprendizaje_id !== 1;

        if ($tienePerfilNormal) {
            $mensaje = 'El estudiante ya tiene un perfil de aprendizaje asignado.';

            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => $mensaje], 422);
            }

            return back()->withErrors(['perfil_aprendizaje_personalizado_id' => $mensaje]);
        }

        $institucionId = $this->institucionId();

        $datos = $request->validate([
            'perfil_aprendizaje_personalizado_id' => [
                'required',
                'integer',
                Rule::exists('perfil_aprendizaje_personalizado', 'id')->where(fn ($q) => $q->where('estado', 1)),
            ],
            'observacion' => 'required|string|min:20|max:2000',
        ]);

        $permitida = PerfilAprendizajePersonalizadoOrden::query()
            ->where('institucion_id', $institucionId)
            ->where('perfil_aprendizaje_personalizado_id', $datos['perfil_aprendizaje_personalizado_id'])
            ->where('activa', true)
            ->exists();

        if (! $permitida) {
            $mensaje = 'El perfil de aprendizaje personalizado no está habilitado para esta institución.';

            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => $mensaje], 422);
            }

            return back()->withErrors(['perfil_aprendizaje_personalizado_id' => $mensaje]);
        }

        if ($estudiante->perfilAprendizajePersonalizadoActiva()->exists()) {
            $mensaje = 'El estudiante ya tiene un perfil de aprendizaje personalizado activo.';

            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => $mensaje], 422);
            }

            return back()->withErrors(['perfil_aprendizaje_personalizado_id' => $mensaje]);
        }

        DB::transaction(function () use ($estudiante, $docente, $datos) {
            EstudiantePerfilAprendizajePersonalizado::create([
                'estudiante_id' => $estudiante->id,
                'perfil_aprendizaje_personalizado_id' => $datos['perfil_aprendizaje_personalizado_id'],
                'docente_id' => $docente->id,
                'observacion' => trim($datos['observacion']),
                'fecha_activacion' => now(),
                'activa' => true,
            ]);

            $estudiante->update([
                'perfil_aprendizaje_personalizado_id' => $datos['perfil_aprendizaje_personalizado_id'],
            ]);
        });

        $etiqueta = PerfilAprendizajePersonalizado::query()
            ->where('id', $datos['perfil_aprendizaje_personalizado_id'])
            ->value('etiqueta');

        $mensaje = 'Perfil de aprendizaje personalizado'.($etiqueta ? " «{$etiqueta}»" : '').' asignado correctamente.';

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => $mensaje,
            ]);
        }

        return redirect()
            ->route('panel.estudiantes.show', $estudiante)
            ->with('success', $mensaje);
    }

    public function desactivarEstudiante(Request $request, EstudiantePerfilAprendizajePersonalizado $asignacion)
    {
        $docente = Auth::guard('docente')->user()->docente;
        if (! $docente) {
            abort(403);
        }

        $institucionId = $this->institucionId();
        $servicio = app(EstudiantePerfilAprendizajePersonalizadoService::class);

        $asignacion->load('perfilAprendizajePersonalizado', 'estudiante');
        $servicio->autorizarPerfilAprendizajePersonalizadoInstitucion($asignacion->perfilAprendizajePersonalizado, $institucionId);

        if ((int) $asignacion->docente_id !== (int) $docente->id) {
            abort(403, 'Solo puedes desactivar perfiles de aprendizaje personalizado que tú asignaste.');
        }

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
            'message' => 'Perfil de aprendizaje personalizado desactivado correctamente.',
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
        $docenteId = Auth::guard('docente')->user()->docente?->id;

        if (! $docenteId) {
            return [];
        }

        return app(EstudiantePerfilAprendizajePersonalizadoService::class)
            ->conteoActivosPorPerfilAprendizajePersonalizadoDocente($institucionId, $docenteId);
    }

    private function docenteTieneAccesoAlEstudiante(int $docenteId, int $estudianteId): bool
    {
        return app(EstudiantePerfilAprendizajeService::class)
            ->estudiantesIdsAccesiblesDocente($docenteId)
            ->contains($estudianteId);
    }

    private function institucionId(): int
    {
        $id = Auth::guard('docente')->user()?->institucion_id;

        if (! $id) {
            abort(403, 'No se encontró la institución del docente.');
        }

        return (int) $id;
    }

    private function autorizarGestion(PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado): void
    {
        $usuarioId = Auth::guard('docente')->id();

        if (
            $perfilAprendizajePersonalizado->es_sistema
            || (int) $perfilAprendizajePersonalizado->institucion_id !== $this->institucionId()
            || ! $perfilAprendizajePersonalizado->esDelUsuario($usuarioId)
        ) {
            abort(403, 'Solo puedes editar o eliminar los perfiles de aprendizaje personalizados que tú creaste.');
        }
    }

    private function autorizarOrdenPropia(PerfilAprendizajePersonalizadoOrden $orden): void
    {
        if ((int) $orden->institucion_id !== $this->institucionId()) {
            abort(403, 'No autorizado.');
        }

        $orden->load('perfilAprendizajePersonalizado');
        $this->autorizarGestion($orden->perfilAprendizajePersonalizado);
    }
}
