<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SeguridadAccion;
use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Matricula;
use App\Models\Observacion;
use App\Models\User;
use App\Services\ActividadAdminService;
use App\Services\HistorialAccesosService;
use App\Services\ResumenActividadDocenteService;
use App\Services\SeguridadService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UsuarioAdminController extends Controller
{
    public function __construct(
        private ResumenActividadDocenteService $resumenActividadDocente,
        private ActividadAdminService $actividadAdmin,
        private HistorialAccesosService $historialAccesos,
    ) {}

    public function perfil()
    {
        $usuario = Auth::guard('docente')
            ->user()
            ->load([
                'docente',
                'ultimoLogin',
                'ultimoCambioPassword.actor',
            ]);

        $estadisticas = [];
        $actividad = [];
        $roles = [];
        $sessiones = [];
        $ultimoAcceso = $this->actividadAdmin->ultimoAcceso($usuario);

        if ($usuario->esAdmin()) {

            $informacionPersonal = [
                'nombre' => $usuario->nombre,
                'apellido' => $usuario->apellido,
                'email' => $usuario->email,
                'identificacion' => $usuario->identificacion,
                'rol' => $usuario->rol,
            ];

            $estadisticas = [
                [
                    'titulo' => 'Docentes gestionados',
                    'valor' => Docente::count(),
                    'icono' => 'fa-chalkboard-user',
                    'color' => 'green',
                ],
                [
                    'titulo' => 'Estudiantes registrados',
                    'valor' => Estudiante::count(),
                    'icono' => 'fa-users',
                    'color' => 'blue',
                ],
                [
                    'titulo' => 'Matrículas activas',
                    'valor' => Matricula::count(),
                    'icono' => 'fa-book',
                    'color' => 'purple',
                ],
                [
                    'titulo' => 'Reportes generados',
                    'valor' => Observacion::count(),
                    'icono' => 'fa-file-pen',
                    'color' => 'orange',
                ],
            ];

            $actividad = $this->actividadAdmin->actividadReciente($usuario);
            $ultimoAcceso = $this->actividadAdmin->ultimoAcceso($usuario);

            $roles = [
                [
                    'titulo' => 'Administrador',
                    'descripcion' => 'Acceso completo al sistema',
                    'icono' => 'fa-user-shield',
                    'color' => 'azul',
                ],

            ];

            $sessiones = [
                [
                    'titulo' => 'Actual',
                    'ambiente' => $usuario->ultimoLogin?->ambiente ?? '—',
                    'ip' => 'IP: '.($usuario->ultimoLogin?->ip ?? 'Sin registrar'),
                    'fecha' => $usuario->ultimoLogin
                        ? Carbon::parse($usuario->ultimoLogin->fecha)->format('d/m/Y H:i')
                        : 'Sin registros',
                    'icono' => 'fa-computer',
                    'color' => 'success',
                ],
            ];

        } else {

            $informacionPersonal = [
                'nombre' => $usuario->nombre,
                'apellido' => $usuario->apellido,
                'email' => $usuario->email,
                'identificacion' => $usuario->identificacion,
                'rol' => $usuario->rol,
                'telefono' => $usuario->docente->telefono,
                'direccion' => $usuario->docente->direccion,
                'especialidad' => $usuario->docente->especialidad,
                'fecha_ingreso' => $usuario->docente->fecha_ingreso,
                'firma_url' => $usuario->docente->firma_url,
            ];

            $estadisticas = [
                [
                    'titulo' => 'Grupos',
                    'valor' => $usuario->docente->cargasActivas->count(),
                    'icono' => 'fa-users-rectangle',
                    'color' => 'blue',
                ],
                [
                    'titulo' => 'Horas',
                    'valor' => $usuario->docente->cargasActivas->sum('horas'),
                    'icono' => 'fa-clock',
                    'color' => 'green',
                ],
                [
                    'titulo' => 'Ambientes',
                    'valor' => $usuario->docente->cargasActivas
                        ->pluck('ambiente_id')
                        ->unique()
                        ->count(),
                    'icono' => 'fa-building',
                    'color' => 'purple',
                ],
                [
                    'titulo' => 'Planeaciones',
                    'valor' => 0,
                    'icono' => 'fa-book-open',
                    'color' => 'orange',
                ],
            ];
        }

        return view('admin.perfil.index', compact(
            'usuario',
            'informacionPersonal',
            'estadisticas',
            'actividad',
            'roles',
            'sessiones',
            'ultimoAcceso',
        ));
    }

    public function historialAccesos()
    {
        $usuario = Auth::guard('docente')->user();

        return response()->json([
            'success' => true,
            'data' => $this->historialAccesos->paraUsuario($usuario),
        ]);
    }

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

        $consulta->orderBy('rol');
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
        $datosModalAsignar = $this->datosModalAsignarGrupo();

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('admin.usuarios._tabla', compact('usuarios'))->render(),
            ]);
        }

        return view('admin.usuarios.index', array_merge(
            compact('usuarios'),
            $datosModalAsignar
        ));
    }

    /**
     * Datos necesarios para el modal de asignar grupo incluido en la vista de usuarios.
     */
    private function datosModalAsignarGrupo(): array
    {
        $ambientes = Ambiente::orderBy('nombre')->get();
        $docentesActivos = Docente::where('estado', 'activo')
            ->with('user')
            ->get()
            ->sortBy(fn ($docente) => trim($docente->user->nombre.' '.$docente->user->apellido))
            ->values();

        return compact('ambientes', 'docentesActivos');
    }

    /**
     * Crea un usuario y, si corresponde, su perfil de docente dentro de una transacción.
     *
     * La validación del perfil docente se ejecuta antes de persistir nada en BD,
     * de modo que un error de validación no deje un registro huérfano en users.
     */
    public function guardar(Request $request)
    {
        // Paso 1 — Validar siempre los datos de la cuenta (tabla users).
        $datos = $request->validate([
            'identificacion' => 'required|string|min:8|max:15|unique:users,identificacion',
            'nombre' => 'required|string|max:100',
            'apellido' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8|confirmed',
            'rol' => 'required|in:admin,docente',
        ]);

        // Paso 2 — Si el rol es docente, validar el perfil antes de abrir la transacción.
        $datosDocente = null;
        if ($datos['rol'] === 'docente') {
            $datosDocente = $request->validate([
                'telefono' => 'required|string|max:30',
                'direccion' => 'required|string|max:150',
                'especialidad' => 'required|string|max:150',
                'fecha_ingreso' => 'required|date',
                'firma_url' => 'nullable|image|max:2048',
            ]);
        }

        // Paso 3 — Persistir cuenta + perfil de forma atómica.
        $usuario = DB::transaction(function () use ($datos, $datosDocente, $request) {
            $usuario = User::create([
                'identificacion' => $datos['identificacion'],
                'nombre' => $datos['nombre'],
                'apellido' => $datos['apellido'],
                'email' => $datos['email'],
                'password' => Hash::make($datos['password']),
                'rol' => $datos['rol'],
                'estado' => 'activo',
            ]);

            if ($datos['rol'] === 'docente') {
                $this->crearPerfilDocente($usuario, $datosDocente, $request);
            }

            return $usuario;
        });

        // La contraseña en sesión alimenta la descarga del PDF posterior.
        session(['password_temporal' => $datos['password']]);

        SeguridadService::registrar(
            $usuario->id,
            Auth::guard('docente')->id(),
            SeguridadAccion::USER_CREATED,
            'Usuario creado correctamente.',
            $request,
            trim($usuario->nombre.' '.$usuario->apellido),
        );

        return response()->json([
            'success' => true,
            'accion' => 'crear',
            'message' => 'Usuario creado correctamente.',
            // Se devuelve para mostrarla una sola vez en el modal de credenciales.
            'password_generada' => $datos['password'],
            'usuario' => [
                'id' => $usuario->id,
                'nombre' => $datos['nombre'],
                'apellido' => $datos['apellido'],
            ],
        ]);
    }

    /**
     * Crea el registro en docentes asociado al usuario recién creado.
     *
     * El estado del perfil se asigna aquí; no se valida desde el request
     * porque siempre inicia como activo al crear la cuenta.
     */
    private function crearPerfilDocente(User $usuario, array $datosDocente, Request $request): void
    {
        $perfil = [
            'telefono' => $datosDocente['telefono'],
            'direccion' => $datosDocente['direccion'],
            'especialidad' => $datosDocente['especialidad'],
            'fecha_ingreso' => $datosDocente['fecha_ingreso'],
            'estado' => 'activo',
        ];

        if ($request->hasFile('firma_url')) {
            $perfil['firma_url'] = $request->file('firma_url')
                ->store('docentes', 'public');
        }

        $usuario->docente()->create($perfil);
    }

    /**
     * Actualiza la información del docente y del usuario asociado.
     *
     * Maneja cambio opcional de contraseña y mantiene la contraseña anterior
     * cuando no se envía una nueva contraseña.
     */
    public function actualizar(Request $request, $docente)
    {
        $usuario = User::with('docente.cargasActivas')->findOrFail($docente);

        $datos = $request->validate([
            'nombre' => 'required|string|max:100',
            'apellido' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email,'.$usuario->id,
            'identificacion' => 'required|string|min:8|max:15|unique:users,identificacion,'.$usuario->id,
            'rol' => 'required|in:admin,docente',
            'password' => 'nullable|min:8|confirmed',
        ]);

        $rolCambiado = $datos['rol'] !== $usuario->rol;

        if ($rolCambiado && $usuario->docente?->cargasActivas->isNotEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Este usuario tiene carga docente asignada. Desasígnala primero',
            ], 422);
        }

        DB::transaction(function () use ($usuario, $datos, $request) {

            $usuario->update([
                'identificacion' => $datos['identificacion'],
                'nombre' => $datos['nombre'],
                'apellido' => $datos['apellido'],
                'email' => $datos['email'],
                'rol' => $datos['rol'],
            ]);

            if (! empty($datos['password'])) {
                $usuario->password = Hash::make($datos['password']);
                $usuario->save();
                SeguridadService::registrar(
                    $usuario->id,
                    Auth::guard('docente')->id(),
                    SeguridadAccion::PASSWORD_CHANGED,
                    'Contraseña actualizada.',
                    $request
                );
            }

            if ($datos['rol'] === 'docente') {
                $datosDocente = $request->validate([
                    'telefono' => 'nullable|string|max:30',
                    'direccion' => 'nullable|string|max:150',
                    'especialidad' => 'nullable|string|max:150',
                    'fecha_ingreso' => 'nullable|date',
                    'firma_url' => 'nullable|image|max:2048',
                ]);

                $perfilDocente = [
                    'telefono' => $datosDocente['telefono'] ?? null,
                    'direccion' => $datosDocente['direccion'] ?? null,
                    'especialidad' => $datosDocente['especialidad'] ?? null,
                    'fecha_ingreso' => $datosDocente['fecha_ingreso'] ?? null,
                    'estado' => 'activo',
                ];

                if ($request->hasFile('firma_url')) {
                    $perfilDocente['firma_url'] = $request->file('firma_url')
                        ->store('docentes', 'public');
                }

                $usuario->docente()->updateOrCreate(
                    ['user_id' => $usuario->id],
                    array_filter($perfilDocente, fn ($valor) => $valor !== null)
                );
            }
        });
        session([
            'password_temporal' => $datos['password'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'accion' => 'actualizar',
            'message' => 'Datos del usuario actualizados correctamente.',
            'password_generada' => $datos['password'] ?? null,
            'usuario' => [
                'id' => $usuario->id,
            ],
        ]);
    }

    /**
     * Cambia el estado del usuario a eliminado.
     *
     * No borra el registro, lo marca como eliminado para mantener el historial.
     */
    public function eliminar($usuario)
    {
        try {

            $usuario = User::findOrFail($usuario);

            // Impedir que el usuario autenticado se elimine a sí mismo
            if ($usuario->id === Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No puedes eliminar tu propia cuenta.',
                ], 403);
            }

            // Contar únicamente administradores activos
            $adminsActivos = User::where('rol', 'admin')
                ->where('estado', 'activo')
                ->count();

            // Impedir eliminar al último administrador activo
            if ($usuario->rol === 'admin' && $adminsActivos === 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede eliminar el administrador activo.',
                ], 403);
            }

            if ($usuario->rol === 'docente' && $usuario->docente?->cargasActivas->isNotEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Este usuario tiene cargas académicas asignadas. 
                        Reasígnalas primero.',
                ], 422);
            }

            // Eliminación lógica
            $usuario->estado = 'eliminado';
            $usuario->save();

            return response()->json([
                'success' => true,
                'estado' => $usuario->estado,
                'message' => 'Usuario eliminado correctamente.',
            ]);

        } catch (\Throwable $e) {

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ], 500);
        }
    }

    /**
     * Devuelve los datos básicos del docente para el formulario de edición.
     *
     * Convierte la fecha de ingreso al formato Y-m-d usable por los inputs HTML.
     */
    public function verDatosUsuario($usuario_id)
    {
        $usuario_id = (int) $usuario_id;

        $usuario = User::with('docente.cargasActivas')
            ->where('id', $usuario_id)
            ->first();

        if (! $usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado.',
            ]);
        }

        $docente = $usuario->docente;
        $usuario->telefono = $docente?->telefono;
        $usuario->direccion = $docente?->direccion;
        $usuario->especialidad = $docente?->especialidad;
        $usuario->fecha_ingreso = $docente?->fecha_ingreso
            ? Carbon::parse($docente->fecha_ingreso)->format('Y-m-d')
            : null;
        $usuario->firma_url = $docente?->firma_url
            ? asset('storage/'.$docente->firma_url)
            : null;

        $tieneCargaActiva = $usuario->docente?->cargasActivas->isNotEmpty();

        return response()->json([
            'success' => true,
            'data' => $usuario,
            'tiene_carga_activa' => $tieneCargaActiva,
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
     * Muestra el detalle del usuario. Para docentes incluye resumen de carga y actividad.
     */
    public function ver(Request $request, string $id)
    {
        $usuario = User::with('docente')->findOrFail($id);

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'usuario' => $usuario,
            ]);
        }
    }

    /**
     * Devuelve el resumen de carga y actividad del docente para el modal de la tabla.
     */
    public function resumenActividad($id)
    {
        $usuario = User::with('docente')->findOrFail($id);

        if ($usuario->rol !== 'docente' || ! $usuario->docente) {
            return response()->json([
                'success' => false,
                'message' => 'El usuario no tiene perfil docente.',
            ], 404);
        }

        $resumen = $this->resumenActividadDocente->construir($usuario);

        return response()->json([
            'success' => true,
            'data' => [
                'docente' => [
                    'id' => $usuario->id,
                    'nombre' => trim($usuario->nombre.' '.$usuario->apellido),
                    'email' => $usuario->email,
                    'estado' => $usuario->docente->estado,
                ],
                'anio' => $resumen['anio'],
                'cargas' => $resumen['cargas'],
                'totales' => $resumen['totales'],
                'tiene_carga' => $resumen['tiene_carga'],
            ],
        ]);
    }

    /**
     * Alterna el estado activo/inactivo del perfil docente.
     *
     * Útil para habilitar o deshabilitar rápidamente un docente sin eliminarlo.
     */
    public function toggleActivo($id)
    {
        try {

            $usuario = User::findOrFail($id);

            if ($usuario->id === Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No puedes desactivar tu propia cuenta.',
                ], 403);
            }

            $pasaraAInactivo = $usuario->estado === 'activo';

            // Validaciones únicamente al desactivar
            if ($pasaraAInactivo) {

                // Impedir desactivar al último administrador activo
                if ($usuario->rol === 'admin') {

                    $adminsActivos = User::where('rol', 'admin')
                        ->where('estado', 'activo')
                        ->count();

                    if ($adminsActivos === 1) {
                        return response()->json([
                            'success' => false,
                            'message' => 'No se puede desactivar el administrador activo.',
                        ], 403);
                    }
                }

                // Impedir desactivar docentes con cargas activas
                if (
                    $usuario->rol === 'docente' &&
                    $usuario->docente &&
                    $usuario->docente->cargasActivas()->exists()
                ) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Este usuario tiene cargas académicas asignadas. 
                        Reasígnalas primero.',
                    ], 422);
                }
            }

            $nuevoEstado = $pasaraAInactivo ? 'inactivo' : 'activo';

            DB::transaction(function () use ($usuario, $nuevoEstado) {

                $usuario->update([
                    'estado' => $nuevoEstado,
                ]);

                if ($usuario->rol === 'docente' && $usuario->docente) {
                    $usuario->docente->update([
                        'estado' => $nuevoEstado,
                    ]);
                }

            });

            return response()->json([
                'success' => true,
                'estado' => $nuevoEstado,
                'message' => $nuevoEstado === 'activo'
                    ? 'Usuario activado correctamente.'
                    : 'Usuario desactivado correctamente.',
            ]);

        } catch (\Throwable $e) {

            return response()->json([
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ], 500);
        }
    }

    public function validarDatos(Request $request)
    {
        $request->validate([
            'identificacion' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:255',
            'usuario_id' => 'nullable|integer',
        ]);

        $identificacionExiste = false;
        $emailExiste = false;

        if ($request->filled('identificacion')) {
            $query = User::where('identificacion', $request->identificacion);

            if ($request->filled('usuario_id')) {
                $query->where('id', '!=', $request->usuario_id);
            }

            $identificacionExiste = $query->exists();
        }

        if ($request->filled('email')) {
            $query = User::where('email', $request->email);

            if ($request->filled('usuario_id')) {
                $query->where('id', '!=', $request->usuario_id);
            }

            $emailExiste = $query->exists();
        }

        return response()->json([
            'success' => true,
            'identificacion_existe' => $identificacionExiste,
            'email_existe' => $emailExiste,
        ]);
    }

    /**
     * Actualiza el perfil del usuario autenticado (solo puede editar su propia cuenta).
     *
     * Reglas de negocio:
     * - nombre, apellido y email son obligatorios.
     * - Si el email cambia respecto al registrado, se exige password_actual y se valida con Hash::check.
     * - Registra la acción en seguridad_logs (PROFILE_UPDATED o EMAIL_CHANGED).
     *
     * @param  int|string  $usuario  ID del usuario (debe coincidir con el autenticado).
     * @return \Illuminate\Http\JsonResponse  Datos actualizados para refrescar la UI sin recargar.
     */
    public function actualizarPerfil(Request $request, $usuario)
    {
        $authUser = Auth::guard('docente')->user();
        $usuario = User::findOrFail($usuario);

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
}
