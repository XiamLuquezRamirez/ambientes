<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\PiarAtencionMedica;
use App\Models\PiarTratamiento;
use App\Models\PiarMedicamento;

class PiarEntornoSalud extends Model
{
    protected $table = 'piar_entorno_salud';

    protected $fillable = [
        'id_piar',
        'afiliado_salud',
        'regimen',
        'eps',
        'lugar_emergencia',
        'diagnostico_medico',
        'cual_diagnostico',
        'atencion_medica',
        'tratamiento_integral',
        'consume_medicamentos',
        'ayudas_tecnicas',
        'cuales_ayudas',
    ];

    public function atencionesMedicas()
    {
        return $this->hasMany(PiarAtencionMedica::class, 'id_entorno_salud');
    }

    public function tratamientos()
    {
        return $this->hasMany(PiarTratamiento::class, 'id_entorno_salud');
    }

    public function medicamentos()
    {
        return $this->hasMany(PiarMedicamento::class, 'id_entorno_salud');
    }
}