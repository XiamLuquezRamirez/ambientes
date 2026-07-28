<?php

namespace App\Models;

use App\Enums\SeguridadAccion;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SeguridadLog extends Model
{
    use HasFactory;

    protected $table = 'seguridad_logs';

    protected $fillable = [
        'user_id',
        'actor_user_id',
        'accion',
        'descripcion',
        'registro_afectado',
        'ip',
        'user_agent',
    ];

    protected $casts = [
        'accion' => SeguridadAccion::class,
    ];

    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
