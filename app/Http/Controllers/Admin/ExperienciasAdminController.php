<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Experiencia;
use App\Models\Grado;
use App\Models\Institucion;
use App\Models\Modulo;
use App\Models\Tematica;
use App\Services\BloqueExperienciaService;
use App\Services\TematicaCurriculoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class ExperienciasAdminController extends Controller
{
    public function __construct(
        private TematicaCurriculoService $curriculo,
        private BloqueExperienciaService $bloques,
    ) {}

    public function index()
    {
        $institucionId = $this->institucionId();
        $institucion = Institucion::with(['ambientesActivos' => fn ($q) => $q->orderBy('nombre')])
            ->findOrFail($institucionId);

        $ambientes = $institucion->ambientesActivos->map(function ($ambiente) use ($institucionId) {
            $oficiales = Modulo::query()
                ->oficiales()
                ->where('activo', true)
                ->where('ambiente_id', $ambiente->id)
                ->whereHas(
                    'instituciones',
                    fn ($q) => $q
                        ->where('instituciones.id', $institucionId)
                        ->where('modulo_institucion.activo', true)
                )
                ->with([
                    'ejes' => fn ($q) => $q
                        ->where(function ($inner) use ($institucionId) {
                            $inner->where(fn ($oficial) => $oficial->oficiales()->where('activo', true))
                                ->orWhere(fn ($propia) => $propia->deInstitucion($institucionId)->where('activo', true));
                        })
                        ->orderBy('orden'),
                ])
                ->orderBy('orden')
                ->get();

            $propios = Modulo::query()
                ->deInstitucion($institucionId)
                ->where('ambiente_id', $ambiente->id)
                ->where('activo', true)
                ->with([
                    'ejes' => fn ($q) => $q
                        ->where(function ($inner) use ($institucionId) {
                            $inner->where(fn ($oficial) => $oficial->oficiales()->where('activo', true))
                                ->orWhere(fn ($propia) => $propia->deInstitucion($institucionId)->where('activo', true));
                        })
                        ->orderBy('orden'),
                ])
                ->orderBy('orden')
                ->get();

            $ambiente->setRelation(
                'modulos',
                $oficiales->concat($propios)->sortBy('orden')->values()
            );

            return $ambiente;
        });

        $grados = Grado::activos()->get(['id', 'nombre']);

        return view('admin.catalogo.experiencias.index', compact('ambientes', 'grados'));
    }

    public function listarPorTematica(Tematica $tematica)
    {
        $institucionId = $this->institucionId();
        $this->asegurarTematicaVisible($tematica, $institucionId);

        $experiencias = $this->curriculo
            ->consultaExperienciasDeTematica($tematica)
            ->get();

        $puedeEditar = $tematica->esDeInstitucion($institucionId);

        return response()->json([
            'success' => true,
            'data' => [
                'tematica' => $this->curriculo->serializarTematicaParaExperiencias($tematica, [
                    'es_propia' => $tematica->esDeInstitucion($institucionId),
                    'puede_editar' => $puedeEditar,
                    'puede_crear_experiencia' => $puedeEditar && $tematica->activo,
                ]),
                'experiencias' => $this->curriculo->serializarColeccionExperiencias(
                    $experiencias,
                    $this->opcionesSerializarExperiencia($institucionId)
                ),
            ],
        ]);
    }

    public function guardar(Request $request, Tematica $tematica)
    {
        $institucionId = $this->institucionId();
        $this->asegurarTematicaGestionable($tematica, $institucionId);

        $datos = $this->validarExperiencia($request, $tematica->id);
        $experiencia = $this->curriculo->crearExperiencia($tematica, $datos, $this->usuarioId());

        return response()->json([
            'success' => true,
            'message' => 'Experiencia creada correctamente.',
            'data' => $this->curriculo->serializarExperiencia(
                $experiencia,
                $this->opcionesSerializarExperiencia($institucionId)
            ),
        ], 201);
    }

    public function mostrar(Experiencia $experiencia)
    {
        $institucionId = $this->institucionId();
        $this->asegurarExperienciaVisible($experiencia, $institucionId);

        return response()->json([
            'success' => true,
            'data' => $this->curriculo->serializarExperiencia(
                $this->curriculo->cargarExperiencia($experiencia),
                $this->opcionesSerializarExperiencia($institucionId)
            ),
        ]);
    }

    public function constructor(Experiencia $experiencia)
    {
        $institucionId = $this->institucionId();
        $this->asegurarExperienciaVisible($experiencia, $institucionId);

        $experiencia = $this->curriculo->cargarExperiencia($experiencia);
        $puedeEditar = $experiencia->puedeGestionarComoAdmin($institucionId);
        $puedePublicar = $puedeEditar;
        $volverUrl = route('admin.catalogo.experiencias.index', [
            'tematica' => $experiencia->tematica_id,
        ]);

        $bloques = $puedeEditar
            ? $this->bloques->asegurarObligatorios($experiencia)
            : $this->bloques->listar($experiencia);
        $catalogo = $this->bloques->registry()->catalogo();
        $constructorUrls = [
            'listar' => route('admin.experiencias.bloques.index', $experiencia),
            'guardar' => route('admin.experiencias.bloques.guardar', $experiencia),
            'reordenar' => route('admin.experiencias.bloques.reordenar', $experiencia),
            'limpiar' => route('admin.experiencias.bloques.limpiar', $experiencia),
            'upload' => route('admin.experiencias.bloques.upload', $experiencia),
            'tts' => route('admin.experiencias.bloques.tts', $experiencia),
            'publicar' => route('admin.experiencias.publicar', $experiencia),
            'vista_previa' => route('admin.experiencias.vista-previa', $experiencia),
            'vista_previa_foco' => route('admin.experiencias.vista-previa.foco', $experiencia),
            'actualizar_template' => route('admin.bloques.actualizar', ['bloque' => '__BLOQUE__']),
            'eliminar_template' => route('admin.bloques.eliminar', ['bloque' => '__BLOQUE__']),
        ];

        return view('admin.catalogo.experiencias.constructor', compact(
            'experiencia',
            'puedeEditar',
            'puedePublicar',
            'volverUrl',
            'bloques',
            'catalogo',
            'constructorUrls'
        ));
    }

    public function actualizar(Request $request, Experiencia $experiencia)
    {
        $institucionId = $this->institucionId();
        $this->asegurarExperienciaGestionable($experiencia, $institucionId);

        $datos = $this->validarExperiencia($request, $experiencia->tematica_id, $experiencia->id);
        $experiencia = $this->curriculo->actualizarExperiencia($experiencia, $datos);

        return response()->json([
            'success' => true,
            'message' => 'Experiencia actualizada correctamente.',
            'data' => $this->curriculo->serializarExperiencia(
                $experiencia,
                $this->opcionesSerializarExperiencia($institucionId)
            ),
        ]);
    }

    public function actualizarEstado(Experiencia $experiencia)
    {
        $institucionId = $this->institucionId();
        $this->asegurarExperienciaGestionable($experiencia, $institucionId);

        $experiencia = $this->curriculo->toggleActivoExperiencia($experiencia);

        return response()->json([
            'success' => true,
            'message' => $experiencia->activo
                ? 'Experiencia activada correctamente.'
                : 'Experiencia desactivada correctamente.',
            'activo' => (bool) $experiencia->activo,
        ]);
    }

    public function cambiarEstado(Request $request, Experiencia $experiencia)
    {
        $institucionId = $this->institucionId();
        $this->asegurarExperienciaGestionable($experiencia, $institucionId);

        $datos = $request->validate([
            'estado' => ['required', Rule::in(Experiencia::ESTADOS)],
        ]);

        $experiencia = $this->curriculo->cambiarEstadoExperiencia($experiencia, $datos['estado']);

        return response()->json([
            'success' => true,
            'message' => 'Estado de la experiencia actualizado correctamente.',
            'data' => $this->curriculo->serializarExperiencia(
                $experiencia,
                $this->opcionesSerializarExperiencia($institucionId)
            ),
        ]);
    }

    public function eliminar(Experiencia $experiencia)
    {
        $institucionId = $this->institucionId();
        $this->asegurarExperienciaGestionable($experiencia, $institucionId);

        $data = $this->curriculo->eliminarExperiencia($experiencia);

        return response()->json([
            'success' => true,
            'message' => 'Experiencia eliminada correctamente.',
            'data' => $data,
        ]);
    }

    private function validarExperiencia(Request $request, int $tematicaId, ?int $experienciaId = null): array
    {
        return $request->validate([
            'grado_id' => ['required', 'integer', 'exists:grados,id'],
            'nombre' => [
                'required',
                'string',
                'max:150',
                Rule::unique('experiencias', 'nombre')
                    ->where(fn ($q) => $q->where('tematica_id', $tematicaId))
                    ->where(fn ($q) => $q->where('grado_id', $request->grado_id))
                    ->ignore($experienciaId),
            ],
            'objetivo' => ['required', 'string'],
            'proposito' => ['nullable', 'string'],
            'habilidades' => ['nullable', 'string'],
            'duracion_minutos' => ['required', 'integer', Rule::in(Experiencia::DURACIONES_MINUTOS)],
            'referente_aprendizaje' => ['nullable', 'string'],
            'estado' => ['nullable', Rule::in(Experiencia::ESTADOS)],
            'materiales' => ['nullable', 'array'],
            'materiales.*.id' => ['nullable', 'integer'],
            'materiales.*.nombre' => ['required', 'string', 'max:150'],
            'materiales.*.cantidad' => ['required', 'string', 'max:60'],
            'materiales.*.es_obligatorio' => ['sometimes', 'boolean'],
            'materiales.*.orden' => ['nullable', 'integer', 'min:1', 'max:255'],
        ], [
            'nombre.required' => 'El nombre de la experiencia es obligatorio.',
            'nombre.unique' => 'Ya existe una experiencia con ese nombre en esta temática y grado.',
            'objetivo.required' => 'El objetivo de la experiencia es obligatorio.',
            'grado_id.required' => 'El grado es obligatorio.',
            'duracion_minutos.required' => 'La duración estimada es obligatoria.',
            'duracion_minutos.in' => 'Seleccione una duración válida (15, 20, 30 o 45 min).',
        ]);
    }

    private function asegurarTematicaVisible(Tematica $tematica, int $institucionId): void
    {
        if (! $tematica->esOficial() && ! $tematica->esDeInstitucion($institucionId)) {
            abort(403, 'No puede consultar esta temática.');
        }

        $tematica->loadMissing('eje.modulo');
        $this->asegurarAmbienteActivoContratado($tematica->eje->modulo->ambiente_id, $institucionId);
    }

    private function asegurarTematicaGestionable(Tematica $tematica, int $institucionId): void
    {
        if (! $tematica->esDeInstitucion($institucionId)) {
            abort(403, 'Solo puede gestionar experiencias de temáticas propias de su institución.');
        }

        if (! $tematica->activo) {
            abort(422, 'La temática no está activa.');
        }

        $tematica->loadMissing('eje.modulo');

        if (! $tematica->eje->activo) {
            abort(422, 'El eje de la temática no está activo.');
        }

        $this->asegurarAmbienteActivoContratado($tematica->eje->modulo->ambiente_id, $institucionId);
    }

    private function asegurarExperienciaVisible(Experiencia $experiencia, int $institucionId): void
    {
        $experiencia->loadMissing('tematica.eje.modulo');
        $this->asegurarTematicaVisible($experiencia->tematica, $institucionId);
    }

    private function asegurarExperienciaGestionable(Experiencia $experiencia, int $institucionId): void
    {
        $experiencia->loadMissing('tematica.eje.modulo');
        $this->asegurarTematicaGestionable($experiencia->tematica, $institucionId);
    }

    private function opcionesSerializarExperiencia(?int $institucionId = null): array
    {
        $institucionId = $institucionId ?: $this->institucionId();

        return [
            'resolver_puede_editar' => fn (Experiencia $e) => $e->puedeGestionarComoAdmin($institucionId),
        ];
    }

    private function asegurarAmbienteActivoContratado(int $ambienteId, int $institucionId): void
    {
        $activo = Institucion::query()
            ->whereKey($institucionId)
            ->whereHas(
                'ambientesActivos',
                fn ($q) => $q->where('ambientes.id', $ambienteId)
            )
            ->exists();

        if (! $activo) {
            abort(403, 'El ambiente no está activo para esta institución.');
        }
    }

    private function institucionId(): int
    {
        $institucionId = session('institucion_id') ?: Auth::guard('docente')->user()?->institucion_id;
        abort_unless($institucionId, 403, 'No se pudo determinar la institución del administrador.');

        return (int) $institucionId;
    }

    private function usuarioId(): int
    {
        $id = Auth::guard('docente')->id();
        abort_unless($id, 403, 'No hay un usuario autenticado.');

        return (int) $id;
    }
}
