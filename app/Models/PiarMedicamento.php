<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PiarMedicamento extends Model
{
    protected $table = 'piar_medicamento';

    protected $fillable = [
        'id_entorno_salud',
        'cual',
        'frecuencia',
        'horario',
    ];
}