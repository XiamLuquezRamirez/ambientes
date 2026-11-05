<?php

namespace App\Services;

use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajeOrden;
use App\Models\PerfilAprendizajePersonalizado;
use App\Models\PerfilAprendizajePersonalizadoOrden;

/**
 * Garantiza que la institución tenga su fila de orden/activación para cada perfil del catálogo
 * y siembra los parámetros por defecto cuando se agregan perfiles nuevos.
 */
class PersonalizacionPerfilAprendizajeService
{
    public function __construct(
        private readonly ParametrosPerfilAprendizajeService $parametros
    ) {
    }

    /**
     * Perfiles de inclusión (catálogo oficial) → perfil_aprendizaje_orden.
     */
    public function asegurarInclusion(int $institucionId): void
    {
        $catalogoIds = PerfilAprendizajeInclusion::query()->pluck('id');

        $insertadas = $this->insertarFaltantes(
            PerfilAprendizajeOrden::class,
            'perfil_aprendizaje_id',
            $institucionId,
            $catalogoIds
        );

        if ($insertadas) {
            $this->parametros->sembrarInstitucion($institucionId);
        }
    }

    /**
     * Perfiles personalizados (sistema + propios del colegio) → perfil_aprendizaje_personalizado_orden.
     */
    public function asegurarPersonalizado(int $institucionId): void
    {
        $catalogoIds = PerfilAprendizajePersonalizado::query()
            ->where(function ($q) use ($institucionId) {
                $q->whereNull('institucion_id')
                    ->orWhere('institucion_id', $institucionId);
            })
            ->pluck('id');

        $insertadas = $this->insertarFaltantes(
            PerfilAprendizajePersonalizadoOrden::class,
            'perfil_aprendizaje_personalizado_id',
            $institucionId,
            $catalogoIds
        );

        if ($insertadas) {
            $this->parametros->sembrarInstitucion($institucionId);
        }
    }

    /**
     * Inserta al final del orden los perfiles del catálogo que la institución aún no tiene.
     *
     * @param  class-string<\Illuminate\Database\Eloquent\Model>  $modeloOrden
     * @param  \Illuminate\Support\Collection<int, int>  $catalogoIds
     */
    private function insertarFaltantes(string $modeloOrden, string $columnaPerfil, int $institucionId, $catalogoIds): bool
    {
        $existentes = $modeloOrden::query()
            ->where('institucion_id', $institucionId)
            ->pluck($columnaPerfil);

        $faltantes = $catalogoIds->diff($existentes);
        if ($faltantes->isEmpty()) {
            return false;
        }

        $orden = (int) ($modeloOrden::query()
            ->where('institucion_id', $institucionId)
            ->max('orden') ?? -1);
        $ahora = now();
        $filas = [];

        foreach ($faltantes as $perfilId) {
            $orden++;
            $filas[] = [
                'institucion_id' => $institucionId,
                $columnaPerfil => (int) $perfilId,
                'orden' => $orden,
                'activa' => 1,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ];
        }

        $modeloOrden::query()->insert($filas);

        return true;
    }
}
