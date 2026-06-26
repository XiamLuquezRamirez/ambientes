<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConfiguracionPin extends Model
{
    use HasFactory;

    protected $fillable = ['estudiante_id', 'figura_1', 'color_figura_1', 'figura_2', 'color_figura_2', 'figura_3', 'color_figura_3', 'intentos_fallidos'];
}
