<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class Piar extends Model
{
    use Sincronizable;

    protected $table = 'piar';

    protected $fillable = [
        'estudiante_id', 'docente_id', 'estado', 'paso', 'fecha_diligenciamiento',
    ];
}
