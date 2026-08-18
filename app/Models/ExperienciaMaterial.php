<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExperienciaMaterial extends Model
{
    protected $table = 'experiencia_materiales';

    public $timestamps = false;

    protected $fillable = [
        'experiencia_id',
        'nombre',
        'cantidad',
        'es_obligatorio',
        'orden',
    ];

    protected $casts = [
        'es_obligatorio' => 'boolean',
        'orden' => 'integer',
    ];

    public function experiencia()
    {
        return $this->belongsTo(Experiencia::class);
    }
}
