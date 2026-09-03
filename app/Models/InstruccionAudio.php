<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InstruccionAudio extends Model
{
    public const PERSONAJE_ZOE = 'zoe';

    public const PERSONAJE_ZEUS = 'zeus';

    public const PERSONAJES = [
        self::PERSONAJE_ZOE,
        self::PERSONAJE_ZEUS,
    ];

    public const MAX_POR_BLOQUE = 8;

    protected $table = 'instrucciones_audio';

    protected $fillable = [
        'bloque_experiencia_id',
        'instruccion',
        'personaje',
        'orden',
    ];

    protected $casts = [
        'orden' => 'integer',
    ];

    public function bloqueExperiencia(): BelongsTo
    {
        return $this->belongsTo(BloqueExperiencia::class, 'bloque_experiencia_id');
    }
}
