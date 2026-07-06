<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class Grupo extends Model
{
    use Sincronizable;

    protected $table = 'grupos';

    protected $fillable = ['grado_id', 'nombre', 'anio_lectivo', 'cupo_maximo', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    /**
     * Relación con el grado al que pertenece el grupo.
     */
    public function grado()
    {
        return $this->belongsTo(Grado::class);
    }

    /**
     * Relación con las matrículas que pertenecen a este grupo.
     */
    public function matriculas()
    {
        return $this->hasMany(Matricula::class);
    }

    /**
     * Relación con las cargas docentes asociadas al grupo.
     */
    public function cargasDocente()
    {
        return $this->hasMany(CargaDocente::class);
    }

    /**
     * Atributo calculado para mostrar el nombre completo del grupo.
     *
     * Combina el nombre del grado con la letra del grupo.
     */
    public function getNombreCompletoAttribute(): string
    {
        return $this->grado->nombre.' '.$this->nombre;
    }

    /**
     * Cuenta las matrículas activas del grupo para un año lectivo dado.
     *
     * Si no se especifica año, usa el año actual.
     */
    public function totalMatriculas(?int $anio = null): int
    {
        return $this->matriculas()
            ->where('estado', 'activo')
            ->where('anio_lectivo', $anio ?? date('Y'))
            ->count();
    }

    public function docentes()
    {
        return $this->belongsToMany(Docente::class, 'carga_docente', 'grupo_id', 'docente_id')
            ->withPivot(['ambiente_id', 'anio_lectivo', 'activo'])
            ->wherePivot('activo', true)
            ->wherePivot('anio_lectivo', date('Y'));
    }

    public function docentesDelAnio(int $anio)
    {
        return $this->belongsToMany(Docente::class, 'carga_docente', 'grupo_id', 'docente_id')
            ->withPivot(['ambiente_id', 'anio_lectivo', 'activo'])
            ->wherePivot('activo', true)
            ->wherePivot('anio_lectivo', $anio);
    }

    public function cargasDocenteDelAnio(?int $anio = null)
    {
        return $this->hasMany(CargaDocente::class)
            ->where('activo', true)
            ->where('anio_lectivo', $anio ?? date('Y'));
    }

    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    public function scopeDelAnio($query, $anio = null)
    {
        return $query->where('anio_lectivo', $anio ?? date('Y'));
    }

    /**
     * Datos del grupo para refrescar el modal "Docentes asignados" sin recargar la página.
     */
    public function datosParaModalDocentesAsignados(?int $anio = null): array
    {
        $anio = $anio ?? (int) date('Y');

        $this->load([
            'grado',
            'cargasDocente' => function ($q) use ($anio) {
                $q->where('activo', true)
                    ->where('anio_lectivo', $anio)
                    ->with(['docente.user', 'ambiente']);
            },
        ]);

        $asignaciones = $this->cargasDocente
            ->filter(fn ($carga) => $carga->docente)
            ->map(fn ($carga) => [
                'ambiente' => $carga->ambiente?->nombre ?? '—',
                'docente' => trim($carga->docente->user->nombre.' '.$carga->docente->user->apellido),
            ])
            ->values();

        $totalEstudiantes = $this->totalMatriculas($anio);

        return [
            'grupo_id' => $this->id,
            'grado_id' => $this->grado_id,
            'anio' => $anio,
            'grado' => $this->grado->nombre,
            'grupo' => $this->nombre,
            'asignaciones' => $asignaciones->all(),
            'estudiantes' => $totalEstudiantes,
            'alerta_sin_docente' => $totalEstudiantes > 0 && $asignaciones->isEmpty(),
        ];
    }
}
