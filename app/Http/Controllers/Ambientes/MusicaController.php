<?php

namespace App\Http\Controllers\Ambientes;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;

class MusicaController extends Controller
{
    public function index()
    {
        $ambiente = Ambiente::where('slug', 'musica')->firstOrFail();
        return view('ambientes.musica.inicio', compact('ambiente'));
    }
}
