<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Estudiante extends Model
{
    use Sincronizable;

    protected $fillable = ['avatar', 'tipo_identificacion', 'otro_tipo_identificacion', 'identificacion', 'nombre', 'apellido', 'iniciales', 'grado_id', 'atencion_id', 'estado_id', 'color_avatar', 'condicion', 'activo', 'fecha_nacimiento', 'sexo', 'acudiente', 'telefono_acudiente', 'requiere_apoyo', 'estado_piar', 'lugar_nacimiento', 'departamento_id', 'municipio_id', 'barrio_vereda', 'direccion', 'telefono', 'email'];

    protected $casts = [
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
            ->where('anio_lectivo', date('Y')
        );
    }

    public function departamento()
    {
        return $this->belongsTo(Departamento::class);
    }

    public function municipio()
    {
        return $this->belongsTo(Municipio::class);
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

    public function portafolios()
    {
        return $this->hasMany(Portafolio::class);
    }

    public function ajustesTemporales()
    {
        return $this->hasMany(AjusteTemporal::class);
    }

    public function configuracionPin()
    {
        return $this->hasOne(ConfiguracionPin::class, 'estudiante_id', 'id');
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
