<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VersionTematica extends Model
{
    public $timestamps = false;

    protected $table = 'versiones_tematica';

    protected $fillable = [
        'tematica_id',
        'snapshot',
        'creado_por',
        'created_at',
    ];

    protected $casts = [
        'snapshot' => 'array',
        'created_at' => 'datetime',
    ];

    public function tematica()
    {
        return $this->belongsTo(Tematica::class);
    }

    public function creador()
    {
        return $this->belongsTo(User::class, 'creado_por');
    }
}
