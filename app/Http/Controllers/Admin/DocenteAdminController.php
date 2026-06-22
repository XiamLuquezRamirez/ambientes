<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\CargaDocente;
use App\Models\Docente;
use App\Models\Grado;
use App\Models\Grupo;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DocenteAdminController extends Controller
{
    public function listar(Request $request)
    {
        $consulta = Docente::query()
            ->join('users', 'users.id', '=', 'docentes.user_id')
            ->select('docentes.*', 'users.*');

        if ($request->filled('buscar')) {
            $termino = $request->buscar;
            $consulta->where('users.nombre', 'like', "%{$termino}%")
                ->orWhere('users.email', 'like', "%{$termino}%");
        }

        if ($request->filled('ambiente_id')) {
            $consulta->whereHas('docente.ambientes', fn ($q) => $q->where('ambientes.id', $request->ambiente_id));
        }

        if ($request->filled('rol')) {
            $consulta->where('rol', $request->rol);
        }

        if ($request->filled('estado')) {
            $consulta->where('users.estado', $request->estado === 'true');
        }

        // ordenar por nombre
        $consulta->orderBy('users.nombre');
        $docentes = $consulta->paginate(10);

        $ambientes = Ambiente::orderBy('nombre')->get();
        $grados = Grado::activos()->get();
        $grupos = Grupo::activos()->delAnio()->orderBy('nombre')->get();
        // Grupos del año lectivo actual para el modal de asignación.

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('admin.docentes._tabla', compact('docentes'))->render(),
            ]);
        }

        return view('admin.docentes.index', compact('docentes', 'ambientes', 'grados', 'grupos'));
    }

    // Devuelve los datos del usuario, su perfil docente y la carga activa del año.
    public function ver($docente)
    {
        $usuario = User::with(['docente.cargasActivas'])->findOrFail($docente);
        $carga = $usuario->docente?->cargasActivas->first();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $usuario->id,
                'nombre' => trim($usuario->nombre.' '.$usuario->apellido),
                'email' => $usuario->email,
                'rol' => $usuario->rol,
                'estado' => $usuario->estado,
                'docente' => $usuario->docente ? $usuario->docente->toArray() : null,
                // La asignación ambiente/grado/grupo se lee desde carga_docente, no desde docentes.
                'carga' => $carga ? [
                    'ambiente_id' => $carga->ambiente_id,
                    'grado_id' => $carga->grado_id,
                    'grupo_id' => $carga->grupo_id,
                ] : null,
            ],
        ]);
    }

    public function guardar(Request $request)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:100',
            'apellido' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8|confirmed',
            'telefono' => 'required|string|max:30',
            'direccion' => 'required|string|max:150',
            'identificacion' => 'required|string|min:8|max:15|unique:users,identificacion',
            'especialidad' => 'required|string|max:150',
            'fecha_ingreso' => 'required|date',
        ]);

        // Transacción: si falla el perfil docente, no queda un usuario huérfano.
        DB::transaction(function () use ($datos) {
            // Paso 1 — Cuenta de acceso (tabla users).
            $usuario = User::create([
                'nombre' => $datos['nombre'],
                'apellido' => $datos['apellido'],
                'identificacion' => $datos['identificacion'],
                'email' => $datos['email'],
                'password' => Hash::make($datos['password']),
                'rol' => 'docente',
                'estado' => true,
            ]);

            // Paso 2 — Perfil profesional (tabla docentes).
            Docente::create([
                'user_id' => $usuario->id,
                'telefono' => $datos['telefono'],
                'direccion' => $datos['direccion'],
                'especialidad' => $datos['especialidad'],
                'fecha_ingreso' => $datos['fecha_ingreso'],
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Docente creado exitosamente.',
            'password_generada' => $datos['password'],
        ]);
    }

    public function formularioEditar($docente)
    {
        $docente = User::with('docente')->findOrFail($docente);
        $ambientes = Ambiente::orderBy('nombre')->get();

        return response()->json([
            'success' => true,
            'data' => [
                'docente' => $docente,
                'ambientes' => $ambientes,
            ],
        ]);
    }

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
            'password' => 'nullable|min:8|confirmed',
        ]);

        DB::transaction(function () use ($usuario, $datos) {
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
            ]);

            if ($datos['password']) {
                $usuario->password = Hash::make($datos['password']);
                $usuario->save();
            } else {
                $usuario->password = $usuario->password;
                $usuario->save();
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Datos del docente actualizados.',
            'password_generada' => $datos['password'],
        ]);
    }

    public function asignarInfo(Request $request, $docente)
    {
        $usuario = User::with('docente')->findOrFail($docente);

        $datos = $request->validate([
            'ambiente_id' => 'nullable|exists:ambientes,id',
            'grado_id' => 'nullable|exists:grados,id',
            'grupo_id' => 'nullable|exists:grupos,id',
            'descripcion' => 'nullable|string',
        ]);

        DB::transaction(function () use ($usuario, $datos) {
            $doc = $usuario->docente;
            if (! $doc) {
                $doc = Docente::create(['user_id' => $usuario->id]);
            }

            // Descripción sí vive en docentes; ambiente/grado/grupo van en carga_docente.
            if (array_key_exists('descripcion', $datos)) {
                $doc->descripcion = $datos['descripcion'];
                $doc->save();
            }

            if (! empty($datos['ambiente_id']) && ! empty($datos['grado_id']) && ! empty($datos['grupo_id'])) {
                $this->sincronizarCargaDocente(
                    $doc,
                    (int) $datos['ambiente_id'],
                    (int) $datos['grado_id'],
                    (int) $datos['grupo_id']
                );
            }
        });

        return response()->json(['success' => true, 'message' => 'Asignación guardada correctamente.']);
    }

    public function eliminar($docente)
    {
        $usuario = User::with('docente')->findOrFail($docente);
        $usuario->estado = false;
        $usuario->save();

        return response()->json([
            'success' => true,
            'message' => 'Docente eliminado.',
        ]);
    }

    public function restablecerContrasena(Request $request, $docente)
    {
        $datos = $request->validate([
            'password' => 'required|min:8|confirmed',
        ]);
        $usuario = User::findOrFail($docente);
        $usuario->password = Hash::make($datos['password']);
        $usuario->save();
        $usuario->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Contraseña reestablecida.',
            'data' => [
                'id' => $usuario->id,
            ],
            'usuario' => $usuario->toArray(),
        ]);
    }

    /**
     * Registra o actualiza la carga docente del año lectivo actual.
     * Ambiente, grado y grupo no se guardan en la tabla docentes.
     */
    private function sincronizarCargaDocente(
        Docente $docente,
        int $ambienteId,
        int $gradoId,
        int $grupoId
    ): void {
        CargaDocente::updateOrCreate(
            [
                'docente_id' => $docente->id,
                'ambiente_id' => $ambienteId,
                'grado_id' => $gradoId,
                'grupo_id' => $grupoId,
                'anio_lectivo' => (int) date('Y'),
            ],
            ['activo' => true]
        );
    }

    public function verDatosDocente($docente_id)
    {
        $docente_id = (int) $docente_id;
        $docente = Docente::with('user')->where('user_id', $docente_id)->first();

        // setear fecha de ingreso en formato dd/mm/yyyy

        $docente->fecha_ingreso_set = Carbon::parse($docente->fecha_ingreso)->format('Y-m-d');

        if ($docente) {
            return response()->json([
                'success' => true,
                'data' => $docente,
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Docente no encontrado.',
        ]);
    }

    public function toggleActivo($id)
    {
        $usuario = User::findOrFail($id);

        $usuario->estado = ! $usuario->estado;
        $usuario->save();

        return response()->json([
            'success' => true,
            'estado' => $usuario->estado,
            'message' => $usuario->estado
                ? 'Docente activado correctamente.'
                : 'Docente desactivado correctamente.',
        ]);
    }

    public function verAccesos($id)
    {
        $user = User::with('docente')->findOrFail($id);

        $user = $user->accesos()
            ->orderByDesc('fecha')
            ->paginate(30);

        return view('admin.docentes.ver-accesos', compact(
            'user',
            'loginLogs'
        ));

    }

    public function ipPermitida($ip)
    {
        return filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_IPV4
        ) &&
        ip2long($ip) >= ip2long('192.168.1.0') &&
        ip2long($ip) <= ip2long('192.168.1.255');
    }
}
