<?php
namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class InclusionController extends Controller
{
    public function index() {}
    public function ajustes($estudiante) {}
    public function updateAjustes(Request $request, $estudiante) {}
    public function crearSolicitud(Request $request, $estudiante) {}
}
