<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PerfilAprendizajeInclusion extends Model
{
    protected $table = 'perfil_aprendizaje';

    public const CREATED_AT = null;

    public const UPDATED_AT = 'fecha_ultima_edicion';

    protected $fillable = [
        'codigo',
        'nombre',
        'descripcion_corta',
        'estado',
        'color_hex',
        'es_sistema',
        'vista_info_asociada',
        'eliminado',
    ];

    protected $casts = [
        'es_sistema' => 'boolean',
        'estado' => 'integer',
    ];

    protected $appends = [
        'fecha_ultima_edicion_formato',
    ];

    public static function generarCodigo(): string
    {
        $siguiente = (int) (static::query()->max('id') ?? 0) + 1;

        do {
            $codigo = 'COND-'.str_pad((string) $siguiente, 3, '0', STR_PAD_LEFT);
            $siguiente++;
        } while (static::where('codigo', $codigo)->exists());

        return $codigo;
    }

    public function estudiantes(): HasMany
    {
        return $this->hasMany(Estudiante::class, 'perfil_aprendizaje_id');
    }

    public function perfilesAprendizajePersonalizado(): HasMany
    {
        return $this->hasMany(PerfilAprendizajePersonalizado::class, 'perfil_aprendizaje_id');
    }

    public function activa(): bool
    {
        return (int) $this->estado === 1;
    }

    public function cantidadEstudiantes(): int
    {
        if (array_key_exists('estudiantes_count', $this->attributes)) {
            return (int) $this->estudiantes_count;
        }

        return $this->estudiantes()->count();
    }

    public function scopeActivas(Builder $query): Builder
    {
        return $query->where('estado', 1);
    }

    public function scopeOrdenadas(Builder $query): Builder
    {
        return $query->orderBy('nombre');
    }

    public function getFechaUltimaEdicionFormatoAttribute(): string
    {
        return $this->fecha_ultima_edicion
            ? Carbon::parse($this->fecha_ultima_edicion)
                ->locale('es')
                ->translatedFormat('d \d\e F \d\e Y \a \l\a\s H:i')
            : '—';
    }
}
