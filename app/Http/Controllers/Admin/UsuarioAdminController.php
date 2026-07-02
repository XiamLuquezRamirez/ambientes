<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Docente;
use App\Models\User;
use App\Services\ResumenActividadDocenteService;
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
        private ResumenActividadDocenteService $resumenActividadDocente
    ) {}

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
            $datosDocente = $request->validate([
                'telefono' => 'required|string|max:30',
                'direccion' => 'required|string|max:150',
                'especialidad' => 'required|string|max:150',
                'fecha_ingreso' => 'required|date',
                'firma_url' => 'nullable|image|max:2048',
                'estado' => 'activo',
            ]);

            // Si se sube una imagen de firma, se guarda en el directorio de docentes.
            // Si no se sube una imagen de firma, se crea el perfil docente con los datos obligatorios.
            // Si se sube una imagen de firma, se crea el perfil docente con los datos obligatorios y la imagen de firma.
            if ($request->hasFile('firma_url') || $request->filled('telefono') || $request->filled('direccion') ||
                $request->filled('especialidad') || $request->filled('fecha_ingreso')) {
                if ($request->hasFile('firma_url')) {
                    $datosDocente['firma_url'] = $request->file('firma_url')
                        ->store('docentes', 'public');
                }
                $usuario->docente()->create(array_filter($datosDocente));
            } else {
                $usuario->docente()->create();
            }
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
                    'message' => 'Este usuario tiene cargas asignadas. Desasígnalas primero',
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
                        'message' => 'Este usuario tiene cargas asignadas. Desasígnalas primero.',
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
