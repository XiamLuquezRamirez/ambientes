<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;

class SuperAdminController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $ambientes = Ambiente::withCount([
            'modulos',
            'modulos as modulos_activos_count' => fn ($q) => $q->where('activo', true),
        ])
            ->orderBy('nombre')
            ->get();

        return view('superAdmin.principal', compact('ambientes'));
    }
}
