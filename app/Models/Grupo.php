<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class Grupo extends Model
{
    use Sincronizable;

    protected $table = 'grupos';

    protected $fillable = ['grado_id', 'nombre', 'anio_lectivo', 'cupo_maximo', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    public function grado()
    {
        return $this->belongsTo(Grado::class);
    }

    public function matriculas()
    {
        return $this->hasMany(Matricula::class);
    }

    public function cargasDocente()
    {
        return $this->hasMany(CargaDocente::class);
    }

    public function getNombreCompletoAttribute(): string
    {
        return $this->grado->nombre.' '.$this->nombre;
    }

    public function totalMatriculas(): int
    {
        return $this->matriculas()
            ->where('estado', 'activo')
            ->where('anio_lectivo', date('Y'))
            ->count();
    }

    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    public function scopeDelAnio($query, $anio = null)
    {
        return $query->where('anio_lectivo', $anio ?? date('Y'));
    }
}
