<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajePersonalizado;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class PerfilAprendizajePersonalizadoController extends Controller
{
    public function index(Request $request)
    {
        $usuario = Auth::guard('docente')->user();
        $esSuperAdmin = $usuario?->esSuperAdmin() ?? false;

        $consulta = PerfilAprendizajePersonalizado::query()
            ->with(['condicionBase:id,codigo,nombre,color_hex'])
            ->ordenadas();

        if ($this->tieneColumnaEstudiantes()) {
            $consulta->withCount([
                'estudiantes',
                'estudiantes as estudiantes_activos_count' => fn ($q) => $q->where('activo', true),
            ]);
        }

        if ($esSuperAdmin) {
            // Solo globales: sistema y adicionales creadas por super admin (sin institución).
            $consulta->whereNull('id_institucion');
        } else {
            $consulta->deInstitucion($usuario?->institucion_id);
        }

        if ($request->filled('buscar')) {
            $buscar = trim($request->get('buscar'));
            $consulta->where(function ($q) use ($buscar) {
                $q->where('etiqueta', 'like', "%{$buscar}%")
                    ->orWhere('codigo', 'like', "%{$buscar}%")
                    ->orWhere('descripcion_interna', 'like', "%{$buscar}%");
            });
        }

        if ($request->filled('estado') && in_array($request->estado, ['1', '0'], true)) {
            $consulta->where('estado', (int) $request->estado);
        }

        if ($request->filled('es_sistema') && in_array($request->es_sistema, ['1', '0'], true)) {
            $consulta->where('es_sistema', (int) $request->es_sistema);
        }

        if ($request->filled('condicion_base_id')) {
            $consulta->where('condicion_base_id', (int) $request->condicion_base_id);
        }

        $condiciones = $consulta->paginate(15)->withQueryString();
        $condicionesBase = PerfilAprendizajeInclusion::ordenadas()->get(['id', 'codigo', 'nombre', 'color_hex', 'estado']);

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('superAdmin.perfilAprendizajePersonalizado._tabla', [
                    'condiciones' => $condiciones,
                    'esSuperAdmin' => $esSuperAdmin,
                ])->render(),
            ]);
        }

        return view('superAdmin.perfilAprendizajePersonalizado.index', [
            'condiciones' => $condiciones,
            'condicionesBase' => $condicionesBase,
            'esSuperAdmin' => $esSuperAdmin,
        ]);
    }

    public function mostrar(PerfilAprendizajePersonalizado $condicionTransitoria)
    {
        $this->autorizarAcceso($condicionTransitoria);

        $condicionTransitoria->load('condicionBase:id,codigo,nombre,color_hex');

        if ($this->tieneColumnaEstudiantes()) {
            $condicionTransitoria->loadCount([
                'estudiantes',
                'estudiantes as estudiantes_activos_count' => fn ($q) => $q->where('activo', true),
            ]);
        }

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
        $usuario = Auth::guard('docente')->user();
        $esSuperAdmin = $usuario?->esSuperAdmin() ?? false;

        $datos = $this->validar($request);
        $datos['codigo'] = PerfilAprendizajePersonalizado::generarCodigo();
        $datos['estado'] = 1;
        $datos['es_sistema'] = $esSuperAdmin ? $request->boolean('es_sistema') : false;
        $datos['id_institucion'] = $esSuperAdmin
            ? null
            : $usuario?->institucion_id;
        $datos['condicion_base_id'] = $datos['condicion_base_id'] ?? null;
        $datos['usuario_crea'] = $usuario?->id;

        $condicion = PerfilAprendizajePersonalizado::create($datos);

        return response()->json([
            'success' => true,
            'message' => 'perfil de aprendizaje personalizado creado correctamente.',
            'condicion' => $condicion,
        ]);
    }

    public function actualizar(Request $request, PerfilAprendizajePersonalizado $condicionTransitoria)
    {
        $this->autorizarAcceso($condicionTransitoria);
        $usuario = Auth::guard('docente')->user();
        $esSuperAdmin = $usuario?->esSuperAdmin() ?? false;

        $datos = $this->validar($request, $condicionTransitoria->id);
        $datos['condicion_base_id'] = $datos['condicion_base_id'] ?? null;

        if ($esSuperAdmin && ! $condicionTransitoria->es_sistema) {
            $datos['es_sistema'] = $request->boolean('es_sistema');
        } else {
            unset($datos['es_sistema']);
        }

        $condicionTransitoria->update($datos);

        return response()->json([
            'success' => true,
            'message' => 'perfil de aprendizaje personalizado actualizado correctamente.',
            'condicion' => $condicionTransitoria->fresh(),
        ]);
    }

    public function cambiarEstado(PerfilAprendizajePersonalizado $condicionTransitoria)
    {
        $this->autorizarAcceso($condicionTransitoria);

        $nuevoEstado = $condicionTransitoria->activa() ? 0 : 1;
        $condicionTransitoria->update(['estado' => $nuevoEstado]);

        return response()->json([
            'success' => true,
            'message' => $nuevoEstado === 1
                ? 'perfil de aprendizaje personalizado activado correctamente.'
                : 'perfil de aprendizaje personalizado desactivado correctamente. Ya no aparecerá en el selector del docente.',
            'estado' => $nuevoEstado,
        ]);
    }

    public function eliminar(PerfilAprendizajePersonalizado $condicionTransitoria)
    {
        $this->autorizarAcceso($condicionTransitoria);

        if ($condicionTransitoria->es_sistema) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar un perfil de aprendizaje de sistema.',
            ], 422);
        }

        $estudiantesAsignados = $this->tieneColumnaEstudiantes()
            ? $condicionTransitoria->estudiantes()->count()
            : 0;

        if ($estudiantesAsignados > 0) {
            return response()->json([
                'success' => false,
                'estudiantes_asignados' => $estudiantesAsignados,
                'message' => "No se puede eliminar: tiene {$estudiantesAsignados} estudiante(s) asociados. Puede desactivarla en su lugar.",
            ], 422);
        }

        $condicionTransitoria->delete();

        return response()->json([
            'success' => true,
            'message' => 'perfil de aprendizaje personalizado eliminado correctamente.',
        ]);
    }

    private function validar(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'etiqueta' => 'required|string|max:150|min:10',
            'descripcion_interna' => 'required|string',
            'condicion_base_id' => [
                'nullable',
                'integer',
                Rule::exists('condiciones', 'id'),
            ],
            'es_sistema' => 'nullable|boolean',
        ]);
    }

    private function autorizarAcceso(PerfilAprendizajePersonalizado $condicion): void
    {
        $usuario = Auth::guard('docente')->user();

        if ($usuario?->esSuperAdmin()) {
            return;
        }

        if (
            $condicion->es_sistema
            || ($condicion->id_institucion && $condicion->id_institucion !== $usuario?->institucion_id)
        ) {
            abort(403, 'No autorizado para gestionar este perfil de aprendizaje personalizado.');
        }
    }

    private function tieneColumnaEstudiantes(): bool
    {
        return Schema::hasColumn('estudiantes', 'id_condicion_transitoria');
    }
}
