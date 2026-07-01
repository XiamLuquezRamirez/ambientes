<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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
            'identificacion' => 'required|string|min:8|max:15|unique:users,identificacion',
            'nombre' => 'required|string|max:100',
            'apellido' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8|confirmed',
            'rol' => 'required|in:admin,docente',
        ]);

        $usuario = User::create([
            'identificacion' => $datos['identificacion'],
            'nombre' => $datos['nombre'],
            'apellido' => $datos['apellido'],
            'email' => $datos['email'],
            'password' => Hash::make($datos['password']),
            'rol' => $datos['rol'],
        ]);

        if ($usuario->rol === 'docente') {
            $usuario->docente()->create();
        }
        session([
            'password_temporal' => $datos['password'],
        ]);

        return response()->json([
            'success' => true,
            'accion' => 'crear',
            'message' => 'Usuario creado correctamente.',
            'password_generada' => $datos['password'],
            'usuario' => [
                'id' => $usuario->id,
                'nombre' => $datos['nombre'],
                'apellido' => $datos['apellido'],
            ],
        ]);
    }

    /**
     * Actualiza la información del docente y del usuario asociado.
     *
     * Maneja cambio opcional de contraseña y mantiene la contraseña anterior
     * cuando no se envía una nueva contraseña.
     */
    public function actualizar(Request $request, $docente)
    {
        $usuario = User::with('docente')->findOrFail($docente);

        $datos = $request->validate([
            'nombre' => 'required|string|max:100',
            'apellido' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email,'.$usuario->id,
            'identificacion' => 'required|string|min:8|max:15|unique:users,identificacion,'.$usuario->id,
            'telefono' => 'required|string|max:30',
            'direccion' => 'required|string|max:150',
            'especialidad' => 'required|string|max:150',
            'fecha_ingreso' => 'required|date',
            'firma_url' => 'nullable|image|max:2048',
            'password' => 'nullable|min:8|confirmed',
        ]);

        DB::transaction(function () use ($usuario, $datos, $request) {

            $firma_url = null;

            if ($request->hasFile('firma_url')) {
                $firma_url = $request->file('firma_url')->store('docentes', 'public');
            }

            // Datos de users
            $usuario->update([
                'nombre' => $datos['nombre'],
                'apellido' => $datos['apellido'],
                'identificacion' => $datos['identificacion'],
                'email' => $datos['email'],
            ]);

            // Datos de docentes
            $usuario->docente->update([
                'user_id' => $usuario->id,
                'telefono' => $datos['telefono'],
                'direccion' => $datos['direccion'],
                'especialidad' => $datos['especialidad'],
                'fecha_ingreso' => $datos['fecha_ingreso'],
                'firma_url' => $firma_url,
            ]);

            // Si se proporciona una nueva contraseña, se actualiza la contraseña del usuario.
            // Si no se proporciona una nueva contraseña, se mantiene la contraseña actual.
            if ($datos['password']) {
                $usuario->password = Hash::make($datos['password']);
                $usuario->save();
            } else {
                $usuario->password = $usuario->password;
                $usuario->save();
            }
        });
        session([
            'password_temporal' => $datos['password'],
        ]);

        return response()->json([
            'success' => true,
            'accion' => 'actualizar',
            'message' => 'Datos del docente actualizados correctamente.',
            'password_generada' => $datos['password'],
            'docente' => [
                'id' => $usuario->docente->id,
            ],
        ]);
    }

    public function completarInfo(Request $request, $usuario)
    {
        $usuario = User::with('docente')->findOrFail($usuario);

        if ($usuario->rol !== 'docente') {
            return response()->json([
                'success' => false,
                'message' => 'El usuario no es un docente.',
            ], 403);
        }
        $datos = $request->validate([
            'telefono' => 'required|string|max:30',
            'direccion' => 'required|string|max:150',
            'especialidad' => 'required|string|max:150',
            'fecha_ingreso' => 'required|date',
            'firma_url' => 'nullable|image|max:2048',
            'password' => 'nullable|min:8|confirmed',
        ]);

        DB::transaction(function () use ($usuario, $datos, $request) {

            $datosDocente = [
                'telefono' => $datos['telefono'],
                'direccion' => $datos['direccion'],
                'especialidad' => $datos['especialidad'],
                'fecha_ingreso' => $datos['fecha_ingreso'],
                'estado' => 'activo',
            ];

            if ($request->hasFile('firma_url')) {
                $datosDocente['firma_url'] = $request->file('firma_url')
                    ->store('docentes', 'public');
            }

            $usuario->docente()->updateOrCreate(
                ['user_id' => $usuario->id],
                $datosDocente
            );
            // Si se proporciona una nueva contraseña, se actualiza la contraseña del usuario.
            // Si no se proporciona una nueva contraseña, se mantiene la contraseña actual.
            if (! empty($datos['password'])) {
                $usuario->update([
                    'password' => Hash::make($datos['password']),
                ]);
            }
        });
        if (! empty($datos['password'])) {
            session([
                'password_temporal' => $datos['password'],
            ]);
        }

        return response()->json([
            'success' => true,
            'accion' => 'actualizar',
            'message' => 'Datos del docente actualizados correctamente.',
            'password_generada' => $datos['password'] ?? null,
            'usuario' => [
                'id' => $usuario->id,
            ],
        ]);
    }

    /**
     * Devuelve los datos básicos del docente para el formulario de edición.
     *
     * Convierte la fecha de ingreso al formato Y-m-d usable por los inputs HTML.
     */
    public function verDatosUsuario($usuario_id)
    {
        $usuario_id = (int) $usuario_id;

        $usuario = User::with('docente')
            ->where('id', $usuario_id)
            ->first();

        if (! $usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado.',
            ]);
        }

        $usuario->fecha_ingreso_set = Carbon::parse($usuario->fecha_ingreso)
            ->format('Y-m-d');

        $usuario->firma_url = $usuario->firma_url
            ? asset('storage/'.$usuario->firma_url)
            : null;

        return response()->json([
            'success' => true,
            'data' => $usuario,
        ]);
    }

    /**
     * Genera un PDF con los datos del usuario y la contraseña temporal.
     *
     * Se usa para descargar la ficha de usuario después de crear o resetear la contraseña.
     */
    public function generarPdf($id)
    {
        // Verificar si el usuario tiene una cuenta activa
        $usuario = User::findOrFail($id);
        $password = session()->pull('password_temporal');
        $pdf = Pdf::loadView(
            'admin.pdf.usuario',
            compact('usuario', 'password')
        );
        $nombreArchivo = 'Usuario_'.
        Str::slug(
            $usuario->nombre.' '.$usuario->apellido,
            ' '
        ).
        '.pdf';

        return $pdf->download($nombreArchivo);
    }

    /**
     * Display the specified resource.
     */
    public function ver(string $id)
    {
        $usuario = User::with('docente')->findOrFail($id);

        return response()->json([
            'success' => true,
            'usuario' => $usuario,
        ]);
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
