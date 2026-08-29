<?php

namespace App\Services;

use App\Models\Ambiente;
use App\Models\CargaDocente;
use App\Models\Clase;
use App\Models\Estudiante;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

/**
 * Clase programada del día para el kiosco (lista + recorrido acotado).
 */
class ClaseKioscoService
{
    public const MOTIVO_SIN_CLASE = 'sin_clase';

    public const MOTIVO_CONFLICTO = 'conflicto';

    public const MOTIVO_INCOMPLETA = 'incompleta';

    public function __construct(
        private AccesoAmbienteService $accesoAmbiente,
    ) {}

    public function anioLectivo(): int
    {
        return $this->accesoAmbiente->anioLectivo();
    }

    /**
     * Exactamente una clase activa con fecha = hoy para el ambiente.
     * Si hay 0 o más de 1, retorna null.
     */
    public function clasesActivasHoy(Ambiente $ambiente, ?string $fecha = null): Collection
    {
        $fecha = $fecha ?? date('Y-m-d');

        return Clase::query()
            ->with(['cargaDocente.grado', 'cargaDocente.grupo'])
            ->where('ambiente_id', $ambiente->id)
            ->where('anio_lectivo', $this->anioLectivo())
            ->where('estado', Clase::ESTADO_ACTIVA)
            ->whereDate('fecha', $fecha)
            ->orderBy('id')
            ->get();
    }

    public function claseActivaHoy(Ambiente $ambiente, ?string $fecha = null): ?Clase
    {
        $clases = $this->clasesActivasHoy($ambiente, $fecha);

        if ($clases->count() === 1) {
            return $clases->first();
        }

        if ($clases->count() > 1) {
            Log::warning('Kiosco: más de una clase activa el mismo día', [
                'ambiente_id' => $ambiente->id,
                'fecha' => $fecha ?? date('Y-m-d'),
                'clase_ids' => $clases->pluck('id')->all(),
            ]);
        }

        return null;
    }

    /**
     * Resuelve la clase del kiosco y el motivo si no puede usarse.
     *
     * @return array{clase: ?Clase, motivo: ?string}
     */
    public function resolverClaseKiosco(Ambiente $ambiente, ?string $fecha = null): array
    {
        $clases = $this->clasesActivasHoy($ambiente, $fecha);

        if ($clases->isEmpty()) {
            return ['clase' => null, 'motivo' => self::MOTIVO_SIN_CLASE];
        }

        if ($clases->count() > 1) {
            return ['clase' => null, 'motivo' => self::MOTIVO_CONFLICTO];
        }

        $clase = $clases->first();

        if (! $this->claseValidaParaRecorrido($clase)) {
            return ['clase' => null, 'motivo' => self::MOTIVO_INCOMPLETA];
        }

        return ['clase' => $clase, 'motivo' => null];
    }

    /**
     * La clase activa debe tener toda la cadena curricular y una sola experiencia.
     */
    public function claseValidaParaRecorrido(Clase $clase): bool
    {
        return $this->motivoClaseInvalida($clase) === null;
    }

    public function motivoClaseInvalida(Clase $clase): ?string
    {
        $clase->loadMissing('experienciasClase');

        if ($clase->experienciasClase->isEmpty()) {
            return 'La clase no tiene experiencias asociadas.';
        }

        foreach ($clase->experienciasClase as $item) {
            if (! $item->modulo_id || ! $item->eje_id || ! $item->tematica_id || ! $item->experiencia_id) {
                return 'Hay una experiencia con cadena curricular incompleta en la clase activa.';
            }
        }

        if ($clase->estado !== Clase::ESTADO_ACTIVA || ! $clase->fecha) {
            return 'La clase no está activa o no tiene fecha.';
        }

        return null;
    }

    public function obtenerClaseSesion(?int $claseId): ?Clase
    {
        if (! $claseId) {
            return null;
        }

        return Clase::query()
            ->with(['cargaDocente', 'experienciasClase.experiencia', 'experienciasClase.modulo', 'experienciasClase.eje', 'experienciasClase.tematica'])
            ->find($claseId);
    }

    /**
     * Estudiantes de la carga de la clase ∩ filtros kiosco.
     *
     * @return Collection<int, Estudiante>
     */
    public function estudiantesDeClase(Clase $clase): Collection
    {
        $clase->loadMissing('cargaDocente');
        $carga = $clase->cargaDocente;

        if (! $carga) {
            return collect();
        }

        $ids = CargaDocente::obtenerIdsEstudiantesDeCargas([$carga], $this->anioLectivo());

        if ($ids->isEmpty()) {
            return collect();
        }

        $ambiente = $clase->ambiente ?? Ambiente::query()->find($clase->ambiente_id);

        if (! $ambiente) {
            return collect();
        }

        return $this->accesoAmbiente->queryEstudiantesKiosco($ambiente)
            ->whereIn('estudiantes.id', $ids)
            ->with('configuracionPin')
            ->orderBy('nombre')
            ->get();
    }

    public function estudiantePerteneceAClase(Clase $clase, int $estudianteId): bool
    {
        return $this->estudiantesDeClase($clase)->contains('id', $estudianteId);
    }

    public function obtenerParaKioscoDeClase(Clase $clase, int $estudianteId): ?Estudiante
    {
        return $this->estudiantesDeClase($clase)->firstWhere('id', $estudianteId);
    }

    /**
     * Pasa a borrador otras clases activas del mismo ambiente + fecha.
     */
    public function asegurarUnicaActiva(Clase $clase): void
    {
        if ($clase->estado !== Clase::ESTADO_ACTIVA || ! $clase->fecha) {
            return;
        }

        Clase::query()
            ->where('ambiente_id', $clase->ambiente_id)
            ->whereDate('fecha', $clase->fecha->format('Y-m-d'))
            ->where('estado', Clase::ESTADO_ACTIVA)
            ->where('id', '!=', $clase->id)
            ->update(['estado' => Clase::ESTADO_BORRADOR]);
    }

    /**
     * Antes de crear/activar: demota otras activas del ambiente+fecha.
     */
    public function demotarOtrasActivas(int $ambienteId, string $fecha, ?int $exceptoClaseId = null): void
    {
        $q = Clase::query()
            ->where('ambiente_id', $ambienteId)
            ->whereDate('fecha', $fecha)
            ->where('estado', Clase::ESTADO_ACTIVA);

        if ($exceptoClaseId) {
            $q->where('id', '!=', $exceptoClaseId);
        }

        $q->update(['estado' => Clase::ESTADO_BORRADOR]);
    }
}
