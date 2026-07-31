<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\CondicionInclusion;
use App\Models\CondicionOrden;
use Illuminate\Support\Facades\DB;

class CondicionOrdenController extends Controller
{
    /**
     * Sincroniza las condiciones de una institución.
     * Guarda todas las condiciones del catálogo; las marcadas quedan activas.
     *
     * @param  array<int|string, mixed>  $seleccion  claves = id_condicion; valor con activa/orden opcionales
     */
    public function sincronizarParaInstitucion(int $institucionId, array $seleccion = []): void
    {
        $catalogo = CondicionInclusion::query()->ordenadas()->get(['id']);

        DB::transaction(function () use ($institucionId, $seleccion, $catalogo) {
            CondicionOrden::query()
                ->where('id_institucion', $institucionId)
                ->delete();

            $filas = [];
            $ahora = now();
            $ordenAuto = 0;

            foreach ($catalogo as $condicion) {
                $id = (int) $condicion->id;
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
                    'id_institucion' => $institucionId,
                    'id_condicion' => $id,
                    'orden' => $orden,
                    'activa' => $activa ? 1 : 0,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ];
                $ordenAuto++;
            }

            if ($filas !== []) {
                CondicionOrden::query()->insert($filas);
            }
        });
    }

    /**
     * @return array<int, array{id_condicion:int,orden:int,activa:bool}>
     */
    public function listarPorInstitucion(int $institucionId): array
    {
        return CondicionOrden::query()
            ->where('id_institucion', $institucionId)
            ->orderBy('orden')
            ->get(['id_condicion', 'orden', 'activa'])
            ->map(fn (CondicionOrden $row) => [
                'id_condicion' => (int) $row->id_condicion,
                'orden' => (int) $row->orden,
                'activa' => (bool) $row->activa,
            ])
            ->all();
    }
}
