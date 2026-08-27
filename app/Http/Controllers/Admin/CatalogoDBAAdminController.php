<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\CatalogoDBA;
use App\Models\Grado;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * Dominio DBA: consulta unificada (Catálogo) + gestión del colegio.
 */
class CatalogoDBAAdminController extends Controller
{
    /**
     * Listado MEN + DBA del colegio.
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
                'html' => view('admin.catalogo._contenido', compact(
                    'catalogosMen',
                    'catalogosColegio',
                ))->render(),
            ]);
        }

        return view('admin.catalogo.index', compact(
            'catalogosMen',
            'catalogosColegio',
            'areas',
            'grados',
        ));
    }

    /**
     * Detalle de lectura: DBA del MEN o del colegio.
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

    public function guardar(Request $request)
    {
        $institucionId = $this->institucionId();

        $datos = $request->validate([
            'codigo' => [
                'required',
                'string',
                'max:50',
                Rule::unique('catalogo_dba', 'codigo')->where(
                    fn ($q) => $q->where('institucion_id', $institucionId)
                ),
            ],
            'area_id' => 'required|exists:areas,id',
            'grado_id' => 'required|exists:grados,id',
            'descripcion' => 'required|string|max:65000',
        ]);

        $catalogo = CatalogoDBA::create([
            'codigo' => $datos['codigo'],
            'area_id' => $datos['area_id'],
            'grado_id' => $datos['grado_id'],
            'descripcion' => $datos['descripcion'],
            'institucion_id' => $institucionId,
            'creado_por' => Auth::guard('docente')->id(),
            'es_men' => false,
            'estado' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Catálogo DBA personalizado creado correctamente.',
            'catalogo' => $catalogo,
        ]);
    }

    public function ver(string $id)
    {
        $catalogo = $this->catalogoDeInstitucion($id);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $catalogo->id,
                'codigo' => $catalogo->codigo,
                'area_id' => $catalogo->area_id,
                'grado_id' => $catalogo->grado_id,
                'descripcion' => $catalogo->descripcion,
                'es_men' => false,
                'estado' => (bool) $catalogo->estado,
            ],
        ]);
    }

    public function actualizar(Request $request, string $id)
    {
        $catalogo = $this->catalogoDeInstitucion($id);
        $institucionId = $this->institucionId();

        $datos = $request->validate([
            'codigo' => [
                'required',
                'string',
                'max:50',
                Rule::unique('catalogo_dba', 'codigo')
                    ->where(fn ($q) => $q->where('institucion_id', $institucionId))
                    ->ignore($catalogo->id),
            ],
            'area_id' => 'required|exists:areas,id',
            'grado_id' => 'required|exists:grados,id',
            'descripcion' => 'required|string|max:65000',
        ]);

        $catalogo->update($datos);

        return response()->json([
            'success' => true,
            'message' => 'Catálogo DBA actualizado correctamente.',
            'catalogo' => $catalogo->fresh(),
        ]);
    }

    public function toggleActivo(string $id)
    {
        $catalogo = $this->catalogoDeInstitucion($id);
        $nuevoEstado = ! $catalogo->estado;
        $catalogo->update(['estado' => $nuevoEstado]);

        return response()->json([
            'success' => true,
            'estado' => $nuevoEstado,
            'message' => $nuevoEstado
                ? 'Catálogo DBA activado correctamente.'
                : 'Catálogo DBA desactivado correctamente.',
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

    private function catalogoDeInstitucion(string $id): CatalogoDBA
    {
        return CatalogoDBA::with(['area:id,nombre', 'grado:id,nombre'])
            ->where('institucion_id', $this->institucionId())
            ->where('es_men', false)
            ->findOrFail($id);
    }
}
