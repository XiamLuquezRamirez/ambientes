<?php

namespace App\Services;

use App\Models\Ambiente;
use App\Models\Eje;
use App\Models\Juego;
use App\Models\Modulo;
use App\Models\Tematica;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class JuegoCatalogoService
{
    /**
     * @return array<string, mixed>
     */
    public function opcionesFiltro(): array
    {
        return [
            'ambientes' => Ambiente::query()->orderBy('nombre')->get(['id', 'nombre']),
            'modulos' => Modulo::query()->oficiales()->orderBy('nombre')->get(['id', 'nombre', 'ambiente_id']),
            'ejes' => Eje::query()->oficiales()->orderBy('nombre')->get(['id', 'nombre', 'modulo_id']),
            'tematicas' => Tematica::query()->oficiales()->orderBy('nombre')->get(['id', 'nombre', 'eje_id']),
            'tiposJuego' => Juego::TIPOS_LABELS,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function listarDesdeRequest(Request $request, bool $soloActivos = false): array
    {
        $consulta = $this->consultaFiltrada($request, $soloActivos);
        $paraStats = (clone $consulta)->get();

        $total = $paraStats->count();
        $activos = $paraStats->where('activo', true)->count();

        $estadisticas = [
            'total' => $total,
            'activos' => $activos,
            'activos_pct' => $total > 0 ? round(($activos / $total) * 100, 1) : 0,
            'inactivos' => $total - $activos,
            'modulos' => $paraStats
                ->map(fn (Juego $j) => $j->cadenaCurricularResuelta()['modulo_id'])
                ->filter()
                ->unique()
                ->count(),
        ];

        $perPage = max(1, min(48, (int) $request->input('per_page', 12)));

        /** @var LengthAwarePaginator $juegos */
        $juegos = $consulta
            ->orderBy('orden')
            ->orderBy('id')
            ->paginate($perPage)
            ->withQueryString();

        $filtros = $request->only(['q', 'ambiente_id', 'modulo_id', 'eje_id', 'tematica_id', 'tipo', 'estado']);

        return array_merge($this->opcionesFiltro(), [
            'juegos' => $juegos,
            'estadisticas' => $estadisticas,
            'filtros' => $filtros,
            'vista' => $request->get('vista', 'grid'),
            'texto_busqueda' => $request->get('q', ''),
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function serializarColeccionJson(Collection $juegos): array
    {
        return $juegos
            ->map(fn (Juego $juego) => $this->serializarTarjeta($juego))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function serializarTarjeta(Juego $juego): array
    {
        $cadena = $juego->cadenaCurricularResuelta();

        return [
            'id' => $juego->id,
            'tipo' => $juego->tipo,
            'tipo_label' => Juego::TIPOS_LABELS[$juego->tipo] ?? $juego->tipo,
            'nombre' => $juego->nombre,
            'descripcion' => $juego->descripcion ?? '',
            'icono' => $juego->icono ?: 'fa-gamepad',
            'color' => $juego->color ?: '#2563eb',
            'orden' => $juego->orden,
            'activo' => (bool) $juego->activo,
            'cadena' => $cadena,
        ];
    }

    public function consultaFiltrada(Request $request, bool $soloActivos = false): Builder
    {
        $consulta = Juego::query()->with([
            'ambiente:id,nombre',
            'modulo:id,nombre,ambiente_id',
            'modulo.ambiente:id,nombre',
            'eje:id,nombre,modulo_id',
            'eje.modulo:id,nombre,ambiente_id',
            'eje.modulo.ambiente:id,nombre',
            'tematica:id,nombre,eje_id',
            'tematica.eje:id,nombre,modulo_id',
            'tematica.eje.modulo:id,nombre,ambiente_id',
            'tematica.eje.modulo.ambiente:id,nombre',
        ]);

        if ($soloActivos) {
            $consulta->activos();
        }

        if ($request->filled('q')) {
            $texto = '%'.trim((string) $request->q).'%';
            $consulta->where(function ($q) use ($texto) {
                $q->where('nombre', 'like', $texto)
                    ->orWhere('descripcion', 'like', $texto);
            });
        }

        if ($request->filled('tipo')) {
            $consulta->where('tipo', (string) $request->tipo);
        }

        if ($request->has('estado') && $request->input('estado') !== null && $request->input('estado') !== '') {
            $consulta->where('activo', (int) $request->input('estado') === 1);
        }

        if ($request->filled('ambiente_id')) {
            $this->aplicarFiltroAmbiente($consulta, (int) $request->ambiente_id);
        }

        if ($request->filled('modulo_id')) {
            $this->aplicarFiltroModulo($consulta, (int) $request->modulo_id);
        }

        if ($request->filled('eje_id')) {
            $this->aplicarFiltroEje($consulta, (int) $request->eje_id);
        }

        if ($request->filled('tematica_id')) {
            $this->aplicarFiltroTematica($consulta, (int) $request->tematica_id);
        }

        return $consulta;
    }

    private function aplicarFiltroAmbiente(Builder $consulta, int $ambienteId): void
    {
        $consulta->where(function ($q) use ($ambienteId) {
            $q->where('ambiente_id', $ambienteId)
                ->orWhereHas('modulo', fn ($m) => $m->where('ambiente_id', $ambienteId))
                ->orWhereHas('eje.modulo', fn ($m) => $m->where('ambiente_id', $ambienteId))
                ->orWhereHas('tematica.eje.modulo', fn ($m) => $m->where('ambiente_id', $ambienteId));
        });
    }

    private function aplicarFiltroModulo(Builder $consulta, int $moduloId): void
    {
        $consulta->where(function ($q) use ($moduloId) {
            $q->where('modulo_id', $moduloId)
                ->orWhereHas('eje', fn ($e) => $e->where('modulo_id', $moduloId))
                ->orWhereHas('tematica.eje', fn ($e) => $e->where('modulo_id', $moduloId));
        });
    }

    private function aplicarFiltroEje(Builder $consulta, int $ejeId): void
    {
        $consulta->where(function ($q) use ($ejeId) {
            $q->where('eje_id', $ejeId)
                ->orWhereHas('tematica', fn ($t) => $t->where('eje_id', $ejeId));
        });
    }

    private function aplicarFiltroTematica(Builder $consulta, int $tematicaId): void
    {
        $consulta->where('tematica_id', $tematicaId);
    }
}
