<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class DocumentoCondicion extends Model
{
    protected $table = 'documentos_condiciones';

    protected $fillable = [
        'condicion_id',
        'nombre_archivo',
        'ruta_archivo',
        'numero_paginas',
        'tamano_mb',
        'usuario_id',
        'fecha_actualizacion',
    ];

    protected $casts = [
        'numero_paginas' => 'integer',
        'tamano_mb' => 'float',
        'fecha_actualizacion' => 'datetime',
    ];

    protected $appends = [
        'url_publica',
        'fecha_actualizacion_formato',
    ];

    public function condicion(): BelongsTo
    {
        return $this->belongsTo(CondicionInclusion::class, 'condicion_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function getUrlPublicaAttribute(): ?string
    {
        return $this->ruta_archivo
            ? Storage::disk('public')->url($this->ruta_archivo)
            : null;
    }

    public function getFechaActualizacionFormatoAttribute(): string
    {
        return $this->fecha_actualizacion
            ? Carbon::parse($this->fecha_actualizacion)
                ->locale('es')
                ->translatedFormat('d \d\e F \d\e Y \a \l\a\s H:i')
            : '—';
    }

    public function rutaAbsoluta(): ?string
    {
        if (! $this->ruta_archivo) {
            return null;
        }

        return Storage::disk('public')->path($this->ruta_archivo);
    }

    public function existeArchivo(): bool
    {
        return $this->ruta_archivo
            && Storage::disk('public')->exists($this->ruta_archivo);
    }
}
