<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Docente;

class PiarAjusteRazonableDocenteFirma extends Model
{
    protected $table = 'piar_ajuste_razonable_docente_firma';

    protected $fillable = [
        'id',
        'id_ajuste_razonable',
        'id_docente',
        'area'
    ];

    protected $with = ['docente'];

    public function docente()
    {
        return $this->belongsTo(Docente::class, 'id_docente');
    }
}