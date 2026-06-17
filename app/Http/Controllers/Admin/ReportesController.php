<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;

class ReportesController extends Controller
{
    public function listar()
    {
        return view('admin.reportes.index');
    }

    public function exportar()
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }
}
