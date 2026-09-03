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

    public const TIPO_ROMPECABEZAS = 'rompecabezas';

    public const TIPO_MEMORIA = 'memoria';

    public const TIPO_COLOREAR = 'colorear';

    public const TIPO_SECUENCIA = 'secuencia';

    public const TIPOS = [
        self::TIPO_ROMPECABEZAS,
        self::TIPO_MEMORIA,
        self::TIPO_COLOREAR,
        self::TIPO_SECUENCIA,
    ];

    public const TIPOS_LABELS = [
        self::TIPO_ROMPECABEZAS => 'Rompecabezas',
        self::TIPO_MEMORIA => 'Memoria',
        self::TIPO_COLOREAR => 'Colorear',
        self::TIPO_SECUENCIA => 'Secuencia',
    ];

    protected $fillable = [
        'ambiente_id',
        'modulo_id',
        'eje_id',
        'tematica_id',
        'tipo',
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
