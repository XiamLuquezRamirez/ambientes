<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    // apellido e identificacion viven en users (datos de la cuenta).
    protected $fillable = ['nombre', 'apellido', 'identificacion', 'email', 'password', 'rol', 'estado'];

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

    /**
     * Determina si la cuenta nunca ha sido utilizada.
     *
     * Retorna true cuando el usuario no tiene registros
     * de inicio de sesión asociados.
     */
    public function getCuentaSinUsarAttribute(): bool
    {
        // Si el modelo ya tiene cargado el conteo de loginLogs
        // (por ejemplo mediante withCount('loginLogs')),
        // se utiliza ese valor para evitar una consulta adicional.
        if (array_key_exists('login_logs_count', $this->attributes)) {

            // La cuenta se considera sin usar cuando el conteo es 0.
            return (int) $this->attributes['login_logs_count'] === 0;
        }

        // Si no existe el conteo precargado, consulta si hay
        // al menos un login asociado al usuario.
        // Si no existe ninguno, retorna true.
        return ! $this->loginLogs()->exists();
    }
}
