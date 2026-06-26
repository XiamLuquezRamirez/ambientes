<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use Illuminate\Http\Request;
use App\Models\Condicion;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
class PiarController extends Controller
{
    public function diligenciarPiar($idEstudiante)
    {
        $estudiante = Estudiante::with('grado')->where('id', $idEstudiante)->first();
        $condiciones = Condicion::all();

        //usuario logueado
        $user =Auth::guard('docente')->user();
        $docente_diligencia = User::where('id', $user->id)->first();

        return view('admin.estudiantes.diligenciarPiar', compact('estudiante', 'condiciones', 'docente_diligencia'));
    }
}