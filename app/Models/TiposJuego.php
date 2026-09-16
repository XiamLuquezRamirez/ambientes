<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TiposJuego extends Model
{
    use HasFactory;

    protected $table = 'tipos_juegos';

    protected $fillable = [
        'slug',
        'nombre',
        'descripcion',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function juegos()
    {
        return $this->hasMany(Juego::class, 'tipo_juego_id');
    }
}