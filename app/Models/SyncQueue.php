<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SyncQueue extends Model
{
    protected $table = 'cola_sincronizacion';
    protected $fillable = ['entidad', 'entidad_id', 'accion', 'servidor_origen', 'payload', 'estado', 'intentos', 'enviado_en'];
    protected $casts = ['payload' => 'array'];
}
