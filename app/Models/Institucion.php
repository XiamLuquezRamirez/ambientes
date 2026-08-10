<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Institucion extends Model
{
    protected $fillable = [
        'nombre',
        'slug',
        'municipio',
        'departamento',
        'codigo_dane',
        'logo',
        'correo_contacto',
        'activo',
    ];

    protected $table = 'instituciones';

    protected $casts = [
        'activo' => 'boolean',
    ];

    public function ambientes()
    {
        return $this->belongsToMany(
            Ambiente::class,
            'ambiente_institucion',
            'institucion_id',
            'ambiente_id'
        )->withPivot('ip', 'puerto', 'activo')
            ->withTimestamps();
    }

    /** Ambientes contratados y activos para la institución. */
    public function ambientesActivos()
    {
        return $this->ambientes()->wherePivot('activo', true);
    }

    public function usuarios()
    {
        return $this->hasMany(User::class, 'institucion_id');
    }

    public function perfilesAprendizajeOrden()
    {
        return $this->hasMany(PerfilAprendizajeOrden::class, 'institucion_id');
    }

    public function perfilesAprendizajePersonalizadoOrden()
    {
        return $this->hasMany(PerfilAprendizajePersonalizadoOrden::class, 'institucion_id');
    }

    public function modulos()
    {
        return $this->belongsToMany(Modulo::class, 'modulo_institucion')
            ->withPivot('activo')
            ->withTimestamps();
    }
}
