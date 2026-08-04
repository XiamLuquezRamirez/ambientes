<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
class PerfilAprendizajePersonalizado extends Model
{
    protected $table = 'condiciones_transitorias';

    protected $fillable = [
        'id_institucion',
        'codigo',
        'etiqueta',
        'descripcion_interna',
        'condicion_base_id',
        'es_sistema',
        'estado',
        'usuario_crea',
    ];

    protected $casts = [
        'es_sistema' => 'boolean',
        'estado' => 'integer',
    ];

    public static function generarCodigo(): string
    {
        $siguiente = (int) (static::query()->max('id') ?? 0) + 1;

        do {
            $codigo = 'CTR-'.str_pad((string) $siguiente, 3, '0', STR_PAD_LEFT);
            $siguiente++;
        } while (static::where('codigo', $codigo)->exists());

        return $codigo;
    }

    public function condicionBase(): BelongsTo
    {
        return $this->belongsTo(PerfilAprendizajeInclusion::class, 'condicion_base_id');
    }

    public function institucion(): BelongsTo
    {
        return $this->belongsTo(Institucion::class, 'id_institucion');
    }

    public function creador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_crea');
    }

    public function estudiantes(): HasMany
    {
        return $this->hasMany(Estudiante::class, 'condicion_transitoria_id');
    }

    public function asignacionesEstudiante(): HasMany
    {
        return $this->hasMany(EstudiantePerfilAprendizajePersonalizado::class, 'id_condicion_transitoria');
    }

    public function activa(): bool
    {
        return (int) $this->estado === 1;
    }

    public function creadaPorDocente(): bool
    {
        $this->loadMissing('creador');

        return $this->creador?->esDocente() ?? false;
    }

    public function esDelUsuario(?int $userId): bool
    {
        if ($userId === null) {
            return false;
        }

        return (int) $this->usuario_crea === (int) $userId;
    }

    public function scopeActivas(Builder $query): Builder
    {
        return $query->where('estado', 1);
    }

    public function scopeOrdenadas(Builder $query): Builder
    {
        return $query
            ->orderBy('condicion_base_id')
            ->orderBy('etiqueta');
    }

    public function scopeDeInstitucion(Builder $query, ?int $institucionId): Builder
    {
        if ($institucionId === null) {
            return $query->whereNull('id_institucion');
        }

        return $query->where(function ($q) use ($institucionId) {
            $q->whereNull('id_institucion')
                ->orWhere('id_institucion', $institucionId);
        });
    }
}
