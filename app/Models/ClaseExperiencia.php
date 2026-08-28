<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClaseExperiencia extends Model
{
    protected $table = 'clase_experiencias';

    protected $fillable = [
        'clase_id',
        'experiencia_id',
        'modulo_id',
        'eje_id',
        'tematica_id',
        'orden',
    ];

    protected $casts = [
        'orden' => 'integer',
    ];

    public function clase()
    {
        return $this->belongsTo(Clase::class);
    }

    public function experiencia()
    {
        return $this->belongsTo(Experiencia::class);
    }

    public function modulo()
    {
        return $this->belongsTo(Modulo::class);
    }

    public function eje()
    {
        return $this->belongsTo(Eje::class);
    }

    public function tematica()
    {
        return $this->belongsTo(Tematica::class);
    }
}
