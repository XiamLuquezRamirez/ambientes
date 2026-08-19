<?php

namespace App\Services;

use App\Models\Eje;
use App\Models\Institucion;
use App\Models\Modulo;
use Illuminate\Support\Collection;

class CatalogoInstitucionAdminService
{
    /**
     * Ambientes contratados con módulos oficiales y propios de la institución.
     */
    public function ambientesConModulos(int $institucionId): Collection
    {
        $institucion = Institucion::with(['ambientesActivos' => fn ($q) => $q->orderBy('nombre')])
            ->findOrFail($institucionId);

        return $institucion->ambientesActivos->map(function ($ambiente) use ($institucionId) {
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
    }

    /**
     * Ambientes con módulos y ejes (oficiales + propios) para la vista de ejes.
     */
    public function ambientesConModulosYEjes(int $institucionId): Collection
    {
        $ambientes = $this->ambientesConModulos($institucionId);
        $this->adjuntarEjesAModulos($ambientes, $institucionId);

        return $ambientes;
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
}
