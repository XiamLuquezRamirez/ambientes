<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Clase extends Model
{
    public const ESTADO_BORRADOR = 'borrador';

    public const ESTADO_ACTIVA = 'activa';

    public const ESTADO_FINALIZADA = 'finalizada';

    public const ESTADOS = [
        self::ESTADO_BORRADOR,
        self::ESTADO_ACTIVA,
        self::ESTADO_FINALIZADA,
    ];

    protected $table = 'clases';

    protected $fillable = [
        'carga_docente_id',
        'docente_id',
        'ambiente_id',
        'nombre',
        'descripcion',
        'fecha',
        'estado',
        'anio_lectivo',
    ];

    protected $casts = [
        'fecha' => 'date',
        'anio_lectivo' => 'integer',
    ];

    public function cargaDocente()
    {
        return $this->belongsTo(CargaDocente::class);
    }

    public function docente()
    {
        return $this->belongsTo(Docente::class);
    }

    public function ambiente()
    {
        return $this->belongsTo(Ambiente::class);
    }

    public function experienciasClase()
    {
        return $this->hasMany(ClaseExperiencia::class)->orderBy('orden')->orderBy('id');
    }

    public function experiencias()
    {
        return $this->belongsToMany(Experiencia::class, 'clase_experiencias')
            ->withPivot(['modulo_id', 'eje_id', 'tematica_id', 'orden'])
            ->orderByPivot('orden')
            ->orderByPivot('id');
    }

    /** Compatibilidad kiosco: primera experiencia de la clase. */
    public function getExperienciaIdAttribute(): ?int
    {
        return $this->primeraExperienciaClase()?->experiencia_id;
    }

    public function getModuloIdAttribute(): ?int
    {
        return $this->primeraExperienciaClase()?->modulo_id;
    }

    public function getEjeIdAttribute(): ?int
    {
        return $this->primeraExperienciaClase()?->eje_id;
    }

    public function getTematicaIdAttribute(): ?int
    {
        return $this->primeraExperienciaClase()?->tematica_id;
    }

    public function primeraExperienciaClase(): ?ClaseExperiencia
    {
        if ($this->relationLoaded('experienciasClase')) {
            return $this->experienciasClase->first();
        }

        return $this->experienciasClase()->first();
    }

    public function scopeDeCarga(Builder $query, int $cargaDocenteId): Builder
    {
        return $query->where('carga_docente_id', $cargaDocenteId);
    }

    public function scopeDelDocente(Builder $query, int $docenteId): Builder
    {
        return $query->where('docente_id', $docenteId);
    }

    public function scopeDelAnio(Builder $query, ?int $anio = null): Builder
    {
        return $query->where('anio_lectivo', $anio ?? (int) date('Y'));
    }

    public function etiquetaEstado(): string
    {
        return match ($this->estado) {
            self::ESTADO_ACTIVA => 'Activa',
            self::ESTADO_FINALIZADA => 'Finalizada',
            default => 'Borrador',
        };
    }

    public function badgeEstado(): string
    {
        return match ($this->estado) {
            self::ESTADO_ACTIVA => 'badge-green',
            self::ESTADO_FINALIZADA => 'badge-gray',
            default => 'badge-yellow',
        };
    }
}
