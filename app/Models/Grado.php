<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class Grado extends Model
{
    use Sincronizable;

    protected $table = 'grados';

    protected $fillable = ['nombre', 'edad_anos', 'descripcion', 'orden', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    public function grupos()
    {
        return $this->hasMany(Grupo::class);
    }

    public function matriculas()
    {
        return $this->hasMany(Matricula::class);
    }

    public function cargasDocente()
    {
        return $this->hasMany(CargaDocente::class);
    }

    public function scopeActivos($query)
    {
        return $query->where('activo', true)->orderBy('orden');
    }
}
