<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class Ambiente extends Model
{
    use Sincronizable;

    protected $fillable = ['nombre', 'slug', 'color_hex', 'icono', 'servidor_ip', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    public function cargasDocente()
    {
        return $this->hasMany(CargaDocente::class);
    }

    public function docentes()
    {
        return $this->belongsToMany(Docente::class, 'carga_docente')
            ->where('carga_docente.activo', true)
            ->where('carga_docente.anio_lectivo', date('Y'))
            ->distinct();
    }

    public function modulos()
    {
        return $this->hasMany(Modulo::class)->orderBy('orden');
    }
}
