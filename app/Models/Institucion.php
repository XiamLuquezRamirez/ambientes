<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Institucion extends Model
{
    protected $fillable = ['nombre', 'slug', 'municipio', 'departamento', 'codigo_dane', 'logo', 'correo_contacto', 'activo'];

    protected $table = 'instituciones';

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
}
