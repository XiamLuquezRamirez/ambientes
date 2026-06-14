<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CatalogoController extends Controller
{
    public function index(Request $request) {}
    public function storeModulo(Request $request) {}
    public function updateModulo(Request $request, $modulo) {}
    public function destroyModulo($modulo) {}
    public function storeTema(Request $request) {}
    public function updateTema(Request $request, $tema) {}
}
