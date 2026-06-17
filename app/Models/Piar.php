<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class Piar extends Model
{
    use Sincronizable;

    protected $table = 'piar';

    protected $fillable = [
        'estudiante_id', 'docente_id', 'anio_lectivo',
        'descripcion_diagnostico', 'barreras_aprendizaje', 'ajustes_propuestos',
        'estado', 'archivo_adjunto',
    ];

    public function estudiante()
    {
        return $this->belongsTo(Estudiante::class);
    }

    public function docente()
    {
        return $this->belongsTo(Docente::class);
    }
}
