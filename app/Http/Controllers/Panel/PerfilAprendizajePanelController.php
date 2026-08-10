<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajeOrden;
use App\Services\EstudiantePerfilAprendizajePersonalizadoService;
use App\Services\EstudiantePerfilAprendizajeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PerfilAprendizajePanelController extends Controller
{
    public function index(Request $request)
    {
        $institucionId = $this->institucionId();
        $this->asegurarPersonalizacion($institucionId);

        $consulta = PerfilAprendizajeOrden::query()
            ->where('perfil_aprendizaje_orden.institucion_id', $institucionId)
            ->with('perfilAprendizaje');

        if ($request->filled('buscar')) {
            $buscar = trim($request->get('buscar'));
            $consulta->whereHas('perfilAprendizaje', function ($q) use ($buscar) {
                $q->where('nombre', 'like', "%{$buscar}%")
                    ->orWhere('codigo', 'like', "%{$buscar}%");
            });
        }

        if ($request->filled('activa') && in_array($request->activa, ['1', '0'], true)) {
            $consulta->where('perfil_aprendizaje_orden.activa', (int) $request->activa);
        }

        $consulta->whereHas('perfilAprendizaje', fn ($q) => $q->where('eliminado', 0));
        $consulta->orderBy('perfil_aprendizaje_orden.orden');

        $items = $consulta->get();
        $docenteId = Auth::guard('docente')->user()->docente?->id;
        $servicio = app(EstudiantePerfilAprendizajeService::class);
        $conteos = $docenteId
            ? $servicio->conteoActivosPorPerfilAprendizajeDocente($institucionId, $docenteId)
            : [];

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('panel.inclusion.perfil-aprendizaje._lista', compact('items', 'conteos'))->render(),
            ]);
        }

        return view('panel.inclusion.perfil-aprendizaje.index', compact('items', 'conteos'));
    }

    public function estudiantesAsociados(PerfilAprendizajeInclusion $perfilAprendizajeInclusion)
    {
        $docente = Auth::guard('docente')->user()->docente;
        if (! $docente) {
            abort(403);
        }

        $institucionId = $this->institucionId();
        $servicio = app(EstudiantePerfilAprendizajeService::class);

        return response()->json([
            'success' => true,
            'perfil_aprendizaje' => [
                'id' => $perfilAprendizajeInclusion->id,
                'codigo' => $perfilAprendizajeInclusion->codigo,
                'nombre' => $perfilAprendizajeInclusion->nombre,
            ],
            'estudiantes' => $servicio->estudiantesAsociados(
                $perfilAprendizajeInclusion->id,
                $institucionId,
                $docente->id
            ),
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

        if ($estudiante->requiere_apoyo !== 'si') {
            $mensaje = 'Solo los estudiantes que requieren apoyo pedagógico pueden recibir un perfil de aprendizaje.';

            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => $mensaje], 422);
            }

            return back()->withErrors(['perfil_aprendizaje_id' => $mensaje]);
        }

        $institucionId = $this->institucionId();

        $datos = $request->validate([
            'perfil_aprendizaje_id' => [
                'required',
                'integer',
                Rule::exists('perfil_aprendizaje', 'id')->where(fn ($q) => $q->where('eliminado', 0)),
            ],
        ]);

        if ((int) $datos['perfil_aprendizaje_id'] === 1) {
            $mensaje = 'No puedes asignar el perfil estándar desde esta acción.';

            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => $mensaje], 422);
            }

            return back()->withErrors(['perfil_aprendizaje_id' => $mensaje]);
        }

        $permitido = PerfilAprendizajeOrden::query()
            ->where('institucion_id', $institucionId)
            ->where('perfil_aprendizaje_id', $datos['perfil_aprendizaje_id'])
            ->where('activa', true)
            ->exists();

        if (! $permitido) {
            $mensaje = 'El perfil de aprendizaje no está habilitado para esta institución.';

            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => $mensaje], 422);
            }

            return back()->withErrors(['perfil_aprendizaje_id' => $mensaje]);
        }

        $estudiante->load('perfilAprendizajePersonalizadoActiva');

        $servicioPersonalizado = app(EstudiantePerfilAprendizajePersonalizadoService::class);
        $cerroPersonalizado = false;

        DB::transaction(function () use ($estudiante, $datos, $servicioPersonalizado, &$cerroPersonalizado) {
            $cerroPersonalizado = $servicioPersonalizado->cerrarAsignacionActivaAlAsignarPerfilAprendizaje($estudiante);

            $estudiante->update([
                'perfil_aprendizaje_id' => $datos['perfil_aprendizaje_id'],
            ]);
        });

        $nombre = PerfilAprendizajeInclusion::query()
            ->where('id', $datos['perfil_aprendizaje_id'])
            ->value('nombre');

        $mensaje = 'Perfil de aprendizaje'.($nombre ? " «{$nombre}»" : '').' asignado correctamente.';
        if ($cerroPersonalizado) {
            $mensaje .= ' El perfil de aprendizaje personalizado activo fue desactivado automáticamente.';
        }

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

    public function desactivarEstudiante(Request $request, Estudiante $estudiante)
    {
        $docente = Auth::guard('docente')->user()->docente;
        if (! $docente) {
            abort(403);
        }

        if (! $this->docenteTieneAccesoAlEstudiante($docente->id, $estudiante->id)) {
            abort(403, 'No tienes acceso a este estudiante.');
        }

        if ($estudiante->requiere_apoyo !== 'si') {
            $mensaje = 'Solo los estudiantes que requieren apoyo pedagógico pueden modificar el perfil de aprendizaje.';

            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => $mensaje], 422);
            }

            return back()->withErrors(['perfil_aprendizaje_id' => $mensaje]);
        }

        $tienePerfilNormal = ($estudiante->perfil_aprendizaje_id ?? null)
            && (int) $estudiante->perfil_aprendizaje_id !== 1;

        if (! $tienePerfilNormal) {
            $mensaje = 'El estudiante no tiene un perfil de aprendizaje asignado para desactivar.';

            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => $mensaje], 422);
            }

            return back()->withErrors(['perfil_aprendizaje_id' => $mensaje]);
        }

        $estudiante->update(['perfil_aprendizaje_id' => 1]);

        $mensaje = 'Perfil de aprendizaje desactivado correctamente. El estudiante quedó con perfil Estándar.';

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

    private function asegurarPersonalizacion(int $institucionId): void
    {
        $catalogoIds = PerfilAprendizajeInclusion::query()->pluck('id');
        $existentes = PerfilAprendizajeOrden::query()
            ->where('institucion_id', $institucionId)
            ->pluck('perfil_aprendizaje_id');

        $faltantes = $catalogoIds->diff($existentes);
        if ($faltantes->isEmpty()) {
            return;
        }

        $orden = (int) (PerfilAprendizajeOrden::query()
            ->where('institucion_id', $institucionId)
            ->max('orden') ?? -1);
        $ahora = now();
        $filas = [];

        foreach ($faltantes as $perfilAprendizajeId) {
            $orden++;
            $filas[] = [
                'institucion_id' => $institucionId,
                'perfil_aprendizaje_id' => (int) $perfilAprendizajeId,
                'orden' => $orden,
                'activa' => 1,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ];
        }

        PerfilAprendizajeOrden::query()->insert($filas);
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
}
