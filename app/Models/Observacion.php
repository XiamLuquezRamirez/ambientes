<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Observacion extends Model
{
    protected $fillable = ['estudiante_id', 'docente_id', 'tema_id', 'contenido', 'tipo'];

    public function estudiante() { return $this->belongsTo(Estudiante::class); }
    public function docente() { return $this->belongsTo(Docente::class); }
    public function tema() { return $this->belongsTo(Tema::class); }
}
