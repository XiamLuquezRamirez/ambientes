<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Docente;
use App\Models\Grado;
use App\Models\Grupo;
use Illuminate\Http\Request;

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
