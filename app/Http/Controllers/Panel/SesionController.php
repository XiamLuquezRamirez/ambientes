<?php
namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SesionController extends Controller
{
    public function index() {}
    public function registrarAsistencia(Request $request) {}
    public function sesionAsistida(Request $request, $estudiante) {}
    public function activas() {}
}
