<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PiarTratamiento extends Model
{
    protected $table = 'piar_tratamiento';

    protected $fillable = [
        'id_entorno_salud',
        'cual',
        'frecuencia',
    ];
}