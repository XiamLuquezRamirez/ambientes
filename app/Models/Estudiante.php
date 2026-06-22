<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Estudiante extends Model
{
    use Sincronizable;

    protected $fillable = ['avatar', 'identificacion', 'nombre', 'iniciales', 'grado_id', 'atencion_id', 'estado_id', 'color_avatar', 'condicion', 'activo', 'fecha_nacimiento', 'sexo', 'acudiente', 'telefono_acudiente', 'correo_acudiente'];

    protected $casts = [
        'activo' => 'boolean',
        'edad' => 'integer'
    ];

    public function getEdadAttribute()
    {
        if (!$this->fecha_nacimiento) {
            return null;
        }else{
            return Carbon::parse($this->fecha_nacimiento)->diffInYears(Carbon::now());
        }
    }

    public function matriculas()
    {
        return $this->hasMany(Matricula::class);
    }

    public function grado()
    {
        return $this->belongsTo(Grado::class);
    }

    public function condicion()
    {
        return $this->belongsTo(Condicion::class);
    }

    public function matriculaActiva()
    {
        return $this->hasOne(Matricula::class)
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
}
