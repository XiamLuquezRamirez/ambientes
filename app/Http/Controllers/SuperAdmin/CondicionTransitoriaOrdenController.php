<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\CondicionTransitoria;
use App\Models\CondicionTransitoriaOrden;
use Illuminate\Support\Facades\DB;

class CondicionTransitoriaOrdenController extends Controller
{
    /**
     * Sincroniza las condiciones transitorias de una institución.
     *
     * @param  array<int|string, mixed>  $seleccion  claves = id_condicion_transitoria
     */
    public function sincronizarParaInstitucion(int $institucionId, array $seleccion = []): void
    {
        $catalogo = CondicionTransitoria::query()->ordenadas()->get(['id']);

        DB::transaction(function () use ($institucionId, $seleccion, $catalogo) {
            CondicionTransitoriaOrden::query()
                ->where('id_institucion', $institucionId)
                ->delete();

            $filas = [];
            $ahora = now();
            $ordenAuto = 0;

            foreach ($catalogo as $condicion) {
                $id = (int) $condicion->id;
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
                    'id_institucion' => $institucionId,
                    'id_condicion_transitoria' => $id,
                    'orden' => $orden,
                    'activa' => $activa ? 1 : 0,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ];
                $ordenAuto++;
            }

            if ($filas !== []) {
                CondicionTransitoriaOrden::query()->insert($filas);
            }
        });
    }

    /**
     * @return array<int, array{id_condicion_transitoria:int,orden:int,activa:bool}>
     */
    public function listarPorInstitucion(int $institucionId): array
    {
        return CondicionTransitoriaOrden::query()
            ->where('id_institucion', $institucionId)
            ->orderBy('orden')
            ->get(['id_condicion_transitoria', 'orden', 'activa'])
            ->map(fn (CondicionTransitoriaOrden $row) => [
                'id_condicion_transitoria' => (int) $row->id_condicion_transitoria,
                'orden' => (int) $row->orden,
                'activa' => (bool) $row->activa,
            ])
            ->all();
    }
}
