<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Area;
use App\Models\CatalogoDBA;
use App\Models\Eje;
use App\Models\Grado;
use App\Models\Tematica;
use App\Services\TematicaCurriculoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class TematicasSuperAdminController extends Controller
{
    public function __construct(
        private TematicaCurriculoService $curriculo,
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

        $areas = Area::where('estado', true)->orderBy('nombre')->get(['id', 'nombre']);
        $grados = Grado::activos()->get(['id', 'nombre']);

        return view('superAdmin.catalogo.tematicas.index', compact('ambientes', 'areas', 'grados'));
    }

    public function listar(Request $request)
    {
        $filtros = $this->curriculo->filtrosDesdeRequest($request);
        $filtros['alcance'] = 'todas';
        $perPage = max(1, min(48, (int) $request->input('per_page', 12)));

        $pagina = $this->curriculo
            ->consultaTematicas(null, $filtros)
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => [
                'tematicas' => $this->curriculo->serializarColeccionTematicas(
                    collect($pagina->items()),
                    null,
                    $this->opcionesSerializarTematica()
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
        $consulta = CatalogoDBA::query()
            ->with(['area:id,nombre', 'grado:id,nombre'])
            ->where('estado', true)
            ->whereNull('institucion_id')
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
        $this->asegurarEjeOficial($eje);

        $tematicas = $this->curriculo
            ->consultaTematicas(null, ['eje_id' => $eje->id, 'alcance' => 'todas'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'eje' => [
                    'id' => $eje->id,
                    'nombre' => $eje->nombre,
                    'modulo_id' => $eje->modulo_id,
                ],
                'tematicas' => $this->curriculo->serializarColeccionTematicas(
                    $tematicas,
                    null,
                    $this->opcionesSerializarTematica()
                ),
            ],
        ]);
    }

    public function guardar(Request $request, Eje $eje)
    {
        $this->asegurarEjeOficial($eje, true);

        $datos = $this->validarTematica($request, $eje->id);
        $tematica = $this->curriculo->crearTematica(
            $eje,
            $datos,
            $this->usuarioId(),
            true
        );

        return response()->json([
            'success' => true,
            'message' => 'Temática creada correctamente.',
            'data' => $this->curriculo->serializarTematica(
                $tematica,
                null,
                $this->opcionesSerializarTematica()
            ),
        ], 201);
    }

    public function mostrar(Tematica $tematica)
    {
        return response()->json([
            'success' => true,
            'data' => $this->curriculo->serializarTematica(
                $this->curriculo->cargarTematica($tematica),
                null,
                $this->opcionesSerializarTematica()
            ),
        ]);
    }

    public function actualizar(Request $request, Tematica $tematica)
    {
        $this->asegurarTematicaGestionable($tematica);

        $datos = $this->validarTematica($request, $tematica->eje_id, $tematica->id);
        $tematica = $this->curriculo->actualizarTematica($tematica, $datos, null, $this->usuarioId());

        return response()->json([
            'success' => true,
            'message' => 'Temática actualizada correctamente.',
            'data' => $this->curriculo->serializarTematica(
                $tematica,
                null,
                $this->opcionesSerializarTematica()
            ),
        ]);
    }

    public function actualizarEstado(Tematica $tematica)
    {
        $this->asegurarTematicaGestionable($tematica);

        $tematica = $this->curriculo->toggleActivoTematica($tematica);

        return response()->json([
            'success' => true,
            'message' => $tematica->activo
                ? 'Temática activada correctamente.'
                : 'Temática desactivada correctamente.',
            'activo' => (bool) $tematica->activo,
        ]);
    }

    private function validarTematica(Request $request, int $ejeId, ?int $tematicaId = null): array
    {
        return $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:150',
                Rule::unique('tematicas', 'nombre')
                    ->where(fn ($q) => $q
                        ->where('eje_id', $ejeId)
                        ->whereNull('institucion_id')
                        ->where('es_oficial', true))
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
            'nombre.unique' => 'Ya existe una temática oficial con ese nombre en este eje.',
            'indicadores.*.descripcion.required' => 'La descripción del indicador es obligatoria.',
            'indicadores.*.descripcion.max' => 'Cada indicador de logro admite máximo 300 caracteres.',
        ]);
    }

    private function asegurarEjeOficial(Eje $eje, bool $paraEscribir = false): void
    {
        if (! $eje->esOficial()) {
            abort(403, 'Solo se pueden gestionar temáticas de ejes oficiales desde esta vista.');
        }

        if ($paraEscribir && ! $eje->activo) {
            abort(422, 'El eje no está activo.');
        }
    }

    private function asegurarTematicaOficial(Tematica $tematica, bool $paraEscribir = false): void
    {
        if (! $tematica->esOficial()) {
            abort(403, 'Solo se pueden crear o editar temáticas oficiales desde esta vista.');
        }

        if ($paraEscribir) {
            $tematica->loadMissing('eje');
            $this->asegurarEjeOficial($tematica->eje, true);
        }
    }

    private function asegurarTematicaGestionable(Tematica $tematica): void
    {
        $this->asegurarTematicaOficial($tematica, true);

        if (! $tematica->puedeGestionarComoSuperAdmin($this->usuarioId())) {
            abort(403, 'Solo puede gestionar las temáticas oficiales que usted creó.');
        }
    }

    private function opcionesSerializarTematica(): array
    {
        return ['solo_creador_id' => $this->usuarioId()];
    }

    private function usuarioId(): int
    {
        $id = Auth::guard('docente')->id();
        abort_unless($id, 403, 'No hay un usuario autenticado.');

        return (int) $id;
    }
}
