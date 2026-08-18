<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CatalogoDBA extends Model
{
    protected $table = 'catalogo_dba';

    protected $fillable = ['codigo', 'area_id', 'grado_id', 'descripcion', 'es_men', 'estado', 'institucion_id', 'creado_por'];

    protected $casts = [
        'es_men' => 'boolean',
        'estado' => 'boolean',
    ];

    public function area()
    {
        return $this->belongsTo(Area::class);
    }

    public function grado()
    {
        return $this->belongsTo(Grado::class);
    }

    public function institucion()
    {
        return $this->belongsTo(Institucion::class);
    }

    public function creadoPor()
    {
        return $this->belongsTo(User::class, 'creado_por');
    }

    public function tematicas()
    {
        return $this->belongsToMany(Tematica::class, 'tematica_dba', 'catalogo_dba_id', 'tematica_id')
            ->withPivot('relacion', 'observacion');
    }
}
