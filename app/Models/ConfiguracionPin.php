<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConfiguracionPin extends Model
{
    use HasFactory;

    protected $fillable = [
        'estudiante_id',
        'figura_1',
        'color_figura_1',
        'figura_2',
        'color_figura_2',
        'figura_3',
        'color_figura_3',
        'intentos_fallidos',
    ];

    public function estudiante()
    {
        return $this->belongsTo(Estudiante::class);
    }

    public function intentosMaximos(): int
    {
        return (int) Configuracion::get('intentos_max_pin', 5);
    }

    public function estaBloqueado(): bool
    {
        return (int) $this->intentos_fallidos >= $this->intentosMaximos();
    }

    public function verificar($figura1, $figura2, $figura3): bool
    {
        return $this->figura_1 === $figura1
            && $this->figura_2 === $figura2
            && $this->figura_3 === $figura3;
    }
}
