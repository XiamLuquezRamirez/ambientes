<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajePersonalizado;
use App\Services\ParametrosPerfilAprendizajeService;
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
            ->with(['perfilAprendizaje:id,codigo,nombre,color_hex'])
            ->ordenadas();

        if ($this->tieneColumnaEstudiantes()) {
            $consulta->withCount([
                'estudiantes',
                'estudiantes as estudiantes_activos_count' => fn ($q) => $q->where('activo', true),
            ]);
        }

        if ($esSuperAdmin) {
            // Solo globales: sistema y adicionales creadas por super admin (sin institución).
            $consulta->whereNull('institucion_id');
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

        if ($request->filled('perfil_aprendizaje_id')) {
            $consulta->where('perfil_aprendizaje_id', (int) $request->perfil_aprendizaje_id);
        }

        $consulta->where('eliminado', 0);

        $perfilesAprendizajePersonalizado = $consulta->paginate(15)->withQueryString();
        $perfilesAprendizajeBase = PerfilAprendizajeInclusion::ordenadas()->get(['id', 'codigo', 'nombre', 'color_hex', 'estado']);

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('superAdmin.perfilAprendizajePersonalizado._tabla', [
                    'perfilesAprendizajePersonalizado' => $perfilesAprendizajePersonalizado,
                    'esSuperAdmin' => $esSuperAdmin,
                ])->render(),
            ]);
        }

        return view('superAdmin.perfilAprendizajePersonalizado.index', [
            'perfilesAprendizajePersonalizado' => $perfilesAprendizajePersonalizado,
            'perfilesAprendizajeBase' => $perfilesAprendizajeBase,
            'esSuperAdmin' => $esSuperAdmin,
        ]);
    }

    public function mostrar(PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado)
    {
        $this->autorizarAcceso($perfilAprendizajePersonalizado);

        $perfilAprendizajePersonalizado->load('perfilAprendizaje:id,codigo,nombre,color_hex');

        if ($this->tieneColumnaEstudiantes()) {
            $perfilAprendizajePersonalizado->loadCount([
                'estudiantes',
                'estudiantes as estudiantes_activos_count' => fn ($q) => $q->where('activo', true),
            ]);
        }

        return response()->json([
            'success' => true,
            'perfil_aprendizaje_personalizado' => [
                'id' => $perfilAprendizajePersonalizado->id,
                'codigo' => $perfilAprendizajePersonalizado->codigo,
                'etiqueta' => $perfilAprendizajePersonalizado->etiqueta,
                'descripcion_interna' => $perfilAprendizajePersonalizado->descripcion_interna,
                'perfil_aprendizaje_id' => $perfilAprendizajePersonalizado->perfil_aprendizaje_id,
                'es_sistema' => (bool) $perfilAprendizajePersonalizado->es_sistema,
                'estado' => (int) $perfilAprendizajePersonalizado->estado,
                'perfil_aprendizaje' => $perfilAprendizajePersonalizado->perfilAprendizaje,
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
        $datos['institucion_id'] = $esSuperAdmin
            ? null
            : $usuario?->institucion_id;
        $datos['perfil_aprendizaje_id'] = $datos['perfil_aprendizaje_id'] ?? null;
        $datos['usuario_crea'] = $usuario?->id;

        $perfilAprendizajePersonalizado = PerfilAprendizajePersonalizado::create($datos);

        if ($datos['institucion_id'] === null) {
            app(ParametrosPerfilAprendizajeService::class)->inicializarDefaultsPersonalizado(
                (int) $perfilAprendizajePersonalizado->id,
                (int) ($datos['perfil_aprendizaje_id'] ?? 0) ?: null
            );
        } else {
            app(ParametrosPerfilAprendizajeService::class)->inicializarInstitucionPersonalizado(
                (int) $datos['institucion_id'],
                (int) $perfilAprendizajePersonalizado->id,
                $perfilAprendizajePersonalizado
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'perfil de aprendizaje personalizado creado correctamente.',
            'perfil_aprendizaje_personalizado' => $perfilAprendizajePersonalizado,
        ]);
    }

    public function actualizar(Request $request, PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado)
    {
        $this->autorizarAcceso($perfilAprendizajePersonalizado);
        $usuario = Auth::guard('docente')->user();
        $esSuperAdmin = $usuario?->esSuperAdmin() ?? false;

        $datos = $this->validar($request, $perfilAprendizajePersonalizado->id);
        $datos['perfil_aprendizaje_id'] = $datos['perfil_aprendizaje_id'] ?? null;

        if ($esSuperAdmin && ! $perfilAprendizajePersonalizado->es_sistema) {
            $datos['es_sistema'] = $request->boolean('es_sistema');
        } else {
            unset($datos['es_sistema']);
        }

        $perfilAprendizajePersonalizado->update($datos);

        return response()->json([
            'success' => true,
            'message' => 'perfil de aprendizaje personalizado actualizado correctamente.',
            'perfil_aprendizaje_personalizado' => $perfilAprendizajePersonalizado->fresh(),
        ]);
    }

    public function cambiarEstado(PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado)
    {
        $this->autorizarAcceso($perfilAprendizajePersonalizado);

        $nuevoEstado = $perfilAprendizajePersonalizado->activa() ? 0 : 1;
        $perfilAprendizajePersonalizado->update(['estado' => $nuevoEstado]);

        return response()->json([
            'success' => true,
            'message' => $nuevoEstado === 1
                ? 'perfil de aprendizaje personalizado activado correctamente.'
                : 'perfil de aprendizaje personalizado desactivado correctamente. Ya no aparecerá en el selector del docente.',
            'estado' => $nuevoEstado,
        ]);
    }

    public function eliminar(PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado)
    {
        $this->autorizarAcceso($perfilAprendizajePersonalizado);

        if ($perfilAprendizajePersonalizado->es_sistema) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar un perfil de aprendizaje de sistema.',
            ], 422);
        }

        $estudiantesAsignados = $this->tieneColumnaEstudiantes()
            ? $perfilAprendizajePersonalizado->estudiantes()->count()
            : 0;

        if ($estudiantesAsignados > 0) {
            return response()->json([
                'success' => false,
                'estudiantes_asignados' => $estudiantesAsignados,
                'message' => "No se puede eliminar: tiene {$estudiantesAsignados} estudiante(s) asociados. Puede desactivarla en su lugar.",
            ], 422);
        }

        $perfilAprendizajePersonalizado->update(['eliminado' => true]);

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
            'perfil_aprendizaje_id' => [
                'nullable',
                'integer',
                Rule::exists('perfil_aprendizaje', 'id'),
            ],
            'es_sistema' => 'nullable|boolean',
        ]);
    }

    private function autorizarAcceso(PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado): void
    {
        $usuario = Auth::guard('docente')->user();

        if ($usuario?->esSuperAdmin()) {
            return;
        }

        if (
            $perfilAprendizajePersonalizado->es_sistema
            || ($perfilAprendizajePersonalizado->institucion_id && $perfilAprendizajePersonalizado->institucion_id !== $usuario?->institucion_id)
        ) {
            abort(403, 'No autorizado para gestionar este perfil de aprendizaje personalizado.');
        }
    }

    private function tieneColumnaEstudiantes(): bool
    {
        return Schema::hasColumn('estudiantes', 'perfil_aprendizaje_personalizado_id');
    }
}
