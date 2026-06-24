<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\CargaDocente;
use App\Models\Docente;
use App\Models\Grado;
use App\Models\Grupo;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DocenteAdminController extends Controller
{
    public function listar(Request $request)
    {
        $consulta = Docente::query()
            ->join('users', 'users.id', '=', 'docentes.user_id')
            ->select(
                'docentes.*',
                'users.nombre',
                'users.apellido',
                'users.email'
            );

        $consulta->orderBy('users.nombre');
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
            $consulta->where('docentes.estado', $request->estado === 'true');
        }

        // ordenar por nombre
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
                'estado' => $usuario->docente?->estado,
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

        $docente = DB::transaction(function () use ($datos) {

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
            return Docente::create([
                'user_id' => $usuario->id,
                'telefono' => $datos['telefono'],
                'direccion' => $datos['direccion'],
                'especialidad' => $datos['especialidad'],
                'fecha_ingreso' => $datos['fecha_ingreso'],
                'estado' => true,
            ]);
        });

        session([
            'password_temporal' => $datos['password'],
        ]);

        return response()->json([
            'success' => true,
            'accion' => 'crear',
            'message' => 'Docente creado correctamente.',
            'password_generada' => $datos['password'],
            'docente' => [
                'id' => $docente->id,
                'nombre' => $datos['nombre'],
                'apellido' => $datos['apellido'],
            ],
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
        try {

            $docente = Docente::findOrFail($docente);

            $docente->estado = 'eliminado';

            $docente->save();

            return response()->json([
                'success' => true,
                'estado' => $docente->estado,
                'message' => 'Docente eliminado correctamente.',
            ]);

        } catch (\Throwable $e) {

            return response()->json([
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ], 500);
        }
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
        try {

            $docente = Docente::findOrFail($id);

            $docente->estado = $docente->estado === 'activo'
                ? 'inactivo'
                : 'activo';

            $docente->save();

            return response()->json([
                'success' => true,
                'estado' => $docente->estado,
                'message' => $docente->estado === 'activo'
                    ? 'Docente activado correctamente.'
                    : 'Docente desactivado correctamente.',
            ]);

        } catch (\Throwable $e) {

            return response()->json([
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ], 500);
        }
    }

    public function verAccesos($id)
    {
        $usuario = User::with('docente')->findOrFail($id);

        // La historia de auditoría muestra exactamente los 30 eventos más recientes;
        // no se pagina porque el requisito pide un corte fijo y fácil de revisar.
        $loginLogs = $usuario->accesos()
            ->orderByDesc('fecha')
            ->limit(30)
            ->get()
            ->map(function ($acceso) {
                $ipFueraRango = ! $this->ipPermitida($acceso->ip);

                return [
                    'fecha' => optional($acceso->fecha)->format('d/m/Y'),
                    'hora' => optional($acceso->fecha)->format('H:i:s'),
                    'ip' => $acceso->ip ?: 'Sin registrar',
                    // El frontend solo pinta la alerta; la regla de red queda centralizada aquí.
                    'ip_fuera_rango' => $ipFueraRango,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'docente' => [
                    'id' => $usuario->id,
                    'nombre' => trim($usuario->nombre.' '.$usuario->apellido),
                    'email' => $usuario->email,
                ],
                'accesos' => $loginLogs,
                'tiene_accesos_fuera_rango' => $loginLogs->contains('ip_fuera_rango', true),
                'rango_permitido' => '192.168.1.0/24',
            ],
        ]);
    }

    public function ipPermitida($ip)
    {
        // Solo IPv4 dentro de 192.168.1.0/24 se considera confiable para esta auditoría.
        // IPv6, IP vacía o valores inválidos se marcan como fuera de rango.
        if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return false;
        }

        $ipLong = ip2long($ip);

        return $ipLong >= ip2long('192.168.1.0')
            && $ipLong <= ip2long('192.168.1.255');
    }

    public function generarPdf($id)
    {
        // Verificar si el docente tiene una cuenta activa
        $docente = Docente::with('user')->findOrFail($id);
        $password = session()->pull('password_temporal');
        $pdf = Pdf::loadView(
            'admin.pdf.docente',
            compact('docente', 'password')
        );
        $nombreArchivo = 'Docente_'.
        Str::slug(
            $docente->user->nombre.' '.$docente->user->apellido,
            ' '
        ).
        '.pdf';

        return $pdf->download($nombreArchivo);
    }
}