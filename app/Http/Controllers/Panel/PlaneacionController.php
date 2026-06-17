<?php
namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class PlaneacionController extends Controller
{
    public function listar()
    {
        return view('panel.planeacion.index');
    }

    public function alternarVisibilidad(Request $request, $modulo)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function guardarNota(Request $request, $tema)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }
}
