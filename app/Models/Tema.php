<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tema extends Model
{
    use HasFactory;

    protected $fillable = [
        'modulo_id', 'nombre', 'slug', 'descripcion', 'icono',
        'instruccion_corta', 'orden', 'marcador_ra', 'activo',
    ];

    public function modulo()
    {
        return $this->belongsTo(Modulo::class);
    }

    public function actividades()
    {
        return $this->hasMany(Actividad::class);
    }

    public function portafolios()
    {
        return $this->hasMany(Portafolio::class);
    }

    public function notasDocente()
    {
        return $this->hasMany(NotaDocente::class);
    }
}
