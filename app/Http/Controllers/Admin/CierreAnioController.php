<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Grupo;
use App\Models\Matricula;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CierreAnioController extends Controller
{
    public function index()
    {
        return view('admin.cierre.index', [
            'anioInicio' => 2024,
            'anioActual' => (int) date('Y'),
        ]);
    }

    public function grupos(Request $request)
    {
        $anio = (int) $request->get('anio', date('Y'));

        $grupos = Grupo::with('grado')
            ->where('anio_lectivo', $anio)
            ->withCount([
                'matriculas as activas_count' => fn($q) => $q->where('estado', 'activo')->where('anio_lectivo', $anio),
            ])
            ->get()
            ->filter(fn($g) => $g->activas_count > 0)
            ->map(fn($g) => [
                'id'    => $g->id,
                'label' => ($g->grado?->nombre ?? '—') . ' — Grupo ' . $g->nombre
                         . ' (' . $g->activas_count . ' activos)',
            ])
            ->values();

        return response()->json(['ok' => true, 'grupos' => $grupos]);
    }

    public function estudiantes(Request $request)
    {
        $anio    = (int) $request->get('anio', date('Y'));
        $grupoId = (int) $request->get('grupo_id');

        $matriculas = Matricula::with('estudiante')
            ->where('grupo_id', $grupoId)
            ->where('anio_lectivo', $anio)
            ->where('estado', 'activo')
            ->get()
            ->sortBy('estudiante.nombre')
            ->values()
            ->map(fn($m) => [
                'matricula_id' => $m->id,
                'estudiante_id'=> $m->estudiante_id,
                'nombre'       => $m->estudiante->nombre,
                'iniciales'    => $m->estudiante->iniciales ?? mb_substr($m->estudiante->nombre, 0, 2),
                'color_avatar' => $m->estudiante->color_avatar ?? '#2563EB',
                'fecha_nacimiento' => $m->estudiante->fecha_nacimiento,
            ]);

        return response()->json(['ok' => true, 'estudiantes' => $matriculas]);
    }
    

    public function aplicar(Request $request)
    {
        $datos = $request->validate([
            'matricula_ids'    => 'required|array|min:1',
            'matricula_ids.*'  => 'exists:matriculas,id',
            'estado'           => 'required|in:promovido,graduado,retirado',
            'grupo_destino_id' => 'nullable|exists:grupos,id',
            'anio_destino'     => 'nullable|integer|min:2024|max:2030',
        ]);

        if ($datos['estado'] === 'promovido' && empty($datos['grupo_destino_id'])) {
            return response()->json([
                'ok'      => false,
                'mensaje' => 'Selecciona un grupo destino para los estudiantes promovidos.',
            ], 422);
        }

        $matriculas = Matricula::whereIn('id', $datos['matricula_ids'])
            ->where('estado', 'activo')
            ->get();

        if ($matriculas->isEmpty()) {
            return response()->json([
                'ok'      => false,
                'mensaje' => 'No se encontraron matrículas activas en la selección.',
            ], 422);
        }

        $grupoDestino = $datos['estado'] === 'promovido'
            ? Grupo::findOrFail($datos['grupo_destino_id'])
            : null;

        $aplicadas = 0;
        $nuevas    = 0;
        $omitidas  = 0;

        DB::beginTransaction();
        try {
            foreach ($matriculas as $m) {
                $m->update([
                    'estado'       => $datos['estado'],
                    'fecha_egreso' => now()->toDateString(),
                ]);
                $aplicadas++;

                if ($grupoDestino) {
                    $yaExiste = Matricula::where('estudiante_id', $m->estudiante_id)
                        ->where('anio_lectivo', $datos['anio_destino'])
                        ->exists();

                    if ($yaExiste) { $omitidas++; continue; }

                    Matricula::create([
                        'estudiante_id' => $m->estudiante_id,
                        'grado_id'      => $grupoDestino->grado_id,
                        'grupo_id'      => $grupoDestino->id,
                        'anio_lectivo'  => $datos['anio_destino'],
                        'estado'        => 'activo',
                        'fecha_ingreso' => now()->toDateString(),
                    ]);
                    $nuevas++;
                }
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['ok' => false, 'mensaje' => 'Error al procesar: ' . $e->getMessage()], 500);
        }

        $partes = ["{$aplicadas} estudiante(s) marcados como \"{$datos['estado']}\""];
        if ($nuevas   > 0) $partes[] = "{$nuevas} matrícula(s) creadas para {$datos['anio_destino']}";
        if ($omitidas > 0) $partes[] = "{$omitidas} omitido(s) (ya matriculados en {$datos['anio_destino']})";

        return response()->json([
            'ok'       => true,
            'mensaje'  => implode(', ', $partes) . '.',
            'aplicadas'=> $aplicadas,
            'nuevas'   => $nuevas,
            'omitidas' => $omitidas,
        ]);
    }
}
