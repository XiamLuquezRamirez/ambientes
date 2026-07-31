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

    public function usuarios()
    {
        return $this->hasMany(User::class, 'institucion_id');
    }

    public function condicionesOrden()
    {
        return $this->hasMany(CondicionOrden::class, 'id_institucion');
    }

    public function condicionesTransitoriasOrden()
    {
        return $this->hasMany(CondicionTransitoriaOrden::class, 'id_institucion');
    }
}
