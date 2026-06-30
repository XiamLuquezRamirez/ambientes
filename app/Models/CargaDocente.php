<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class CargaDocente extends Model
{
    use Sincronizable;

    protected $table = 'carga_docente';

    protected $fillable = [
        'docente_id', 'ambiente_id', 'grado_id', 'grupo_id', 'anio_lectivo', 'activo',
    ];

    protected $casts = [
        'anio_lectivo' => 'integer',
    ];

    public function docente()
    {
        return $this->belongsTo(Docente::class);
    }

    public function ambiente()
    {
        return $this->belongsTo(Ambiente::class);
    }

    public function grado()
    {
        return $this->belongsTo(Grado::class);
    }

    public function grupo()
    {
        return $this->belongsTo(Grupo::class);
    }

    public function getDescripcionAttribute(): string
    {
        return $this->ambiente->nombre.' → '.
               $this->grado->nombre.' '.$this->grupo->nombre;
    }

    public function scopeActivas($query)
    {
        return $query->where('estado', 'activo');
    }

    public function scopeDelAnio($query, $anio = null)
    {
        return $query->where('anio_lectivo', $anio ?? date('Y'));
    }
}
