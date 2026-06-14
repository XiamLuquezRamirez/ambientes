<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Portafolio extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'estudiante_id', 'tema_id', 'tipo_registro', 'contenido',
        'emocion_seleccionada', 'creado_en',
    ];

    protected $casts = ['contenido' => 'array'];

    public function estudiante()
    {
        return $this->belongsTo(Estudiante::class);
    }

    public function tema()
    {
        return $this->belongsTo(Tema::class);
    }
}
