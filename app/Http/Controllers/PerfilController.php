<?php

namespace App\Http\Controllers;

use App\Enums\SeguridadAccion;
use App\Models\LoginLog;
use App\Models\User;
use App\Services\HistorialAccesosService;
use App\Services\PerfilService;
use App\Services\SeguridadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class PerfilController extends Controller
{
    public function __construct(
        private PerfilService $perfilService,
        private HistorialAccesosService $historialAccesos,
    ) {}

    /**
     * Muestra la vista de perfil del usuario autenticado (admin o docente).
     *
     * Carga relaciones necesarias según el rol y delega la construcción de datos
     * a PerfilService, que unifica layout, rutas y contenido de cada pestaña.
     */
    public function mostrar()
    {
        $usuario = Auth::guard('docente')->user();

        abort_unless($usuario instanceof User, 401);

        $usuario->load([
                'docente.cargasActivas.ambiente',
                'docente.cargasActivas.grado',
                'docente.cargasActivas.grupo',
                'ultimoLogin',
                'ultimoCambioContrasena',
                'ultimoCambioPassword.actor',
            ]);

        return view('perfil.index', $this->perfilService->construir($usuario));
    }

    /**
     * Devuelve el historial de accesos del usuario autenticado (JSON para modal).
     *
     * Consumido por abrirHistorialAccesosPerfil() en _historial_accesos.blade.php.
     */
    public function historialAccesos(): JsonResponse
    {
        $usuario = Auth::guard('docente')->user();

        if (! $usuario instanceof User) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado.',
            ], 401);
        }

        return response()->json([
            'success' => true,
            'data' => $this->historialAccesos->paraUsuario($usuario),
        ]);
    }

    /**
     * Actualiza los datos de cuenta del usuario autenticado (nombre, apellido, email).
     *
     * Reglas de negocio:
     * - Solo puede editar su propio perfil (comparación por ID).
     * - Si el email cambia, exige password_actual validada con Hash::check.
     * - Registra PROFILE_UPDATED o EMAIL_CHANGED en seguridad_logs.
     *
     * @param  User|null  $usuario  Ruta admin: {usuario}; panel docente: null (usa auth).
     */
    public function actualizar(Request $request, ?User $usuario = null): JsonResponse
    {
        $authUser = Auth::guard('docente')->user();

        if (! $authUser instanceof User) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado.',
            ], 401);
        }

        $usuario = $usuario ?? $authUser;

        if ($usuario->id !== $authUser->id) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permiso para editar este perfil.',
            ], 403);
        }

        $emailCambiado = $request->filled('email')
            && mb_strtolower(trim($request->email)) !== mb_strtolower($usuario->email);

        $reglas = [
            'email' => 'required|email|max:255|unique:users,email,'.$usuario->id,
            'nombre' => 'required|string|max:255',
            'apellido' => 'required|string|max:255',
        ];

        if ($emailCambiado) {
            $reglas['password_actual'] = 'required|string';
        }

        $datos = $request->validate($reglas);

        if ($emailCambiado && ! Hash::check($datos['password_actual'], $usuario->password)) {
            return response()->json([
                'success' => false,
                'message' => 'La contraseña actual no es correcta.',
                'errors' => [
                    'password_actual' => ['La contraseña actual no es correcta.'],
                ],
            ], 422);
        }

        $usuario->update([
            'email' => $datos['email'],
            'nombre' => $datos['nombre'],
            'apellido' => $datos['apellido'],
        ]);

        SeguridadService::registrar(
            $usuario->id,
            $authUser->id,
            $emailCambiado ? SeguridadAccion::EMAIL_CHANGED : SeguridadAccion::PROFILE_UPDATED,
            $emailCambiado ? 'Correo electrónico actualizado.' : 'Perfil actualizado.',
            $request,
            $usuario->email,
        );

        return response()->json([
            'success' => true,
            'message' => 'Perfil actualizado correctamente.',
            'usuario' => [
                'id' => $usuario->id,
                'nombre' => $usuario->nombre,
                'apellido' => $usuario->apellido,
                'email' => $usuario->email,
                'iniciales' => mb_strtoupper(
                    mb_substr($usuario->nombre ?? '', 0, 1).mb_substr($usuario->apellido ?? '', 0, 1)
                ),
            ],
        ]);
    }

    /**
     * Actualiza la información profesional del docente autenticado.
     *
     * Solo el propio docente puede editar su teléfono, dirección, especialidad y descripción.
     * Los datos de cuenta (nombre, email) se gestionan en actualizar().
     */
    public function actualizarInformacionPersonal(Request $request): JsonResponse
    {
        $authUser = Auth::guard('docente')->user();

        if (! $authUser instanceof User || ! $authUser->esDocente()) {
            return response()->json([
                'success' => false,
                'message' => 'Solo los docentes pueden actualizar esta información.',
            ], 403);
        }

        $docente = $authUser->docente;

        if (! $docente) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró el perfil docente asociado.',
            ], 404);
        }

        $datos = $request->validate([
            'telefono' => 'required|string|max:30',
            'direccion' => 'required|string|max:150',
            'especialidad' => 'required|string|max:150',
            'descripcion' => 'nullable|string|max:1000',
        ]);

        $docente->update($datos);

        SeguridadService::registrar(
            $authUser->id,
            $authUser->id,
            SeguridadAccion::PROFILE_UPDATED,
            'Información personal actualizada.',
            $request,
            trim($authUser->nombre.' '.$authUser->apellido),
        );

        return response()->json([
            'success' => true,
            'message' => 'Información personal actualizada correctamente.',
            'informacion' => [
                'telefono' => $docente->telefono,
                'direccion' => $docente->direccion,
                'especialidad' => $docente->especialidad,
                'descripcion' => $docente->descripcion ?? '',
            ],
        ]);
    }

    /**
     * Valida unicidad de email/identificación al editar el perfil (AJAX en tiempo real).
     *
     * Accesible para admin y docente autenticados desde sus respectivas rutas de perfil.
     * Excluye al usuario actual mediante usuario_id para permitir conservar su propio email.
     */
    public function validarDatos(Request $request): JsonResponse
    {
        $authUser = Auth::guard('docente')->user();

        if (! $authUser instanceof User) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado.',
            ], 401);
        }

        $request->validate([
            'identificacion' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:255',
            'usuario_id' => 'nullable|integer',
        ]);

        $usuarioId = $request->integer('usuario_id') ?: $authUser->id;

        if ($usuarioId !== $authUser->id) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permiso para validar datos de otro usuario.',
            ], 403);
        }

        $identificacionExiste = false;
        $emailExiste = false;

        if ($request->filled('identificacion')) {
            $identificacionExiste = User::where('identificacion', $request->identificacion)
                ->where('id', '!=', $usuarioId)
                ->exists();
        }

        if ($request->filled('email')) {
            $emailExiste = User::where('email', $request->email)
                ->where('id', '!=', $usuarioId)
                ->exists();
        }

        return response()->json([
            'success' => true,
            'identificacion_existe' => $identificacionExiste,
            'email_existe' => $emailExiste,
        ]);
    }

    /**
     * Cambia la contraseña del usuario autenticado sin cerrar su sesión actual.
     *
     * - Valida contraseña actual contra la BD.
     * - Exige mínimo 8 caracteres y confirmación coincidente.
     * - Registra el evento en registros_acceso (tipo cambio_contrasena) y seguridad_logs.
     */
    public function cambiarContrasena(Request $request): JsonResponse
    {
        $authUser = Auth::guard('docente')->user();

        if (! $authUser instanceof User) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado.',
            ], 401);
        }

        $datos = $request->validate([
            'password_actual' => 'required|string',
            'password' => 'required|string|min:8',
            'password_confirmation' => 'required|string|min:8',
        ]);

        if ($datos['password'] !== $datos['password_confirmation']) {
            return response()->json([
                'success' => false,
                'message' => 'Las contraseñas no coinciden',
                'errors' => [
                    'password_confirmation' => ['Las contraseñas no coinciden'],
                ],
            ], 422);
        }

        if (! Hash::check($datos['password_actual'], $authUser->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Contraseña actual incorrecta',
                'errors' => [
                    'password_actual' => ['Contraseña actual incorrecta'],
                ],
            ], 422);
        }

        $authUser->update([
            'password' => Hash::make($datos['password']),
        ]);

        $fechaCambio = now();

        LoginLog::create([
            'user_id' => $authUser->id,
            'ip' => $request->ip(),
            'ambiente' => config('ambiente.slug'),
            'fecha' => $fechaCambio,
            'tipo' => LoginLog::TIPO_CAMBIO_CONTRASENA,
        ]);

        SeguridadService::registrar(
            $authUser->id,
            $authUser->id,
            SeguridadAccion::PASSWORD_CHANGED,
            'Contraseña actualizada por el usuario.',
            $request,
            trim($authUser->nombre.' '.$authUser->apellido),
        );

        return response()->json([
            'success' => true,
            'message' => 'Contraseña actualizada correctamente.',
            'ultimo_cambio_contrasena' => [
                'fecha' => $fechaCambio->format('d/m/Y H:i'),
                'fecha_relativa' => $fechaCambio->diffForHumans(),
            ],
        ]);
    }
}
