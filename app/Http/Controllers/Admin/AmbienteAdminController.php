<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AmbienteAdminController extends Controller
{
    public function index() {}
    public function edit($ambiente) {}
    public function update(Request $request, $ambiente) {}
    public function ping($ambiente) {}
}
