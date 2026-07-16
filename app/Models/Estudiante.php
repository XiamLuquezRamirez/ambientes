<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Estudiante extends Model
{
    use Sincronizable;

    protected $fillable = ['avatar', 'tipo_identificacion', 'otro_tipo_identificacion', 'identificacion', 'nombre', 'apellido', 'iniciales', 'grado_id', 'atencion_id', 'estado_id', 'color_avatar', 'condicion', 'activo', 'fecha_nacimiento', 'sexo', 'acudiente', 'telefono_acudiente', 'requiere_apoyo', 'estado_piar', 'lugar_nacimiento', 'departamento_id', 'municipio_id', 'barrio_vereda', 'direccion', 'telefono', 'email'];

    protected $casts = [
        'edad' => 'integer',
    ];

    protected $with = ['departamento', 'municipio', 'piar'];

    public function getEdadAttribute()
    {
        if (! $this->fecha_nacimiento) {
            return null;
        } else {
            return Carbon::parse($this->fecha_nacimiento)->diffInYears(Carbon::now());
        }
    }

    protected function nombreCompleto(): Attribute
    {
        return Attribute::make(
            get: fn () => trim("{$this->nombre} {$this->apellido}")
        );
    }



    protected function colorAvatar(): Attribute
    {
        return Attribute::make(
            get: function () {

                $colors = [
                    '#2563EB',
                    '#7C3AED',
                    '#059669',
                    '#DC2626',
                    '#EA580C',
                    '#0891B2',
                    '#DB2777',
                    '#4338CA',
                ];

                return $colors[$this->id % count($colors)];
            }
        );
    }

    protected function avatarUrl(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->avatar
                ? Storage::url($this->avatar)
                : null
        );
    }

    protected function tienePin(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->configuracionPin !== null
        );
    }

    /** sin_configurar | configurado | bloqueado */
    protected function estadoPin(): Attribute
    {
        return Attribute::make(
            get: function () {
                $pin = $this->configuracionPin;
                if ($pin === null) {
                    return 'sin_configurar';
                }

                return $pin->estaBloqueado() ? 'bloqueado' : 'configurado';
            }
        );
    }

    protected function condicionNombre(): Attribute
    {
        return Attribute::make(
            get: function () {
                $condicion = $this->relationLoaded('condicion')
                    ? $this->getRelation('condicion')
                    : $this->condicion()->first();

                return $condicion?->nombre ?? 'Estándar';
            }
        );
    }

    /** Condición distinta de estándar → requiere seguimiento PIAR / botón Ver PIAR */
    protected function condicionEsEstandar(): Attribute
    {
        return Attribute::make(
            get: function () {
                $nombre = mb_strtolower(trim((string) $this->condicion_nombre));
                $normalizado = str_replace(['á', 'é', 'í', 'ó', 'ú'], ['a', 'e', 'i', 'o', 'u'], $nombre);

                return $normalizado === '' || $normalizado === 'estandar';
            }
        );
    }

    protected function estadoTexto(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->activo
                ? 'Activo'
                : 'Inactivo'
        );
    }

    protected function estadoBadge(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->activo
                ? 'badge-green'
                : 'badge-red'
        );
    }

    public function matriculas()
    {
        return $this->hasMany(Matricula::class);
    }

    public function matricula()
    {
        return $this->hasOne(Matricula::class)->where('estado', 'activo');
    }

    public function grado()
    {
        return $this->belongsTo(Grado::class);
    }

    public function condicion()
    {
        return $this->belongsTo(Condicion::class, 'condicion_id');
    }

    public function observaciones()
    {
        return $this->hasMany(Observacion::class);
    }

    public function matriculaActiva()
    {
        return $this->hasOne(Matricula::class)
            ->where('estado', 'activo')
            ->where('anio_lectivo', date('Y')
            );
    }

    public function departamento()
    {
        return $this->belongsTo(Departamento::class, 'departamento_id', 'codigo');
    }

    public function municipio()
    {
        return $this->belongsTo(Municipio::class, 'municipio_id', 'id');
    }

    public function matriculasActivas()
    {
        return $this->hasMany(Matricula::class)
            ->where('estado', 'activo')
            ->where('anio_lectivo', date('Y'));
    }

    public function piar()
    {
        return $this->hasOne(Piar::class);
    }

    public function portafolios()
    {
        return $this->hasMany(Portafolio::class);
    }

    public function ajustesTemporales()
    {
        return $this->hasMany(AjusteTemporal::class);
    }

    public function configuracionPin()
    {
        return $this->hasOne(ConfiguracionPin::class, 'estudiante_id', 'id');
    }

    public function ambientes()
    {
        return $this->belongsToMany(Ambiente::class, 'estudiante_ambiente')
            ->withPivot(['anio_lectivo', 'estado', 'observacion'])
            ->withTimestamps();
    }

    public function asignacionesAmbiente()
    {
        return $this->hasMany(EstudianteAmbiente::class);
    }
}
