<?php

namespace App\Http\Controllers\Ambientes;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;

class PolimotorController extends Controller
{
    public function index()
    {
        $ambiente = Ambiente::where('slug', 'polimotor')->firstOrFail();
        return view('ambientes.polimotor.inicio', compact('ambiente'));
    }
}
