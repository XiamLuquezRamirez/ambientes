<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConfiguracionPin extends Model
{
    use HasFactory;

    protected $fillable = ['estudiante_id', 'figura_1', 'figura_2', 'figura_3', 'intentos_fallidos'];

    public function estudiante()
    {
        return $this->belongsTo(Estudiante::class);
    }

    public function verificar(string $f1, string $f2, string $f3): bool
    {
        return $this->figura_1 === $f1
            && $this->figura_2 === $f2
            && $this->figura_3 === $f3;
    }
}
