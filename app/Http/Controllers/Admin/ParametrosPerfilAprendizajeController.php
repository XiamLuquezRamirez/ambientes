<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Enums\SeguridadAccion;
use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajePersonalizado;
use App\Services\EstudiantePerfilAprendizajePersonalizadoService;
use App\Services\ParametrosPerfilAprendizajeService;
use App\Services\SeguridadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use InvalidArgumentException;

class ParametrosPerfilAprendizajeController extends Controller
{
    public function __construct(
        protected ParametrosPerfilAprendizajeService $servicio
    ) {}

    public function index()
    {
        $institucionId = $this->institucionId();
        $this->servicio->sembrarInstitucion($institucionId);

        return view('admin.configuracion.parametros-perfil.index', [
            'modo' => 'institucion',
            'tituloPagina' => 'Parámetros de adaptación',
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
        return response()->json([
            'success' => true,
            'perfiles' => $this->listarPerfilesFormales(),
        ]);
    }

    public function perfilesPersonalizados(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'perfiles' => $this->listarPerfilesPersonalizados(),
        ]);
    }

    public function mostrarInclusion(PerfilAprendizajeInclusion $perfilAprendizajeInclusion): JsonResponse
    {
        $institucionId = $this->institucionId();
        $id = (int) $perfilAprendizajeInclusion->id;
        $this->servicio->sembrarPerfilInstitucion($institucionId, 'inclusion', $id);

        return response()->json($this->payloadInclusion($institucionId, $perfilAprendizajeInclusion));
    }

