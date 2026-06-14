<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class EstudianteAdminController extends Controller
{
    public function index(Request $request) {}
    public function edit($estudiante) {}
    public function update(Request $request, $estudiante) {}
    public function transferir(Request $request, $estudiante) {}
    public function resetPin($estudiante) {}
}
