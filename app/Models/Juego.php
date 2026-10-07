<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\TiposJuego;

class Juego extends Model
{
    use HasFactory;
    use Sincronizable;

    /**
     * Tipos de paquete del catálogo SuperAdmin (no confundir con motores
     * del constructor de experiencias: rompecabezas/memoria/colorear/secuencia).
     */

    public const TIPO_NUEVO = '__nuevo__';

    /**
     * Paleta sugerida (sin color preseleccionado en el formulario).
     *
     * @var list<string>
     */
    public const COLORES_PALETA = [
        '#ef4444',
        '#f97316',
        '#f59e0b',
        '#eab308',
        '#84cc16',
        '#22c55e',
        '#14b8a6',
        '#06b6d4',
        '#0ea5e9',
        '#3b82f6',
        '#6366f1',
        '#8b5cf6',
        '#a855f7',
        '#d946ef',
        '#ec4899',
        '#f43f5e',
        '#64748b',
        '#0f172a',
    ];

    protected $primaryKey = 'slug';

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @return list<string>
     */
    public static function tiposPermitidos(): array
    {
        return array_keys(self::tiposCatalogo());
    }

    /**
     * Tipos conocidos + los ya usados en BD (para el select del CRUD).
     *
     * @return array<string, string> clave => etiqueta
     */
    public static function tiposCatalogo(): array
    {
        $labels = TiposJuego::query()
        ->where('activo', true)
        ->orderBy('nombre')
        ->pluck('nombre', 'slug')
        ->toArray();

        return $labels;
    }

    /**
     * ¿Clave de tipo válida? (snake_case, sin reservados).
     */
    public static function tipoEsValido(string $tipo): bool
    {
        if ($tipo === '' || $tipo === self::TIPO_NUEVO) {
            return false;
        }

        return (bool) preg_match('/^[a-z][a-z0-9_]{1,78}$/', $tipo);
    }

    /**
     * ¿Slug de juego válido? (kebab-case).
     */
    public static function slugEsValido(string $slug): bool
    {
        if ($slug === '') {
            return false;
        }

        return (bool) preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug);
    }

    /**
     * ¿Color hexadecimal válido (#RGB o #RRGGBB)?
     */
    public static function colorEsValido(string $color): bool
    {
        return (bool) preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $color);
    }

    protected $fillable = [
        'slug',
        'ambiente_id',
        'modulo_id',
        'eje_id',
        'tematica_id',
        'tipo_juego_id',
        'ruta',
        'nombre',
        'descripcion',
        'imagen',
        'color',
        'orden',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    public function urlPaquete(): ?string
    {
        if (! filled($this->ruta)) {
            return null;
        }

        return asset(trim((string) $this->ruta, '/').'/index.html');
    }

    /**
     * La imagen vive dentro de la carpeta del paquete; `?v=` evita caché al reemplazarla con el mismo nombre.
     */
    public function urlImagen(): ?string
    {
        if (! filled($this->ruta) || ! filled($this->imagen)) {
            return null;
        }

        $url = asset(trim((string) $this->ruta, '/').'/'.basename((string) $this->imagen));

        return $this->updated_at ? $url.'?v='.$this->updated_at->timestamp : $url;
    }

    public function tipoJuego()
    {
        return $this->belongsTo(TiposJuego::class, 'tipo_juego_id');
    }

    /**
     * Slug del tipo (el JS del catálogo de juegos envía y espera `tipo`).
     */
    public function getTipoAttribute(): ?string
    {
        $this->loadMissing('tipoJuego');

        return $this->tipoJuego?->slug;
    }

    public function tipoLabel(): string
    {
        $this->loadMissing('tipoJuego');

        return $this->tipoJuego?->nombre ?? 'Sin tipo';
    }

    public function ambiente()
    {
        return $this->belongsTo(Ambiente::class);
    }

    public function modulo()
    {
        return $this->belongsTo(Modulo::class);
    }

    public function eje()
    {
        return $this->belongsTo(Eje::class);
    }

    public function tematica()
    {
        return $this->belongsTo(Tematica::class);
    }

    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('activo', true);
    }

    /**
     * @return array{
     *     ambiente_id:?int, ambiente_nombre:?string,
     *     modulo_id:?int, modulo_nombre:?string,
     *     eje_id:?int, eje_nombre:?string,
     *     tematica_id:?int, tematica_nombre:?string
     * }
     */
    public function cadenaCurricularResuelta(): array
    {
        $this->loadMissing([
            'ambiente:id,nombre',
            'modulo:id,nombre,ambiente_id',
            'modulo.ambiente:id,nombre',
            'eje:id,nombre,modulo_id',
            'eje.modulo:id,nombre,ambiente_id',
            'eje.modulo.ambiente:id,nombre',
            'tematica:id,nombre,eje_id',
            'tematica.eje:id,nombre,modulo_id',
            'tematica.eje.modulo:id,nombre,ambiente_id',
            'tematica.eje.modulo.ambiente:id,nombre',
        ]);

        $vacio = [
            'ambiente_id' => null,
            'ambiente_nombre' => null,
            'modulo_id' => null,
            'modulo_nombre' => null,
            'eje_id' => null,
            'eje_nombre' => null,
            'tematica_id' => null,
            'tematica_nombre' => null,
        ];

        if ($this->tematica_id && $this->tematica) {
            $eje = $this->tematica->eje;
            $modulo = $eje?->modulo;
            $ambiente = $modulo?->ambiente;

            return [
                'ambiente_id' => $ambiente?->id,
                'ambiente_nombre' => $ambiente?->nombre,
                'modulo_id' => $modulo?->id,
                'modulo_nombre' => $modulo?->nombre,
                'eje_id' => $eje?->id,
                'eje_nombre' => $eje?->nombre,
                'tematica_id' => $this->tematica->id,
                'tematica_nombre' => $this->tematica->nombre,
            ];
        }

        if ($this->eje_id && $this->eje) {
            $modulo = $this->eje->modulo;
            $ambiente = $modulo?->ambiente;

            return array_merge($vacio, [
                'ambiente_id' => $ambiente?->id,
                'ambiente_nombre' => $ambiente?->nombre,
                'modulo_id' => $modulo?->id,
                'modulo_nombre' => $modulo?->nombre,
                'eje_id' => $this->eje->id,
                'eje_nombre' => $this->eje->nombre,
            ]);
        }

        if ($this->modulo_id && $this->modulo) {
            $ambiente = $this->modulo->ambiente;

            return array_merge($vacio, [
                'ambiente_id' => $ambiente?->id,
                'ambiente_nombre' => $ambiente?->nombre,
                'modulo_id' => $this->modulo->id,
                'modulo_nombre' => $this->modulo->nombre,
            ]);
        }

        if ($this->ambiente_id && $this->ambiente) {
            return array_merge($vacio, [
                'ambiente_id' => $this->ambiente->id,
                'ambiente_nombre' => $this->ambiente->nombre,
            ]);
        }

        return $vacio;
    }
}
