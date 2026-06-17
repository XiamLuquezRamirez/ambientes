<?php
namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use Illuminate\Http\Request;

class InclusionController extends Controller
{
    public function listar()
    {
        return view('panel.inclusion.index');
    }

    public function verAjustes($estudiante)
    {
        $estudiante = Estudiante::findOrFail($estudiante);
        return view('panel.inclusion.ajustes', compact('estudiante'));
    }

    public function actualizarAjustes(Request $request, $estudiante)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }
}
