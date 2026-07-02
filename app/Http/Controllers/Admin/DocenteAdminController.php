<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\CargaDocente;
use App\Models\Docente;
use App\Models\Grado;
use App\Models\Grupo;
use App\Models\SyncQueue;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DocenteAdminController extends Controller
{
    /**
     * Lista los docentes con filtros opcionales y paginación.
     *
     * Soporta búsqueda por nombre/email, filtrado por ambiente, rol y estado.
     * Si la petición es AJAX devuelve un fragmento HTML para actualización parcial.
     */
    public function listar(Request $request)
    {
        $consulta = Docente::query()
            ->with('user')
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
            $consulta->whereHas('ambientes', fn ($q) => $q->where('ambientes.id', $request->ambiente_id));
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

        // Datos para el modal "Docentes asignados" (solo filtros; la tabla se carga vía AJAX).
        $datosGrupos = $this->datosVistaGrupos($request, cargarGrupos: false);

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('admin.docentes._tabla', compact('docentes', 'ambientes'))->render(),
            ]);
        }

        return view('admin.docentes.index', array_merge(
            compact('docentes', 'ambientes'),
            $datosGrupos
        ));
    }

    /**
     * Prepara grados, grupos y docentes activos para la vista global de cobertura.
     *
     * Respeta los filtros ?grado_id= y ?anio= que envía el modal de grupos.
     */
    private function datosVistaGrupos(Request $request, bool $cargarGrupos = true): array
    {
        $anio = (int) $request->get('anio', date('Y'));
        $gradoId = $request->get('grado_id');

        $grados = Grado::activos()->orderBy('orden')->get();

        $grupos = $cargarGrupos
            ? Grupo::with([
                'grado',
                'cargasDocente' => function ($q) use ($anio) {
                    $q->where('activo', true)
                        ->where('anio_lectivo', $anio)
                        ->with(['docente.user', 'ambiente']);
                },
            ])
                ->delAnio($anio)
                ->when($gradoId, fn ($q) => $q->where('grado_id', $gradoId))
                ->orderBy('grado_id')
                ->orderBy('nombre')
                ->get()
            : collect();

        // Lista para el selector al asignar docente desde una fila de grupo.
        $docentesActivos = Docente::where('estado', 'activo')
            ->with('user')
            ->get()
            ->sortBy(fn ($docente) => trim($docente->user->nombre.' '.$docente->user->apellido))
            ->values();

        return compact('grados', 'grupos', 'anio', 'gradoId', 'docentesActivos');
    }

    /**
     * Devuelve el HTML del modal de grupos/docentes asignados para peticiones AJAX.
     *
     * Respeta los filtros grado_id y anio sin recargar la página principal.
     */
    public function listarGruposAsignados(Request $request)
    {
        $datos = $this->datosVistaGrupos($request);

        return response()->json([
            'success' => true,
            'html' => view('admin.docentes._grupos_asignados_contenido', $datos)->render(),
            'anio' => $datos['anio'],
        ]);
    }

    /**
     * Muestra el detalle de un docente y sus asignaciones actuales.
     *
     * Retorna JSON para peticiones AJAX o carga la vista de detalle.
     */
    public function ver(Request $request, $docente)
    {
        $usuario = User::with([
            'docente.cargasActivas.ambiente',
            'docente.cargasActivas.grado',
            'docente.cargasActivas.grupo',
        ])->findOrFail($docente);

        if ($usuario->docente && $usuario->docente->estado !== 'activo') {
            $this->liberarAsignacionesDocente($usuario->docente);
            $usuario->docente->unsetRelation('cargasActivas');
            $usuario->load([
                'docente.cargasActivas.ambiente',
                'docente.cargasActivas.grado',
                'docente.cargasActivas.grupo',
            ]);
        }

        $carga = $usuario->docente?->cargasActivas->first();
        $asignaciones = $usuario->docente
            ? $this->formatearAsignacionesActuales($usuario->docente)
            : collect();

        if ($request->wantsJson() || $request->ajax()) {
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
                    'asignaciones' => $asignaciones,
                ],
            ]);
        }

        $ambientes = Ambiente::orderBy('nombre')->get();

    }

    /**
     * Devuelve las asignaciones activas del docente como JSON.
     * Se usa para cargar dinámicamente el listado de grupos en la vista.
     */
    /**
     * Devuelve las asignaciones activas del docente en formato JSON.
     *
     * Este endpoint alimenta los select dinámicos y listados del frontend.
     */
    public function asignacionesActuales(User $docente)
    {
        $docente->load('docente.cargasActivas.ambiente', 'docente.cargasActivas.grado', 'docente.cargasActivas.grupo');

        return response()->json([
            'success' => true,
            'data' => $docente->docente ? $this->formatearAsignacionesActuales($docente->docente) : [],
        ]);
    }

    /**
     * Marca la carga docente como inactiva en lugar de borrarla.
     * Esto conserva el historial y evita que el docente siga viendo el grupo.
     */
    /**
     * Desactiva una asignación de grupo para el docente actual.
     *
     * No elimina el registro para conservar historial y encola la actualización
     * para sincronizarla en servidores remotos.
     */
    public function quitarAsignacion(User $docente, CargaDocente $carga)
    {
        $perfilDocente = $docente->docente;

        if (! $perfilDocente || $carga->docente_id !== $perfilDocente->id || $carga->anio_lectivo !== (int) date('Y')) {
            return response()->json([
                'success' => false,
                'message' => 'Asignación inválida o no corresponde al docente.',
            ], 422);
        }

        $grupoId = $carga->grupo_id;
        $anioLectivo = $carga->anio_lectivo;

        DB::transaction(function () use ($carga) {
            // Guardamos el cambio sin disparar eventos automáticos para evitar
            // duplicar registros de sincronización automáticos.
            $carga = CargaDocente::withoutEvents(function () use ($carga) {
                $carga->activo = false;
                $carga->save();

                return $carga;
            });

            // Encolamos manualmente la actualización para la sincronización remota.
            $this->encolarAsignacionParaServidores($carga, 'update');
        });

        $perfilDocente->load('cargasActivas.ambiente', 'cargasActivas.grado', 'cargasActivas.grupo');

        $grupoModal = Grupo::find($grupoId)?->datosParaModalDocentesAsignados($anioLectivo);

        return response()->json([
            'success' => true,
            'message' => 'Grupo desasignado correctamente.',
            'data' => [
                'asignaciones' => $this->formatearAsignacionesActuales($perfilDocente),
                'grupo_modal' => $grupoModal,
            ],
        ]);
    }

    /**
     * Asigna un grupo activo y valido al docente para el año lectivo actual.
     *
     * Valida integridad del grado/grupo y evita duplicados o conflictos por ambiente.
     */
    public function asignarGrupo(Request $request, User $docente)
    {
        $anioActual = (int) date('Y');

        $datos = $request->validate([
            'ambiente_id' => 'required|exists:ambientes,id',
            'grado_id' => 'required|exists:grados,id',
            'grupo_id' => 'required|exists:grupos,id',
            'anio_lectivo' => "required|integer|in:{$anioActual}",
        ]);

        $grupo = Grupo::where('id', $datos['grupo_id'])
            ->where('grado_id', $datos['grado_id'])
            ->where('anio_lectivo', $anioActual)
            ->where('activo', true)
            ->first();

        if (! $grupo) {
            return response()->json([
                'success' => false,
                'message' => 'El grupo seleccionado no pertenece al grado o al año lectivo actual.',
            ], 422);
        }

        $perfilDocente = $docente->docente;

        if (! $perfilDocente) {
            return response()->json([
                'success' => false,
                'message' => 'El usuario seleccionado no tiene perfil docente.',
            ], 422);
        }

        $duplicada = CargaDocente::where('docente_id', $perfilDocente->id)
            ->where('ambiente_id', $datos['ambiente_id'])
            ->where('grado_id', $datos['grado_id'])
            ->where('grupo_id', $datos['grupo_id'])
            ->where('anio_lectivo', $anioActual)
            ->where('activo', true)
            ->exists();

        if ($duplicada) {
            return response()->json([
                'success' => false,
                'message' => 'Ese docente ya tiene asignado ese grupo en el ambiente y año actual.',
            ], 422);
        }

        $ocupadoEnAmbiente = CargaDocente::where('ambiente_id', $datos['ambiente_id'])
            ->where('grupo_id', $datos['grupo_id'])
            ->where('anio_lectivo', $anioActual)
            ->where('activo', true)
            ->exists();

        if ($ocupadoEnAmbiente) {
            return response()->json([
                'success' => false,
                'message' => 'Ese grupo ya tiene un docente asignado en este ambiente para el año lectivo actual.',
            ], 422);
        }

        $carga = DB::transaction(function () use ($perfilDocente, $datos, $anioActual) {
            // carga_docente reemplaza a la tabla antigua docente_grupo y es lo que lee el panel docente.
            $carga = CargaDocente::withoutEvents(function () use ($perfilDocente, $datos, $anioActual) {
                return CargaDocente::updateOrCreate(
                    [
                        'docente_id' => $perfilDocente->id,
                        'ambiente_id' => (int) $datos['ambiente_id'],
                        'grado_id' => (int) $datos['grado_id'],
                        'grupo_id' => (int) $datos['grupo_id'],
                        'anio_lectivo' => $anioActual,
                    ],
                    ['activo' => true]
                );
            });

            $this->encolarAsignacionParaServidores($carga);

            return $carga;
        });

        $perfilDocente->load('cargasActivas.ambiente', 'cargasActivas.grado', 'cargasActivas.grupo');

        return response()->json([
            'success' => true,
            'message' => 'Grupo asignado correctamente.',
            'data' => [
                'asignacion' => $carga->load('ambiente', 'grado', 'grupo'),
                'asignaciones' => $this->formatearAsignacionesActuales($perfilDocente),
                'grupo_modal' => $grupo->datosParaModalDocentesAsignados($anioActual),
            ],
        ]);
    }

    /**
     * Crea un usuario y perfil de docente dentro de una transacción.
     *
     * Si falla la creación del perfil, el usuario no se deja en estado huérfano.
     */
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
            'firma_url' => 'nullable|image|max:2048',
        ]);

        // Transacción: si falla el perfil docente, no queda un usuario huérfano.
        $docente = DB::transaction(function () use ($datos, $request) {

            $firma_url = null;

            if ($request->hasFile('firma_url')) {
                $firma_url = $request->file('firma_url')->store('docentes', 'public');
            }

            $usuario = User::create([
                'nombre' => $datos['nombre'],
                'apellido' => $datos['apellido'],
                'identificacion' => $datos['identificacion'],
                'email' => $datos['email'],
                'password' => Hash::make($datos['password']),
                'rol' => 'docente',
                'activo' => true,
            ]);

            return Docente::create([
                'user_id' => $usuario->id,
                'telefono' => $datos['telefono'],
                'direccion' => $datos['direccion'],
                'especialidad' => $datos['especialidad'],
                'fecha_ingreso' => $datos['fecha_ingreso'],
                'estado' => 'activo',
                'firma_url' => $firma_url,
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

    /**
     * Devuelve los datos del docente para editar desde el modal.
     *
     * Trae ambientes para reconstruir los select del formulario.
     */
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

    /**
     * Guarda información adicional del docente y sincroniza su carga docente.
     *
     * El campo descripcion se guarda en docentes y la asignación ambiente/grado/grupo
     * se mantiene en la tabla carga_docente.
     */
    public function asignarInfo(Request $request, $docente)
    {
        $usuario = User::with('docente')->findOrFail($docente);

        $datos = $request->validate([
            'ambiente_id' => 'required|exists:ambientes,id',
            'grado_id' => 'required|exists:grados,id',
            'grupo_id' => 'required|exists:grupos,id',
            'anio_lectivo' => 'required|integer',
            'descripcion' => 'nullable|string',
        ]);
        $ocupado = CargaDocente::where('ambiente_id', $datos['ambiente_id'])
            ->where('grupo_id', $datos['grupo_id'])
            ->where('anio_lectivo', $datos['anio_lectivo'])
            ->where('activo', true)
            ->exists();

        if ($ocupado) {
            return response()->json([
                'success' => false,
                'message' => 'Ese grupo ya tiene un docente asignado en este ambiente para el año lectivo seleccionado.',
            ], 422);
        }
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
            // Asignar ambiente/grado/grupo/año lectivo
            // Si no se proporciona un año lectivo, se usa el año actual.
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

    /**
     * Cambia el estado del perfil docente a eliminado.
     *
     * No borra el registro, lo marca como eliminado para mantener el historial.
     */
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

    /**
     * Restablece la contraseña de un usuario docente.
     *
     * Valida la contraseña confirmada y la ocupa para actualizar el usuario.
     */
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
    /**
     * Registra o actualiza la carga docente del año lectivo actual.
     *
     * El método garantiza que solo exista una entrada activa para la combinación
     * docente/ambiente/grado/grupo y el año actual.
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

    /**
     * Normaliza las asignaciones activas para el frontend.
     *
     * Ordena por ambiente, grado y grupo, y expone solo los campos necesarios.
     */
    private function formatearAsignacionesActuales(Docente $docente)
    {
        return $docente->cargasActivas
            ->sortBy([
                ['ambiente.nombre', 'asc'],
                ['grado.orden', 'asc'],
                ['grupo.nombre', 'asc'],
            ])
            ->values()
            ->map(fn (CargaDocente $carga) => [
                'id' => $carga->id,
                'ambiente' => $carga->ambiente?->nombre ?? '—',
                'ambiente_id' => $carga->ambiente_id,
                'grado' => $carga->grado?->nombre ?? '—',
                'grado_id' => $carga->grado_id,
                'grupo' => $carga->grupo?->nombre ?? '—',
                'grupo_id' => $carga->grupo_id,
                'anio_lectivo' => $carga->anio_lectivo,
                'estado' => $carga->activo ? 'Activo' : 'Inactivo',
                'estudiantes' => $carga->grupo?->totalMatriculas() ?? 0,
            ]);
    }

    /**
     * Crea registros en la cola de sincronización para los servidores remotos.
     *
     * @param  CargaDocente  $carga  El registro de carga docente afectado.
     * @param  string  $accion  Puede ser 'create' o 'update'.
     */
    /**
     * Genera entradas de sincronización para servidores remotos.
     *
     * Inserta un registro en SyncQueue para cada servidor de la configuración.
     */
    private function encolarAsignacionParaServidores(CargaDocente $carga, string $accion = 'create'): void
    {
        $servidores = array_keys(config('red.servidores', []));
        $origen = config('red.servidor_actual') ?: config('ambiente.slug', 'admin');

        foreach ($servidores as $servidorDestino) {
            // La tabla no tiene servidor_destino; se incluye en payload para que el despachador pueda enviarlo por servidor.
            SyncQueue::create([
                'entidad' => 'CargaDocente',
                'entidad_id' => $carga->id,
                'accion' => $accion,
                'servidor_origen' => $origen,
                'payload' => [
                    ...$carga->fresh()->toArray(),
                    'servidor_destino' => $servidorDestino,
                ],
                'estado' => 'pendiente',
            ]);
        }
    }

    /**
     * Desactiva las cargas docentes activas del año para liberar los grupos asignados.
     */
    private function liberarAsignacionesDocente(Docente $docente, ?int $anio = null): int
    {
        $anio = $anio ?? (int) date('Y');

        $cargas = CargaDocente::where('docente_id', $docente->id)
            ->where('anio_lectivo', $anio)
            ->where('activo', true)
            ->get();

        if ($cargas->isEmpty()) {
            return 0;
        }

        DB::transaction(function () use ($cargas) {
            foreach ($cargas as $carga) {
                CargaDocente::withoutEvents(function () use ($carga) {
                    $carga->activo = false;
                    $carga->save();
                });

                $this->encolarAsignacionParaServidores($carga->fresh(), 'update');
            }
        });

        return $cargas->count();
    }

    /**
     * Devuelve los datos básicos del docente para el formulario de edición.
     *
     * Convierte la fecha de ingreso al formato Y-m-d usable por los inputs HTML.
     */
    public function verDatosDocente($docente_id)
    {
        $docente_id = (int) $docente_id;

        $docente = Docente::with('user')
            ->where('user_id', $docente_id)
            ->first();

        if (! $docente) {
            return response()->json([
                'success' => false,
                'message' => 'Docente no encontrado.',
            ]);
        }

        $docente->fecha_ingreso_set = Carbon::parse($docente->fecha_ingreso)
            ->format('Y-m-d');

        $docente->firma_url = $docente->firma_url
            ? asset('storage/'.$docente->firma_url)
            : null;

        return response()->json([
            'success' => true,
            'data' => $docente,
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

            $docente = Docente::findOrFail($id);
            $pasaraAInactivo = $docente->estado === 'activo';

            $docente->estado = $pasaraAInactivo ? 'inactivo' : 'activo';
            $docente->save();

            $asignacionesLiberadas = 0;
            if ($docente->estado === 'inactivo') {
                $asignacionesLiberadas = $this->liberarAsignacionesDocente($docente);
            }

            return response()->json([
                'success' => true,
                'estado' => $docente->estado,
                'asignaciones_liberadas' => $asignacionesLiberadas,
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

    /**
     * Devuelve el historial de accesos del docente y marca IPs fuera del rango permitido.
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
     * Genera un PDF con los datos del docente y la contraseña temporal.
     *
     * Se usa para descargar la ficha de docente después de crear o resetear la contraseña.
     */
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
