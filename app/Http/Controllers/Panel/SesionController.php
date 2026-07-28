<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\CargaDocente;
use App\Models\Grado;
use App\Models\Grupo;
use App\Services\Docente\GrupoEstudiantesService;
use Illuminate\Http\Request;

class SesionController extends Controller
{
    public function listar()
    {
        if (! session()->has('carga_docente_id')) {
            return redirect()->route('panel.principal');
        }

        return view('panel.sesion.index');
    }

    public function estudiantes()
    {
        $carga = CargaDocente::findOrFail(session('carga_docente_id'));

        $estudiantes = app(GrupoEstudiantesService::class)->listar($carga);

        return response()->json($estudiantes);
    }

    public function seleccionarAmbiente(Request $request)
    {
        $request->validate([
            'ambiente_id' => 'required|exists:ambientes,id',
            'ambiente_nombre' => 'required|string|max:255',
        ]);

        session(['ambiente_id' => $request->ambiente_id]);
        session(['ambiente_nombre' => $request->ambiente_nombre]);

        return response()->json([
            'success' => true,
            'message' => 'Ambiente seleccionado correctamente.',
        ]);
    }

    public function eliminarAmbienteSeleccionado()
    {
        session()->forget('ambiente_id');
        session()->forget('ambiente_nombre');
        session()->forget('grado_id');
        session()->forget('grupo_id');

        return true;
    }

    public function obtenerAmbienteSeleccionado()
    {
        if (! session()->has('ambiente_id')) {
            return response()->json([
                'success' => false,
                'message' => 'No hay ambiente seleccionado.',
            ]);
        }

        return response()->json([
            'success' => true,
            'ambiente_id' => session('ambiente_id'),
            'ambiente_nombre' => session('ambiente_nombre'),
        ]);
    }

    public function obtenerGradoGrupoSeleccionado(Request $request)
    {
        $request->validate([
            'grado_id' => 'required|exists:grados,id',
            'grupo_id' => 'required|exists:grupos,id',
        ]);

        session(['grado_id' => $request->grado_id]);
        session(['grupo_id' => $request->grupo_id]);

        $grado = Grado::findOrFail($request->grado_id);
        $grupo = Grupo::findOrFail($request->grupo_id);

        return response()->json([
            'success' => true,
            'message' => 'Grado y grupo seleccionado correctamente.',
            'grado' => $grado,
            'grupo' => $grupo,
        ]);
    }
}
