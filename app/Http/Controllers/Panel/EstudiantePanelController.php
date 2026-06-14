<?php
namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class EstudiantePanelController extends Controller
{
    public function index() {}
    public function create() {}
    public function store(Request $request) {}
    public function edit($estudiante) {}
    public function update(Request $request, $estudiante) {}
    public function editPin($estudiante) {}
    public function updatePin(Request $request, $estudiante) {}
}
