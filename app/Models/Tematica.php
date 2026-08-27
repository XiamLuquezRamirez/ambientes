<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Tematica extends Model
{
    public const ESTADO_BORRADOR = 'borrador';

    public const ESTADO_ACTIVA = 'activa';

    public const ESTADO_ARCHIVADA = 'archivada';

    public const ESTADOS = [
        self::ESTADO_BORRADOR,
        self::ESTADO_ACTIVA,
        self::ESTADO_ARCHIVADA,
    ];

    protected $table = 'tematicas';

    protected $fillable = [
        'eje_id',
        'nombre',
        'competencia',
        'referente_alternativo',
        'requiere_ra',
        'requiere_acompanamiento',
        'es_oficial',
        'institucion_id',
        'estado',
        'activo',
        'creado_por',
    ];

    protected $casts = [
        'requiere_ra' => 'boolean',
        'requiere_acompanamiento' => 'boolean',
        'es_oficial' => 'boolean',
        'activo' => 'boolean',
    ];

    public function eje()
    {
        return $this->belongsTo(Eje::class);
    }

    public function institucion()
    {
        return $this->belongsTo(Institucion::class);
    }

    public function creador()
    {
        return $this->belongsTo(User::class, 'creado_por');
    }

    public function experiencias()
    {
        return $this->hasMany(Experiencia::class);
    }

    public function indicadoresLogro()
    {
        return $this->hasMany(IndicadorLogro::class)->orderBy('orden');
    }

    public function catalogosDba()
    {
        return $this->belongsToMany(CatalogoDBA::class, 'tematica_dba', 'tematica_id', 'catalogo_dba_id')
            ->withPivot('relacion', 'observacion');
    }

    public function versiones()
    {
        return $this->hasMany(VersionTematica::class)->orderByDesc('created_at');
    }

    public function esCreadaPor(int $userId): bool
    {
        return (int) $this->creado_por === (int) $userId;
    }

    public function puedeGestionarComoAdmin(int $institucionId): bool
    {
        return $this->esDeInstitucion($institucionId);
    }

    public function puedeGestionarComoDocente(int $institucionId, int $userId): bool
    {
        return $this->esDeInstitucion($institucionId) && $this->esCreadaPor($userId);
    }

    public function puedeGestionarComoSuperAdmin(int $userId): bool
    {
        return $this->esOficial() && $this->esCreadaPor($userId);
    }

    public function scopeOficiales(Builder $query): Builder
    {
        return $query->where('es_oficial', true)->whereNull('institucion_id');
    }

    public function scopeDeInstitucion(Builder $query, int $institucionId): Builder
    {
        return $query->where('es_oficial', false)->where('institucion_id', $institucionId);
    }

    public function scopeActivas(Builder $query): Builder
    {
        return $query->where('activo', true);
    }

    public function esOficial(): bool
    {
        return (bool) $this->es_oficial && $this->institucion_id === null;
    }

    public function esDeInstitucion(int $institucionId): bool
    {
        return ! $this->esOficial() && (int) $this->institucion_id === $institucionId;
    }

    public function esBorrador(): bool
    {
        return $this->estado === self::ESTADO_BORRADOR;
    }

    /**
     * Visible para estudiantes solo con al menos una experiencia activa.
     */
    public function visibleParaEstudiantes(): bool
    {
        if (! $this->activo || $this->estado === self::ESTADO_ARCHIVADA) {
            return false;
        }

        return $this->experiencias()
            ->where('activo', true)
            ->where('estado', Experiencia::ESTADO_ACTIVA)
            ->exists();
    }
}
