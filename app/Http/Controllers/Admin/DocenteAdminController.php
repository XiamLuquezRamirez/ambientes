<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\CargaDocente;
use App\Models\Docente;
use App\Models\Grado;
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
            $consulta->where(fn ($q) => $q
                ->where('nombre', 'like', "%{$termino}%")
                ->orWhere('email', 'like', "%{$termino}%")
            );
        }
        if ($request->filled('ambiente_id')) {
            $consulta->whereHas('docente.ambientes', fn ($q) => $q->where('ambientes.id', $request->ambiente_id));
        }
        if ($request->filled('rol')) {
            $consulta->where('rol', $request->rol);
        }
        if ($request->filled('estado')) {
            $consulta->where('users.activo', $request->estado == 'true' ? true : false);
        }

        $docentes = $consulta->orderBy('nombre')->paginate(10)->withQueryString();
        $ambientes = Ambiente::orderBy('nombre')->get();
        // Cargar los grados activos para el selector dentro del modal de completar datos.
        $grados = Grado::activos()->get();

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('admin.docentes._tabla', compact('docentes'))->render(),
            ]);
        }

        return view('admin.docentes.index', compact('docentes', 'ambientes', 'grados'));
    }

    // Devuelve los datos del usuario y su perfil docente para poblar el modal vía AJAX.
    public function ver($docente)
    {
        $usuario = User::with('docente')->findOrFail($docente);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $usuario->id,
                'nombre' => $usuario->nombre,
                'email' => $usuario->email,
                'rol' => $usuario->rol,
                'activo' => $usuario->activo,
                'docente' => $usuario->docente ? $usuario->docente->toArray() : null,
            ],
        ]);
    }

    public function formularioCrear()
    {
        $ambientes = Ambiente::orderBy('nombre')->get();

        return view('admin.docentes.create', compact('ambientes'));
    }

    public function guardar(Request $request)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8',
            'rol' => 'required|in:admin,docente_lider,docente_auxiliar',
            'ambiente_id' => 'nullable|exists:ambientes,id',
            'grado_id' => 'nullable|exists:grados,id',
        ]);

        $usuario = User::create([
            'nombre' => $datos['nombre'],
            'email' => $datos['email'],
            'password' => Hash::make($datos['password']),
            'rol' => $datos['rol'],
            'activo' => true,
        ]);

        $docente = Docente::create(['user_id' => $usuario->id]);

        if (! empty($datos['ambiente_id'])) {
            CargaDocente::create([
                'docente_id' => $docente->id,
                'ambiente_id' => $datos['ambiente_id'],
                'anio_lectivo' => date('Y'),
                'estado' => true,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Docente creado exitosamente.',
        ]);
    }

    public function formularioEditar($docente)
    {
        $docente = User::with('docente')->findOrFail($docente);
        $ambientes = Ambiente::orderBy('nombre')->get();

        return view('admin.docentes.edit', compact('docente', 'ambientes'));
    }

    // Actualiza los datos principales del usuario y los campos adicionales del perfil docente.
    // Actualiza los datos del docente seleccionado desde el modal.
    // Guarda tanto la información del usuario como los campos adicionales del perfil docente.
    public function actualizar(Request $request, $docente)
    {
        $usuario = User::with('docente')->findOrFail($docente);

        $datos = $request->validate([
            'nombre' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email,'.$usuario->id,
            'rol' => 'nullable|in:admin,docente_lider,docente_auxiliar',
            'activo' => 'nullable|boolean',

            'telefono' => 'nullable|string|max:30',
            'especialidad' => 'nullable|string|max:150',
            'fecha_ingreso' => 'nullable|date',
            'foto_url' => 'nullable|url',
            'descripcion' => 'nullable|string',
            'grado_id' => 'nullable|exists:grados,id',
        ]);

        $usuario->nombre = $datos['nombre'];
        $usuario->email = $datos['email'];
        if (isset($datos['rol'])) {
            $usuario->rol = $datos['rol'];
        }
        if (isset($datos['activo'])) {
            $usuario->activo = $datos['activo'];
        }
        $usuario->save();

        $doc = $usuario->docente;
        if (! $doc) {
            $doc = new Docente;
            $doc->user_id = $usuario->id;
        }

        // Guardar los datos del perfil docente si se proporcionan.
        $doc->telefono = $datos['telefono'] ?? $doc->telefono;
        $doc->especialidad = $datos['especialidad'] ?? $doc->especialidad;
        $doc->fecha_ingreso = $datos['fecha_ingreso'] ?? $doc->fecha_ingreso;
        $doc->foto_url = $datos['foto_url'] ?? $doc->foto_url;
        $doc->descripcion = $datos['descripcion'] ?? $doc->descripcion;
        if (array_key_exists('grado_id', $datos)) {
            $doc->grado_id = $datos['grado_id'];
        }
        $doc->save();

        return response()->json(['success' => true, 'message' => 'Datos del docente actualizados.']);
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
