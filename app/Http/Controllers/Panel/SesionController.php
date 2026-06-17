<?php
namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SesionController extends Controller
{
    public function listar()
    {
        return view('panel.sesion.index');
    }

    public function registrarAsistencia(Request $request)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function registrarSesionAsistida(Request $request, $estudiante)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function sesionesActivas()
    {
        return response()->json([]);
    }
}
