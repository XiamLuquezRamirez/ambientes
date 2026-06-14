<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Asistencia extends Model
{
    protected $fillable = ['estudiante_id', 'fecha', 'presente'];
    protected $casts = ['presente' => 'boolean'];

    public function estudiante() { return $this->belongsTo(Estudiante::class); }
}
