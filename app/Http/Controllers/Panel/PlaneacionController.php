<?php
namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class PlaneacionController extends Controller
{
    public function index() {}
    public function toggleVisible(Request $request, $modulo) {}
    public function guardarNota(Request $request, $tema) {}
}
