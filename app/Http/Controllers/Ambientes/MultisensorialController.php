<?php

namespace App\Http\Controllers\Ambientes;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;

class MultisensorialController extends Controller
{
    public function index()
    {
        $ambiente = Ambiente::where('slug', 'multisensorial')->firstOrFail();
        return view('ambientes.multisensorial.inicio', compact('ambiente'));
    }
}
