<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IndicadorLogro extends Model
{
    protected $table = 'indicadores_logro';

    public $timestamps = false;

    protected $fillable = [
        'tematica_id',
        'descripcion',
        'orden',
    ];

    protected $casts = [
        'orden' => 'integer',
    ];

    public function tematica()
    {
        return $this->belongsTo(Tematica::class);
    }
}
