<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class PerfilAprendizaje extends Model
{
    use Sincronizable;
    protected $table = 'perfil_aprendizaje';

    protected $fillable = ['nombre', 'estado'];

    protected $casts = ['estado' => 'boolean'];
}
