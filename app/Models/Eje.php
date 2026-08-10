<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Eje extends Model
{
    use HasFactory;

    protected $fillable = [
        'modulo_id',
        'institucion_id',
        'creado_por',
        'nombre',
        'slug',
        'descripcion',
        'orden',
        'activo',
        'es_oficial',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'es_oficial' => 'boolean',
    ];

    public function modulo()
    {
        return $this->belongsTo(Modulo::class);
    }

    public function institucion()
    {
        return $this->belongsTo(Institucion::class);
    }

    public function creador()
    {
        return $this->belongsTo(Docente::class, 'creado_por');
    }

    public function temas()
    {
        return $this->hasMany(Tema::class)->orderBy('orden');
    }

    public function scopeOficiales(Builder $query): Builder
    {
        return $query->where('es_oficial', true)->whereNull('institucion_id');
    }

    /** Ejes propios de un colegio. */
    public function scopeDeInstitucion(Builder $query, int $institucionId): Builder
    {
        return $query->where('es_oficial', false)->where('institucion_id', $institucionId);
    }

    public function esOficial(): bool
    {
        return (bool) $this->es_oficial && $this->institucion_id === null;
    }

    public function esDeInstitucion(int $institucionId): bool
    {
        return ! $this->esOficial() && (int) $this->institucion_id === $institucionId;
    }

    public function fueCreadoPor(?int $docenteId): bool
    {
        return $docenteId !== null
            && $this->creado_por !== null
            && (int) $this->creado_por === (int) $docenteId;
    }
}
