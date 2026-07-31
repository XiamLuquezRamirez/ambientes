<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CondicionOrden extends Model
{
    protected $table = 'condiciones_orden';

    protected $fillable = [
        'id_institucion',
        'id_condicion',
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

    public function condicion(): BelongsTo
    {
        return $this->belongsTo(CondicionInclusion::class, 'id_condicion');
    }
}
