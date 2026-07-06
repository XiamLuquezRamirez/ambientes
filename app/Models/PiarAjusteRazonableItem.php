<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PiarAjusteRazonableItem extends Model
{
    protected $table = 'piar_ajuste_razonable_item';

    protected $fillable = [
        'id',
        'id_ajuste_razonable',
        'area',
        'barrera',
        'tipo',
        'apoyo',
        'descripcion',
        'seguimiento',
    ];
}