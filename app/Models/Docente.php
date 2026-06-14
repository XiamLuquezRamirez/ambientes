<?php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Docente extends Authenticatable
{
    use Notifiable;

    protected $fillable = ['nombre', 'email', 'ambiente_id', 'rol', 'activo'];
    protected $hidden = ['password', 'remember_token'];
    protected $casts = ['activo' => 'boolean'];

    public function ambiente() { return $this->belongsTo(Ambiente::class); }
    public function loginLogs() { return $this->hasMany(LoginLog::class); }
    public function notas() { return $this->hasMany(NotaDocente::class); }
    public function observaciones() { return $this->hasMany(Observacion::class); }
    public function solicitudes() { return $this->hasMany(SolicitudCambioCondicion::class); }

    public function esAdmin(): bool { return $this->rol === 'admin'; }
    public function esDocente(): bool { return in_array($this->rol, ['docente_lider', 'docente_auxiliar']); }
}
