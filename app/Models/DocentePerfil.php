<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocentePerfil extends Model
{
    protected $table = 'docentes_perfil';
    protected $fillable = ['user_id', 'ambiente_id'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function ambiente()
    {
        return $this->belongsTo(Ambiente::class);
    }
}
