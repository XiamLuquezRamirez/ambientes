<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PiarDatosGenerales extends Model
{
    use HasFactory;
    protected $table = 'piar_datos_generales';
    protected $fillable = [
        'id_piar',
        'vinculado',
        'victima',
        'registro_victima',
        'centro_proteccion',
        'cual_centro_proteccion',
        'grupo_etnico',
        'cual_etnico',
        'capacidades',
        'gustos',
        'expectativas_estudiante',
        'expectativas_familia',
        'redes_apoyo',
        'otras',
        'fecha_diligenciamiento',
    ];
}