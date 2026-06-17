<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use Illuminate\Http\Request;

class AmbienteAdminController extends Controller
{
    public function listar()
    {
        return view('admin.ambientes.index');
    }

    public function formularioEditar($ambiente)
    {
        $ambiente = Ambiente::findOrFail($ambiente);
        return view('admin.ambientes.edit', compact('ambiente'));
    }

    public function actualizar(Request $request, $ambiente)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function verificarConexion($ambiente)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }
}
