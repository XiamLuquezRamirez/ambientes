<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Modulo;
use Illuminate\Http\Request;

class CatalogoController extends Controller
{
    public function listar(Request $request)
    {
        return view('admin.catalogo.index');
    }

    public function guardarModulo(Request $request)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function actualizarModulo(Request $request, $modulo)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function eliminarModulo(Modulo $modulo)
    {
        if (! $modulo->sePuedeEliminar()) {
            return back()->with('error', 'Los módulos oficiales no se pueden eliminar.');
        }

        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function guardarTema(Request $request)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function actualizarTema(Request $request, $tema)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }
}
