<?php

namespace App\Http\Controllers\Panel;

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

class PerfilAprendizajePersonalizadoPanelController extends Controller
{
    public function index(Request $request)
    {
        $institucionId = $this->institucionId();
        $this->asegurarPersonalizacion($institucionId);

        $consulta = PerfilAprendizajePersonalizadoOrden::query()
            ->where('condiciones_transitorias_orden.institucion_id', $institucionId)
            ->with(['condicionTransitoria.condicionBase', 'condicionTransitoria.creador']);

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

        if ($request->filled('origen') && in_array($request->origen, ['propias', 'institucion'], true)) {
            $userId = Auth::guard('docente')->id();
            if ($request->origen === 'propias') {
                $consulta->whereHas('condicionTransitoria', fn ($q) => $q->where('usuario_crea', $userId));
            } else {
                $consulta->whereHas('condicionTransitoria', fn ($q) => $q->where(function ($sub) use ($userId) {
                    $sub->whereNull('usuario_crea')
                        ->orWhere('usuario_crea', '!=', $userId);
                }));
            }
        }

        $consulta->orderBy('condiciones_transitorias_orden.orden');

        $items = $consulta->get();
        $docenteId = Auth::guard('docente')->user()->docente?->id;
        $servicio = app(EstudiantePerfilAprendizajePersonalizadoService::class);
        $conteos = $docenteId
            ? $servicio->conteoActivosPorCondicionDocente($institucionId, $docenteId)
            : [];
        $condicionesBase = PerfilAprendizajeInclusion::query()->ordenadas()->get(['id', 'codigo', 'nombre', 'color_hex']);
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
            'condicionesBase',
            'usuarioId'
        ));
    }

    public function mostrar(PerfilAprendizajePersonalizado $condicionTransitoria)
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
            $condicion = PerfilAprendizajePersonalizado::create([
                'codigo' => PerfilAprendizajePersonalizado::generarCodigo(),
                'etiqueta' => $datos['etiqueta'],
                'descripcion_interna' => $datos['descripcion_interna'] ?? null,
                'condicion_base_id' => $datos['condicion_base_id'] ?? null,
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
                'condicion_transitoria_id' => $condicion->id,
                'orden' => $orden,
                'activa' => true,
            ]);

            return $condicion;
        });

        return response()->json([
            'success' => true,
            'message' => 'perfil de aprendizaje personalizado creado correctamente.',
            'condicion' => $condicion,
        ]);
    }

    public function actualizar(Request $request, PerfilAprendizajePersonalizado $condicionTransitoria)
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
            'message' => 'perfil de aprendizaje personalizado actualizado correctamente.',
            'condicion' => $condicionTransitoria->fresh(),
        ]);
    }

    public function eliminar(PerfilAprendizajePersonalizado $condicionTransitoria)
    {
        $this->autorizarGestion($condicionTransitoria);
        $institucionId = $this->institucionId();

        $estudiantesAsignados = app(EstudiantePerfilAprendizajePersonalizadoService::class)
            ->conteoActivosCondicion($condicionTransitoria->id, $institucionId, Auth::guard('docente')->user()->docente?->id);

        if ($estudiantesAsignados > 0) {
            return response()->json([
                'success' => false,
                'estudiantes_asignados' => $estudiantesAsignados,
                'puede_desactivar' => true,
                'message' => "No se puede eliminar: tiene {$estudiantesAsignados} estudiante(s) asociados. Puede desactivarla en su lugar.",
            ], 422);
        }

        DB::transaction(function () use ($condicionTransitoria, $institucionId) {
            PerfilAprendizajePersonalizadoOrden::query()
                ->where('institucion_id', $institucionId)
                ->where('condicion_transitoria_id', $condicionTransitoria->id)
                ->delete();

            $condicionTransitoria->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'perfil de aprendizaje personalizado eliminado correctamente.',
        ]);
    }

    public function actualizarEstado(Request $request, PerfilAprendizajePersonalizadoOrden $condicionTransitoriaOrden)
    {
        $this->autorizarOrdenPropia($condicionTransitoriaOrden);

        $nuevoEstado = $request->has('activa')
            ? (bool) $request->boolean('activa')
            : ! $condicionTransitoriaOrden->activa;

        $condicionTransitoriaOrden->update([
            'activa' => $nuevoEstado,
        ]);

        return response()->json([
            'success' => true,
            'message' => $condicionTransitoriaOrden->activa
                ? 'perfil de aprendizaje personalizado activado correctamente.'
                : 'perfil de aprendizaje personalizado desactivado correctamente.',
            'activa' => (bool) $condicionTransitoriaOrden->activa,
        ]);
    }

    public function estudiantesAsociados(PerfilAprendizajePersonalizado $condicionTransitoria)
    {
        $institucionId = $this->institucionId();
        $docente = Auth::guard('docente')->user()->docente;
        if (! $docente) {
            abort(403);
        }

        $servicio = app(EstudiantePerfilAprendizajePersonalizadoService::class);
        $servicio->autorizarCondicionInstitucion($condicionTransitoria, $institucionId);

        $asignaciones = $servicio->asignacionesActivas($condicionTransitoria, $institucionId, $docente->id);

        return response()->json([
            'success' => true,
            'condicion' => [
                'id' => $condicionTransitoria->id,
                'codigo' => $condicionTransitoria->codigo,
                'etiqueta' => $condicionTransitoria->etiqueta,
            ],
            'estudiantes' => $asignaciones->map(
                fn ($a) => $servicio->serializarAsignacion($a, true)
            )->values(),
        ]);
    }

    public function desasociarEstudiante(Request $request, EstudiantePerfilAprendizajePersonalizado $asignacion)
    {
        $docente = Auth::guard('docente')->user()->docente;
        if (! $docente) {
            abort(403);
        }

        $institucionId = $this->institucionId();
        $servicio = app(EstudiantePerfilAprendizajePersonalizadoService::class);

        $asignacion->load('condicionTransitoria', 'estudiante');
        $servicio->autorizarCondicionInstitucion($asignacion->condicionTransitoria, $institucionId);

        if ((int) $asignacion->docente_id !== (int) $docente->id) {
            abort(403, 'Solo puedes Desactivar estudiantes que tú asociaste.');
        }

        if ((int) $asignacion->estudiante?->institucion_id !== $institucionId) {
            abort(403, 'No autorizado.');
        }

        $datos = $request->validate([
            'motivo_cierre' => 'required|in:diagnostico_formal,condicion_no_confirmada,otro',
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
            'condicion_base_id' => [
                'nullable',
                'integer',
                Rule::exists('condiciones', 'id'),
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
            ->pluck('condicion_transitoria_id');

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
                'condicion_transitoria_id' => (int) $transitoriaId,
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
            ->conteoActivosPorCondicionDocente($institucionId, $docenteId);
    }

    private function institucionId(): int
    {
        $id = Auth::guard('docente')->user()?->institucion_id;

        if (! $id) {
            abort(403, 'No se encontró la institución del docente.');
        }

        return (int) $id;
    }

    private function autorizarGestion(PerfilAprendizajePersonalizado $condicion): void
    {
        $usuarioId = Auth::guard('docente')->id();

        if (
            $condicion->es_sistema
            || (int) $condicion->institucion_id !== $this->institucionId()
            || ! $condicion->esDelUsuario($usuarioId)
        ) {
            abort(403, 'Solo puedes editar o eliminar las condiciones que tú creaste.');
        }
    }

    private function autorizarOrdenPropia(PerfilAprendizajePersonalizadoOrden $orden): void
    {
        if ((int) $orden->institucion_id !== $this->institucionId()) {
            abort(403, 'No autorizado.');
        }

        $orden->load('condicionTransitoria');
        $this->autorizarGestion($orden->condicionTransitoria);
    }
}
