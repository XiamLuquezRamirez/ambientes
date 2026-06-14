<?php

namespace App\Http\Controllers\Ambientes;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;

class LogicoController extends Controller
{
    public function index()
    {
        $ambiente = Ambiente::where('slug', 'logico')->firstOrFail();
        return view('ambientes.logico.inicio', compact('ambiente'));
    }
}
