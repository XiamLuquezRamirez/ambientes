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
 * Gestión del Catálogo DBA personalizado del colegio (Configuración).
 * La consulta unificada MEN + colegio vive en CatalogoAdminController.
 */
class CatalogoDBAAdminController extends Controller
{
    /**
     * Listado y filtros de DBA personalizados de la institución.
     */
    public function listar(Request $request)
    {
        $institucionId = $this->institucionId();

        $consulta = CatalogoDBA::query()
            ->with(['area:id,nombre', 'grado:id,nombre', 'creadoPor:id,nombre'])
            ->where('institucion_id', $institucionId)
            ->where('es_men', false)
            ->orderBy('codigo');

        $this->aplicarFiltros($consulta, $request);
        $catalogos = $consulta->paginate(10)->withQueryString();

        $areas = Area::where('estado', true)->orderBy('nombre')->get(['id', 'nombre']);
        $grados = Grado::activos()->get(['id', 'nombre']);

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('admin.configuracion.catalogos-DBA._tabla', compact('catalogos'))->render(),
            ]);
        }

        return view('admin.configuracion.catalogos-DBA.index', compact('catalogos', 'areas', 'grados'));
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
