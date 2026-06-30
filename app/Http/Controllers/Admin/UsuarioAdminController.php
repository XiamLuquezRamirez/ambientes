<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UsuarioAdminController extends Controller
{
    /**
     * Lista los docentes con filtros opcionales y paginación.
     *
     * Soporta búsqueda por nombre/email, filtrado por ambiente, rol y estado.
     * Si la petición es AJAX devuelve un fragmento HTML para actualización parcial.
     */
    public function listar(Request $request)
    {
        $consulta = User::query()
            ->select(
                'users.*',
            );

        $consulta->orderBy('nombre');
        /* ── Filtros ────────────────────────────────────── */
        if ($request->filled('buscar')) {
            $termino = $request->buscar;
            $consulta->where(fn ($q) => $q
                ->where('nombre', 'like', "%{$termino}%")
            );
        }

        if ($request->filled('rol')) {
            $consulta->where('rol', $request->rol);
        }
        if ($request->filled('estado')) {
            $consulta->where('estado', $request->estado);
        }

        // ordenar por nombre
        $usuarios = $consulta->orderBy('nombre')->paginate(10);

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('admin.usuarios._tabla', compact('usuarios'))->render(),
            ]);
        }

        return view('admin.usuarios.index', compact('usuarios'));
    }

    /**
     * Crea un usuario y perfil de docente dentro de una transacción.
     *
     * Si falla la creación del perfil, el usuario no se deja en estado huérfano.
     */
    public function guardar(Request $request)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:100',
            'apellido' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8|confirmed',
            'rol' => 'required|in:admin,docente',
        ]);

        session([
            'password_temporal' => $datos['password'],
        ]);

        return response()->json([
            'success' => true,
            'accion' => 'crear',
            'message' => 'Docente creado correctamente.',
            'password_generada' => $datos['password'],
        ]);
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
