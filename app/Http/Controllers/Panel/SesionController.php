<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\CargaDocente;
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
    
    public function eliminarAmbienteSeleccionado(){
        session()->forget('ambiente_id');
        session()->forget('ambiente_nombre');

        return redirect()->route('panel.principal');
        return response()->json([
            'success' => true,
            'message' => 'Ambiente eliminado correctamente.',
        ]);
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
}
