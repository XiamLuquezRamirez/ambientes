<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\PiarActaCompromisoActividad;

class PiarActaCompromiso extends Model
{
    protected $table = 'piar_acta_compromiso';

    protected $fillable = [
        'id',
        'id_piar',
        'compromisos',
    ];

    protected $with = ['actividades'];

    public function actividades()
    {
        return $this->hasMany(
            PiarActaCompromisoActividad::class,
            'id_acta_compromiso'
        );
    }
}