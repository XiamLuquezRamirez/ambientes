<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ConflictosController extends Controller
{
    public function listar()
    {
        return view('admin.conflictos.index');
    }

    public function resolver(Request $request, int $id)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }
}
