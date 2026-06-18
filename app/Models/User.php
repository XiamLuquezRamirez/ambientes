<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    // La columna real en la base de datos es "activo".
    // Se expone también como atributo virtual "estado" para mantener compatibilidad con la vista.
    protected $fillable = ['nombre', 'email', 'password', 'rol', 'activo'];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = ['activo' => 'boolean'];

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

    // Accesor que permite usar $user->estado como alias de la columna activa.
    public function getEstadoAttribute()
    {
        return $this->activo;
    }

    // Mutator que guarda el valor en el campo activo de la base de datos.
    public function setEstadoAttribute($value)
    {
        $this->attributes['activo'] = $value;
    }
}
