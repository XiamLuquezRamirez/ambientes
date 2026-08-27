<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerfilAprendizajePersonalizadoOrden extends Model
{
    protected $table = 'perfil_aprendizaje_personalizado_orden';

    protected $fillable = [
        'institucion_id',
        'perfil_aprendizaje_personalizado_id',
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

    public function perfilAprendizajePersonalizado(): BelongsTo
    {
        return $this->belongsTo(PerfilAprendizajePersonalizado::class, 'perfil_aprendizaje_personalizado_id');
    }
}
