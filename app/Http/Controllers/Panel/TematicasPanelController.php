<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Concerns\ManejaTematicasInstitucion;
use App\Http\Controllers\Controller;
use App\Models\Eje;
use App\Models\Tematica;
use App\Services\TematicaCurriculoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TematicasPanelController extends Controller
{
    use ManejaTematicasInstitucion;

    public function __construct(
        private TematicaCurriculoService $curriculo,
    ) {}

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
}
