<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PiarAtencionMedica extends Model
{
    protected $table = 'piar_atencion_medica';

    protected $fillable = [
        'id_entorno_salud',
        'cual',
        'frecuencia',
    ];
}