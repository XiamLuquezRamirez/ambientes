<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ManejaTematicasInstitucion;
use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Eje;
use App\Models\Grado;
use App\Models\Institucion;
use App\Models\Modulo;
use App\Models\Tematica;
use App\Services\TematicaCurriculoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TematicasAdminController extends Controller
{
    use ManejaTematicasInstitucion;

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

    private function asegurarTematicaGestionable(Tematica $tematica, int $institucionId): void
    {
        if (! $tematica->puedeGestionarComoAdmin($institucionId)) {
            abort(403, 'Solo puede gestionar temáticas propias de su institución.');
        }

        $tematica->loadMissing('eje.modulo');
        $this->asegurarEjeVisible($tematica->eje, $institucionId, true);
    }

    private function institucionId(): int
    {
        $institucionId = session('institucion_id') ?: Auth::guard('docente')->user()?->institucion_id;
        abort_unless($institucionId, 403, 'No se pudo determinar la institución del administrador.');

        return (int) $institucionId;
    }
}
