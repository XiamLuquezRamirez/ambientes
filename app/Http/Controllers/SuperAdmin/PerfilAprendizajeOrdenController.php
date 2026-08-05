<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajeOrden;
use Illuminate\Support\Facades\DB;

class PerfilAprendizajeOrdenController extends Controller
{
    /**
     * Sincroniza los perfiles de aprendizaje de una institución.
     * Guarda todos los perfiles de aprendizaje del catálogo; los marcados quedan activos.
     *
     * @param  array<int|string, mixed>  $seleccion  claves = perfil_aprendizaje_id; valor con activa/orden opcionales
     */
    public function sincronizarParaInstitucion(int $institucionId, array $seleccion = []): void
    {
        $catalogo = PerfilAprendizajeInclusion::query()->ordenadas()->get(['id']);

        DB::transaction(function () use ($institucionId, $seleccion, $catalogo) {
            PerfilAprendizajeOrden::query()
                ->where('institucion_id', $institucionId)
                ->delete();

            $filas = [];
            $ahora = now();
            $ordenAuto = 0;

            foreach ($catalogo as $perfilAprendizaje) {
                $id = (int) $perfilAprendizaje->id;
                $item = $seleccion[$id] ?? $seleccion[(string) $id] ?? null;

                // Sin payload: activar todas. Con payload: solo las marcadas.
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
                    'perfil_aprendizaje_id' => $id,
                    'orden' => $orden,
                    'activa' => $activa ? 1 : 0,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ];
                $ordenAuto++;
            }

            if ($filas !== []) {
                PerfilAprendizajeOrden::query()->insert($filas);
            }
        });
    }

    /**
     * @return array<int, array{perfil_aprendizaje_id:int,orden:int,activa:bool}>
     */
    public function listarPorInstitucion(int $institucionId): array
    {
        return PerfilAprendizajeOrden::query()
            ->where('institucion_id', $institucionId)
            ->orderBy('orden')
            ->get(['perfil_aprendizaje_id', 'orden', 'activa'])
            ->map(fn (PerfilAprendizajeOrden $row) => [
                'perfil_aprendizaje_id' => (int) $row->perfil_aprendizaje_id,
                'orden' => (int) $row->orden,
                'activa' => (bool) $row->activa,
            ])
            ->all();
    }
}
