<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\PerfilAprendizajePersonalizado;
use App\Models\PerfilAprendizajePersonalizadoOrden;
use Illuminate\Support\Facades\DB;

class PerfilAprendizajePersonalizadoOrdenController extends Controller
{
    /**
     * Sincroniza los perfiles de aprendizaje personalizados de una institución.
     *
     * @param  array<int|string, mixed>  $seleccion  claves = perfil_aprendizaje_personalizado_id
     */
    public function sincronizarParaInstitucion(int $institucionId, array $seleccion = []): void
    {
        // Globales (null) + propias de la institución.
        $catalogo = PerfilAprendizajePersonalizado::query()
            ->where(function ($q) use ($institucionId) {
                $q->whereNull('institucion_id')
                    ->orWhere('institucion_id', $institucionId);
            })
            ->ordenadas()
            ->get(['id']);

        DB::transaction(function () use ($institucionId, $seleccion, $catalogo) {
            PerfilAprendizajePersonalizadoOrden::query()
                ->where('institucion_id', $institucionId)
                ->delete();

            $filas = [];
            $ahora = now();
            $ordenAuto = 0;

            foreach ($catalogo as $perfilAprendizajePersonalizado) {
                $id = (int) $perfilAprendizajePersonalizado->id;
                $item = $seleccion[$id] ?? $seleccion[(string) $id] ?? null;

                if ($seleccion === []) {
                    $activa = true;
                } else {
                    $activa = is_array($item) && ! empty($item['activa']);
                }

                $orden = is_array($item) && isset($item['orden'])
                    ? (int) $item['orden']
                    : $ordenAuto;

                $filas[] = [
                    'institucion_id' => $institucionId,
                    'perfil_aprendizaje_personalizado_id' => $id,
                    'orden' => $orden,
                    'activa' => $activa ? 1 : 0,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ];
                $ordenAuto++;
            }

            if ($filas !== []) {
                PerfilAprendizajePersonalizadoOrden::query()->insert($filas);
            }
        });
    }

    /**
     * @return array<int, array{perfil_aprendizaje_personalizado_id:int,orden:int,activa:bool}>
     */
    public function listarPorInstitucion(int $institucionId): array
    {
        return PerfilAprendizajePersonalizadoOrden::query()
            ->where('institucion_id', $institucionId)
            ->orderBy('orden')
            ->get(['perfil_aprendizaje_personalizado_id', 'orden', 'activa'])
            ->map(fn (PerfilAprendizajePersonalizadoOrden $row) => [
                'perfil_aprendizaje_personalizado_id' => (int) $row->perfil_aprendizaje_personalizado_id,
                'orden' => (int) $row->orden,
                'activa' => (bool) $row->activa,
            ])
            ->all();
    }
}