    public function guardarInclusion(Request $request, PerfilAprendizajeInclusion $perfilAprendizajeInclusion): JsonResponse
    {
        $institucionId = $this->institucionId();
        $datos = $request->validate(['valores' => 'required|array']);

        try {
            $resultado = $this->servicio->guardarInstitucion(
                $institucionId,
                'inclusion',
                (int) $perfilAprendizajeInclusion->id,
                $datos['valores']
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        $this->registrarAuditoria(
            'Parámetros de adaptación guardados (inclusión).',
            $request,
            $perfilAprendizajeInclusion->nombre
        );

        $id = (int) $perfilAprendizajeInclusion->id;

        return response()->json([
            'success' => true,
            'message' => 'Parámetros guardados correctamente.',
            'overrides' => $resultado['overrides'],
            'valores' => $this->servicio->valoresResueltosInstitucion($institucionId, 'inclusion', $id),
            'actualizado_en' => $resultado['actualizado_en'],
        ]);
    }

    public function restablecerInclusion(PerfilAprendizajeInclusion $perfilAprendizajeInclusion): JsonResponse
    {
        $institucionId = $this->institucionId();
        $id = (int) $perfilAprendizajeInclusion->id;
        $this->servicio->restablecerInstitucion($institucionId, 'inclusion', $id);

        $this->registrarAuditoria(
            'Parámetros de adaptación restablecidos (inclusión).',
            request(),
            $perfilAprendizajeInclusion->nombre
        );

        return response()->json([
            'success' => true,
            'message' => 'Parámetros restablecidos a los valores por defecto.',
            'overrides' => [],
            'valores' => $this->servicio->valoresReferenciaInstitucion($institucionId, 'inclusion', $id),
        ]);
    }

    public function mostrarPersonalizado(PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado): JsonResponse
    {
        $this->autorizarPersonalizado($perfilAprendizajePersonalizado);
        $institucionId = $this->institucionId();
        $id = (int) $perfilAprendizajePersonalizado->id;
        $this->servicio->sembrarPerfilInstitucion($institucionId, 'personalizado', $id);

        return response()->json($this->payloadPersonalizado($institucionId, $perfilAprendizajePersonalizado));
    }

    public function guardarPersonalizado(Request $request, PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado): JsonResponse
    {
        $this->autorizarPersonalizado($perfilAprendizajePersonalizado);
        $institucionId = $this->institucionId();
        $datos = $request->validate(['valores' => 'required|array']);

        try {
            $resultado = $this->servicio->guardarInstitucion(
                $institucionId,
                'personalizado',
                (int) $perfilAprendizajePersonalizado->id,
                $datos['valores'],
                $perfilAprendizajePersonalizado
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        $this->registrarAuditoria(
            'Parámetros de adaptación guardados (personalizado).',
            $request,
            $perfilAprendizajePersonalizado->etiqueta
        );

        return response()->json([
            'success' => true,
            'message' => 'Parámetros guardados correctamente.',
            'overrides' => $resultado['overrides'],
            'valores' => $this->servicio->valoresResueltosInstitucion(
                $institucionId,
                'personalizado',
                (int) $perfilAprendizajePersonalizado->id,
                $perfilAprendizajePersonalizado
            ),
            'actualizado_en' => $resultado['actualizado_en'],
        ]);
    }

    public function restablecerPersonalizado(PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado): JsonResponse
    {
        $this->autorizarPersonalizado($perfilAprendizajePersonalizado);
        $institucionId = $this->institucionId();
        $id = (int) $perfilAprendizajePersonalizado->id;
        $this->servicio->restablecerInstitucion($institucionId, 'personalizado', $id);

        $this->registrarAuditoria(
            'Parámetros de adaptación restablecidos (personalizado).',
            request(),
            $perfilAprendizajePersonalizado->etiqueta
        );

        return response()->json([
            'success' => true,
            'message' => 'Parámetros restablecidos a la condición base.',
            'overrides' => [],
            'valores' => $this->servicio->valoresReferenciaInstitucion(
                $institucionId,
                'personalizado',
                $id,
                $perfilAprendizajePersonalizado
            ),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function payloadInclusion(int $institucionId, PerfilAprendizajeInclusion $perfil): array
    {
        $id = (int) $perfil->id;
        $clave = $this->servicio->clavePerfilInclusion($id);
        $archivo = $this->servicio->leerArchivoInstitucion($institucionId, 'inclusion', $id);
        $referencia = $this->servicio->valoresReferenciaInstitucion($institucionId, 'inclusion', $id);

        return [
            'success' => true,
            'perfil' => $this->serializarFormal($perfil, $institucionId),
            'clave' => $clave,
            'principio' => $clave ? (config('parametros_perfil.principios.'.$clave) ?? null) : null,
            'base' => config('parametros_perfil.base'),
            'sistema' => $this->servicio->valoresSistemaInclusion($id),
            'referencia' => $referencia,
            'preset' => $clave ? (config('parametros_perfil.presets.'.$clave) ?? []) : [],
            'overrides' => $archivo['overrides'],
            'valores' => $this->servicio->valoresResueltosInstitucion($institucionId, 'inclusion', $id),
            'actualizado_en' => $archivo['actualizado_en'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function payloadPersonalizado(int $institucionId, PerfilAprendizajePersonalizado $perfil): array
    {
        $id = (int) $perfil->id;
        $archivo = $this->servicio->leerArchivoInstitucion($institucionId, 'personalizado', $id);
        $heredado = $this->servicio->valoresReferenciaInstitucion($institucionId, 'personalizado', $id, $perfil);

        return [
            'success' => true,
            'perfil' => [
                'id' => $perfil->id,
                'codigo' => $perfil->codigo,
                'nombre' => $perfil->etiqueta,
                'descripcion' => $perfil->descripcion_interna,
                'base_id' => $perfil->perfil_aprendizaje_id,
                'base_nombre' => $perfil->perfilAprendizaje?->nombre,
                'color' => $perfil->perfilAprendizaje?->color_hex ?? '#854F0B',
            ],
            'heredado' => $heredado,
            'referencia' => $heredado,
            'overrides' => $archivo['overrides'],
            'valores' => $this->servicio->valoresResueltosInstitucion($institucionId, 'personalizado', $id, $perfil),
            'actualizado_en' => $archivo['actualizado_en'],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function listarPerfilesFormales(): array
    {
        $institucionId = $this->institucionId();

        return PerfilAprendizajeInclusion::query()
            ->where('eliminado', 0)
            ->withCount([
                'estudiantes as estudiantes_activos_count' => fn ($q) => $q
                    ->where('activo', true)
                    ->where('institucion_id', $institucionId),
            ])
            ->ordenadas()
            ->get()
            ->map(fn (PerfilAprendizajeInclusion $p) => $this->serializarFormal($p, $institucionId))
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function listarPerfilesPersonalizados(): array
    {
        $institucionId = $this->institucionId();
        $servicioAsignaciones = app(EstudiantePerfilAprendizajePersonalizadoService::class);

        return PerfilAprendizajePersonalizado::query()
            ->deInstitucion($institucionId)
            ->where('eliminado', 0)
            ->with('perfilAprendizaje:id,nombre,codigo,color_hex')
            ->ordenadas()
            ->get()
            ->map(function (PerfilAprendizajePersonalizado $p) use ($institucionId, $servicioAsignaciones) {
                return [
                    'id' => $p->id,
                    'codigo' => $p->codigo,
                    'nombre' => $p->etiqueta,
                    'etiqueta' => $p->etiqueta,
                    'descripcion_interna' => $p->descripcion_interna,
                    'base_id' => $p->perfil_aprendizaje_id,
                    'base_nombre' => $p->perfilAprendizaje?->nombre,
                    'color' => $p->perfilAprendizaje?->color_hex ?? '#854F0B',
                    'activos' => $servicioAsignaciones->conteoActivosPerfilAprendizajePersonalizado($p->id, $institucionId),
                    'es_sistema' => (bool) $p->es_sistema,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    protected function serializarFormal(PerfilAprendizajeInclusion $perfil, int $institucionId): array
    {
        $clave = $this->servicio->clavePerfilInclusion((int) $perfil->id);

        return [
            'id' => $perfil->id,
            'codigo' => $perfil->codigo,
            'nombre' => $perfil->nombre,
            'clave' => $clave,
            'color' => $perfil->color_hex ?: '#0F6E56',
            'principio' => $clave ? (config('parametros_perfil.principios.'.$clave) ?? null) : null,
            'estudiantes' => (int) ($perfil->estudiantes_activos_count ?? 0),
            'activos' => (int) ($perfil->estudiantes_activos_count ?? 0),
        ];
    }

    protected function autorizarPersonalizado(PerfilAprendizajePersonalizado $perfil): void
    {
        $institucionId = $this->institucionId();

        if ($perfil->institucion_id !== null && (int) $perfil->institucion_id !== $institucionId) {
            abort(403, 'No autorizado.');
        }
    }

    protected function institucionId(): int
    {
        $id = session('institucion_id');

        if (! $id) {
            abort(403, 'No se encontró la institución en sesión.');
        }

        return (int) $id;
    }

    protected function registrarAuditoria(string $descripcion, ?Request $request, ?string $registroAfectado = null): void
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
