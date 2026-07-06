<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;
use App\Models\PiarDatosGenerales;
use App\Models\PiarEntornoSalud;
use App\Models\PiarEntornoHogar;
use App\Models\PiarEntornoEducativo;
use App\Models\PiarValoracionPedagogica;
use App\Models\PiarAjusteRazonable;

class Piar extends Model
{
    use Sincronizable;

    protected $table = 'piar';

    protected $fillable = [
        'estudiante_id', 'docente_id', 'estado', 'paso', 'fecha_diligenciamiento',
    ];

    public function datosGenerales()
    {
        return $this->hasOne(PiarDatosGenerales::class, 'id_piar', 'id');
    }

    public function entornoSalud()
    {
        return $this->hasOne(PiarEntornoSalud::class, 'id_piar', 'id');
    }

    public function entornoHogar()
    {
        return $this->hasOne(PiarEntornoHogar::class, 'id_piar', 'id');
    }

    public function entornoEducativo()
    {
        return $this->hasOne(PiarEntornoEducativo::class, 'id_piar', 'id');
    }

    public function valoracionPedagogica()
    {
        return $this->hasOne(PiarValoracionPedagogica::class, 'id_piar', 'id');
    }

    public function ajusteRazonable()
    {
        return $this->hasOne(PiarAjusteRazonable::class, 'id_piar', 'id');
    }

    public function actaCompromiso()
    {
        return $this->hasOne(PiarActaCompromiso::class, 'id_piar', 'id');
    }
}
