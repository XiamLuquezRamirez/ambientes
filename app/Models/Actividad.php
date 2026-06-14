<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Actividad extends Model
{
    use HasFactory;

    protected $fillable = ['tema_id', 'tipo', 'contenido_path', 'configuracion'];
    protected $casts = ['configuracion' => 'array'];

    public function tema()
    {
        return $this->belongsTo(Tema::class);
    }
}
