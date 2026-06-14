<?php

namespace App\Http\Controllers\Ambientes;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;

class TecnologiaController extends Controller
{
    public function index()
    {
        $ambiente = Ambiente::where('slug', 'tecnologia')->firstOrFail();
        return view('ambientes.tecnologia.inicio', compact('ambiente'));
    }
}
