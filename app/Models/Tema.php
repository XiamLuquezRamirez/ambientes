<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tema extends Model
{
    use HasFactory;

    protected $fillable = [
        'modulo_id',
        'eje_id',
        'nombre',
        'slug',
        'descripcion',
        'icono',
        'instruccion_corta',
        'orden',
        'marcador_ra',
        'activo',
        'es_oficial',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'es_oficial' => 'boolean',
    ];

    public function modulo()
    {
        return $this->belongsTo(Modulo::class);
    }

    public function eje()
    {
        return $this->belongsTo(Eje::class);
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
