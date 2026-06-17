<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Grado;
use App\Models\Grupo;
use Illuminate\Http\Request;

class GradoGrupoController extends Controller
{
    public function gestionar(Ambiente $ambiente)
    {
        $grados = Grado::activos()->get();

        // Para cada grado: ¿está habilitado en este ambiente? + sus grupos
        $gradosConInfo = $grados->map(function (Grado $grado) use ($ambiente) {
            $pivot     = $ambiente->todosGrados()->where('grado_id', $grado->id)->first();
            $habilitado = $pivot ? (bool) $pivot->pivot->activo : false;
            $grupos    = $grado->gruposEnAmbiente($ambiente->id)
                               ->orderBy('nombre')
                               ->get();

            return [
                'grado'      => $grado,
                'habilitado' => $habilitado,
                'grupos'     => $grupos,
            ];
        });

        return view('admin.ambientes.grados-grupos', compact('ambiente', 'gradosConInfo'));
    }

    public function toggleGrado(Request $request, Ambiente $ambiente, Grado $grado)
    {
        $pivot = $ambiente->todosGrados()->where('grado_id', $grado->id)->first();

        if ($pivot) {
            $nuevoEstado = !(bool) $pivot->pivot->activo;
            $ambiente->todosGrados()->updateExistingPivot($grado->id, ['activo' => $nuevoEstado]);
        } else {
            $ambiente->todosGrados()->attach($grado->id, ['activo' => true]);
            $nuevoEstado = true;
        }

        return response()->json(['habilitado' => $nuevoEstado]);
    }

    public function guardarGrupo(Request $request, Ambiente $ambiente)
    {
        $datos = $request->validate([
            'grado_id'     => 'required|exists:grados,id',
            'nombre'       => 'required|string|max:10',
            'anio_lectivo' => 'required|integer|min:2024|max:2030',
            'cupo_maximo'  => 'required|integer|min:1|max:60',
        ]);

        $existe = Grupo::where('ambiente_id', $ambiente->id)
                       ->where('grado_id', $datos['grado_id'])
                       ->where('nombre', $datos['nombre'])
                       ->where('anio_lectivo', $datos['anio_lectivo'])
                       ->exists();

        if ($existe) {
            return response()->json([
                'ok'      => false,
                'mensaje' => 'Ya existe un grupo con ese nombre en este grado y año lectivo.',
            ], 422);
        }

        $grupo = Grupo::create([
            'ambiente_id'  => $ambiente->id,
            'grado_id'     => $datos['grado_id'],
            'nombre'       => strtoupper($datos['nombre']),
            'anio_lectivo' => $datos['anio_lectivo'],
            'cupo_maximo'  => $datos['cupo_maximo'],
            'activo'       => true,
        ]);

        $grupo->load('grado');

        return response()->json(['ok' => true, 'grupo' => $grupo]);
    }

    public function actualizarGrupo(Request $request, Ambiente $ambiente, Grupo $grupo)
    {
        $datos = $request->validate([
            'nombre'      => 'required|string|max:10',
            'cupo_maximo' => 'required|integer|min:1|max:60',
        ]);

        $grupo->update([
            'nombre'      => strtoupper($datos['nombre']),
            'cupo_maximo' => $datos['cupo_maximo'],
        ]);

        return response()->json(['ok' => true]);
    }

    public function eliminarGrupo(Ambiente $ambiente, Grupo $grupo)
    {
        $activos = $grupo->totalMatriculas();

        if ($activos > 0) {
            return response()->json([
                'ok'      => false,
                'mensaje' => "El grupo tiene {$activos} estudiante(s) activo(s).",
            ], 422);
        }

        $grupo->delete();

        return response()->json(['ok' => true]);
    }
}
