<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\CatalogoDBA;
use App\Models\Grado;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CatalogoPanelController extends Controller
{
    /**
     * Catálogo DBA solo lectura para docentes.
     * MEN activos (global) + personalizados activos del colegio.
     */
    public function index(Request $request)
    {
        $institucionId = $this->institucionId();

        $consultaMen = CatalogoDBA::query()
            ->with(['area:id,nombre', 'grado:id,nombre'])
            ->whereNull('institucion_id')
            ->where('es_men', true)
            ->where('estado', true)
            ->orderBy('codigo');
        $this->aplicarFiltros($consultaMen, $request);
        $catalogosMen = $consultaMen->paginate(10, ['*'], 'page_men')->withQueryString();

        $consultaColegio = CatalogoDBA::query()
            ->with(['area:id,nombre', 'grado:id,nombre'])
            ->where('institucion_id', $institucionId)
            ->where('es_men', false)
            ->where('estado', true)
            ->orderBy('codigo');
        $this->aplicarFiltros($consultaColegio, $request);
        $catalogosColegio = $consultaColegio->paginate(10, ['*'], 'page_colegio')->withQueryString();

        $areas = Area::where('estado', true)->orderBy('nombre')->get(['id', 'nombre']);
        $grados = Grado::activos()->get(['id', 'nombre']);

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('panel.catalogo._contenido', compact('catalogosMen', 'catalogosColegio'))->render(),
            ]);
        }

        return view('panel.catalogo.index', compact('catalogosMen', 'catalogosColegio', 'areas', 'grados'));
    }

    /**
     * Detalle de lectura: solo DBA activos (MEN global o del colegio del docente).
     */
    public function detalle(string $id)
    {
        $institucionId = $this->institucionId();

        $catalogo = CatalogoDBA::with(['area:id,nombre', 'grado:id,nombre'])
            ->where('estado', true)
            ->where(function ($q) use ($institucionId) {
                $q->where(function ($men) {
                    $men->whereNull('institucion_id')->where('es_men', true);
                })->orWhere(function ($colegio) use ($institucionId) {
                    $colegio->where('institucion_id', $institucionId)->where('es_men', false);
                });
            })
            ->findOrFail($id);

        $esMen = (bool) $catalogo->es_men && $catalogo->institucion_id === null;

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $catalogo->id,
                'codigo' => $catalogo->codigo,
                'descripcion' => $catalogo->descripcion,
                'area' => $catalogo->area?->nombre ?? '—',
                'grado' => $catalogo->grado?->nombre ?? '—',
                'origen' => $esMen ? 'MEN' : 'Del colegio',
                'es_men' => $esMen,
            ],
        ]);
    }

    private function aplicarFiltros($consulta, Request $request): void
    {
        if ($request->filled('buscar')) {
            $termino = trim($request->buscar);
            $consulta->where(function ($q) use ($termino) {
                $q->where('codigo', 'like', "%{$termino}%")
                    ->orWhere('descripcion', 'like', "%{$termino}%");
            });
        }

        if ($request->filled('area_id')) {
            $consulta->where('area_id', $request->area_id);
        }

        if ($request->filled('grado_id')) {
            $consulta->where('grado_id', $request->grado_id);
        }
    }

    private function institucionId(): int
    {
        $id = session('institucion_id') ?: Auth::guard('docente')->user()?->institucion_id;

        abort_unless($id, 403, 'No hay institución en sesión.');

        return (int) $id;
    }
}
