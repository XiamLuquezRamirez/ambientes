<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SolicitudCambioCondicion extends Model
{
    protected $fillable = ['estudiante_id', 'docente_id', 'condicion_actual', 'condicion_solicitada', 'justificacion', 'estado'];

    public function estudiante() { return $this->belongsTo(Estudiante::class); }
    public function docente() { return $this->belongsTo(Docente::class); }
}
