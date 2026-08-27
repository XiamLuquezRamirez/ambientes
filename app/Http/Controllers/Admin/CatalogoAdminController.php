<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Modulo;
use Illuminate\Http\Request;

/**
 * Dominio módulos / temas del catálogo (independiente de DBA).
 */
class CatalogoAdminController extends Controller
{
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
