<?php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    protected $fillable = ['nombre', 'email', 'password', 'rol', 'activo'];
    protected $hidden = ['password', 'remember_token'];
    protected $casts = ['activo' => 'boolean'];

    public function perfil()
    {
        return $this->hasOne(DocentePerfil::class);
    }

    public function loginLogs()
    {
        return $this->hasMany(LoginLog::class);
    }

    public function esAdmin(): bool
    {
        return $this->rol === 'admin';
    }

    public function esDocente(): bool
    {
        return in_array($this->rol, ['docente_lider', 'docente_auxiliar']);
    }
}
