<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PiarEntornoEducativo extends Model
{
    protected $table = 'piar_entorno_educativo';

    protected $fillable = [
        'id_piar',
        'vinculado_otra_institucion',
        'instituciones_anteriores',
        'motivo_no_vinculado',
        'ultimo_grado',
        'estado_ultimo_grado',
        'observaciones_estado',
        'recibe_informe_pedagogico',
        'institucion_informe',
        'programas_complementarios',
        'cuales_programas',
    ];
}