<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AjusteTemporal extends Model
{
    protected $fillable = ['estudiante_id', 'clave', 'valor', 'expira_en'];
    protected $casts = ['expira_en' => 'datetime'];

    public function estudiante() { return $this->belongsTo(Estudiante::class); }
}
