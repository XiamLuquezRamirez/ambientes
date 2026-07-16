<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Asistencia extends Model
{
    protected $fillable = [
        'carga_docente_id',
        'estudiante_id',
        'fecha',
        'presente',
    ];

    protected $casts = [
        'presente' => 'boolean',
        'fecha' => 'date',
    ];

    public function estudiante()
    {
        return $this->belongsTo(Estudiante::class);
    }

    public function cargaDocente()
    {
        return $this->belongsTo(CargaDocente::class);
    }
}
