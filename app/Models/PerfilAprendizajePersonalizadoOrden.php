<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerfilAprendizajePersonalizadoOrden extends Model
{
    protected $table = 'condiciones_transitorias_orden';

    protected $fillable = [
        'institucion_id',
        'condicion_transitoria_id',
        'orden',
        'activa',
    ];

    protected $casts = [
        'orden' => 'integer',
        'activa' => 'boolean',
    ];

    public function institucion(): BelongsTo
    {
        return $this->belongsTo(Institucion::class, 'institucion_id');
    }

    public function condicionTransitoria(): BelongsTo
    {
        return $this->belongsTo(PerfilAprendizajePersonalizado::class, 'condicion_transitoria_id');
    }
}
