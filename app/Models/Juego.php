<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Juego extends Model
{
    use HasFactory;
    use Sincronizable;

    /**
     * Tipos de paquete del catálogo SuperAdmin (no confundir con motores
     * del constructor de experiencias: rompecabezas/memoria/colorear/secuencia).
     */
    public const TIPOS_LABELS = [
        'rompecabezas_cuerpo' => 'Rompecabezas del cuerpo',
        'reconocimiento_partes' => 'Reconocimiento de partes',
        'lateralidad' => 'Lateralidad (derecha/izquierda)',
        'secuencia_movimiento' => 'Secuencia de movimiento',
    ];

    public const TIPO_NUEVO = '__nuevo__';

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
        $labels = self::TIPOS_LABELS;

        $desdeDb = static::query()
            ->whereNotNull('tipo')
            ->where('tipo', '!=', '')
            ->where('tipo', '!=', self::TIPO_NUEVO)
            ->distinct()
            ->orderBy('tipo')
            ->pluck('tipo');

        foreach ($desdeDb as $tipo) {
            $clave = (string) $tipo;
            if ($clave === '' || isset($labels[$clave])) {
                continue;
            }
            $labels[$clave] = str_replace('_', ' ', ucwords($clave, '_'));
        }

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

    protected $fillable = [
        'ambiente_id',
        'modulo_id',
        'eje_id',
        'tematica_id',
        'tipo',
        'ruta',
        'nombre',
        'descripcion',
        'icono',
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

    public function tipoLabel(): string
    {
        return self::TIPOS_LABELS[$this->tipo] ?? $this->tipo;
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
