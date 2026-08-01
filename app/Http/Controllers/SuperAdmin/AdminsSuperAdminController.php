<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Institucion;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
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
            ->where('creado_por', $superadmin->id)
            ->with('institucion')
            ->get();

        return view('superAdmin.administradores.index', compact('administradores', 'instituciones'));
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
            'password' => 'required|min:8|confirmed',
        ]);

        $administrador = User::create([
            'institucion_id' => $datos['institucion'],
            'identificacion' => Str::random(10),
            'nombre' => $datos['nombre'],
            'email' => $datos['email'],
            'password' => Hash::make($datos['password']),
            'rol' => 'admin',
            'estado' => 'activo',
            'creado_por' => Auth::guard('docente')->id(),
        ]);

        session(['password_temporal' => $datos['password']]);

        return response()->json([
            'success' => true,
            'message' => 'Administrador creado correctamente',
            'credenciales' => [
                'correo' => $datos['email'],
                'password' => $datos['password'],
            ],
            'usuario' => [
                'id' => $administrador->id,
                'nombre' => $administrador->nombre,
            ],
        ]);
    }

    public function ver(string $id)
    {
        $administrador = $this->administradorDelSuperadmin($id);

        return response()->json([
            'success' => true,
            'data' => $administrador,
        ]);
    }

    public function actualizar(Request $request, string $id)
    {
        $administrador = $this->administradorDelSuperadmin($id);

        $datos = $request->validate([
            'nombre' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email,'.$administrador->id,
            'institucion' => 'required|exists:instituciones,id',
            'password' => 'nullable|min:8|confirmed',
        ]);

        $administrador->update([
            'nombre' => $datos['nombre'],
            'email' => $datos['email'],
            'institucion_id' => $datos['institucion'],
        ]);

        if ($request->has('password')) {
            $administrador->password = Hash::make($datos['password']);
            $administrador->save();
        }
        session([
            'password_temporal' => $datos['password'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Administrador actualizado correctamente',
            'credenciales' => [
                'correo' => $datos['email'],
                'password' => $datos['password'],
            ],
            'usuario' => [
                'id' => $administrador->id,
                'nombre' => $administrador->nombre,
            ],
        ]);
    }

    public function generarPdf($id)
    {
        $usuario = $this->administradorDelSuperadmin($id);
        $password = session()->pull('password_temporal');
        $pdf = Pdf::loadView(
            'superAdmin.pdf.admin',
            compact('usuario', 'password')
        );
        $nombreArchivo = 'Admin_'.Str::slug($usuario->nombre, ' ').'.pdf';

        return $pdf->download($nombreArchivo);
    }

    private function administradorDelSuperadmin(string $id): User
    {
        return User::where('rol', 'admin')
            ->where('creado_por', Auth::guard('docente')->id())
            ->findOrFail($id);
    }

    public function toggleActivo($id)
    {
        $administrador = User::findOrFail($id);

        $administrador->update([
            'activo' => ! $administrador->activo,
        ]);

        return response()->json([
            'success' => true,
            'activo' => $administrador->activo,
            'message' => $administrador->activo
                ? 'Administrador activado correctamente.'
                : 'Administrador desactivado correctamente.',
        ]);
    }
}
