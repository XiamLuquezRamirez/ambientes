<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use App\Models\Grado;
use App\Models\Grupo;
use App\Models\Matricula;
use Illuminate\Http\Request;

class MatriculaAdminController extends Controller
{
    public function index(Request $request)
    {
        if ($request->ajax()) {
            return $this->tablaResponse($request);
        }

        $matriculas = $this->queryBase($request)->paginate(15)->withQueryString();
        $grupos     = Grupo::with('grado')
            ->where('activo', true)
            ->where('anio_lectivo', date('Y'))
            ->orderBy('nombre')
            ->get();

        return view('admin.matriculas.index', compact('matriculas', 'grupos'));
    }

    public function tabla(Request $request)
    {
        $matriculas = $this->queryBase($request)->paginate(15)->withQueryString();

        return response()->json([
            'success' => true,
            'html'    => view('admin.matriculas._tabla', compact('matriculas'))->render(),
        ]);
    }

    private function queryBase(Request $request)
    {
        $q = Matricula::with(['estudiante', 'grado', 'grupo'])
            ->where('anio_lectivo', $request->get('anio', date('Y')));

        if ($request->filled('buscar')) {
            $t = $request->buscar;
            $q->whereHas('estudiante', fn($s) => $s->where('nombre', 'like', "%{$t}%"));
        }
        if ($request->filled('grupo_id')) {
            $q->where('grupo_id', $request->grupo_id);
        }
        if ($request->filled('estado')) {
            $q->where('estado', $request->estado);
        }

        return $q->orderBy('created_at', 'desc');
    }

    private function tablaResponse(Request $request)
    {
        $matriculas = $this->queryBase($request)->paginate(15)->withQueryString();
        return response()->json([
            'success' => true,
            'html'    => view('admin.matriculas._tabla', compact('matriculas'))->render(),
        ]);
    }

    public function buscarEstudiante(Request $request)
    {
        $termino = $request->get('q', '');
        $anio    = $request->get('anio', date('Y'));

        $estudiantes = Estudiante::where('activo', true)
            ->when($termino, fn($q) => $q->where('nombre', 'like', "%{$termino}%"))
            ->withCount([
                'matriculas as ya_matriculado' => fn($q) =>
                    $q->where('anio_lectivo', $anio),
            ])
            ->orderBy('nombre')
            ->limit(100)
            ->get(['id', 'nombre', 'iniciales', 'color_avatar']);

        return response()->json(['ok' => true, 'estudiantes' => $estudiantes]);
    }

    public function gruposDisponibles(Request $request)
    {
        $anio   = $request->get('anio', date('Y'));

        $grados = Grado::activos()
            ->with(['grupos' => fn($q) => $q
                ->where('activo', true)
                ->where('anio_lectivo', $anio)
                ->orderBy('nombre'),
            ])
            ->get();

        $resultado = $grados->map(function ($grado) use ($anio) {
            $grupos = $grado->grupos->map(function ($g) use ($anio) {
                $ocupados = $g->matriculas()
                    ->where('estado', 'activo')
                    ->where('anio_lectivo', $anio)
                    ->count();

                return [
                    'id'              => $g->id,
                    'nombre'          => $g->nombre,
                    'cupo_disponible' => max(0, $g->cupo_maximo - $ocupados),
                    'cupo_maximo'     => $g->cupo_maximo,
                ];
            });

            return [
                'id'     => $grado->id,
                'nombre' => $grado->nombre,
                'grupos' => $grupos,
            ];
        })->filter(fn($g) => count($g['grupos']) > 0)->values();

        return response()->json(['ok' => true, 'grados' => $resultado]);
    }

    public function matricular(Request $request)
    {
        $datos = $request->validate([
            'estudiante_ids'   => 'required|array|min:1',
            'estudiante_ids.*' => 'exists:estudiantes,id',
            'grupo_id'         => 'required|exists:grupos,id',
            'fecha_ingreso'    => 'required|date',
            'anio_lectivo'     => 'required|integer|min:2024|max:2030',
        ]);

        $grupo    = Grupo::findOrFail($datos['grupo_id']);
        $creadas  = 0;
        $omitidas = 0;

        foreach ($datos['estudiante_ids'] as $estudianteId) {
            $yaExiste = Matricula::where('estudiante_id', $estudianteId)
                ->where('anio_lectivo', $datos['anio_lectivo'])
                ->exists();

            if ($yaExiste) { $omitidas++; continue; }

            $ocupados = Matricula::where('grupo_id', $grupo->id)
                ->where('anio_lectivo', $datos['anio_lectivo'])
                ->where('estado', 'activo')
                ->count();

            if ($grupo->cupo_maximo && $ocupados >= $grupo->cupo_maximo) {
                $omitidas++;
                continue;
            }

            Matricula::create([
                'estudiante_id' => $estudianteId,
                'grado_id'      => $grupo->grado_id,
                'grupo_id'      => $grupo->id,
                'anio_lectivo'  => $datos['anio_lectivo'],
                'estado'        => 'activo',
                'fecha_ingreso' => $datos['fecha_ingreso'],
            ]);
            $creadas++;
        }

        $partes = [];
        if ($creadas  > 0) $partes[] = "{$creadas} matrícula(s) creada(s)";
        if ($omitidas > 0) $partes[] = "{$omitidas} omitida(s) (ya existía o sin cupo)";

        return response()->json([
            'ok'      => $creadas > 0,
            'creadas' => $creadas,
            'omitidas'=> $omitidas,
            'mensaje' => $partes ? implode(', ', $partes) . '.' : 'Sin cambios.',
        ], $creadas > 0 ? 200 : 422);
    }

