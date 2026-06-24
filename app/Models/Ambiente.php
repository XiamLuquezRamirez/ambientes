<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class Ambiente extends Model
{
    use Sincronizable;

    protected $fillable = ['nombre', 'slug', 'color_hex', 'icono', 'servidor_ip', 'activo', 'cupo_defecto'];

    protected $casts = ['activo' => 'boolean', 'cupo_defecto' => 'integer'];

    public function cargasDocente()
    {
        return $this->hasMany(CargaDocente::class);
    }

    public function docentes()
    {
        return $this->belongsToMany(Docente::class, 'carga_docente')
            ->where('carga_docente.activo', true)
            ->where('carga_docente.anio_lectivo', date('Y'))
            ->distinct();
    }

    public function modulos()
    {
        return $this->hasMany(Modulo::class)->orderBy('orden');
    }

    public function gradosHabilitados()
    {
        return $this->belongsToMany(Grado::class, 'ambiente_grado')
            ->withPivot('activo')
            ->wherePivot('activo', 1)
            ->orderBy('orden');
    }

    public function todosGrados()
    {
        return $this->belongsToMany(Grado::class, 'ambiente_grado')
            ->withPivot('activo')
            ->orderBy('orden');
    }

    public function estudiantesAmbiente()
    {
        return $this->hasMany(EstudianteAmbiente::class);
    }

    public function estudiantes()
    {
        return $this->belongsToMany(Estudiante::class, 'estudiante_ambiente')
            ->withPivot(['anio_lectivo', 'estado', 'observacion'])
            ->withTimestamps();
    }
}
