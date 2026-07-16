<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Admin\PiarController;
use App\Http\Controllers\Controller;
use App\Models\Asistencia;
use App\Models\CargaDocente;
use App\Models\Condicion;
use App\Models\Departamento;
use App\Models\Estudiante;
use App\Models\Grado;
use App\Models\Grupo;
use App\Models\Matricula;
use App\Models\SyncQueue;
use App\Services\Docente\DocenteAsignacionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Ambiente;
use App\Models\ConfiguracionPin;
use App\Models\FigurasModel;
class EstudiantePanelController extends Controller
{
    public function listar(Request $request)
    {
        $docente = Auth::guard('docente')->user()->docente;

        $figuras =  FigurasModel::getFiguras();

        /* obtener grados de docente logueado */
        $carga = CargaDocente::where('docente_id', Auth::guard('docente')->user()->docente->id)
        ->where('activo', true)
        ->where('anio_lectivo', date('Y'))
        ->with(['grado'])
        ->get();

        $departamentos = Departamento::orderBy('descripcion')->get();

        $grados = $carga->pluck('grado')
        ->filter()
        ->unique('id')
        ->values();


        $cargas = CargaDocente::where('docente_id', $docente->id)
            ->where('activo', true)
            ->with('ambiente')
            ->get();

        $matriculas = collect();

        if ($cargas->isNotEmpty()) {
            $matriculas = Matricula::query()
                ->where(function ($query) use ($cargas) {
                    foreach ($cargas as $carga) {
                        $query->orWhere(function ($q) use ($carga) {
                            $q->where('grado_id', $carga->grado_id)
                                ->where('grupo_id', $carga->grupo_id)
                                ->where('anio_lectivo', $carga->anio_lectivo)
                                ->where('estado', 'activo');
                        });
                    }
                })
                ->pluck('estudiante_id');
        }

        $base = Estudiante::with([
            'condicion:id,nombre',
            'configuracionPin',
            'piar',
        ])->whereIn('id', $matriculas);

        $paraStats = (clone $base)->get();
        $total = $paraStats->count();
        $conPiar = $paraStats->filter(fn ($e) => $e->piar !== null && $e->piar->paso == '8')->count();
        $sinPin = $paraStats->filter(fn ($e) => $e->configuracionPin === null)->count();
        $activos = $paraStats->where('activo', true)->count();

        $estadisticas = [
            'total' => $total,
            'piar' => $conPiar,
            'piar_pct' => $total > 0 ? round(($conPiar / $total) * 100, 1) : 0,
            'sin_pin' => $sinPin,
            'activos' => $activos,
            'activos_pct' => $total > 0 ? round(($activos / $total) * 100, 1) : 0,
        ];

        $consulta = clone $base;

        if ($request->filled('q')) {
            $q = trim($request->get('q'));
            $consulta->where(function ($sub) use ($q) {
                $sub->where('nombre', 'like', "%{$q}%")
                    ->orWhere('apellido', 'like', "%{$q}%")
                    ->orWhere('identificacion', 'like', "%{$q}%")
                    ->orWhereRaw("CONCAT(nombre, ' ', COALESCE(apellido, '')) like ?", ["%{$q}%"]);
            });
        }

        if ($request->filled('condicion_id')) {
            $consulta->where('condicion_id', $request->get('condicion_id'));
        }

        // '0' falla con filled(); comparar de forma explícita.
        if ($request->has('estado') && $request->input('estado') !== null && $request->input('estado') !== '') {
            $consulta->where('activo', (int) $request->input('estado') === 1);
        }

        if ($request->get('filtro') === 'piar') {
            $consulta->whereHas('piar');
        } elseif ($request->get('filtro') === 'sin_pin') {
            $consulta->whereDoesntHave('configuracionPin');
        } elseif ($request->get('filtro') === 'activos') {
            $consulta->where('activo', true);
        }

        $orden = $request->get('orden', 'az');
        if ($orden === 'za') {
            $consulta->orderByDesc('nombre')->orderByDesc('apellido');
        } else {
            $consulta->orderBy('nombre')->orderBy('apellido');
        }

        $estudiantes = $consulta->paginate(12)->withQueryString();

        $condiciones = Condicion::where('estado', true)->orderBy('nombre')->get();
        $filtros = $request->only(['q', 'condicion_id', 'estado', 'filtro', 'orden']);
        $vista = $request->get('vista', 'grid');

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('panel.estudiantes.partials._grid', compact('estudiantes'))->render(),
            ]);
        }

        return view('panel.estudiantes.index', compact(
            'estudiantes',
            'estadisticas',
            'cargas',
            'condiciones',
            'filtros',
            'vista',
            'departamentos',
            'figuras',
            'grados'
        ));

    }

    /**
     * Ficha completa del estudiante (panel docente).
     * Ruta: GET /panel/estudiantes/ficha/{estudiante} → panel.estudiantes.show
     */
    public function verFicha(Estudiante $estudiante)
    {
        $figuras = FigurasModel::getFiguras();
        $docente = Auth::guard('docente')->user()->docente;

        if (! $docente || ! $this->docenteTieneAccesoAlEstudiante($docente->id, $estudiante->id)) {
            abort(403, 'No tienes acceso a este estudiante.');
        }

        $anio = date('Y');

        $estudiante->load([
            'condicion:id,nombre',
            'configuracionPin',
            'piar',
            'matriculaActiva.grado',
            'matriculaActiva.grupo',
        ]);


        $ambiente = $estudiante->ambientes()
            ->wherePivot('anio_lectivo', $anio)
            ->wherePivot('estado', 'activo')
            ->first();

        $portafolioReciente = $estudiante->portafolios()
            ->orderByDesc('creado_en')
            ->limit(5)
            ->get();

        $observacionesRecientes = $estudiante->observaciones()
            ->orderByDesc('created_at')
            ->limit(3)
            ->get();

        $asistenciaHoy = Asistencia::query()
            ->where('estudiante_id', $estudiante->id)
            ->whereDate('fecha', now()->toDateString())
            ->first();

        $estadoPin = $estudiante->estado_pin;
        $estadosPin = [
            'sin_configurar' => 'Sin configurar',
            'configurado' => 'Configurado',
            'bloqueado' => 'Bloqueado',
        ];

        return view('panel.estudiantes.show', [
            'estudiante' => $estudiante,
            'matricula' => $estudiante->matriculaActiva,
            'ambiente' => $ambiente,
            'portafolioReciente' => $portafolioReciente,
            'observacionesRecientes' => $observacionesRecientes,
            'estadoPin' => $estadoPin,
            'estadoPinLabel' => $estadosPin[$estadoPin] ?? 'Sin configurar',
            'mostrarVerPiar' => ! $estudiante->condicion_es_estandar,
            'asistenciaHoy' => $asistenciaHoy,
            'figuras' => $figuras,
        ]);
    }

    public function tomarAsistencia(CargaDocente $carga)
    {
        $fecha = today();

        $asistencia = Asistencia::where('carga_docente_id', $carga->id)
            ->whereDate('fecha', $fecha)
            ->get()
            ->keyBy('estudiante_id');

        $estudiantes = $carga->estudiantes->transform(function ($e) use ($asistencia) {
            $registro = $asistencia->get($e->id);
            $e->presente = $registro ? $registro->estado === 'presente' : true;

            return $e;
        });

        return view('panel.sesion.index', compact('estudiantes', 'carga'));
    }

    public function registrarAsistenciaPuntual(Estudiante $estudiante)
    {
        $docente = Auth::guard('docente')->user()->docente;

        if (! $docente || ! $this->docenteTieneAccesoAlEstudiante($docente->id, $estudiante->id)) {
            abort(403, 'No tienes acceso a este estudiante.');
        }

        Asistencia::updateOrCreate(
            [
                'estudiante_id' => $estudiante->id,
                'fecha' => now()->toDateString(),
            ],
            ['presente' => true]
        );

        return redirect()
            ->route('panel.estudiantes.show', $estudiante)
            ->with('success', 'Asistencia del día registrada.');
    }

    public function verPiar(Estudiante $estudiante)
    {
        $docente = Auth::guard('docente')->user()->docente;

        if (! $docente || ! $this->docenteTieneAccesoAlEstudiante($docente->id, $estudiante->id)) {
            abort(403, 'No tienes acceso a este estudiante.');
        }

        $estudiante->load('condicion');

        if ($estudiante->condicion_es_estandar) {
            return redirect()
                ->route('panel.estudiantes.show', $estudiante)
                ->with('info', 'Ver PIAR solo aplica a condiciones distintas de estándar.');
        }

        if (! $estudiante->piar) {
            return redirect()
                ->route('panel.estudiantes.show', $estudiante)
                ->with('info', 'Este estudiante aún no tiene un PIAR diligenciado.');
        }

        return app(PiarController::class)->exportar($estudiante->id);
    }

    private function docenteTieneAccesoAlEstudiante(int $docenteId, int $estudianteId): bool
    {
        $cargas = CargaDocente::query()
            ->where('docente_id', $docenteId)
            ->where('activo', true)
            ->where('anio_lectivo', date('Y'))
            ->get();

        if ($cargas->isEmpty()) {
            return false;
        }

        return Matricula::query()
            ->where('estudiante_id', $estudianteId)
            ->where('estado', 'activo')
            ->where('anio_lectivo', date('Y'))
            ->where(function ($query) use ($cargas) {
                foreach ($cargas as $carga) {
                    $query->orWhere(function ($q) use ($carga) {
                        $q->where('grado_id', $carga->grado_id)
                            ->where('grupo_id', $carga->grupo_id);
                    });
                }
            })
            ->exists();
    }

    public function formularioCrear()
    {
        $docente = Auth::guard('docente')->user()->docente;
        $anio = date('Y');
        $carga = CargaDocente::where('docente_id', $docente->id)
            ->where('activo', true)
            ->where('anio_lectivo', $anio)
            ->with(['ambiente', 'grado', 'grupo'])
            ->first();

        $condiciones = ['estandar', 'tea', 'tdah', 'disc_visual', 'disc_auditiva', 'disc_motriz', 'down'];

        return view('panel.estudiantes.create', compact('condiciones', 'carga'));
    }

    public function guardar(Request $request)
    {
        $docente = Auth::guard('docente')->user()->docente;
        $anio = date('Y');
        $carga = CargaDocente::where('docente_id', $docente->id)
            ->where('activo', true)
            ->where('anio_lectivo', $anio)
            ->first();

        $datos = $request->validate([
            'nombre' => 'required|string|max:100',
            'apellido' => 'nullable|string|max:100',
            'iniciales' => 'required|string|max:3',
            'color_avatar' => 'required|string|max:9',
            'condicion' => 'required|in:estandar,tea,tdah,disc_visual,disc_auditiva,disc_motriz,down',
            'tipo_identificacion' => 'nullable|string|max:100',
            'identificacion' => 'nullable|string|max:100',
            'sexo' => 'nullable|string|max:20',
        ]);

        if (! $carga) {
            return back()->with('error', 'No tienes un grupo activo para asignar el estudiante.');
        }

        $datos['activo'] = true;
        $datos['nombre'] = trim($datos['nombre']);
        $datos['apellido'] = trim($datos['apellido'] ?? '');
        $datos['iniciales'] = strtoupper($datos['iniciales']);

        $estudiante = Estudiante::create($datos);

        $estudiante->matriculas()->create([
            'grado_id' => $carga->grado_id,
            'grupo_id' => $carga->grupo_id,
            'anio_lectivo' => $anio,
            'estado' => 'activo',
            'fecha_ingreso' => now()->toDateString(),
        ]);

        $ambiente = $carga->ambiente;
        $ambiente->estudiantes()->attach($estudiante->id, [
            'anio_lectivo' => $anio,
            'estado' => 'activo',
        ]);

        SyncQueue::create([
            'entidad' => 'Estudiante',
            'entidad_id' => $estudiante->id,
            'accion' => 'create',
            'servidor_origen' => config('ambiente.slug'),
            'payload' => $datos,
            'estado' => 'pendiente',
        ]);

        app(DocenteAsignacionService::class)->prepararAsignacion($estudiante, $carga, [
            'fecha_ingreso' => now()->toDateString(),
            'anio_lectivo' => $anio,
        ]);

        return redirect()->route('panel.estudiantes')->with('success', 'Estudiante creado y asignado a tu grupo activo.');
    }

    public function buscarEstudiantes(Request $request)
    {
        $query = trim((string) $request->get('q', ''));

        $estudiantes = Estudiante::query()
            ->when($query !== '', function ($q) use ($query) {
                $q->where(function ($sub) use ($query) {
                    $sub->where('nombre', 'like', "%{$query}%")
                        ->orWhere('apellido', 'like', "%{$query}%")
                        ->orWhereRaw("CONCAT(nombre, ' ', COALESCE(apellido, '')) like ?", ["%{$query}%"]);
                });
            })
            ->orderBy('nombre')
            ->paginate(8);

        return response()->json([
            'data' => $estudiantes->items(),
            'pagination' => [
                'current_page' => $estudiantes->currentPage(),
                'last_page' => $estudiantes->lastPage(),
                'total' => $estudiantes->total(),
            ],
        ]);
    }

    public function formularioEditar($estudiante)
    {
        $estudiante = Estudiante::findOrFail($estudiante);
        $condiciones = ['estandar', 'tea', 'tdah', 'disc_visual', 'disc_auditiva', 'disc_motriz', 'down'];

        return view('panel.estudiantes.edit', compact('estudiante', 'condiciones'));
    }

    public function actualizar(Request $request, $estudiante)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function formularioPin($estudiante)
    {
        $estudiante = Estudiante::findOrFail($estudiante);

        return view('panel.estudiantes.pin', compact('estudiante'));
    }

    public function actualizarPin(Request $request, $estudiante)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }


    public function obtenerGruposPorGrado($idGrado)
    {
        $grupoIds = CargaDocente::where('docente_id', Auth::guard('docente')->user()->docente->id)
            ->where('anio_lectivo', date('Y'))
            ->where('grado_id', $idGrado)
            ->select('grupo_id')->get();
    
        $grupos = Grupo::whereIn('id', $grupoIds)->get();

        return response()->json([
            'data' => $grupos,
        ]);
    }

    public function obtenerAmbientesDisponibles($grado, $grupo)
    {
        $idAmbientes = CargaDocente::where('docente_id', Auth::guard('docente')->user()->docente->id)
        ->where('anio_lectivo', date('Y'))
        ->where('grado_id', $grado)
        ->where('grupo_id', $grupo)
        ->select('ambiente_id')
        ->get();

        $ambientes = Ambiente::whereIn('id', $idAmbientes)->get();

        // obtener cantidad de estudiantes matriculados en el grupo
        $ocupados = Matricula::where('grupo_id', $grupo)
        ->where('anio_lectivo', date('Y'))
        ->where('estado', 'activo')
        ->count();

        $cupoMaximo = Grupo::find($grupo)?->cupo_maximo;
        $disponible = $cupoMaximo ? $cupoMaximo - $ocupados : 0;

        return response()->json([
            'disponible' => $disponible,
            'ambientes' => $ambientes,
        ]);
    }

    public function configurarPin(Request $request)
    {
        $datos = $request->validate([
            'id' => 'required|exists:estudiantes,id',
            'configuracion_pin' => 'required|array',
            'configuracion_pin.*.icon' => 'required|string|max:100',
            'configuracion_pin.*.color' => 'required|string|max:100',
        ]);

        $estudiante = Estudiante::findOrFail($datos['id']);
        
        $exitoso = ConfiguracionPin::create([
            'estudiante_id' => $estudiante->id,
            'figura_1' => $datos['configuracion_pin'][0]['icon'],
            'color_figura_1' => $datos['configuracion_pin'][0]['color'],
            'figura_2' => $datos['configuracion_pin'][1]['icon'],
            'color_figura_2' => $datos['configuracion_pin'][1]['color'],
            'figura_3' => $datos['configuracion_pin'][2]['icon'],
            'color_figura_3' => $datos['configuracion_pin'][2]['color'],
        ]);

        if ($exitoso) {
            return response()->json([
                'success' => true,
                'message' => 'PIN configurado correctamente.',
            ]);
        }
        
        return response()->json([
            'success' => false,
            'message' => 'Error al configurar el PIN, intente nuevamente.',
        ]);
    }
}
