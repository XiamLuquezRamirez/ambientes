<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CondicionTransitoriaOrden extends Model
{
    protected $table = 'condiciones_transitorias_orden';

    protected $fillable = [
        'id_institucion',
        'id_condicion_transitoria',
        'orden',
        'activa',
    ];

    protected $casts = [
        'orden' => 'integer',
        'activa' => 'boolean',
    ];

    public function institucion(): BelongsTo
    {
        return $this->belongsTo(Institucion::class, 'id_institucion');
    }

    public function condicionTransitoria(): BelongsTo
    {
        return $this->belongsTo(CondicionTransitoria::class, 'id_condicion_transitoria');
    }
}
