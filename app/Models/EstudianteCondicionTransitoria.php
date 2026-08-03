<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstudianteCondicionTransitoria extends Model
{
    protected $table = 'estudiante_condicion_transitoria';

    protected $fillable = [
        'id_estudiante',
        'id_condicion_transitoria',
        'id_docente',
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
        return $this->belongsTo(Estudiante::class, 'id_estudiante');
    }

    public function condicionTransitoria(): BelongsTo
    {
        return $this->belongsTo(CondicionTransitoria::class, 'id_condicion_transitoria');
    }

    public function docente(): BelongsTo
    {
        return $this->belongsTo(Docente::class, 'id_docente');
    }

    public function scopeActivas(Builder $query): Builder
    {
        return $query->where('activa', true);
    }
}
