<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BloqueExperiencia extends Model
{
    public const TIPO_BIENVENIDA = 'bienvenida';

    public const TIPO_AUDIO = 'audio';

    public const TIPO_VIDEO = 'video';

    public const TIPO_IMAGEN = 'imagen';

    public const TIPO_HISTORIA = 'historia';

    public const TIPO_RA = 'ra';

    public const TIPO_EVIDENCIA = 'evidencia';

    public const TIPO_JUEGO = 'juego';

    public const TIPO_DIBUJO = 'dibujo';

    public const TIPO_PREGUNTA = 'pregunta';

    public const TIPO_EMPAREJAR = 'emparejar';

    public const TIPO_CLASIFICACION = 'clasificacion';

    public const TIPO_ARRASTRAR = 'arrastrar';

    public const TIPO_RETO = 'reto';

    public const TIPO_EMOCION = 'emocion';

    public const TIPO_RECOMPENSA = 'recompensa';

    public const TIPOS = [
        self::TIPO_BIENVENIDA,
        self::TIPO_AUDIO,
        self::TIPO_VIDEO,
        self::TIPO_IMAGEN,
        self::TIPO_HISTORIA,
        self::TIPO_RA,
        self::TIPO_EVIDENCIA,
        self::TIPO_JUEGO,
        self::TIPO_DIBUJO,
        self::TIPO_PREGUNTA,
        self::TIPO_EMPAREJAR,
        self::TIPO_CLASIFICACION,
        self::TIPO_ARRASTRAR,
        self::TIPO_RETO,
        self::TIPO_EMOCION,
        self::TIPO_RECOMPENSA,
    ];

    public const TIPOS_OBLIGATORIOS = [
        self::TIPO_BIENVENIDA,
        self::TIPO_RECOMPENSA,
    ];

    protected $table = 'bloques_experiencia';

    protected $fillable = [
        'experiencia_id',
        'tipo',
        'orden',
        'datos',
        'activo',
    ];

    protected $casts = [
        'datos' => 'array',
        'activo' => 'boolean',
        'orden' => 'integer',
    ];

    public function experiencia()
    {
        return $this->belongsTo(Experiencia::class);
    }

    public function instruccionesAudio()
    {
        return $this->hasMany(InstruccionAudio::class, 'bloque_experiencia_id')->orderBy('orden');
    }

    public function esObligatorio(): bool
    {
        return in_array($this->tipo, self::TIPOS_OBLIGATORIOS, true);
    }

    public function esCierre(): bool
    {
        return in_array($this->tipo, [self::TIPO_EMOCION, self::TIPO_RECOMPENSA], true);
    }

    public function puedeEliminar(): bool
    {
        return ! $this->esObligatorio();
    }

    public function puedeMover(): bool
    {
        return ! $this->esObligatorio();
    }
}
