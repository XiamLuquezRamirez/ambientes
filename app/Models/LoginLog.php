<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoginLog extends Model
{
    public const TIPO_INICIO_SESION = 'inicio_sesion';

    public const TIPO_CAMBIO_CONTRASENA = 'cambio_contrasena';

    protected $table = 'registros_acceso';

    public $timestamps = false;

    protected $fillable = ['user_id', 'ip', 'ambiente', 'fecha', 'tipo'];

    // La fecha del acceso se manipula como Carbon para formatearla sin parsing manual en el controlador.
    protected $casts = [
        'fecha' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
