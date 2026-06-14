<?php
namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class PortafolioController extends Controller
{
    public function index() {}
    public function estudiante($estudiante) {}
    public function guardarObservacion(Request $request, $estudiante) {}
    public function exportar($estudiante) {}
}
