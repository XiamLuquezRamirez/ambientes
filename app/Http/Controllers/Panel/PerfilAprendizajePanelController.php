<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajeOrden;
use App\Services\EstudiantePerfilAprendizajeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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

    private function institucionId(): int
    {
        $id = Auth::guard('docente')->user()?->institucion_id;

        if (! $id) {
            abort(403, 'No se encontró la institución del docente.');
        }

        return (int) $id;
    }
}
