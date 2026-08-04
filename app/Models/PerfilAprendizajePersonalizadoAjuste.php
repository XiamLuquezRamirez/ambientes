<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PerfilAprendizajePersonalizadoAjuste extends Model
{
    protected $table = 'ajustes_temporales';

    protected $fillable = ['estudiante_id', 'clave', 'valor', 'expira_en'];
    protected $casts = ['expira_en' => 'datetime'];

    public function estudiante() { return $this->belongsTo(Estudiante::class); }
}
