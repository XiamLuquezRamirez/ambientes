<?php

namespace App\Services;

use App\Models\Ambiente;
use App\Models\Estudiante;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Collection;

/**
 * Quién puede entrar al kiosco del ambiente (tablet).
 *
 * Pivot estudiante_ambiente:
 * - activo (tinyint): asignación vigente
 * - estado: activo | restringido | adaptado
 */
class AccesoAmbienteService
{
    public const ESTADO_ACTIVO = 'activo';

    public const ESTADO_RESTRINGIDO = 'restringido';

    public const ESTADO_ADAPTADO = 'adaptado';

    /** Estados que permiten login en tablet. */
    public const ESTADOS_PERMITIDOS = [
        self::ESTADO_ACTIVO,
        self::ESTADO_ADAPTADO,
    ];

    public function anioLectivo(): int
    {
        return (int) date('Y');
    }

    /**
     * Query base: estudiantes del ambiente con acceso al kiosco.
     */
    public function queryEstudiantesKiosco(Ambiente $ambiente): BelongsToMany
    {
        return $ambiente->estudiantes()
            ->wherePivot('anio_lectivo', $this->anioLectivo())
            ->wherePivot('activo', 1)
            ->wherePivotIn('estado', self::ESTADOS_PERMITIDOS)
            ->where('estudiantes.activo', true);
    }

    /**
     * @return Collection<int, Estudiante>
     */
    public function listarParaSelector(Ambiente $ambiente): Collection
    {
        return $this->queryEstudiantesKiosco($ambiente)
            ->with('configuracionPin')
            ->orderBy('nombre')
            ->get();
    }

    public function obtenerParaKiosco(Ambiente $ambiente, int $estudianteId): ?Estudiante
    {
        return $this->queryEstudiantesKiosco($ambiente)
            ->where('estudiantes.id', $estudianteId)
            ->with(['configuracionPin', 'grado'])
            ->first();
    }

    public function estadoAsignacion(Estudiante $estudiante): ?string
    {
        return $estudiante->pivot->estado ?? null;
    }

    public function esAdaptado(Estudiante $estudiante): bool
    {
        return $this->estadoAsignacion($estudiante) === self::ESTADO_ADAPTADO;
    }

    public function esRestringido(Estudiante $estudiante): bool
    {
        return $this->estadoAsignacion($estudiante) === self::ESTADO_RESTRINGIDO;
    }
}
