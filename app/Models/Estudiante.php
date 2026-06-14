<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Estudiante extends Model
{
    use HasFactory;

    protected $fillable = ['nombre', 'iniciales', 'color_avatar', 'condicion', 'activo'];

    public function ambientes()
    {
        return $this->belongsToMany(Ambiente::class);
    }

    public function configuracionPin()
    {
        return $this->hasOne(ConfiguracionPin::class);
    }

    public function portafolios()
    {
        return $this->hasMany(Portafolio::class);
    }

    public function ajustesTemporales()
    {
        return $this->hasMany(AjusteTemporal::class);
    }
}
