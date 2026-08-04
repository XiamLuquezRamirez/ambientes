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
        'docente_id',
        'area'
    ];

    protected $with = ['docente'];

    public function docente()
    {
        return $this->belongsTo(Docente::class, 'docente_id');
    }
}