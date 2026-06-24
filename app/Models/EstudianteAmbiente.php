<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EstudianteAmbiente extends Model
{
    protected $table = 'estudiante_ambiente';

    protected $fillable = ['estudiante_id', 'ambiente_id', 'anio_lectivo', 'estado', 'observacion'];

    public function estudiante()
    {
        return $this->belongsTo(Estudiante::class);
    }

    public function ambiente()
    {
        return $this->belongsTo(Ambiente::class);
    }
}
