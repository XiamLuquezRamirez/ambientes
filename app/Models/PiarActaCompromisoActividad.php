<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PiarActaCompromisoActividad extends Model
{
    protected $table = 'piar_acta_compromiso_actividades';

    protected $fillable = [
        'id',
        'id_acta_compromiso',
        'nombre',
        'descripcion',
        'frecuencia',
    ];
}