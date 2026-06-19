<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class Estudiante extends Model
{
    use Sincronizable;

    protected $fillable = ['nombre', 'iniciales', 'color_avatar', 'condicion', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    public function matriculas()
    {
        return $this->hasMany(Matricula::class);
    }

    public function matriculaActiva()
    {
        return $this->hasOne(Matricula::class)
            ->where('estado', 'activo')
            ->where('anio_lectivo', date('Y'));
    }

    public function matriculasActivas()
    {
        return $this->hasMany(Matricula::class)
            ->where('estado', 'activo')
            ->where('anio_lectivo', date('Y'));
    }

    public function piar()
    {
        return $this->hasOne(Piar::class);
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

    public function ambientes()
    {
        return $this->belongsToMany(Ambiente::class, 'estudiante_ambiente')
            ->withPivot(['anio_lectivo', 'estado', 'observacion'])
            ->withTimestamps();
    }

    public function asignacionesAmbiente()
    {
        return $this->hasMany(EstudianteAmbiente::class);
    }
}
