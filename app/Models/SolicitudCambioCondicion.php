<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SolicitudCambioCondicion extends Model
{
    protected $fillable = ['estudiante_id', 'user_id', 'condicion_actual', 'condicion_solicitada', 'justificacion', 'estado'];

    public function estudiante() { return $this->belongsTo(Estudiante::class); }
    public function user() { return $this->belongsTo(User::class); }
}
