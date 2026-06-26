<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class Departamento extends Model
{
    use Sincronizable;

    protected $table = 'departamentos';

    protected $fillable = [
        'codigo', 'descripcion',
    ];
}
