<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerfilAprendizajeOrden extends Model
{
    protected $table = 'condiciones_orden';

    protected $fillable = [
        'institucion_id',
        'condicion_id',
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

    public function condicion(): BelongsTo
    {
        return $this->belongsTo(PerfilAprendizajeInclusion::class, 'condicion_id');
    }
}
