<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Experiencia;
use App\Models\Grado;
use App\Models\Tematica;
use App\Services\BloqueExperienciaService;
use App\Services\TematicaCurriculoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class ExperienciasSuperAdminController extends Controller
{
    public function __construct(
        private TematicaCurriculoService $curriculo,
        private BloqueExperienciaService $bloques,
    ) {}

    public function index()
    {
        $ambientes = Ambiente::query()
            ->with([
                'modulosOficiales' => fn ($q) => $q
                    ->where('activo', true)
                    ->with([
                        'ejesOficiales' => fn ($eq) => $eq->where('activo', true)->orderBy('orden'),
                    ])
                    ->orderBy('orden'),
            ])
            ->orderBy('nombre')
            ->get();

        $grados = Grado::activos()->get(['id', 'nombre']);

        return view('superAdmin.catalogo.experiencias.index', compact('ambientes', 'grados'));
    }

    public function listarPorTematica(Tematica $tematica)
    {
        $this->asegurarTematicaOficial($tematica, false);

        $experiencias = $this->curriculo
            ->consultaExperienciasDeTematica($tematica)
            ->get();

        $puedeEditar = $tematica->puedeGestionarComoSuperAdmin($this->usuarioId());

        return response()->json([
            'success' => true,
            'data' => [
                'tematica' => $this->curriculo->serializarTematicaParaExperiencias($tematica, [
                    'creado_por' => (int) $tematica->creado_por,
                    'puede_editar' => $puedeEditar,
                    'puede_crear_experiencia' => $puedeEditar && $tematica->activo,
                ]),
                'experiencias' => $this->curriculo->serializarColeccionExperiencias(
                    $experiencias,
                    $this->opcionesSerializarExperiencia()
                ),
            ],
        ]);
    }

    public function guardar(Request $request, Tematica $tematica)
    {
        $this->asegurarTematicaGestionable($tematica);

        $datos = $this->validarExperiencia($request, $tematica->id);
        $experiencia = $this->curriculo->crearExperiencia($tematica, $datos, $this->usuarioId());

        return response()->json([
            'success' => true,
            'message' => 'Experiencia creada correctamente.',
            'data' => $this->curriculo->serializarExperiencia($experiencia, $this->opcionesSerializarExperiencia()),
        ], 201);
    }

    public function mostrar(Experiencia $experiencia)
    {
        $experiencia = $this->curriculo->cargarExperiencia($experiencia);
        $this->asegurarTematicaOficial($experiencia->tematica, false);

        return response()->json([
            'success' => true,
            'data' => $this->curriculo->serializarExperiencia(
                $experiencia,
                $this->opcionesSerializarExperiencia()
            ),
        ]);
    }

    public function constructor(Experiencia $experiencia)
    {
        $experiencia = $this->curriculo->cargarExperiencia($experiencia);
        $this->asegurarTematicaOficial($experiencia->tematica, false);

        $puedeEditar = $experiencia->puedeGestionarComoSuperAdmin($this->usuarioId());
        $puedePublicar = $puedeEditar;
        $volverUrl = route('superadmin.catalogo.experiencias.index', [
            'tematica' => $experiencia->tematica_id,
        ]);

        // Solo el dueño editable siembra Bienvenida/Recompensa; la vista de lectura no escribe.
        $bloques = $puedeEditar
            ? $this->bloques->asegurarObligatorios($experiencia)
            : $this->bloques->listar($experiencia);
        $catalogo = $this->bloques->registry()->catalogo();
        $constructorUrls = [
            'listar' => route('superadmin.catalogo.experiencias.bloques.index', $experiencia),
            'guardar' => route('superadmin.catalogo.experiencias.bloques.guardar', $experiencia),
            'reordenar' => route('superadmin.catalogo.experiencias.bloques.reordenar', $experiencia),
            'limpiar' => route('superadmin.catalogo.experiencias.bloques.limpiar', $experiencia),
            'upload' => route('superadmin.catalogo.experiencias.bloques.upload', $experiencia),
            'tts' => route('superadmin.catalogo.experiencias.bloques.tts', $experiencia),
            'publicar' => route('superadmin.catalogo.experiencias.publicar', $experiencia),
            'vista_previa' => route('superadmin.catalogo.experiencias.vista-previa', $experiencia),
            'vista_previa_foco' => route('superadmin.catalogo.experiencias.vista-previa.foco', $experiencia),
            'actualizar_template' => route('superadmin.catalogo.bloques.actualizar', ['bloque' => '__BLOQUE__']),
            'eliminar_template' => route('superadmin.catalogo.bloques.eliminar', ['bloque' => '__BLOQUE__']),
        ];

        return view('superAdmin.catalogo.experiencias.constructor', compact(
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
        $this->asegurarExperienciaGestionable($experiencia);

        $datos = $this->validarExperiencia($request, $experiencia->tematica_id, $experiencia->id);
        $experiencia = $this->curriculo->actualizarExperiencia($experiencia, $datos);

        return response()->json([
            'success' => true,
            'message' => 'Experiencia actualizada correctamente.',
            'data' => $this->curriculo->serializarExperiencia($experiencia, $this->opcionesSerializarExperiencia()),
        ]);
    }

    public function actualizarEstado(Experiencia $experiencia)
    {
        $this->asegurarExperienciaGestionable($experiencia);

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
        $this->asegurarExperienciaGestionable($experiencia);

        $datos = $request->validate([
            'estado' => ['required', Rule::in(Experiencia::ESTADOS)],
        ]);

        $experiencia = $this->curriculo->cambiarEstadoExperiencia($experiencia, $datos['estado']);

        return response()->json([
            'success' => true,
            'message' => 'Estado de la experiencia actualizado correctamente.',
            'data' => $this->curriculo->serializarExperiencia($experiencia, $this->opcionesSerializarExperiencia()),
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

    private function asegurarTematicaOficial(Tematica $tematica, bool $paraEscribir = false): void
    {
        if (! $tematica->esOficial()) {
            abort(403, 'Solo se pueden gestionar experiencias de temáticas oficiales desde esta vista.');
        }

        if ($paraEscribir) {
            if (! $tematica->activo) {
                abort(422, 'La temática no está activa.');
            }
            $tematica->loadMissing('eje');
            if (! $tematica->eje || ! $tematica->eje->activo || ! $tematica->eje->esOficial()) {
                abort(422, 'El eje oficial de la temática no está activo.');
            }
        }
    }

    private function asegurarTematicaGestionable(Tematica $tematica): void
    {
        $this->asegurarTematicaOficial($tematica, true);

        if (! $tematica->puedeGestionarComoSuperAdmin($this->usuarioId())) {
            abort(403, 'Solo puede crear experiencias en temáticas oficiales que usted creó.');
        }
    }

    private function asegurarExperienciaGestionable(Experiencia $experiencia): void
    {
        $experiencia->loadMissing('tematica.eje');
        $this->asegurarTematicaOficial($experiencia->tematica, true);

        if (! $experiencia->puedeGestionarComoSuperAdmin($this->usuarioId())) {
            abort(403, 'Solo puede gestionar las experiencias oficiales que usted creó.');
        }
    }

    private function opcionesSerializarExperiencia(): array
    {
        $userId = $this->usuarioId();

        return [
            'resolver_puede_editar' => fn (Experiencia $e) => $e->puedeGestionarComoSuperAdmin($userId),
        ];
    }

    private function usuarioId(): int
    {
        $id = Auth::guard('docente')->id();
        abort_unless($id, 403, 'No hay un usuario autenticado.');

        return (int) $id;
    }
}
