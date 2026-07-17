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

    public function asistencias()
    {
        return $this->hasMany(Asistencia::class);
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

    public static function asignarConteoEstudiantes(iterable $cargas, ?int $anio = null): void
    {
        $anio = $anio ?? (int) date('Y');

        $coleccion = collect($cargas)->filter(function ($carga) {
            return $carga && $carga->ambiente_id && $carga->grado_id && $carga->grupo_id;
        });

        if ($coleccion->isEmpty()) {
            return;
        }

        $ambienteIds = $coleccion->pluck('ambiente_id')->unique()->values();
        $gradoIds = $coleccion->pluck('grado_id')->unique()->values();
        $grupoIds = $coleccion->pluck('grupo_id')->unique()->values();

        $conteos = EstudianteAmbiente::query()
            ->join('matriculas', function ($join) {
                $join->on('matriculas.estudiante_id', '=', 'estudiante_ambiente.estudiante_id')
                    ->whereColumn('matriculas.anio_lectivo', 'estudiante_ambiente.anio_lectivo')
                    ->where('matriculas.estado', 'activo');
            })
            ->where('estudiante_ambiente.estado', 'activo')
            ->where('estudiante_ambiente.anio_lectivo', $anio)
            ->whereIn('estudiante_ambiente.ambiente_id', $ambienteIds)
            ->whereIn('matriculas.grado_id', $gradoIds)
            ->whereIn('matriculas.grupo_id', $grupoIds)
            ->selectRaw(
                'estudiante_ambiente.ambiente_id, matriculas.grado_id, matriculas.grupo_id, COUNT(DISTINCT estudiante_ambiente.estudiante_id) as total'
            )
            ->groupBy('estudiante_ambiente.ambiente_id', 'matriculas.grado_id', 'matriculas.grupo_id')
            ->get()
            ->keyBy(function ($item) {
                return "{$item->ambiente_id}-{$item->grado_id}-{$item->grupo_id}";
            });

        $coleccion->each(function ($carga) use ($conteos) {
            $clave = "{$carga->ambiente_id}-{$carga->grado_id}-{$carga->grupo_id}";
            $carga->total_estudiantes = $conteos[$clave]->total ?? 0;
        });
    }

    public static function obtenerIdsEstudiantesDeCargas(iterable $cargas, ?int $anio = null)
    {
        $anio = $anio ?? (int) date('Y');

        $coleccion = collect($cargas)->filter(function ($carga) {
            return $carga && $carga->ambiente_id && $carga->grado_id && $carga->grupo_id;
        });

        if ($coleccion->isEmpty()) {
            return collect();
        }

        $combos = $coleccion
            ->map(fn ($carga) => [
                'ambiente_id' => $carga->ambiente_id,
                'grado_id' => $carga->grado_id,
                'grupo_id' => $carga->grupo_id,
            ])
            ->unique()
            ->values();

        return EstudianteAmbiente::query()
            ->join('matriculas', function ($join) {
                $join->on('matriculas.estudiante_id', '=', 'estudiante_ambiente.estudiante_id')
                    ->whereColumn('matriculas.anio_lectivo', 'estudiante_ambiente.anio_lectivo')
                    ->where('matriculas.estado', 'activo');
            })
            ->where('estudiante_ambiente.estado', 'activo')
            ->where('estudiante_ambiente.anio_lectivo', $anio)
            ->where(function ($query) use ($combos) {
                foreach ($combos as $combo) {
                    $query->orWhere(function ($where) use ($combo) {
                        $where->where('estudiante_ambiente.ambiente_id', $combo['ambiente_id'])
                            ->where('matriculas.grado_id', $combo['grado_id'])
                            ->where('matriculas.grupo_id', $combo['grupo_id']);
                    });
                }
            })
            ->distinct()
            ->pluck('estudiante_ambiente.estudiante_id');
    }
}
