<?php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    protected $fillable = ['nombre', 'email', 'password', 'rol', 'estado'];
    protected $hidden = ['password', 'remember_token'];
    protected $casts = ['estado' => 'boolean'];

    public function docente()
    {
        return $this->hasOne(Docente::class);
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
        return $this->rol === 'docente';
    }
}
