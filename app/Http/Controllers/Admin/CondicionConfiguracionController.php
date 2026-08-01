<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CondicionInclusion;
use App\Models\CondicionOrden;
use App\Models\Estudiante;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CondicionConfiguracionController extends Controller
{
    public function index(Request $request)
    {
        $institucionId = $this->institucionId();
        $this->asegurarPersonalizacion($institucionId);

        $consulta = CondicionOrden::query()
            ->where('condiciones_orden.id_institucion', $institucionId)
            ->with('condicion');

        if ($request->filled('buscar')) {
            $buscar = trim($request->get('buscar'));
            $consulta->whereHas('condicion', function ($q) use ($buscar) {
                $q->where('nombre', 'like', "%{$buscar}%")
                    ->orWhere('codigo', 'like', "%{$buscar}%");
            });
        }

        if ($request->filled('activa') && in_array($request->activa, ['1', '0'], true)) {
            $consulta->where('condiciones_orden.activa', (int) $request->activa);
        }

        if ($request->filled('ordenar') && in_array($request->ordenar, ['nombre', 'codigo'], true)) {
            $consulta->join('condiciones', 'condiciones.id', '=', 'condiciones_orden.id_condicion')
                ->orderBy('condiciones.'.$request->ordenar)
                ->select('condiciones_orden.*');
        } else {
            $consulta->orderBy('condiciones_orden.orden');
        }

        $items = $consulta->get();
        $conteos = $this->conteoEstudiantesPorCondicion($institucionId);

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('admin.configuracion.condiciones._lista', compact('items', 'conteos'))->render(),
            ]);
        }

        return view('admin.configuracion.condiciones.index', compact('items', 'conteos'));
    }

    public function actualizarEstado(Request $request, CondicionOrden $condicionOrden)
    {
        $this->autorizarOrden($condicionOrden);

        $condicionOrden->update([
            'activa' => ! $condicionOrden->activa,
        ]);

        return response()->json([
            'success' => true,
            'message' => $condicionOrden->activa
                ? 'Condición activada para la institución.'
                : 'Condición desactivada para la institución.',
            'activa' => (bool) $condicionOrden->activa,
        ]);
    }

    public function actualizarOrden(Request $request)
    {
        $institucionId = $this->institucionId();

        $datos = $request->validate([
            'orden' => 'required|array|min:1',
            'orden.*' => 'integer|distinct',
        ]);

        $ids = array_map('intval', $datos['orden']);

        $validos = CondicionOrden::query()
            ->where('id_institucion', $institucionId)
            ->whereIn('id', $ids)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (count($validos) !== count($ids)) {
            return response()->json([
                'success' => false,
                'message' => 'Hay condiciones inválidas en el orden enviado.',
            ], 422);
        }

        DB::transaction(function () use ($ids, $institucionId) {
            foreach ($ids as $posicion => $id) {
                CondicionOrden::query()
                    ->where('id_institucion', $institucionId)
                    ->where('id', $id)
                    ->update(['orden' => $posicion]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Orden actualizado correctamente.',
        ]);
    }

    private function asegurarPersonalizacion(int $institucionId): void
    {
        $catalogoIds = CondicionInclusion::query()->pluck('id');
        $existentes = CondicionOrden::query()
            ->where('id_institucion', $institucionId)
            ->pluck('id_condicion');

        $faltantes = $catalogoIds->diff($existentes);
        if ($faltantes->isEmpty()) {
            return;
        }

        $orden = (int) (CondicionOrden::query()
            ->where('id_institucion', $institucionId)
            ->max('orden') ?? -1);
        $ahora = now();
        $filas = [];

        foreach ($faltantes as $condicionId) {
            $orden++;
            $filas[] = [
                'id_institucion' => $institucionId,
                'id_condicion' => (int) $condicionId,
                'orden' => $orden,
                'activa' => 1,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ];
        }

        CondicionOrden::query()->insert($filas);
    }

    /**
     * @return array<int, array{total:int,activos:int}>
     */
    private function conteoEstudiantesPorCondicion(int $institucionId): array
    {
        $filas = Estudiante::query()
            ->selectRaw('condicion_id, COUNT(*) as total, SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos')
            ->where('institucion_id', $institucionId)
            ->whereNotNull('condicion_id')
            ->groupBy('condicion_id')
            ->get();

        $mapa = [];
        foreach ($filas as $fila) {
            $mapa[(int) $fila->condicion_id] = [
                'total' => (int) $fila->total,
                'activos' => (int) $fila->activos,
            ];
        }

        return $mapa;
    }

    private function institucionId(): int
    {
        $id = session('institucion_id');

        if (! $id) {
            abort(403, 'No se encontró la institución en sesión.');
        }

        return (int) $id;
    }

    private function autorizarOrden(CondicionOrden $orden): void
    {
        if ((int) $orden->id_institucion !== $this->institucionId()) {
            abort(403, 'No autorizado.');
        }
    }
}