    public function gruposEstado(Request $request)
    {
        $anio = $request->get('anio', date('Y'));

        $grupos = Grupo::with('grado')
            ->where('activo', true)
            ->where('anio_lectivo', $anio)
            ->orderBy('nombre')
            ->get()
            ->map(function ($g) {
                $activas = Matricula::where('grupo_id', $g->id)
                    ->where('anio_lectivo', $g->anio_lectivo)
                    ->where('estado', 'activo')
                    ->count();

                return [
                    'id'           => $g->id,
                    'nombre'       => $g->nombre,
                    'grado_nombre' => $g->grado?->nombre ?? '—',
                    'anio_lectivo' => $g->anio_lectivo,
                    'activas'      => $activas,
                ];
            });

        return response()->json(['ok' => true, 'grupos' => $grupos]);
    }

    public function cambiarEstadoPorGrupo(Request $request)
    {
        $datos = $request->validate([
            'grupo_id' => 'required|exists:grupos,id',
            'estado'   => 'required|in:promovido,graduado,retirado',
        ]);

        $grupo = Grupo::findOrFail($datos['grupo_id']);

        $actualizadas = Matricula::where('grupo_id', $grupo->id)
            ->where('anio_lectivo', $grupo->anio_lectivo)
            ->where('estado', 'activo')
            ->update([
                'estado'       => $datos['estado'],
                'fecha_egreso' => now()->toDateString(),
            ]);

        if ($actualizadas === 0) {
            return response()->json([
                'ok'      => false,
                'mensaje' => 'No hay matrículas activas en este grupo.',
            ], 422);
        }

        return response()->json([
            'ok'      => true,
            'mensaje' => "{$actualizadas} matrícula(s) actualizadas a \"{$datos['estado']}\".",
            'count'   => $actualizadas,
        ]);
    }

    public function datosEditar(Matricula $matricula)
    {
        $anio = $matricula->anio_lectivo;

        $grupos = Grupo::with('grado')
            ->where('activo', true)
            ->where('anio_lectivo', $anio)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'grado_id'])
            ->map(fn($g) => [
                'id'    => $g->id,
                'label' => ($g->grado?->nombre ?? '') . ' — Grupo ' . $g->nombre,
            ]);

        return response()->json([
            'ok'        => true,
            'matricula' => [
                'id'         => $matricula->id,
                'grupo_id'   => $matricula->grupo_id,
                'estudiante' => $matricula->estudiante->nombre,
                'grado'      => $matricula->grado?->nombre ?? '—',
                'grupo'      => $matricula->grupo?->nombre ?? '—',
            ],
            'grupos' => $grupos,
        ]);
    }

    public function actualizar(Request $request, Matricula $matricula)
    {
        $datos = $request->validate([
            'grupo_id' => 'required|exists:grupos,id',
        ]);

        $grupo = Grupo::findOrFail($datos['grupo_id']);

        $matricula->update([
            'grupo_id' => $grupo->id,
            'grado_id' => $grupo->grado_id,
        ]);

        return response()->json(['ok' => true, 'mensaje' => 'Matrícula actualizada.']);
    }

    public function cambiarEstado(Request $request, Matricula $matricula)
    {
        $datos = $request->validate([
            'estado' => 'required|in:activo,promovido,graduado,retirado',
        ]);

        $matricula->update([
            'estado'       => $datos['estado'],
            'fecha_egreso' => in_array($datos['estado'], ['promovido', 'graduado', 'retirado'])
                ? now()->toDateString()
                : null,
        ]);

        return response()->json(['ok' => true, 'mensaje' => 'Estado actualizado.']);
    }

    public function eliminar(Matricula $matricula)
    {
        $matricula->delete();

        return response()->json(['ok' => true, 'mensaje' => 'Matrícula eliminada.']);
    }
}
