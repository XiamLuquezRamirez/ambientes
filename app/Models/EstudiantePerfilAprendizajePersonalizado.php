<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstudiantePerfilAprendizajePersonalizado extends Model
{
    protected $table = 'estudiante_perfil_aprendizaje_personalizado';

    protected $fillable = [
        'estudiante_id',
        'perfil_aprendizaje_personalizado_id',
        'docente_id',
        'observacion',
        'fecha_activacion',
        'activa',
        'fecha_cierre',
        'motivo_cierre',
        'observacion_cierre',
    ];

    protected $casts = [
        'activa' => 'boolean',
        'fecha_activacion' => 'datetime',
        'fecha_cierre' => 'datetime',
    ];

    public function estudiante(): BelongsTo
    {
        return $this->belongsTo(Estudiante::class, 'estudiante_id');
    }

    public function perfilAprendizajePersonalizado(): BelongsTo
    {
        return $this->belongsTo(PerfilAprendizajePersonalizado::class, 'perfil_aprendizaje_personalizado_id');
    }

    public function docente(): BelongsTo
    {
        return $this->belongsTo(Docente::class, 'docente_id');
    }

    public function scopeActivas(Builder $query): Builder
    {
        return $query->where('activa', true);
    }
}
