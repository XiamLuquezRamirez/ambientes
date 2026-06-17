<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class Matricula extends Model
{
    use Sincronizable;

    protected $table = 'matriculas';

    protected $fillable = [
        'estudiante_id', 'grado_id', 'grupo_id',
        'anio_lectivo', 'estado', 'fecha_ingreso', 'fecha_egreso',
    ];

    protected $casts = [
        'fecha_ingreso' => 'date',
        'fecha_egreso'  => 'date',
    ];

    public function estudiante()
    {
        return $this->belongsTo(Estudiante::class);
    }

    public function grado()
    {
        return $this->belongsTo(Grado::class);
    }

    public function grupo()
    {
        return $this->belongsTo(Grupo::class);
    }

    public function scopeActiva($query)
    {
        return $query->where('estado', 'activo');
    }

    public function scopeDelAnio($query, $anio = null)
    {
        return $query->where('anio_lectivo', $anio ?? date('Y'));
    }
}
