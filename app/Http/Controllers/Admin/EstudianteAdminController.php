<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use Illuminate\Http\Request;

class EstudianteAdminController extends Controller
{
    public function listar(Request $request)
    {
        return view('admin.estudiantes.index');
    }

    public function formularioEditar($estudiante)
    {
        $estudiante = Estudiante::findOrFail($estudiante);
        return view('admin.estudiantes.edit', compact('estudiante'));
    }

    public function actualizar(Request $request, $estudiante)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function transferir(Request $request, $estudiante)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function restablecerPin($estudiante)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }
}
