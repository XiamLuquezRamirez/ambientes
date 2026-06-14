<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class DocenteAdminController extends Controller
{
    public function index(Request $request) {}
    public function create() {}
    public function store(Request $request) {}
    public function edit($docente) {}
    public function update(Request $request, $docente) {}
    public function destroy($docente) {}
    public function resetPassword($docente) {}
}
