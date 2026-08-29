<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Modulo extends Model
{
    use HasFactory;
    use Sincronizable;

    protected $fillable = [
        'ambiente_id',
        'institucion_id',
        'nombre',
        'slug',
        'descripcion',
        'tipo_media',
        'media_origen',
        'media_archivo',
        'media_url',
        'media_embed',
        'icono',
        'orden',
        'activo',
        'visible_estudiantes',
        'es_oficial',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'visible_estudiantes' => 'boolean',
        'es_oficial' => 'boolean',
    ];

    public function ambiente()
    {
        return $this->belongsTo(Ambiente::class);
    }

    public function institucion()
    {
        return $this->belongsTo(Institucion::class);
    }

    public function instituciones()
    {
        return $this->belongsToMany(Institucion::class, 'modulo_institucion')
            ->withPivot('activo')
            ->withTimestamps();
    }

    public function ejes()
    {
        return $this->hasMany(Eje::class)->orderBy('orden');
    }

    public function ejesOficiales()
    {
        return $this->hasMany(Eje::class)->oficiales()->orderBy('orden');
    }

    public function temas()
    {
        return $this->hasMany(Tema::class)->orderBy('orden');
    }

    /** Catálogo del sistema: es_oficial = true e institucion_id = NULL. */
    public function scopeOficiales(Builder $query): Builder
    {
        return $query->where('es_oficial', true)->whereNull('institucion_id');
    }

    /** Módulos adicionales creados por un colegio. */
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

    public function sePuedeEliminar(): bool
    {
        return ! $this->esOficial();
    }
}
