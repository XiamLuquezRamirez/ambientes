<?php

namespace App\Http\Controllers\Docente;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\CargaDocente;
use App\Models\Condicion;
use App\Services\AmbienteService;
use App\Services\Docente\AsistenciaService;
use App\Services\Docente\GrupoEstadisticasService;
use App\Services\Docente\GrupoEstudiantesService;
use Illuminate\Support\Facades\Auth;

class DocenteDashboardController extends Controller
{
    public function listar()
    {
        $docente = Auth::guard('docente')->user()->docente;
        $anio = date('Y');

        $ambientes = Ambiente::whereHas('cargasDocente', function ($q) use ($docente, $anio) {
            $q->where('docente_id', $docente->id)
                ->where('activo', true)
                ->where('anio_lectivo', $anio);
        })
            ->with([
                'cargasDocente' => function ($q) use ($docente, $anio) {
                    $q->where('docente_id', $docente->id)
                        ->where('activo', true)
                        ->where('anio_lectivo', $anio);
                },
            ])
            ->orderBy('nombre')
            ->get();

        $ambientes->each(function ($ambiente) {

            $cargas = $ambiente->cargasDocente;
            $ambiente->grados_count = $cargas
                ->pluck('grado_id')
                ->unique()
                ->count();

            $ambiente->grupos_count = $cargas
                ->pluck('grupo_id')
                ->unique()
                ->count();

        });

        $ambienteSeleccionado = null;

        if ($ambientes->count() === 1) {
            $ambienteSeleccionado = $ambientes->first();
        }

        $condiciones = Condicion::where('estado', true)->orderBy('nombre')->get(['id', 'nombre']);

        $ambienteService = app(AmbienteService::class);
        $ambientes_disponibles = $ambienteService->getAmbientes();

        return view('panel.principal', compact(
            'ambientes',
            'ambienteSeleccionado',
            'condiciones',
            'ambientes_disponibles',
        ));
    }

    // 1. Devuelve la estructura de Grados y Grupos según la carga del docente en el ambiente
    public function obtenerGradosYGrupos(Ambiente $ambiente)
    {
        $docente = Auth::guard('docente')->user()->docente;
        $anio = date('Y');

        // Obtenemos la carga filtrada agrupada
        $cargas = CargaDocente::where('ambiente_id', $ambiente->id)
            ->where('docente_id', $docente->id)
            ->where('activo', true)
            ->where('anio_lectivo', $anio)
            ->with(['grado', 'grupo'])
            ->get();

        // Estructuramos el JSON para que sea fácil de iterar por el front
        $gradosAgrupados = $cargas->groupBy('grado_id')->map(function ($grupoCarga) {
            $primerRegistro = $grupoCarga->first();

            return [
                'id' => $primerRegistro->grado_id,
                'nombre' => $primerRegistro->grado->nombre ?? 'Sin Grado',
                'grupos' => $grupoCarga->map(function ($item) {
                    return [
                        'carga_docente_id' => $item->id, // ID clave para buscar sus alumnos luego
                        'id' => $item->grupo_id,
                        'nombre' => $item->grupo->nombre ?? 'Sin Grupo',
                        'total_estudiantes' => app(GrupoEstudiantesService::class)->contar($item),
                    ];
                })->values(),
            ];
        })->values();

        return response()->json($gradosAgrupados);
    }

    // 2. Devuelve los indicadores en tiempo real de los alumnos adscritos a esa carga docente
    public function obtenerEstadisticasGrupo(CargaDocente $carga)
    {
        session(['carga_docente_id' => $carga->id]);

        $matriculas = app(GrupoEstudiantesService::class)->obtenerMatriculas($carga);

        $listaTomada = app(AsistenciaService::class)
            ->listaTomada($carga, $matriculas->count());

        $estadisticas = app(GrupoEstadisticasService::class)
            ->calcular($matriculas, $listaTomada);

        return response()->json($estadisticas);
    }

    public function obtenerEstudiantesGrupo(CargaDocente $carga)
    {
        session(['carga_docente_id' => $carga->id]);

        $estudiantes = app(GrupoEstudiantesService::class)->listar($carga);

        return response()->json($estudiantes);
    }

    public function misEstudiantes()
    {
        if (! session()->has('carga_docente_id')) {
            return redirect()
                ->route('panel.principal')
                ->with('warning', 'Primero selecciona un grupo desde el inicio.');
        }

        $carga = CargaDocente::with([
            'ambiente',
            'grado',
            'grupo',
        ])->findOrFail(session('carga_docente_id'));

        $estudiantes = app(GrupoEstudiantesService::class)
            ->listar($carga);

        return view('panel.estudiantes.index', compact(
            'carga',
            'estudiantes'
        ));
    }
}
