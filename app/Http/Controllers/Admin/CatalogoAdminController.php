<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\CatalogoDBA;
use App\Models\Grado;
use App\Models\Modulo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CatalogoAdminController extends Controller
{
    /**
     * Vista unificada del sidebar «Catálogo»:
     * DBA del MEN (solo lectura) + DBA del colegio (consulta / acciones de lectura).
     */
    public function listar(Request $request)
    {
        $institucionId = $this->institucionId();

        $consultaMen = CatalogoDBA::query()
            ->with(['area:id,nombre', 'grado:id,nombre'])
            ->whereNull('institucion_id')
            ->where('es_men', true)
            ->orderBy('codigo');
        $this->aplicarFiltros($consultaMen, $request);
        $catalogosMen = $consultaMen->paginate(10, ['*'], 'page_men')->withQueryString();

        $consultaColegio = CatalogoDBA::query()
            ->with(['area:id,nombre', 'grado:id,nombre'])
            ->where('institucion_id', $institucionId)
            ->where('es_men', false)
            ->orderBy('codigo');
        $this->aplicarFiltros($consultaColegio, $request);
        $catalogosColegio = $consultaColegio->paginate(10, ['*'], 'page_colegio')->withQueryString();

        $areas = Area::where('estado', true)->orderBy('nombre')->get(['id', 'nombre']);
        $grados = Grado::activos()->get(['id', 'nombre']);

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('admin.catalogo._contenido', compact('catalogosMen', 'catalogosColegio'))->render(),
            ]);
        }

        return view('admin.catalogo.index', compact('catalogosMen', 'catalogosColegio', 'areas', 'grados'));
    }

    /**
     * Detalle de lectura: DBA del MEN oficiales o del colegio del Admin.
     */
    public function detalle(string $id)
    {
        $institucionId = $this->institucionId();

        $catalogo = CatalogoDBA::with(['area:id,nombre', 'grado:id,nombre'])
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
                'estado' => (bool) $catalogo->estado,
            ],
        ]);
    }

    public function guardarModulo(Request $request)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function actualizarModulo(Request $request, $modulo)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function eliminarModulo(Modulo $modulo)
    {
        if (! $modulo->sePuedeEliminar()) {
            return back()->with('error', 'Los módulos oficiales no se pueden eliminar.');
        }

        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function guardarTema(Request $request)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function actualizarTema(Request $request, $tema)
    {
        return back()->with('info', 'Pendiente de implementacion.');
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

        if ($request->filled('estado') && in_array($request->estado, ['0', '1'], true)) {
            $consulta->where('estado', (bool) (int) $request->estado);
        }
    }

    private function institucionId(): int
    {
        $institucionId = session('institucion_id') ?: Auth::guard('docente')->user()?->institucion_id;

        abort_unless($institucionId, 403, 'No se pudo determinar la institución del administrador.');

        return (int) $institucionId;
    }
}
