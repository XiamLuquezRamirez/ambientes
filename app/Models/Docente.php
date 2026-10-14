<?php

namespace App\Models;

use App\Services\PinAccesibilidadDocenteService;
use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class Docente extends Model
{
    use Sincronizable;

    // Perfil profesional del docente. La asignación ambiente/grado/grupo va en carga_docente.
    protected $fillable = [
        'user_id', 'telefono', 'direccion', 'especialidad', 'fecha_ingreso', 'descripcion', 'estado', 'firma_url', 'foto_url', 'pin_accesibilidad',
    ];

    protected $with = ['user'];

    protected $casts = [
        'fecha_ingreso' => 'date',
    ];

    protected static function booted(): void
    {
        static::creating(function (Docente $docente) {
            if ($docente->pin_accesibilidad) {
                return;
            }

            $institucionId = (int) (User::query()->whereKey($docente->user_id)->value('institucion_id') ?? 0);
            $docente->pin_accesibilidad = app(PinAccesibilidadDocenteService::class)->generar($institucionId);
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function cargasDocente()
    {
        return $this->hasMany(CargaDocente::class);
    }

    public function cargasActivas()
    {
        return $this->hasMany(CargaDocente::class)
            ->where('activo', true)
            ->where('anio_lectivo', date('Y'));
    }

    public function ambientes()
    {
        return $this->belongsToMany(Ambiente::class, 'carga_docente')
            ->where('carga_docente.activo', true)
            ->where('carga_docente.anio_lectivo', date('Y'))
            ->distinct();
    }

    public function getAmbienteAttribute()
    {
        if ($this->relationLoaded('ambientes')) {
            return $this->ambientes->first();
        }

        return $this->ambientes()->first();
    }

    public function asignacionesPerfilAprendizajePersonalizado()
    {
        return $this->hasMany(EstudiantePerfilAprendizajePersonalizado::class, 'docente_id');
    }
}
