<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Institucion;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminsSuperAdminController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function listar()
    {
        $superadmin = Auth::guard('docente')->user();
        $instituciones = Institucion::all();
        $administradores = User::where('rol', 'admin')
            ->whereHas('creador', function ($query) use ($superadmin) {
                $query->where('id', $superadmin->id);
            })
            ->get();
        $institucion = $administradores->first()->institucion;

        return view('superAdmin.administradores.index', compact('administradores', 'institucion', 'instituciones'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function guardar(Request $request)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'institucion' => 'required|exists:instituciones,id',
        ]);

        $passwordTemporal = Str::password(8);

        $administrador = User::create([
            'institucion_id' => $datos['institucion'],
            'identificacion' => Str::random(10),
            'nombre' => $datos['nombre'],
            'email' => $datos['email'],
            'password' => Hash::make($passwordTemporal),
            'rol' => 'admin',
            'estado' => 'activo',
            'creado_por' => Auth::guard('docente')->id(),
        ]);

        session(['password_temporal' => $passwordTemporal]);

        return response()->json([
            'success' => true,
            'message' => 'Administrador creado correctamente',
            'data' => $administrador,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
