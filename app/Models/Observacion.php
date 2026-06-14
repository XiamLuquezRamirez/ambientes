<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Observacion extends Model
{
    protected $fillable = ['estudiante_id', 'user_id', 'tema_id', 'contenido', 'tipo'];

    public function estudiante() { return $this->belongsTo(Estudiante::class); }
    public function user() { return $this->belongsTo(User::class); }
    public function tema() { return $this->belongsTo(Tema::class); }
}
