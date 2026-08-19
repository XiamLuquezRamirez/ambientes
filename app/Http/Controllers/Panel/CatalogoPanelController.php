<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Area;
use App\Models\CatalogoDBA;
use App\Models\Eje;
use App\Models\Grado;
use App\Models\Modulo;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class CatalogoPanelController extends Controller
{
    /**
     * Catálogo DBA solo lectura para docentes.
     * MEN activos (global) + personalizados activos del colegio.
     */
    public function index(Request $request)
    {
        $institucionId = $this->institucionId();

        $consultaMen = CatalogoDBA::query()
            ->with(['area:id,nombre', 'grado:id,nombre'])
            ->whereNull('institucion_id')
            ->where('es_men', true)
            ->where('estado', true)
            ->orderBy('codigo');
        $this->aplicarFiltros($consultaMen, $request);
        $catalogosMen = $consultaMen->paginate(10, ['*'], 'page_men')->withQueryString();

        $consultaColegio = CatalogoDBA::query()
            ->with(['area:id,nombre', 'grado:id,nombre'])
            ->where('institucion_id', $institucionId)
            ->where('es_men', false)
            ->where('estado', true)
            ->orderBy('codigo');
        $this->aplicarFiltros($consultaColegio, $request);
        $catalogosColegio = $consultaColegio->paginate(10, ['*'], 'page_colegio')->withQueryString();

        $areas = Area::where('estado', true)->orderBy('nombre')->get(['id', 'nombre']);
        $grados = Grado::activos()->get(['id', 'nombre']);

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('panel.catalogo.dba._contenido', compact('catalogosMen', 'catalogosColegio'))->render(),
            ]);
        }

        return view('panel.catalogo.dba.index', compact('catalogosMen', 'catalogosColegio', 'areas', 'grados'));
    }

    /**
     * Catálogo · Módulos (solo lectura de los ambientes asignados).
     */
    public function modulos()
    {
        $datos = $this->datosCurriculoAsignado();

        return view('panel.catalogo.modulos.index', $datos);
    }

    /**
     * Catálogo · Ejes propios y oficiales.
     */
    public function ejes()
    {
        $datos = $this->datosCurriculoAsignado();

        return view('panel.catalogo.ejes.index', $datos);
    }

    /**
     * Catálogo · Temáticas.
     */
    public function tematicas()
    {
        $datos = $this->datosCurriculoAsignado();

        return view('panel.catalogo.tematicas.index', $datos);
    }

    /**
     * Catálogo · Experiencias.
     */
    public function experiencias()
    {
        $datos = $this->datosCurriculoAsignado();

        return view('panel.catalogo.experiencias.index', $datos);
    }

    /**
     * @return array{ambientesModulos: Collection, docenteId: int, areas: Collection, grados: Collection}
     */
    private function datosCurriculoAsignado(): array
    {
        $institucionId = $this->institucionId();
        $docente = Auth::guard('docente')->user()?->docente;

        if (! $docente) {
            abort(403, 'No se encontró el perfil docente.');
        }

        $docenteId = (int) $docente->id;
        $areas = Area::where('estado', true)->orderBy('nombre')->get(['id', 'nombre']);
        $grados = Grado::activos()->get(['id', 'nombre']);

        $ambienteIdsAsignados = $docente->cargasActivas()
            ->pluck('ambiente_id')
            ->unique()
            ->filter()
            ->values();

        if ($ambienteIdsAsignados->isEmpty()) {
            return [
                'ambientesModulos' => collect(),
                'docenteId' => $docenteId,
                'areas' => $areas,
                'grados' => $grados,
            ];
        }

        $ambientes = Ambiente::query()
            ->whereIn('id', $ambienteIdsAsignados)
            ->whereHas(
                'instituciones',
                fn ($q) => $q
                    ->where('instituciones.id', $institucionId)
                    ->where('ambiente_institucion.activo', true)
            )
            ->orderBy('nombre')
            ->get();

        $ambientesModulos = $ambientes->map(function (Ambiente $ambiente) use ($institucionId) {
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
                ->withCount([
                    'temas as temas_activos_count' => fn ($q) => $q->where('activo', true),
                    'temas as temas_count',
                    'ejes as ejes_count',
                    'ejes as ejes_propios_count' => fn ($q) => $q->deInstitucion($institucionId),
                ])
                ->orderBy('orden')
                ->get()
                ->map(fn (Modulo $modulo) => [
                    'modelo' => $modulo,
                    'es_propio' => false,
                    'activo_institucion' => true,
                    'puede_gestionar' => false,
                    'puede_gestionar_ejes' => true,
                ]);

            $propios = Modulo::query()
                ->deInstitucion($institucionId)
                ->where('ambiente_id', $ambiente->id)
                ->where('activo', true)
                ->withCount([
                    'temas as temas_activos_count' => fn ($q) => $q->where('activo', true),
                    'temas as temas_count',
                    'ejes as ejes_count',
                    'ejes as ejes_propios_count' => fn ($q) => $q->deInstitucion($institucionId),
                ])
                ->orderBy('orden')
                ->get()
                ->map(fn (Modulo $modulo) => [
                    'modelo' => $modulo,
                    'es_propio' => true,
                    'activo_institucion' => true,
                    'puede_gestionar' => false,
                    'puede_gestionar_ejes' => true,
                ]);

            $ambiente->setRelation(
                'modulosInstitucion',
                $oficiales->concat($propios)->sortBy(fn ($item) => $item['modelo']->orden)->values()
            );
            $ambiente->modulos_total_count = $ambiente->modulosInstitucion->count();
            $ambiente->modulos_activos_count = $ambiente->modulosInstitucion
                ->filter(fn ($item) => $item['puede_gestionar_ejes'])
                ->count();
            $ambiente->ambiente_activo = true;

            return $ambiente;
        });

        $this->adjuntarEjesAModulos($ambientesModulos, $institucionId);

        return [
            'ambientesModulos' => $ambientesModulos,
            'docenteId' => $docenteId,
            'areas' => $areas,
            'grados' => $grados,
        ];
    }

    /**
     * Detalle de lectura: solo DBA activos (MEN global o del colegio del docente).
     */
    public function detalle(string $id)
    {
        $institucionId = $this->institucionId();

        $catalogo = CatalogoDBA::with(['area:id,nombre', 'grado:id,nombre'])
            ->where('estado', true)
            ->where(function ($q) use ($institucionId) {
                $q->where(function ($men) {
                    $men->whereNull('institucion_id')->where('es_men', true);
                })->orWhere(function ($colegio) use ($institucionId) {
                    $colegio->where('institucion_id', $institucionId)->where('es_men', false);
                });
            })
            ->findOrFail($id);

        $esMen = (bool) $catalogo->es_men && $catalogo->institucion_id === null;

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $catalogo->id,
                'codigo' => $catalogo->codigo,
                'descripcion' => $catalogo->descripcion,
                'area' => $catalogo->area?->nombre ?? '—',
                'grado' => $catalogo->grado?->nombre ?? '—',
                'origen' => $esMen ? 'MEN' : 'Del colegio',
                'es_men' => $esMen,
            ],
        ]);
    }

    private function adjuntarEjesAModulos(Collection $ambientesModulos, int $institucionId): void
    {
        $moduloIds = $ambientesModulos
            ->flatMap(fn ($ambiente) => $ambiente->modulosInstitucion->pluck('modelo.id'))
            ->unique()
            ->values();

        if ($moduloIds->isEmpty()) {
            foreach ($ambientesModulos as $ambiente) {
                $ambiente->ejes_total_count = 0;
                $ambiente->ejes_activos_count = 0;
            }

            return;
        }

        $ejesPorModulo = Eje::query()
            ->whereIn('modulo_id', $moduloIds)
            ->where(function ($q) use ($institucionId) {
                $q->where(fn ($oficial) => $oficial->oficiales())
                    ->orWhere(fn ($propio) => $propio->deInstitucion($institucionId));
            })
            ->withCount([
                'tematicas as tematicas_activas_count' => fn ($q) => $q->where('activo', true),
                'temas as temas_count',
            ])
            ->orderBy('orden')
            ->get()
            ->groupBy('modulo_id');

        foreach ($ambientesModulos as $ambiente) {
            $items = $ambiente->modulosInstitucion->map(function (array $item) use ($ejesPorModulo, $institucionId) {
                $modulo = $item['modelo'];
                $ejes = ($ejesPorModulo->get($modulo->id) ?? collect())->values();

                $oficiales = $ejes->filter(fn (Eje $eje) => $eje->esOficial())->values();
                $propios = $ejes->filter(fn (Eje $eje) => $eje->esDeInstitucion($institucionId))->values();

                $item['ejes_oficiales'] = $oficiales;
                $item['ejes_propios'] = $propios;
                $item['ejes_total_count'] = $oficiales->count() + $propios->count();
                $item['ejes_activos_count'] = $oficiales->where('activo', true)->count()
                    + $propios->where('activo', true)->count();

                return $item;
            })->values();

            $ambiente->setRelation('modulosInstitucion', $items);
            $ambiente->ejes_total_count = $items->sum('ejes_total_count');
            $ambiente->ejes_activos_count = $items->sum('ejes_activos_count');
        }
    }

    private function aplicarFiltros($consulta, Request $request): void
    {
        if ($request->filled('buscar')) {
            $termino = trim($request->buscar);
            $consulta->where(function ($q) use ($termino) {
                $q->where('codigo', 'like', "%{$termino}%")
                    ->orWhere('descripcion', 'like', "%{$termino}%");
            });
        }

        if ($request->filled('area_id')) {
            $consulta->where('area_id', $request->area_id);
        }

        if ($request->filled('grado_id')) {
            $consulta->where('grado_id', $request->grado_id);
        }
    }

    private function institucionId(): int
    {
        $id = session('institucion_id') ?: Auth::guard('docente')->user()?->institucion_id;

        abort_unless($id, 403, 'No hay institución en sesión.');

        return (int) $id;
    }
}
