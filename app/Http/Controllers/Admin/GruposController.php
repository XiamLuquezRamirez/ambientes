<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Grado;
use App\Models\Grupo;
use Illuminate\Http\Request;

class GruposController extends Controller
{
    public function index(Request $request)
    {
        $anio = (int) $request->get('anio', date('Y'));
        $grados = Grado::activos()
            ->with(['grupos' => fn ($q) => $q->where('anio_lectivo', $anio)->orderBy('nombre')])
            ->get();

        return view('admin.grupos.index', compact('grados', 'anio'));
    }

    public function guardar(Request $request)
    {
        $datos = $request->validate([
            'grado_id' => 'required|exists:grados,id',
            'nombre' => 'required|string|max:10',
            'anio_lectivo' => 'required|integer|min:2024|max:2030',
            'cupo_maximo' => 'nullable|integer|min:1|max:60',
        ]);

        $nombre = strtoupper($datos['nombre']);

        $existe = Grupo::where('grado_id', $datos['grado_id'])
            ->where('nombre', $nombre)
            ->where('anio_lectivo', $datos['anio_lectivo'])
            ->exists();

        if ($existe) {
            return response()->json([
                'ok' => false,
                'mensaje' => 'Ya existe un grupo con ese nombre en este grado y año lectivo.',
            ], 422);
        }

        $grupo = Grupo::create([
            'grado_id' => $datos['grado_id'],
            'nombre' => $nombre,
            'anio_lectivo' => $datos['anio_lectivo'],
            'cupo_maximo' => $datos['cupo_maximo'] ?? 25,
            'activo' => true,
        ]);
        $grupo->load('grado');

        return response()->json(['ok' => true, 'grupo' => $grupo]);
    }

    public function actualizar(Request $request, Grupo $grupo)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:10',
            'cupo_maximo' => 'required|integer|min:1|max:60',
        ]);

        $nombre = strtoupper($datos['nombre']);

        $existe = Grupo::where('grado_id', $grupo->grado_id)
            ->where('nombre', $nombre)
            ->where('anio_lectivo', $grupo->anio_lectivo)
            ->where('id', '!=', $grupo->id)
            ->exists();

        if ($existe) {
            return response()->json([
                'ok' => false,
                'mensaje' => 'Ya existe un grupo con ese nombre en este grado y año.',
            ], 422);
        }

        $grupo->update([
            'nombre' => $nombre,
            'cupo_maximo' => $datos['cupo_maximo'],
        ]);

        return response()->json(['ok' => true]);
    }

    public function eliminar(Grupo $grupo)
    {
        $activos = $grupo->totalMatriculas();

        if ($activos > 0) {
            return response()->json([
                'ok' => false,
                'mensaje' => "El grupo tiene {$activos} estudiante(s) activo(s) matriculados.",
            ], 422);
        }

        $grupo->delete();

        return response()->json(['ok' => true]);
    }
}
