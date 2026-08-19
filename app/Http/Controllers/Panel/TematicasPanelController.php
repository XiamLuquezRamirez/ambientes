<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\CatalogoDBA;
use App\Models\Eje;
use App\Models\Institucion;
use App\Models\Tematica;
use App\Services\TematicaCurriculoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TematicasPanelController extends Controller
{
    public function __construct(
        private TematicaCurriculoService $curriculo,
    ) {}

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

    public function listar(Request $request)
    {
        $institucionId = $this->institucionId();
        $filtros = $this->curriculo->filtrosDesdeRequest($request);
        $filtros['ambiente_ids'] = $this->ambienteIdsAsignados();
        $perPage = max(1, min(48, (int) $request->input('per_page', 12)));

        $pagina = $this->curriculo
            ->consultaTematicas($institucionId, $filtros)
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => [
                'tematicas' => $this->curriculo->serializarColeccionTematicas(
                    collect($pagina->items()),
                    $institucionId,
                    ['solo_creador_id' => $this->usuarioId()]
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
                'tematicas' => $this->curriculo->serializarColeccionTematicas(
                    $tematicas,
                    $institucionId,
                    ['solo_creador_id' => $this->usuarioId()]
                ),
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
            'data' => $this->curriculo->serializarTematica(
                $tematica,
                $institucionId,
                ['solo_creador_id' => $this->usuarioId()]
            ),
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
                $institucionId,
                ['solo_creador_id' => $this->usuarioId()]
            ),
        ]);
    }

    public function actualizar(Request $request, Tematica $tematica)
    {
        $institucionId = $this->institucionId();
        $this->asegurarTematicaGestionable($tematica, $institucionId);

        $datos = $this->validarTematica($request, $tematica->eje_id, $institucionId, $tematica->id);
        $tematica = $this->curriculo->actualizarTematica(
            $tematica,
            $datos,
            $institucionId,
            $this->usuarioId()
        );

        return response()->json([
            'success' => true,
            'message' => 'Temática actualizada correctamente.',
            'data' => $this->curriculo->serializarTematica(
                $tematica,
                $institucionId,
                ['solo_creador_id' => $this->usuarioId()]
            ),
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
            'indicadores' => ['nullable', 'array'],
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
            'indicadores.*.descripcion.required' => 'La descripción del indicador es obligatoria.',
            'indicadores.*.descripcion.max' => 'Cada indicador de logro admite máximo 300 caracteres.',
        ]);
    }

    private function asegurarEjeVisible(Eje $eje, int $institucionId, bool $paraEscribir = false): void
    {
        $eje->loadMissing('modulo');
        $this->asegurarAmbienteAsignadoAlDocente($eje->modulo->ambiente_id, $institucionId);

        if ($eje->esDeInstitucion($institucionId)) {
            if ($paraEscribir && ! $eje->activo) {
                abort(422, 'El eje no está activo.');
            }

            return;
        }

        if (! $eje->esOficial() || ! $eje->activo) {
            abort(403, 'No puede gestionar temáticas de este eje.');
        }
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
        if (! $tematica->puedeGestionarComoDocente($institucionId, $this->usuarioId())) {
            abort(403, 'Solo puede gestionar las temáticas que usted creó.');
        }

        $tematica->loadMissing('eje.modulo');
        $this->asegurarEjeVisible($tematica->eje, $institucionId, true);
    }

    private function asegurarAmbienteAsignadoAlDocente(int $ambienteId, int $institucionId): void
    {
        $this->asegurarAmbienteActivoContratado($ambienteId, $institucionId);

        $docenteId = Auth::guard('docente')->user()?->docente?->id;
        abort_unless($docenteId, 403, 'No se encontró el perfil docente.');

        $asignado = DB::table('carga_docente')
            ->where('docente_id', $docenteId)
            ->where('ambiente_id', $ambienteId)
            ->where('activo', true)
            ->where('anio_lectivo', date('Y'))
            ->exists();

        if (! $asignado) {
            abort(403, 'No tiene asignación activa en este ambiente.');
        }
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

    private function ambienteIdsAsignados(): array
    {
        $docente = Auth::guard('docente')->user()?->docente;
        abort_unless($docente, 403, 'No se encontró el perfil docente.');

        return $docente->cargasActivas()
            ->pluck('ambiente_id')
            ->unique()
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    private function institucionId(): int
    {
        $institucionId = session('institucion_id') ?: Auth::guard('docente')->user()?->institucion_id;
        abort_unless($institucionId, 403, 'No se pudo determinar la institución.');

        return (int) $institucionId;
    }

    private function usuarioId(): int
    {
        $id = Auth::guard('docente')->id();
        abort_unless($id, 403, 'No hay un usuario autenticado.');

        return (int) $id;
    }
}
