<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\PerfilAprendizajeInclusion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;

class PerfilAprendizajeInclusionController extends Controller
{
    public function index(Request $request)
    {
        $consulta = PerfilAprendizajeInclusion::query()
            ->withCount([
                'estudiantes',
                'estudiantes as estudiantes_activos_count' => fn ($q) => $q->where('activo', true),
            ])
            ->ordenadas();

        if ($request->filled('buscar')) {
            $buscar = trim($request->get('buscar'));
            $consulta->where(function ($q) use ($buscar) {
                $q->where('nombre', 'like', "%{$buscar}%")
                    ->orWhere('codigo', 'like', "%{$buscar}%");
            });
        }

        if ($request->filled('estado') && in_array($request->estado, ['1', '0'], true)) {
            $consulta->where('estado', (int) $request->estado);
        }

        if ($request->filled('es_sistema') && in_array($request->es_sistema, ['1', '0'], true)) {
            $consulta->where('es_sistema', (int) $request->es_sistema);
        }

        $condiciones = $consulta->paginate(10)->withQueryString();

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('superAdmin.perfilAprendizaje._tabla', compact('condiciones'))->render(),
            ]);
        }

        return view('superAdmin.perfilAprendizaje.index', compact('condiciones'));
    }

    public function mostrar(PerfilAprendizajeInclusion $condicionInclusion)
    {
        $condicionInclusion->loadCount([
            'estudiantes',
            'estudiantes as estudiantes_activos_count' => fn ($q) => $q->where('activo', true),
        ]);

        return response()->json([
            'success' => true,
            'condicion' => [
                'id' => $condicionInclusion->id,
                'codigo' => $condicionInclusion->codigo,
                'nombre' => $condicionInclusion->nombre,
                'descripcion_corta' => $condicionInclusion->descripcion_corta,
                'estado' => (int) $condicionInclusion->estado,
                'color_hex' => $condicionInclusion->color_hex,
                'es_sistema' => (bool) $condicionInclusion->es_sistema,
                'vista_info_asociada' => $condicionInclusion->vista_info_asociada,
                'estudiantes_count' => $condicionInclusion->estudiantes_count,
                'estudiantes_activos_count' => $condicionInclusion->estudiantes_activos_count,
            ],
        ]);
    }

    public function actualizarVistaInfo(Request $request, PerfilAprendizajeInclusion $condicionInclusion)
    {
        $datos = $request->validate([
            'vista_info_asociada' => [
                'nullable',
                'string',
                'max:100'
            ],
        ]);
        $vista = isset($datos['vista_info_asociada'])
            ? trim($datos['vista_info_asociada'])
            : null;

        if ($vista === '') {
            $vista = null;
        }

        if ($vista !== null && ! View::exists($vista)) {
            return response()->json([
                'success' => false,
                'message' => "La vista \"{$vista}\" no existe en el sistema.",
                'errors' => [
                    'vista_info_asociada' => ["La vista \"{$vista}\" no existe."],
                ],
            ], 422);
        }

        $condicionInclusion->update(['vista_info_asociada' => $vista]);

        return response()->json([
            'success' => true,
            'message' => $vista
                ? 'Vista de información asociada correctamente.'
                : 'Vista de información eliminada.',
            'vista_info_asociada' => $vista,
        ]);
    }

    public function verVistaInfo(PerfilAprendizajeInclusion $condicionInclusion)
    {
        $vista = $condicionInclusion->vista_info_asociada;

        if (! $vista) {
            return response()->json([
                'success' => false,
                'message' => 'Este perfil de aprendizaje no tiene una vista de información asociada.',
            ], 422);
        }

        if (! View::exists($vista)) {
            return response()->json([
                'success' => false,
                'message' => "La vista \"{$vista}\" no existe o fue eliminada.",
            ], 422);
        }

        return response()->json([
            'success' => true,
            'condicion' => [
                'id' => $condicionInclusion->id,
                'codigo' => $condicionInclusion->codigo,
                'nombre' => $condicionInclusion->nombre,
                'vista_info_asociada' => $vista,
            ],
            'html' => view($vista, [
                'condicion' => $condicionInclusion,
            ])->render(),
        ]);
    }

    public function guardar(Request $request)
    {
        $datos = $this->validar($request);
        $datos['codigo'] = PerfilAprendizajeInclusion::generarCodigo();
        $datos['estado'] = $this->normalizarEstado($request->input('estado'), 1);
        $datos['color_hex'] = $datos['color_hex'] ?? '#000000';
        $datos['es_sistema'] = $request->boolean('es_sistema');

        $condicion = PerfilAprendizajeInclusion::create($datos);

        return response()->json([
            'success' => true,
            'message' => 'perfil de aprendizaje creado correctamente.',
            'condicion' => $condicion,
        ]);
    }

    public function actualizar(Request $request, PerfilAprendizajeInclusion $condicionInclusion)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:100|min:10',
            'descripcion_corta' => 'required|string',
            'color_hex' => ['required', 'string', 'max:7', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'es_sistema' => 'nullable|boolean',
        ]);

        // Si ya es de sistema, no se permite quitar esa bandera.
        if ($condicionInclusion->es_sistema) {
            unset($datos['es_sistema']);
        } else {
            $datos['es_sistema'] = $request->boolean('es_sistema');
        }

        $condicionInclusion->update($datos);

        return response()->json([
            'success' => true,
            'message' => 'perfil de aprendizaje actualizado correctamente.',
            'condicion' => $condicionInclusion->fresh()->loadCount('estudiantes'),
        ]);
    }

    public function cambiarEstado(PerfilAprendizajeInclusion $condicionInclusion)
    {
        $estudiantesAsignados = $condicionInclusion->estudiantes()->count();
        $nuevoEstado = $condicionInclusion->activa() ? 0 : 1;

        if ($nuevoEstado === 0 && $estudiantesAsignados > 0 && ! request()->boolean('confirmar')) {
            return response()->json([
                'success' => false,
                'requiere_confirmacion' => true,
                'estudiantes_asignados' => $estudiantesAsignados,
                'message' => "Este perfil de aprendizaje tiene {$estudiantesAsignados} estudiante(s) asignado(s). ¿Desea desactivarla de todas formas?",
            ], 422);
        }

        $condicionInclusion->update(['estado' => $nuevoEstado]);

        return response()->json([
            'success' => true,
            'message' => $nuevoEstado === 1
                ? 'perfil de aprendizaje activado correctamente.'
                : 'perfil de aprendizaje desactivado correctamente.',
            'estado' => $nuevoEstado,
            'estudiantes_asignados' => $estudiantesAsignados,
        ]);
    }

    public function eliminar(PerfilAprendizajeInclusion $condicionInclusion)
    {
        if ($condicionInclusion->es_sistema) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar un perfil de aprendizaje de sistema.',
            ], 422);
        }

        $estudiantesAsignados = $condicionInclusion->estudiantes()->count();

        if ($estudiantesAsignados > 0) {
            return response()->json([
                'success' => false,
                'estudiantes_asignados' => $estudiantesAsignados,
                'message' => "No se puede eliminar: tiene {$estudiantesAsignados} estudiante(s) asignado(s). Puede desactivarla en su lugar.",
            ], 422);
        }

        $condicionInclusion->delete();

        return response()->json([
            'success' => true,
            'message' => 'perfil de aprendizaje eliminado correctamente.',
        ]);
    }

    private function validar(Request $request): array
    {
        return $request->validate([
            'nombre' => 'required|string|max:100|min:10',
            'descripcion_corta' => 'required|string',
            'estado' => 'nullable',
            'color_hex' => ['nullable', 'string', 'max:7', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'es_sistema' => 'nullable|boolean',
        ]);
    }

    private function normalizarEstado(mixed $estado, int $default = 1): int
    {
        if ($estado === null || $estado === '') {
            return $default;
        }

        if (in_array($estado, [1, '1', true, 'activa', 'activo'], true)) {
            return 1;
        }

        if (in_array($estado, [0, '0', false, 'inactiva', 'inactivo'], true)) {
            return 0;
        }

        return $default;
    }
}
