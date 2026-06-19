<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Estudiante;
use App\Models\EstudianteAmbiente;
use Illuminate\Http\Request;

class AsignacionAmbienteController extends Controller
{
    public function index(Request $request, Ambiente $ambiente)
    {
        $anio = (int) $request->get('anio', date('Y'));
        return view('admin.ambientes.asignaciones', compact('ambiente', 'anio'));
    }

    public function tabla(Request $request, Ambiente $ambiente)
    {
        $anio = (int) $request->get('anio', date('Y'));

        $asignaciones = EstudianteAmbiente::where('ambiente_id', $ambiente->id)
            ->where('anio_lectivo', $anio)
            ->with([
                'estudiante',
                'estudiante.matriculaActiva.grupo.grado',
            ])
            ->orderBy('created_at')
            ->get()
            ->map(fn($ea) => [
                'id'           => $ea->id,
                'estudiante_id'=> $ea->estudiante_id,
                'nombre'       => $ea->estudiante->nombre,
                'iniciales'    => $ea->estudiante->iniciales ?? mb_substr($ea->estudiante->nombre, 0, 2),
                'color_avatar' => $ea->estudiante->color_avatar ?? '#2563EB',
                'estado'       => $ea->estado,
                'observacion'  => $ea->observacion,
                'grado_grupo'  => $this->resolverGradoGrupo($ea->estudiante),
            ]);

        return response()->json(['ok' => true, 'asignaciones' => $asignaciones]);
    }

    public function buscar(Request $request, Ambiente $ambiente)
    {
        $anio    = (int) $request->get('anio', date('Y'));
        $termino = $request->get('q', '');

        $yaAsignados = EstudianteAmbiente::where('ambiente_id', $ambiente->id)
            ->where('anio_lectivo', $anio)
            ->pluck('estudiante_id');

        $estudiantes = Estudiante::where('activo', true)
            ->whereNotIn('id', $yaAsignados)
            ->when($termino, fn($q) => $q->where('nombre', 'like', "%{$termino}%"))
            ->with(['matriculaActiva.grupo.grado'])
            ->orderBy('nombre')
            ->limit(50)
            ->get()
            ->map(fn($e) => [
                'id'           => $e->id,
                'nombre'       => $e->nombre,
                'iniciales'    => $e->iniciales ?? mb_substr($e->nombre, 0, 2),
                'color_avatar' => $e->color_avatar ?? '#2563EB',
                'grado_grupo'  => $this->resolverGradoGrupo($e),
            ]);

        return response()->json(['ok' => true, 'estudiantes' => $estudiantes]);
    }

    public function asignar(Request $request, Ambiente $ambiente)
    {
        $datos = $request->validate([
            'estudiante_ids'   => 'required|array|min:1',
            'estudiante_ids.*' => 'exists:estudiantes,id',
            'anio_lectivo'     => 'required|integer|min:2024|max:2030',
        ]);

        $creadas = 0;

        foreach ($datos['estudiante_ids'] as $estudianteId) {
            $existe = EstudianteAmbiente::where('estudiante_id', $estudianteId)
                ->where('ambiente_id', $ambiente->id)
                ->where('anio_lectivo', $datos['anio_lectivo'])
                ->exists();

            if ($existe) continue;

            EstudianteAmbiente::create([
                'estudiante_id' => $estudianteId,
                'ambiente_id'   => $ambiente->id,
                'anio_lectivo'  => $datos['anio_lectivo'],
                'estado'        => 'activo',
            ]);
            $creadas++;
        }

        return response()->json([
            'ok'      => $creadas > 0,
            'creadas' => $creadas,
            'mensaje' => $creadas > 0
                ? "{$creadas} estudiante(s) asignado(s) al ambiente."
                : 'Ya estaban todos asignados.',
        ], $creadas > 0 ? 200 : 422);
    }

    public function actualizar(Request $request, Ambiente $ambiente, EstudianteAmbiente $ea)
    {
        $datos = $request->validate([
            'estado'      => 'required|in:activo,restringido,adaptado',
            'observacion' => 'nullable|string|max:500',
        ]);

        $ea->update($datos);

        return response()->json(['ok' => true, 'mensaje' => 'Asignación actualizada.']);
    }

    public function quitar(Ambiente $ambiente, EstudianteAmbiente $ea)
    {
        $ea->delete();

        return response()->json(['ok' => true, 'mensaje' => 'Estudiante quitado del ambiente.']);
    }

    private function resolverGradoGrupo(Estudiante $estudiante): ?string
    {
        $mat = $estudiante->matriculaActiva;
        if (!$mat) return null;
        $grado = $mat->grupo?->grado?->nombre ?? '';
        $grupo = $mat->grupo?->nombre ?? '';
        return trim("{$grado} {$grupo}") ?: null;
    }
}
