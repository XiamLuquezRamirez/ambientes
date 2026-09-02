<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResultadoBloqueNino extends Model
{
    public const TIPO_REGISTRO_RESULTADO = 'resultado';

    public const TIPO_REGISTRO_EMOCION = 'emocion';

    public const TIPO_REGISTRO_FOTO = 'foto';

    public const TIPO_REGISTRO_AUDIO = 'audio';

    public const TIPO_REGISTRO_VIDEO = 'video';

    public const CREATED_AT = 'creado_en';

    public const UPDATED_AT = 'actualizado_en';

    protected $table = 'resultados_bloque_nino';

    protected $fillable = [
        'estudiante_id',
        'clase_id',
        'experiencia_id',
        'bloque_experiencia_id',
        'tipo_bloque',
        'tipo_registro',
        'correcto',
        'payload',
        'archivo_path',
    ];

    protected $casts = [
        'correcto' => 'boolean',
        'payload' => 'array',
        'creado_en' => 'datetime',
        'actualizado_en' => 'datetime',
    ];

    public function estudiante()
    {
        return $this->belongsTo(Estudiante::class);
    }

    public function clase()
    {
        return $this->belongsTo(Clase::class);
    }

    public function experiencia()
    {
        return $this->belongsTo(Experiencia::class);
    }

    public function bloque()
    {
        return $this->belongsTo(BloqueExperiencia::class, 'bloque_experiencia_id');
    }
}
