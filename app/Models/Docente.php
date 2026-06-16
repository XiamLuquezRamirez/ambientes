<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Docente extends Model
{
    protected $fillable = [
        'user_id',
        'ambiente_id',
        'telefono',
        'especialidad',
        'fecha_ingreso',
        'foto_url',
        'descripcion',
    ];

    protected $casts = [
        'fecha_ingreso' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function ambiente()
    {
        return $this->belongsTo(Ambiente::class);
    }
}
