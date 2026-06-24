<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class Docente extends Model
{
    use Sincronizable;

    // Perfil profesional del docente. La asignación ambiente/grado/grupo va en carga_docente.
    protected $fillable = [
        'user_id', 'telefono', 'direccion', 'especialidad', 'fecha_ingreso', 'foto_url', 'descripcion', 'estado',
    ];

    protected $casts = [
        'fecha_ingreso' => 'date',
    ];

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
}