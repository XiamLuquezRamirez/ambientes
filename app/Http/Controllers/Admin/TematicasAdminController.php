<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\CatalogoDBA;
use App\Models\Eje;
use App\Models\Grado;
use App\Models\Institucion;
use App\Models\Modulo;
use App\Models\Tematica;
use App\Services\TematicaCurriculoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class TematicasAdminController extends Controller
{
    public function __construct(
        private TematicaCurriculoService $curriculo,
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

        $areas = Area::where('estado', true)->orderBy('nombre')->get(['id', 'nombre']);
        $grados = Grado::activos()->get(['id', 'nombre']);

        return view('admin.catalogo.tematicas.index', compact('ambientes', 'areas', 'grados'));
    }

    public function listar(Request $request)
    {
        $institucionId = $this->institucionId();
        $filtros = $this->curriculo->filtrosDesdeRequest($request);
        $perPage = max(1, min(48, (int) $request->input('per_page', 12)));

        $pagina = $this->curriculo
            ->consultaTematicas($institucionId, $filtros)
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => [
                'tematicas' => $this->curriculo->serializarColeccionTematicas(
                    collect($pagina->items()),
                    $institucionId
                ),
                'pagination' => [
                    'current_page' => $pagina->currentPage(),
                    'last_page' => $pagina->lastPage(),
                    'per_page' => $pagina->perPage(),
                    'total' => $pagina->total(),
                    'from' => $pagina->firstItem(),
                    'to' => $pagina->lastItem(),
                ],
            ],
        ]);
    }

    public function buscarDbas(Request $request)
    {
        $institucionId = $this->institucionId();

        $consulta = CatalogoDBA::query()
            ->with(['area:id,nombre', 'grado:id,nombre'])
            ->where('estado', true)
            ->where(function ($q) use ($institucionId) {
                $q->whereNull('institucion_id')
                    ->orWhere('institucion_id', $institucionId);
            })
            ->orderBy('codigo');

        if ($request->filled('grado_id')) {
            $consulta->where('grado_id', (int) $request->grado_id);
        }
        if ($request->filled('area_id')) {
            $consulta->where('area_id', (int) $request->area_id);
        }
        if ($request->filled('q')) {
            $q = trim((string) $request->q);
            $consulta->where(function ($inner) use ($q) {
                $inner->where('codigo', 'like', "%{$q}%")
                    ->orWhere('descripcion', 'like', "%{$q}%");
            });
        }

        $data = $consulta->limit(50)->get()->map(fn (CatalogoDBA $dba) => [
            'id' => $dba->id,
            'codigo' => $dba->codigo,
            'descripcion' => $dba->descripcion,
            'area' => $dba->area?->nombre,
            'grado' => $dba->grado?->nombre,
        ]);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function listarPorEje(Eje $eje)
    {
        $institucionId = $this->institucionId();
        $this->asegurarEjeVisible($eje, $institucionId);

        $tematicas = $this->curriculo
            ->consultaTematicasDeEje($eje, $institucionId)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'eje' => [
                    'id' => $eje->id,
                    'nombre' => $eje->nombre,
                    'modulo_id' => $eje->modulo_id,
                    'es_oficial' => $eje->esOficial(),
                ],
                'tematicas' => $this->curriculo->serializarColeccionTematicas($tematicas, $institucionId),
            ],
        ]);
    }

    public function guardar(Request $request, Eje $eje)
    {
        $institucionId = $this->institucionId();
        $this->asegurarEjeVisible($eje, $institucionId, true);

        $datos = $this->validarTematica($request, $eje->id, $institucionId);
        $tematica = $this->curriculo->crearTematica(
            $eje,
            $datos,
            $this->usuarioId(),
            false,
            $institucionId
        );

        return response()->json([
            'success' => true,
            'message' => 'Temática creada correctamente.',
            'data' => $this->curriculo->serializarTematica($tematica, $institucionId),
        ], 201);
    }

    public function mostrar(Tematica $tematica)
    {
        $institucionId = $this->institucionId();
        $this->asegurarTematicaVisible($tematica, $institucionId);

        return response()->json([
            'success' => true,
            'data' => $this->curriculo->serializarTematica(
                $this->curriculo->cargarTematica($tematica),
                $institucionId
            ),
        ]);
    }

    public function actualizar(Request $request, Tematica $tematica)
    {
        $institucionId = $this->institucionId();
        $this->asegurarTematicaGestionable($tematica, $institucionId);

        $datos = $this->validarTematica($request, $tematica->eje_id, $institucionId, $tematica->id);
        $tematica = $this->curriculo->actualizarTematica($tematica, $datos, $institucionId, $this->usuarioId());

        return response()->json([
            'success' => true,
            'message' => 'Temática actualizada correctamente.',
            'data' => $this->curriculo->serializarTematica($tematica, $institucionId),
        ]);
    }

    public function actualizarEstado(Tematica $tematica)
    {
        $institucionId = $this->institucionId();
        $this->asegurarTematicaGestionable($tematica, $institucionId);

        $tematica = $this->curriculo->toggleActivoTematica($tematica);

        return response()->json([
            'success' => true,
            'message' => $tematica->activo
                ? 'Temática activada correctamente.'
                : 'Temática desactivada correctamente.',
            'activo' => (bool) $tematica->activo,
        ]);
    }

    public function eliminar(Tematica $tematica)
    {
        $institucionId = $this->institucionId();
        $this->asegurarTematicaGestionable($tematica, $institucionId);

        $experienciasCount = (int) $tematica->experiencias()->count();

        if ($experienciasCount > 0) {
            return response()->json([
                'success' => false,
                'can_delete' => false,
                'puede_desactivar' => (bool) $tematica->activo,
                'experiencias_count' => $experienciasCount,
                'message' => 'No se puede eliminar: la temática tiene experiencias. Puede desactivarla para conservar el contenido.',
            ], 422);
        }

        $ejeId = $tematica->eje_id;
        $tematicaId = $tematica->id;
        $tematica->delete();

        return response()->json([
            'success' => true,
            'message' => 'Temática eliminada correctamente.',
            'data' => [
                'id' => $tematicaId,
                'eje_id' => $ejeId,
            ],
        ]);
    }

    private function validarTematica(Request $request, int $ejeId, int $institucionId, ?int $tematicaId = null): array
    {
        return $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:150',
                Rule::unique('tematicas', 'nombre')
                    ->where(fn ($q) => $q
                        ->where('eje_id', $ejeId)
                        ->where('institucion_id', $institucionId)
                        ->where('es_oficial', false))
                    ->ignore($tematicaId),
            ],
            'competencia' => ['nullable', 'string', 'max:100'],
            'referente_alternativo' => ['nullable', 'string', 'max:1000'],
            'requiere_ra' => ['sometimes', 'boolean'],
            'requiere_acompanamiento' => ['sometimes', 'boolean'],
            'indicadores' => ['required', 'array', 'min:1'],
            'indicadores.*.id' => ['nullable', 'integer'],
            'indicadores.*.descripcion' => ['required', 'string', 'max:300'],
            'indicadores.*.orden' => ['nullable', 'integer', 'min:1', 'max:255'],
            'dbas' => ['nullable', 'array'],
            'dbas.*.catalogo_dba_id' => ['required', 'integer', 'exists:catalogo_dba,id'],
            'dbas.*.relacion' => ['required', Rule::in(['principal', 'complementario'])],
            'dbas.*.observacion' => ['nullable', 'string', 'max:1000'],
        ], [
            'nombre.required' => 'El nombre de la temática es obligatorio.',
            'nombre.unique' => 'Ya existe una temática del colegio con ese nombre en este eje.',
            'indicadores.required' => 'Debe registrar al menos un indicador de logro.',
            'indicadores.min' => 'Debe registrar al menos un indicador de logro.',
            'indicadores.*.descripcion.required' => 'Cada indicador de logro es obligatorio.',
            'indicadores.*.descripcion.max' => 'Cada indicador de logro admite máximo 300 caracteres.',
        ]);
    }

    private function asegurarEjeVisible(Eje $eje, int $institucionId, bool $paraEscribir = false): void
    {
        $eje->loadMissing('modulo');

        if ($eje->esDeInstitucion($institucionId)) {
            if ($paraEscribir && ! $eje->activo) {
                abort(422, 'El eje no está activo.');
            }

            $this->asegurarAmbienteActivoContratado($eje->modulo->ambiente_id, $institucionId);

            return;
        }

        if (! $eje->esOficial() || ! $eje->activo) {
            abort(403, 'No puede gestionar temáticas de este eje.');
        }

        $this->asegurarAmbienteActivoContratado($eje->modulo->ambiente_id, $institucionId);
    }

    private function asegurarTematicaVisible(Tematica $tematica, int $institucionId): void
    {
        if ($tematica->esOficial() || $tematica->esDeInstitucion($institucionId)) {
            $tematica->loadMissing('eje.modulo');
            $this->asegurarEjeVisible($tematica->eje, $institucionId);

            return;
        }

        abort(403, 'No puede consultar esta temática.');
    }

    private function asegurarTematicaGestionable(Tematica $tematica, int $institucionId): void
    {
        if (! $tematica->puedeGestionarComoAdmin($institucionId)) {
            abort(403, 'Solo puede gestionar temáticas propias de su institución.');
        }

        $tematica->loadMissing('eje.modulo');
        $this->asegurarEjeVisible($tematica->eje, $institucionId, true);
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
