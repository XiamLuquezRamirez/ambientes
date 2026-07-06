<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Docente;

class PiarAjusteRazonable extends Model
{
    protected $table = 'piar_ajuste_razonable';

    protected $fillable = [
        'id_piar',
        'docente_orientador_id',
        'docente_apoyo_pedagogico_id',
        'docente_coordinador_pedagogico_id',
        'docente_orientador_area',
        'docente_apoyo_pedagogico_area',
        'docente_coordinador_pedagogico_area',
    ];

    protected $with = ['items', 'docentesFirma', 'docenteOrientador', 'docenteApoyoPedagogico', 'docenteCoordinadorPedagogico'];

    public function items()
    {
        return $this->hasMany(PiarAjusteRazonableItem::class, 'id_ajuste_razonable');
    }

    public function docentesFirma()
    {
        return $this->hasMany(PiarAjusteRazonableDocenteFirma::class, 'id_ajuste_razonable');
    }

    public function docenteOrientador()
    {
        return $this->belongsTo(Docente::class, 'docente_orientador_id');
    }

    public function docenteApoyoPedagogico()
    {
        return $this->belongsTo(Docente::class, 'docente_apoyo_pedagogico_id');
    }

    public function docenteCoordinadorPedagogico()  
    {
        return $this->belongsTo(Docente::class, 'docente_coordinador_pedagogico_id');
    }
}