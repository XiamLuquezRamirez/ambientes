<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoginLog extends Model
{
    protected $table = 'registros_acceso';
    public $timestamps = false;
    protected $fillable = ['user_id', 'ip', 'ambiente', 'fecha'];

    // La fecha del acceso se manipula como Carbon para formatearla sin parsing manual en el controlador.
    protected $casts = [
        'fecha' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
