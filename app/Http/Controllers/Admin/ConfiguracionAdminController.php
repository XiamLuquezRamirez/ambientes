<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Departamento;
use App\Models\Eje;
use App\Models\Institucion;
use App\Models\Modulo;
use App\Models\Municipio;
use App\Services\InstitucionLogoService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class ConfiguracionAdminController extends Controller
{
    public function __construct(
        private InstitucionLogoService $logoService,
    ) {}

    public function listar()
    {
        $institucionId = $this->institucionId();
        $institucion = Institucion::with(['ambientesActivos' => fn ($q) => $q->orderBy('nombre')])
            ->findOrFail($institucionId);

        // Solo ambientes contratados y activos (misma fuente para Servidores y Módulos/Ejes).
        $ambientes = $institucion->ambientesActivos;
        $departamentos = Departamento::orderBy('descripcion')->get();

        $ambientesModulos = $ambientes->map(function ($ambiente) use ($institucionId) {
            $oficiales = Modulo::query()
                ->oficiales()
                ->where('activo', true)
                ->where('ambiente_id', $ambiente->id)
                ->whereHas(
                    'instituciones',
                    fn ($q) => $q->where('instituciones.id', $institucionId)
                )
                ->with([
                    'instituciones' => fn ($q) => $q->where('instituciones.id', $institucionId),
                ])
                ->withCount([
                    'temas as temas_activos_count' => fn ($q) => $q->where('activo', true),
                    'temas as temas_count',
                    'ejes as ejes_count',
                    'ejes as ejes_propios_count' => fn ($q) => $q->deInstitucion($institucionId),
                ])
                ->orderBy('orden')
                ->get()
                ->map(function (Modulo $modulo) {
                    $activoInstitucion = (bool) optional($modulo->instituciones->first())->pivot?->activo;

                    return [
                        'modelo' => $modulo,
                        'es_propio' => false,
                        'activo_institucion' => $activoInstitucion,
                        'puede_gestionar' => false,
                        'puede_gestionar_ejes' => $activoInstitucion,
                    ];
                });

            $propios = Modulo::query()
                ->deInstitucion($institucionId)
                ->where('ambiente_id', $ambiente->id)
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
                    'activo_institucion' => (bool) $modulo->activo,
                    'puede_gestionar' => true,
                    'puede_gestionar_ejes' => (bool) $modulo->activo,
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

        return view(
            'admin.configuracion.institucion.index',
            compact('ambientes', 'institucion', 'departamentos', 'ambientesModulos')
        );
    }

    /**
     * Adjunta ejes oficiales y del colegio a cada módulo del listado de configuración.
     */
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
                'temas as tematicas_activas_count' => fn ($q) => $q->where('activo', true),
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

    /**
     * Municipios de un departamento (coddep = codigo del departamento).
     */
    public function cargarMunicipios($departamento)
    {
        $municipios = Municipio::where('coddep', $departamento)
            ->orderBy('descripcion')
            ->get(['id', 'descripcion', 'coddep']);

        return response()->json($municipios);
    }

    /**
     * Actualiza solo datos básicos de la institución de la sesión.
     * Servidores no se modifican desde el panel admin.
     */
    public function actualizar(Request $request)
    {
        $institucion = Institucion::findOrFail($this->institucionId());

        $datos = $request->validate([
            'nombre' => 'required|string|max:255',
            'codigo_dane' => 'required|string|max:20|unique:instituciones,codigo_dane,'.$institucion->id,
            'departamento_id' => 'required|exists:departamentos,codigo',
            'municipio_id' => 'required|exists:municipios,id',
            'correo_contacto' => 'required|email|max:255',
        ], [
            'departamento_id.required' => 'Seleccione un departamento.',
            'departamento_id.exists' => 'El departamento seleccionado no es válido.',
            'municipio_id.required' => 'Seleccione un municipio.',
            'municipio_id.exists' => 'El municipio seleccionado no es válido.',
        ]);

        $departamento = Departamento::where('codigo', $datos['departamento_id'])->firstOrFail();
        $municipio = Municipio::where('id', $datos['municipio_id'])
            ->where('coddep', $departamento->codigo)
            ->first();

        if (! $municipio) {
            throw ValidationException::withMessages([
                'municipio_id' => ['El municipio no pertenece al departamento seleccionado.'],
            ]);
        }

        if (! filled($institucion->logo)) {
            throw ValidationException::withMessages([
                'logo' => ['El logo de la institución es obligatorio. Suba uno antes de guardar.'],
            ]);
        }

        $institucion->update([
            'nombre' => $datos['nombre'],
            'codigo_dane' => $datos['codigo_dane'],
            'departamento' => $departamento->descripcion,
            'municipio' => $municipio->descripcion,
            'correo_contacto' => $datos['correo_contacto'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Datos de la institución actualizados correctamente.',
        ]);
    }

    /**
     * Datos de la institución de la sesión (incluye ambientes y logo solo para lectura/visualización).
     */
    public function verDatosInstitucion($id)
    {
        $institucionId = $this->institucionId();

        if ((int) $id !== $institucionId) {
            abort(403, 'No autorizado.');
        }

        $institucion = Institucion::with(['ambientesActivos' => fn ($q) => $q->orderBy('nombre')])
            ->findOrFail($institucionId);

        $ambientes = $institucion->ambientesActivos->map(function ($ambiente) {
            return [
                'id' => $ambiente->id,
                'nombre' => $ambiente->nombre,
                'ip' => $ambiente->pivot->ip,
                'puerto' => $ambiente->pivot->puerto,
                'activo' => true,
            ];
        })->values();

        [$departamentoId, $municipioId] = $this->resolverIdsUbicacion(
            $institucion->departamento,
            $institucion->municipio
        );

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $institucion->id,
                'nombre' => $institucion->nombre,
                'codigo_dane' => $institucion->codigo_dane,
                'municipio' => $institucion->municipio,
                'departamento' => $institucion->departamento,
                'departamento_id' => $departamentoId,
                'municipio_id' => $municipioId,
                'correo_contacto' => $institucion->correo_contacto,
                'activo' => (bool) $institucion->activo,
                'logo' => $institucion->logo,
                'logo_url_publica' => $this->logoService->urlPublica($institucion->logo),
                'iniciales' => $this->logoService->iniciales($institucion),
                'ambientes' => $ambientes,
            ],
        ]);
    }

    /**
     * Sube o reemplaza el logo de la institución de la sesión.
     */
    public function subirLogo(Request $request)
    {
        $institucion = Institucion::findOrFail($this->institucionId());

        $request->validate([
            'logo' => 'required|file|mimes:jpeg,jpg,png|max:'.InstitucionLogoService::MAX_KILOBYTES,
        ]);

        try {
            $resultado = $this->logoService->guardar($institucion, $request->file('logo'));
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Logo actualizado correctamente.',
            'logo_url_publica' => $resultado['logo_url_publica'],
            'iniciales' => $resultado['iniciales'],
        ]);
    }

    /**
     * Resuelve descripciones guardadas → codigo departamento / id municipio.
     */
    private function resolverIdsUbicacion(?string $departamentoNombre, ?string $municipioNombre): array
    {
        if (! filled($departamentoNombre)) {
            return [null, null];
        }

        $departamento = Departamento::where('descripcion', $departamentoNombre)->first();
        if (! $departamento) {
            return [null, null];
        }

        $municipioId = null;
        if (filled($municipioNombre)) {
            $municipioId = Municipio::where('descripcion', $municipioNombre)
                ->where('coddep', $departamento->codigo)
                ->value('id');
        }

        return [$departamento->codigo, $municipioId];
    }

    private function institucionId(): int
    {
        $id = session('institucion_id');

        if (! $id) {
            abort(403, 'No hay institución en sesión.');
        }

        return (int) $id;
    }
}
