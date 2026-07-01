<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PiarEntornoHogar extends Model
{
    protected $table = 'piar_entorno_hogar';

    protected $fillable = [
        'id_piar',
        'nombre_madre',
        'ocupacion_madre',
        'nivel_madre',
        'nombre_padre',
        'ocupacion_padre',
        'nivel_padre',
        'nombre_cuidador',
        'nivel_cuidador',
        'telefono_cuidador',
        'parentesco_cuidador',
        'correo_cuidador',
        'numero_hermanos',
        'lugar_ocupa',
        'apoyo_crianza',
        'personas_con_quien_vive',
    ];
}