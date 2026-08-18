<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Experiencia extends Model
{
    public const ESTADO_BORRADOR = 'borrador';

    public const ESTADO_ACTIVA = 'activa';

    public const ESTADO_ARCHIVADA = 'archivada';

    public const ESTADOS = [
        self::ESTADO_BORRADOR,
        self::ESTADO_ACTIVA,
        self::ESTADO_ARCHIVADA,
    ];

    public const DURACIONES_MINUTOS = [15, 20, 30, 45];

    public const DURACION_DEFAULT = 20;

    protected $table = 'experiencias';

    protected $fillable = [
        'tematica_id',
        'grado_id',
        'nombre',
        'objetivo',
        'proposito',
        'habilidades',
        'duracion_minutos',
        'referente_aprendizaje',
        'estado',
        'activo',
        'creado_por',
    ];

    protected $casts = [
        'duracion_minutos' => 'integer',
        'activo' => 'boolean',
    ];

    public function tematica()
    {
        return $this->belongsTo(Tematica::class);
    }

    public function grado()
    {
        return $this->belongsTo(Grado::class);
    }

    public function creador()
    {
        return $this->belongsTo(User::class, 'creado_por');
    }

    public function materiales()
    {
        return $this->hasMany(ExperienciaMaterial::class)->orderBy('orden');
    }

    public function scopeActivas(Builder $query): Builder
    {
        return $query->where('activo', true)->where('estado', self::ESTADO_ACTIVA);
    }

    public function esBorrador(): bool
    {
        return $this->estado === self::ESTADO_BORRADOR;
    }

    public function esCreadaPor(int $userId): bool
    {
        return (int) $this->creado_por === (int) $userId;
    }

    public function puedeGestionarComoAdmin(int $institucionId): bool
    {
        $this->loadMissing('tematica');

        return $this->tematica && $this->tematica->esDeInstitucion($institucionId);
    }

    public function puedeGestionarComoDocente(int $institucionId, int $userId): bool
    {
        $this->loadMissing('tematica');
        if (! $this->tematica || ! $this->tematica->esDeInstitucion($institucionId)) {
            return false;
        }

        return $this->tematica->esCreadaPor($userId) || $this->esCreadaPor($userId);
    }

    public function puedeGestionarComoSuperAdmin(int $userId): bool
    {
        $this->loadMissing('tematica');

        return $this->esCreadaPor($userId)
            && $this->tematica
            && $this->tematica->esOficial();
    }
}
