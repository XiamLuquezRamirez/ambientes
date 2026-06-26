<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\CargaDocente;
use App\Models\Docente;
use App\Models\Grado;
use App\Models\Grupo;
use App\Models\SyncQueue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GruposController extends Controller
{
    /**
     * Lista los grupos institucionales y sus docentes asignados para el año seleccionado.
     *
     * Incluye filtros de grado y carga relaciones necesarias para mostrar el listado.
     */
    public function index(Request $request)
    {
        $anio = (int) $request->get('anio', date('Y'));
        $grados = Grado::activos()
            ->with(['grupos' => fn ($q) => $q->where('anio_lectivo', $anio)->orderBy('nombre')])
            ->get();

        return view('admin.grupos.index', compact('grados', 'anio'));
    }

    public function docentes(Request $request)
    {
        $anio = (int) $request->get('anio', date('Y'));
        $gradoId = $request->get('grado_id');

        $grados = Grado::activos()->orderBy('orden')->get();

        $grupos = Grupo::with([
            'grado',
            'cargasDocente' => function ($q) use ($anio) {
                $q->where('activo', true)
                    ->where('anio_lectivo', $anio)
                    ->with('docente.user');
            },
        ])
            ->delAnio($anio)
            ->when($gradoId, fn ($q) => $q->where('grado_id', $gradoId))
            ->orderBy('grado_id')
            ->orderBy('nombre')
            ->get();

        $docentes = Docente::where('estado', 'activo')
            ->with('user')
            ->get()
            ->sortBy(fn ($docente) => trim($docente->user->nombre.' '.$docente->user->apellido))
            ->values();

        $ambientes = Ambiente::orderBy('nombre')->get();

        return view('admin.grupos.index', compact('grados', 'grupos', 'anio', 'gradoId', 'docentes', 'ambientes'));
    }

    /**
     * Crea un nuevo grupo para el año lectivo especificado.
     *
     * Convierte el nombre a mayúsculas y evita duplicados por grado/año.
     */
    public function guardar(Request $request)
    {
        $datos = $request->validate([
            'grado_id' => 'required|exists:grados,id',
            'nombre' => 'required|string|max:10',
            'anio_lectivo' => 'required|integer|min:2024|max:2030',
            'cupo_maximo' => 'nullable|integer|min:1|max:60',
        ]);

        $nombre = strtoupper($datos['nombre']);

        $existe = Grupo::where('grado_id', $datos['grado_id'])
            ->where('nombre', $nombre)
            ->where('anio_lectivo', $datos['anio_lectivo'])
            ->exists();

        if ($existe) {
            return response()->json([
                'ok' => false,
                'mensaje' => 'Ya existe un grupo con ese nombre en este grado y año lectivo.',
            ], 422);
        }

        $grupo = Grupo::create([
            'grado_id' => $datos['grado_id'],
            'nombre' => $nombre,
            'anio_lectivo' => $datos['anio_lectivo'],
            'cupo_maximo' => $datos['cupo_maximo'] ?? 25,
            'activo' => true,
        ]);
        $grupo->load('grado');

        return response()->json(['ok' => true, 'grupo' => $grupo]);
    }

    /**
     * Actualiza nombre y cupo máximo de un grupo existente.
     *
     * Verifica que no exista otro grupo con el mismo nombre en ese grado/año.
     */
    public function actualizar(Request $request, Grupo $grupo)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:10',
            'cupo_maximo' => 'required|integer|min:1|max:60',
        ]);

        $nombre = strtoupper($datos['nombre']);

        $existe = Grupo::where('grado_id', $grupo->grado_id)
            ->where('nombre', $nombre)
            ->where('anio_lectivo', $grupo->anio_lectivo)
            ->where('id', '!=', $grupo->id)
            ->exists();

        if ($existe) {
            return response()->json([
                'ok' => false,
                'mensaje' => 'Ya existe un grupo con ese nombre en este grado y año.',
            ], 422);
        }

        $grupo->update([
            'nombre' => $nombre,
            'cupo_maximo' => $datos['cupo_maximo'],
        ]);

        return response()->json(['ok' => true]);
    }

    /**
     * Asigna un docente a un grupo específico y encola la sincronización remota.
     *
     * Valida que el grupo pertenezca al grado/año actual y evita conflictos ya asignados.
     */
    public function asignarDocente(Request $request, Grupo $grupo)
    {
        $anioActual = (int) date('Y');

        $datos = $request->validate([
            'docente_id' => 'required|exists:docentes,id',
            'ambiente_id' => 'required|exists:ambientes,id',
            'grado_id' => 'required|exists:grados,id',
            'grupo_id' => 'required|exists:grupos,id',
            'anio_lectivo' => "required|integer|in:{$anioActual}",
        ]);

        if ($datos['grupo_id'] !== $grupo->id) {
            return response()->json(['ok' => false, 'mensaje' => 'El grupo seleccionado no coincide.'], 422);
        }

        $grupoValid = Grupo::where('id', $datos['grupo_id'])
            ->where('grado_id', $datos['grado_id'])
            ->where('anio_lectivo', $anioActual)
            ->where('activo', true)
            ->first();

        if (! $grupoValid) {
            return response()->json(['ok' => false, 'mensaje' => 'El grupo no pertenece al grado o al año actual.'], 422);
        }

        $docente = Docente::find($datos['docente_id']);
        if (! $docente) {
            return response()->json(['ok' => false, 'mensaje' => 'Docente no encontrado.'], 422);
        }

        $duplicada = CargaDocente::where('docente_id', $docente->id)
            ->where('ambiente_id', $datos['ambiente_id'])
            ->where('grado_id', $datos['grado_id'])
            ->where('grupo_id', $datos['grupo_id'])
            ->where('anio_lectivo', $anioActual)
            ->where('activo', true)
            ->exists();

        if ($duplicada) {
            return response()->json(['ok' => false, 'mensaje' => 'Ese docente ya tiene asignado ese grupo en el ambiente y año actual.'], 422);
        }

        $ocupadoEnAmbiente = CargaDocente::where('ambiente_id', $datos['ambiente_id'])
            ->where('grupo_id', $datos['grupo_id'])
            ->where('anio_lectivo', $anioActual)
            ->where('activo', true)
            ->exists();

        if ($ocupadoEnAmbiente) {
            return response()->json(['ok' => false, 'mensaje' => 'Ese grupo ya tiene un docente asignado en este ambiente para el año lectivo actual.'], 422);
        }

        $carga = DB::transaction(function () use ($docente, $datos, $anioActual) {
            $carga = CargaDocente::withoutEvents(function () use ($docente, $datos, $anioActual) {
                return CargaDocente::updateOrCreate(
                    [
                        'docente_id' => $docente->id,
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

        return response()->json([
            'ok' => true,
            'mensaje' => 'Docente asignado correctamente.',
        ]);
    }

    /**
     * Encola la asignación docente para sincronizarla con otros servidores.
     *
     * Crea un registro por servidor destino con el payload completo.
     */
    private function encolarAsignacionParaServidores(CargaDocente $carga): void
    {
        $servidores = array_keys(config('red.servidores', []));
        $origen = config('red.servidor_actual') ?: config('ambiente.slug', 'admin');

        foreach ($servidores as $servidorDestino) {
            SyncQueue::create([
                'entidad' => 'CargaDocente',
                'entidad_id' => $carga->id,
                'accion' => 'create',
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
     * Elimina un grupo solo si no tiene estudiantes matriculados activos.
     *
     * Previene la eliminación de grupos con matrícula vigente.
     */
    public function eliminar(Grupo $grupo)
    {
        $activos = $grupo->totalMatriculas();

        if ($activos > 0) {
            return response()->json([
                'ok' => false,
                'mensaje' => "El grupo tiene {$activos} estudiante(s) activo(s) matriculados.",
            ], 422);
        }

        $grupo->delete();

        return response()->json(['ok' => true]);
    }
}
