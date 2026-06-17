<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ConfiguracionAdminController extends Controller
{
    public function listar()
    {
        return view('admin.configuracion.index');
    }

    public function actualizar(Request $request)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }
}
