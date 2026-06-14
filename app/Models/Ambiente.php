<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ambiente extends Model
{
    use HasFactory;

    protected $fillable = ['nombre', 'slug', 'color_hex', 'icono', 'servidor_ip', 'activo'];

    public function estudiantes()
    {
        return $this->belongsToMany(Estudiante::class);
    }

    public function docentes()
    {
        return $this->hasMany(Docente::class);
    }

    public function modulos()
    {
        return $this->hasMany(Modulo::class)->orderBy('orden');
    }
}
