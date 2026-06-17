<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\CargaDocente;
use App\Models\Docente;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class DocenteAdminController extends Controller
{
    public function listar(Request $request)
    {
        $consulta = User::with('docente.ambientes');

        if ($request->filled('buscar')) {
            $termino = $request->buscar;
            $consulta->where(fn($q) => $q
                ->where('nombre', 'like', "%{$termino}%")
                ->orWhere('email', 'like', "%{$termino}%")
            );
        }
        if ($request->filled('ambiente_id')) {
            $consulta->whereHas('docente.ambientes', fn($q) => $q->where('ambientes.id', $request->ambiente_id));
        }
        if ($request->filled('rol')) {
            $consulta->where('rol', $request->rol);
        }

        $docentes  = $consulta->orderBy('nombre')->paginate(10)->withQueryString();
        $ambientes = Ambiente::orderBy('nombre')->get();

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html'    => view('admin.docentes._tabla', compact('docentes'))->render(),
            ]);
        }

        return view('admin.docentes.index', compact('docentes', 'ambientes'));
    }

    public function formularioCrear()
    {
        $ambientes = Ambiente::orderBy('nombre')->get();
        return view('admin.docentes.create', compact('ambientes'));
    }

    public function guardar(Request $request)
    {
        $datos = $request->validate([
            'nombre'      => 'required|string|max:100',
            'email'       => 'required|email|unique:users,email',
            'password'    => 'required|min:8',
            'rol'         => 'required|in:admin,docente_lider,docente_auxiliar',
            'ambiente_id' => 'nullable|exists:ambientes,id',
        ]);

        $usuario = User::create([
            'nombre'   => $datos['nombre'],
            'email'    => $datos['email'],
            'password' => Hash::make($datos['password']),
            'rol'      => $datos['rol'],
            'activo'   => true,
        ]);

        $docente = Docente::create(['user_id' => $usuario->id]);

        if (!empty($datos['ambiente_id'])) {
            CargaDocente::create([
                'docente_id'   => $docente->id,
                'ambiente_id'  => $datos['ambiente_id'],
                'anio_lectivo' => date('Y'),
                'activo'       => true,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Docente creado exitosamente.',
        ]);
    }

    public function formularioEditar($docente)
    {
        $docente   = User::with('docente')->findOrFail($docente);
        $ambientes = Ambiente::orderBy('nombre')->get();
        return view('admin.docentes.edit', compact('docente', 'ambientes'));
    }

    public function actualizar(Request $request, $docente)
    {
        return response()->json(['success' => false, 'message' => 'Pendiente de implementación.'], 501);
    }

    public function eliminar($docente)
    {
        $usuario = User::with('docente')->findOrFail($docente);
        $usuario->docente?->delete();
        $usuario->delete();

        return response()->json([
            'success' => true,
            'message' => 'Docente eliminado.',
        ]);
    }

    public function restablecerContrasena($docente)
    {
        return response()->json(['success' => false, 'message' => 'Pendiente de implementación.'], 501);
    }
}
