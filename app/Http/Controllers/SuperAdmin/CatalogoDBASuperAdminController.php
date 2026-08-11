<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\CatalogoDBA;
use App\Models\Grado;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class CatalogoDBASuperAdminController extends Controller
{
    /**
     * Lista el catálogo DBA oficial (sin institución) con filtros y paginación.
     */
    public function listar(Request $request)
    {
        $consulta = CatalogoDBA::query()
            ->with(['area:id,nombre', 'grado:id,nombre'])
            ->whereNull('institucion_id')
            ->orderBy('codigo');

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

        $catalogos = $consulta->paginate(10)->withQueryString();
        $areas = Area::where('estado', true)->orderBy('nombre')->get(['id', 'nombre']);
        $grados = Grado::activos()->get(['id', 'nombre']);

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('superAdmin.configuracion.catalogos-DBA._tabla', compact('catalogos'))->render(),
            ]);
        }

        return view('superAdmin.configuracion.catalogos-DBA.index', compact('catalogos', 'areas', 'grados'));
    }

    public function guardar(Request $request)
    {
        $datos = $request->validate([
            'codigo' => [
                'required',
                'string',
                'max:50',
                Rule::unique('catalogo_dba', 'codigo')->whereNull('institucion_id'),
            ],
            'area_id' => 'required|exists:areas,id',
            'grado_id' => 'required|exists:grados,id',
            'descripcion' => 'required|string|max:255',
            'es_men' => 'required|in:0,1',
        ]);

        $catalogo = CatalogoDBA::create([
            'codigo' => $datos['codigo'],
            'area_id' => $datos['area_id'],
            'grado_id' => $datos['grado_id'],
            'descripcion' => $datos['descripcion'],
            'es_men' => (bool) (int) $datos['es_men'],
            'institucion_id' => null,
            'creado_por' => Auth::guard('docente')->id(),
            'estado' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Catálogo DBA creado correctamente.',
            'catalogo' => $catalogo,
        ]);
    }

    public function ver(string $id)
    {
        $catalogo = $this->catalogoOficial($id);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $catalogo->id,
                'codigo' => $catalogo->codigo,
                'area_id' => $catalogo->area_id,
                'grado_id' => $catalogo->grado_id,
                'descripcion' => $catalogo->descripcion,
                'es_men' => (bool) $catalogo->es_men,
                'estado' => (bool) $catalogo->estado,
            ],
        ]);
    }

    public function actualizar(Request $request, string $id)
    {
        $catalogo = $this->catalogoOficial($id);

        $datos = $request->validate([
            'codigo' => [
                'required',
                'string',
                'max:50',
                Rule::unique('catalogo_dba', 'codigo')
                    ->whereNull('institucion_id')
                    ->ignore($catalogo->id),
            ],
            'area_id' => 'required|exists:areas,id',
            'grado_id' => 'required|exists:grados,id',
            'descripcion' => 'required|string|max:255',
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
        $catalogo = $this->catalogoOficial($id);
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

    private function catalogoOficial(string $id): CatalogoDBA
    {
        return CatalogoDBA::with(['area:id,nombre', 'grado:id,nombre'])
            ->whereNull('institucion_id')
            ->findOrFail($id);
    }
}
