<?php
namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use Illuminate\Http\Request;

class PortafolioController extends Controller
{
    public function listar()
    {
        return view('panel.portafolio.index');
    }

    public function verEstudiante($estudiante)
    {
        $estudiante = Estudiante::findOrFail($estudiante);
        return view('panel.portafolio.estudiante', compact('estudiante'));
    }

    public function guardarObservacion(Request $request, $estudiante)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function exportar($estudiante)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }
}
