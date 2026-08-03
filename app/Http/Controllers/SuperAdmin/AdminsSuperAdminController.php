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
     * Lista los administradores creados por el superadmin autenticado.
     *
     * Solo incluye cuentas con estado "activo" (la eliminación es lógica).
     * Si la petición es AJAX, devuelve el HTML parcial de la tabla para
     * refrescar el listado sin recargar la página (mismo patrón que admin/usuarios).
     */
    public function listar(Request $request)
    {
        $superadmin = Auth::guard('docente')->user();
        $instituciones = Institucion::all();
        $administradores = User::where('rol', 'admin')
            ->where('creado_por', $superadmin->id)
            ->where('estado', '!=', 'eliminado')
            ->with('institucion')
            ->orderBy('nombre')
            ->get();

        $consulta = User::query()
            ->where('creado_por', $superadmin->id)
            ->where('estado', '!=', 'eliminado')
            ->orderBy('nombre')
            ->select(
                'users.*',
            );

        if ($request->filled('buscar')) {
            $termino = $request->buscar;
            $consulta->where(fn ($q) => $q
                ->where('creado_por', $superadmin->id)
                ->where('nombre', 'like', "%{$termino}%")
            );
        }

        if ($request->filled('institucion_id')) {
            $consulta->where('creado_por', $superadmin->id)
                ->where('institucion_id', $request->institucion_id);
        }

        $administradores = $consulta->orderBy('nombre')->paginate(10);

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('superAdmin.administradores._tabla', compact('administradores'))->render(),
            ]);
        }

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

    /**
     * Resuelve un administrador perteneciente al superadmin autenticado.
     *
     * Centraliza el scope de autorización (rol admin + creado_por) usado por
     * ver, actualizar, eliminar, toggle y PDF.
     */
    private function administradorDelSuperadmin(string $id): User
    {
        return User::where('rol', 'admin')
            ->where('creado_por', Auth::guard('docente')->id())
            ->findOrFail($id);
    }

    /**
     * Alterna el estado activo/inactivo del administrador.
     *
     * Usa el enum `users.estado` (no existe columna `activo`).
     * Al desactivar, exige que quede al menos un admin activo en la institución.
     */
    public function toggleActivo($id)
    {
        $administrador = $this->administradorDelSuperadmin($id);
        $pasaraAInactivo = $administrador->estado === 'activo';

        if ($pasaraAInactivo) {
            $adminsActivos = User::where('rol', 'admin')
                ->where('institucion_id', $administrador->institucion_id)
                ->where('estado', 'activo')
                ->count();

            if ($adminsActivos <= 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede desactivar el único administrador activo de la institución.',
                ], 403);
            }
        }

        $nuevoEstado = $pasaraAInactivo ? 'inactivo' : 'activo';
        $administrador->update(['estado' => $nuevoEstado]);

        return response()->json([
            'success' => true,
            'estado' => $nuevoEstado,
            'message' => $nuevoEstado === 'activo'
                ? 'Administrador activado correctamente.'
                : 'Administrador desactivado correctamente.',
        ]);
    }

    /**
     * Devuelve el historial de accesos del administrador y marca IPs fuera del rango permitido.
     *
     * La respuesta incluye un resumen que el frontend usa para mostrar advertencias.
     */
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

    /**
     * Valida si una IP se encuentra dentro del rango de red permitido.
     *
     * Actualmente solo admite IPv4 y rango 192.168.1.0/24.
     */
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

    /**
     * Eliminación lógica del administrador (estado → eliminado).
     *
     * No borra el registro para preservar historial de accesos y auditoría.
     * Solo actúa sobre admins creados por el superadmin autenticado.
     * Bloquea la operación si es el único administrador activo de su institución.
     */
    public function eliminar($id)
    {
        try {
            $administrador = $this->administradorDelSuperadmin($id);

            $totalAdministradores = User::where('rol', 'admin')
                ->where('institucion_id', $administrador->institucion_id)
                ->where('estado', 'activo')
                ->count();

            if ($totalAdministradores <= 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede eliminar el único administrador de la institución.',
                ], 403);
            }

            $administrador->update([
                'estado' => 'eliminado',
            ]);

            return response()->json([
                'success' => true,
                'estado' => 'eliminado',
                'message' => 'Administrador eliminado correctamente.',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
