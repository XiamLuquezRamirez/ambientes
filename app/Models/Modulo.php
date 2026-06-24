<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Modulo extends Model
{
    use HasFactory;

    protected $fillable = ['ambiente_id', 'nombre', 'slug', 'descripcion', 'icono', 'orden', 'activo', 'visible_estudiantes'];

    public function ambiente()
    {
        return $this->belongsTo(Ambiente::class);
    }

    public function temas()
    {
        return $this->hasMany(Tema::class)->orderBy('orden');
    }
}