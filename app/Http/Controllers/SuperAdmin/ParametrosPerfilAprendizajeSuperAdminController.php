<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Enums\SeguridadAccion;
use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajePersonalizado;
use App\Services\ParametrosPerfilAprendizajeService;
use App\Services\SeguridadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use InvalidArgumentException;

class ParametrosPerfilAprendizajeSuperAdminController extends Controller
{
    public function __construct(
        protected ParametrosPerfilAprendizajeService $servicio
    ) {}

    public function index()
    {
        return view('superAdmin.parametros-perfil.index', [
            'modo' => 'defaults',
            'tituloPagina' => 'Parámetros por defecto',
        ]);
    }

    public function catalogo(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'catalogo' => $this->servicio->catalogo(),
        ]);
    }

    public function perfilesFormales(): JsonResponse
    {
        $perfiles = PerfilAprendizajeInclusion::query()
            ->where('eliminado', 0)
            ->withCount([
                'estudiantes',
                'estudiantes as estudiantes_activos_count' => fn ($q) => $q->where('activo', true),
            ])
            ->ordenadas()
            ->get()
            ->map(function (PerfilAprendizajeInclusion $p) {
                $clave = $this->servicio->clavePerfilInclusion((int) $p->id);

                return [
                    'id' => $p->id,
                    'codigo' => $p->codigo,
                    'nombre' => $p->nombre,
                    'clave' => $clave,
                    'color' => $p->color_hex ?: '#0F6E56',
                    'estudiantes' => (int) ($p->estudiantes_activos_count ?? 0),
                ];
            })
            ->values()
            ->all();

        return response()->json(['success' => true, 'perfiles' => $perfiles]);
    }

    public function perfilesPersonalizados(): JsonResponse
    {
        $perfiles = PerfilAprendizajePersonalizado::query()
            ->whereNull('institucion_id')
            ->where('eliminado', 0)
            ->with('perfilAprendizaje:id,nombre,codigo,color_hex')
            ->ordenadas()
            ->get()
            ->map(fn (PerfilAprendizajePersonalizado $p) => [
                'id' => $p->id,
                'codigo' => $p->codigo,
                'nombre' => $p->etiqueta,
                'etiqueta' => $p->etiqueta,
                'descripcion_interna' => $p->descripcion_interna,
                'base_id' => $p->perfil_aprendizaje_id,
                'base_nombre' => $p->perfilAprendizaje?->nombre,
                'color' => $p->perfilAprendizaje?->color_hex ?? '#854F0B',
                'activos' => 0,
                'es_sistema' => true,
                'predefinida' => true,
            ])
            ->values()
            ->all();

        return response()->json(['success' => true, 'perfiles' => $perfiles]);
    }

    public function mostrarInclusion(PerfilAprendizajeInclusion $perfilAprendizajeInclusion): JsonResponse
    {
        $id = (int) $perfilAprendizajeInclusion->id;
        $clave = $this->servicio->clavePerfilInclusion($id);
        $archivo = $this->servicio->leerArchivoDefaults('inclusion', $id);

        return response()->json([
            'success' => true,
            'clave' => $clave,
            'principio' => $clave ? (config('parametros_perfil.principios.'.$clave) ?? null) : null,
            'base' => config('parametros_perfil.base'),
            'sistema' => $this->servicio->valoresSistemaInclusion($id),
            'referencia' => $this->servicio->valoresSistemaInclusion($id),
            'preset' => $clave ? (config('parametros_perfil.presets.'.$clave) ?? []) : [],
            'overrides' => $archivo['overrides'],
            'valores' => $this->servicio->valoresDefaults('inclusion', $id),
            'actualizado_en' => $archivo['actualizado_en'],
        ]);
    }

    public function guardarInclusion(Request $request, PerfilAprendizajeInclusion $perfilAprendizajeInclusion): JsonResponse
    {
        $datos = $request->validate(['valores' => 'required|array']);

        try {
            $resultado = $this->servicio->guardarDefaults(
                'inclusion',
                (int) $perfilAprendizajeInclusion->id,
                $datos['valores']
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        $this->registrarAuditoria(
            'Valores por defecto guardados (inclusión).',
            $request,
            $perfilAprendizajeInclusion->nombre
        );

        $id = (int) $perfilAprendizajeInclusion->id;

        return response()->json([
            'success' => true,
            'message' => 'Valores por defecto guardados.',
            'overrides' => $resultado['overrides'],
            'valores' => $this->servicio->valoresDefaults('inclusion', $id),
            'actualizado_en' => $resultado['actualizado_en'],
        ]);
    }

    public function restablecerInclusion(PerfilAprendizajeInclusion $perfilAprendizajeInclusion): JsonResponse
    {
        $id = (int) $perfilAprendizajeInclusion->id;
        $this->servicio->restablecerDefaults('inclusion', $id);

        $this->registrarAuditoria(
            'Valores por defecto restablecidos (inclusión).',
            request(),
            $perfilAprendizajeInclusion->nombre
        );

        return response()->json([
            'success' => true,
            'message' => 'Valores por defecto restablecidos al preset del sistema.',
            'overrides' => [],
            'valores' => $this->servicio->valoresSistemaInclusion($id),
        ]);
    }

    public function mostrarPersonalizado(PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado): JsonResponse
    {
        $id = (int) $perfilAprendizajePersonalizado->id;
        $archivo = $this->servicio->leerArchivoDefaults('personalizado', $id);
        $heredado = $this->servicio->valoresReferenciaDefaults('personalizado', $id, $perfilAprendizajePersonalizado);

        return response()->json([
            'success' => true,
            'heredado' => $heredado,
            'referencia' => $heredado,
            'overrides' => $archivo['overrides'],
            'valores' => $this->servicio->valoresDefaults('personalizado', $id),
            'actualizado_en' => $archivo['actualizado_en'],
        ]);
    }

    public function guardarPersonalizado(Request $request, PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado): JsonResponse
    {
        $datos = $request->validate(['valores' => 'required|array']);

        try {
            $resultado = $this->servicio->guardarDefaults(
                'personalizado',
                (int) $perfilAprendizajePersonalizado->id,
                $datos['valores'],
                $perfilAprendizajePersonalizado
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        $this->registrarAuditoria(
            'Valores por defecto guardados (personalizado).',
            $request,
            $perfilAprendizajePersonalizado->etiqueta
        );

        $id = (int) $perfilAprendizajePersonalizado->id;

        return response()->json([
            'success' => true,
            'message' => 'Valores por defecto guardados.',
            'overrides' => $resultado['overrides'],
            'valores' => $this->servicio->valoresDefaults('personalizado', $id),
            'actualizado_en' => $resultado['actualizado_en'],
        ]);
    }

    public function restablecerPersonalizado(PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado): JsonResponse
    {
        $id = (int) $perfilAprendizajePersonalizado->id;
        $this->servicio->restablecerDefaults('personalizado', $id);

        $this->registrarAuditoria(
            'Valores por defecto restablecidos (personalizado).',
            request(),
            $perfilAprendizajePersonalizado->etiqueta
        );

        return response()->json([
            'success' => true,
            'message' => 'Valores por defecto restablecidos.',
            'overrides' => [],
            'valores' => $this->servicio->valoresReferenciaDefaults('personalizado', $id, $perfilAprendizajePersonalizado),
        ]);
    }

    private function registrarAuditoria(string $descripcion, ?Request $request, ?string $registroAfectado = null): void
    {
        $usuarioId = Auth::guard('docente')->id();

        if (! $usuarioId) {
            return;
        }

        SeguridadService::registrar(
            $usuarioId,
            $usuarioId,
            SeguridadAccion::PROFILE_UPDATED,
            $descripcion,
            $request,
            $registroAfectado
        );
    }
}
