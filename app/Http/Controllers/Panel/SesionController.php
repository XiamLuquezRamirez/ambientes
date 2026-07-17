<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\CargaDocente;
use App\Services\Docente\GrupoEstudiantesService;

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
}
