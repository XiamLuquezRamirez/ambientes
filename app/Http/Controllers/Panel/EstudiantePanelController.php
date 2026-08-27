<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Asistencia;
use App\Models\CargaDocente;
use App\Models\ConfiguracionPin;
use App\Models\Departamento;
use App\Models\Estudiante;
use App\Models\EstudianteAmbiente;
use App\Models\FigurasModel;
use App\Models\Grado;
use App\Models\Grupo;
use App\Models\Matricula;
use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajeOrden;
use App\Models\PerfilAprendizajePersonalizadoOrden;
use App\Models\SyncQueue;
use App\Services\AmbienteService;
use App\Services\Docente\AsistenciaService;
use App\Services\Docente\DocenteAsignacionService;
use App\Services\EstudiantePerfilAprendizajePersonalizadoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EstudiantePanelController extends Controller
{
    public function listar(Request $request)
    {
        $ambiente = session('ambiente_id');
        $ambiente = Ambiente::findOrFail($ambiente);
        $docente = Auth::guard('docente')->user()->docente;

        $figuras = FigurasModel::getFiguras();

        $departamentos = Departamento::orderBy('descripcion')->get();

        $cargas = CargaDocente::where('docente_id', $docente->id)
            ->where('ambiente_id', $ambiente->id)
            ->where('activo', true)
            ->where('anio_lectivo', date('Y'))
            ->with(['ambiente', 'grado', 'grupo'])
            ->get();

        $matriculas = collect();

        $grados = $cargas->pluck('grado')
            ->filter()
            ->unique('id')
            ->values();

        if ($request->get('grado_id')) {
            $id_grado_seleccionado = $request->get('grado_id');
        } else {
            if (session('grado_id')) {
                $id_grado_seleccionado = session('grado_id');
            } else {
                $id_grado_seleccionado = '';
            }
        }

        $grupos = $cargas->pluck('grupo')
            ->filter(fn ($grupo) => $grupo->grado_id == $id_grado_seleccionado)
            ->unique('id')
            ->values();

        if ($request->get('grupo_id')) {
            $id_grupo_seleccionado = $request->get('grupo_id');
        } else {
            if (session('grupo_id')) {
                $id_grupo_seleccionado = session('grupo_id');
            } else {
                $id_grupo_seleccionado = '';
            }
        }

        if ($cargas->isNotEmpty()) {

            $anio = date('Y');

            $matriculas = Matricula::query()
                ->join('estudiante_ambiente', function ($join) use ($ambiente, $anio) {
                    $join->on('estudiante_ambiente.estudiante_id', '=', 'matriculas.estudiante_id')
                        ->where('estudiante_ambiente.ambiente_id', $ambiente->id)
                        ->where('estudiante_ambiente.anio_lectivo', $anio)
                        ->where('estudiante_ambiente.estado', 'activo');
                })
                ->where('matriculas.anio_lectivo', $anio)
                ->where('matriculas.estado', 'activo')
                ->where(function ($query) use ($cargas) {

                    foreach ($cargas as $carga) {

                        $query->orWhere(function ($q) use ($carga) {
                            $q->where('matriculas.grado_id', $carga->grado_id)
                                ->where('matriculas.grupo_id', $carga->grupo_id);
                        });

                    }

                })
                ->pluck('matriculas.estudiante_id');

        }

        $base = Estudiante::with([
            'ambientes',
            'perfilAprendizaje:id,nombre',
            'configuracionPin',
            'piar',
            'perfilAprendizajePersonalizadoActiva.perfilAprendizajePersonalizado',
        ])->whereIn('id', $matriculas);

        $consulta = clone $base;

        if ($request->filled('q')) {
            $texto_busqueda = $request->get('q');
            $q = trim($request->get('q'));
            $consulta->where(function ($sub) use ($q) {
                $sub->where('nombre', 'like', "%{$q}%")
                    ->orWhere('apellido', 'like', "%{$q}%")
                    ->orWhere('identificacion', 'like', "%{$q}%")
                    ->orWhereRaw("CONCAT(nombre, ' ', COALESCE(apellido, '')) like ?", ["%{$q}%"]);
            });
        } else {
            $texto_busqueda = '';
        }

        if ($request->filled('perfil_aprendizaje_id')) {
            $perfil_aprendizaje_id = $request->get('perfil_aprendizaje_id');
            $consulta->where('perfil_aprendizaje_id', $request->get('perfil_aprendizaje_id'));
        } else {
            $perfil_aprendizaje_id = '';
        }

        if ($request->filled('grado_id')) {
            $matriculas = Matricula::query()
                ->whereIn('estudiante_id', $matriculas)
                ->where('grado_id', $request->grado_id)
                ->where('estado', 'activo')
                ->pluck('estudiante_id');

            $consulta->whereIn('id', $matriculas);
        }

        if ($id_grupo_seleccionado) {
            $matriculas = Matricula::query()
                ->whereIn('estudiante_id', $matriculas)
                ->where('grupo_id', $id_grupo_seleccionado)
                ->where('estado', 'activo')
                ->pluck('estudiante_id');

            $consulta->whereIn('id', $matriculas);
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

        $paraStats = (clone $consulta)->get();

        $estudiantes = $consulta->paginate(12)->withQueryString();

        $perfilesAprendizaje = PerfilAprendizajeInclusion::where('estado', true)->orderBy('nombre')->get();
        $datosPerfilesAsignables = $this->datosPerfilesAsignablesInstitucion();
        $filtros = $request->only(['q', 'perfil_aprendizaje_id', 'estado', 'filtro', 'orden']);
        $vista = $request->get('vista', 'grid');

        /* estadisticas */
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

        if ($request->ajax()) {

            return response()->json([
                'success' => true,
                'html' => view('panel.estudiantes.partials._grid', compact(
                    'estudiantes',
                    'estadisticas',
                    'vista',
                    'grupos',
                    'perfilesAprendizaje',
                    'grados',
                    'id_grado_seleccionado',
                    'id_grupo_seleccionado',
                    'perfil_aprendizaje_id',
                    'texto_busqueda',
                ) + $datosPerfilesAsignables)->render(),
            ]);
        }

        $ambienteService = app(AmbienteService::class);
        $ambientes_disponibles = $ambienteService->getAmbientes();

        return view('panel.estudiantes.index', compact(
            'estudiantes',
            'estadisticas',
            'cargas',
            'perfilesAprendizaje',
            'filtros',
            'vista',
            'departamentos',
            'figuras',
            'grados',
            'grupos',
            'ambientes_disponibles',
            'ambiente',
            'id_grado_seleccionado',
            'perfil_aprendizaje_id',
            'id_grupo_seleccionado',
            'texto_busqueda'
        ) + $datosPerfilesAsignables);
    }

    /**
     * Ficha completa del estudiante (panel docente).
     * Ruta: GET /panel/estudiantes/ficha/{estudiante} → panel.estudiantes.show
     */
    public function verFicha(Request $request, Estudiante $estudiante)
    {
        $figuras = FigurasModel::getFiguras();
        $docente = Auth::guard('docente')->user()->docente;
        $asistenciaService = app(AsistenciaService::class);

        if (! $docente || ! $this->docenteTieneAccesoAlEstudiante($docente->id, $estudiante->id)) {
            abort(403, 'No tienes acceso a este estudiante.');
        }

        $urlVolver = $this->resolverUrlVolverFicha($request, $estudiante);

        $estudiante->load([
            'perfilAprendizaje',
            'configuracionPin',
            'piar',
            'matriculaActiva.grado',
            'matriculaActiva.grupo',
            'perfilAprendizajePersonalizadoActiva.perfilAprendizajePersonalizado',
            'perfilAprendizajePersonalizadoActiva.docente.user',
        ]);

        $historialAsistencia = $asistenciaService->historialAsistencia($estudiante);

        $resumenAsistencia = $asistenciaService->resumenAsistencia($estudiante);

        $cargas = CargaDocente::where('docente_id', $docente->id)
            ->where('activo', true)
            ->where('anio_lectivo', date('Y'))
            ->get();

        $ambientesEstudiante = EstudianteAmbiente::where('estudiante_id', $estudiante->id)
            ->where('anio_lectivo', date('Y'))
            ->whereIn('ambiente_id', $cargas->pluck('ambiente_id'))
            ->with('ambiente')
            ->get();

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

        $datosPerfiles = $this->datosPerfilesAprendizajeFicha($estudiante);

        return view('panel.estudiantes.show', [
            'estudiante' => $estudiante,
            'matricula' => $estudiante->matriculaActiva,
            'ambientesEstudiante' => $ambientesEstudiante,
            'portafolioReciente' => $portafolioReciente,
            'observacionesRecientes' => $observacionesRecientes,
            'estadoPin' => $estadoPin,
            'estadoPinLabel' => $estadosPin[$estadoPin] ?? 'Sin configurar',
            'mostrarVerPiar' => ! $estudiante->perfil_aprendizaje_es_estandar,
            'asistenciaHoy' => $asistenciaHoy,
            'figuras' => $figuras,
            'historialAsistencia' => $historialAsistencia,
            'resumenAsistencia' => $resumenAsistencia,
            ...$datosPerfiles,
            'urlVolver' => $urlVolver,
        ]);
    }

    public function fragmentosPerfilesAprendizaje(Estudiante $estudiante)
    {
        $docente = Auth::guard('docente')->user()->docente;

        if (! $docente || ! $this->docenteTieneAccesoAlEstudiante($docente->id, $estudiante->id)) {
            abort(403, 'No tienes acceso a este estudiante.');
        }

        $estudiante->load(['perfilAprendizaje']);

        return $this->respuestaFragmentosPerfilesAprendizaje($estudiante);
    }

    public function fragmentosPerfilAprendizajePersonalizado(Estudiante $estudiante)
    {
        return $this->fragmentosPerfilesAprendizaje($estudiante);
    }

    /**
     * Resuelve a dónde debe regresar el botón Volver de la ficha.
     * Prioridad: ?volver= → página de origen (referer) → sesión → listado de estudiantes.
     */
    private function resolverUrlVolverFicha(Request $request, Estudiante $estudiante): string
    {
        $sessionKey = "ficha_estudiante_volver.{$estudiante->id}";
        $fallback = route('panel.estudiantes');

        $explicita = $request->query('volver');
        if (is_string($explicita) && $explicita !== '') {
            $explicita = str_starts_with($explicita, '/') ? url($explicita) : $explicita;
            if ($this->esUrlVolverSegura($explicita, $estudiante)) {
                session([$sessionKey => $explicita]);

                return $explicita;
            }
        }

        $anterior = url()->previous();
        if ($this->esUrlOrigenFicha($anterior, $estudiante)) {
            session([$sessionKey => $anterior]);

            return $anterior;
        }

        $guardada = session($sessionKey);
        if (is_string($guardada) && $this->esUrlVolverSegura($guardada, $estudiante)) {
            return $guardada;
        }

        return $fallback;
    }

    /**
     * Indica si la URL puede usarse como destino del botón Volver (misma app, no la ficha).
     */
    private function esUrlVolverSegura(string $url, Estudiante $estudiante): bool
    {
        $partes = parse_url($url);
        if ($partes === false || empty($partes['path'])) {
            return false;
        }

        if (isset($partes['scheme']) && ! in_array($partes['scheme'], ['http', 'https'], true)) {
            return false;
        }

        if (isset($partes['host']) && $partes['host'] !== request()->getHost()) {
            return false;
        }

        $path = rtrim($partes['path'], '/');
        $fichaPath = rtrim((string) parse_url(route('panel.estudiantes.show', $estudiante), PHP_URL_PATH), '/');

        return $path !== $fichaPath;
    }

    /**
     * Indica si la URL es un origen válido para actualizar el retorno
     * (excluye la ficha y páginas hijas del flujo del estudiante).
     */
    private function esUrlOrigenFicha(string $url, Estudiante $estudiante): bool
    {
        if (! $this->esUrlVolverSegura($url, $estudiante)) {
            return false;
        }

        $path = rtrim((string) parse_url($url, PHP_URL_PATH), '/');
        $portafolioPath = rtrim((string) parse_url(route('panel.portafolio.estudiante', $estudiante), PHP_URL_PATH), '/');

        if ($path === $portafolioPath) {
            return false;
        }

        if (str_contains($path, '/piar') || str_contains($path, 'diligenciar-piar')) {
            return false;
        }

        return true;
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

        $carga = CargaDocente::where('docente_id', $docente->id)
            ->where('activo', true)
            ->where('anio_lectivo', date('Y'))
            ->first();

        Asistencia::updateOrCreate(
            [
                'carga_docente_id' => $carga->id,
                'estudiante_id' => $estudiante->id,
                'fecha' => now()->toDateString(),
            ],
            ['presente' => true]
        );

        return redirect()
            ->route('panel.estudiantes.show', $estudiante)
            ->with('success', 'Asistencia del día registrada.');
    }

    /**
     * @return array<string, mixed>
     */
    private function datosPerfilesAsignablesInstitucion(): array
    {
        $institucionId = Auth::guard('docente')->user()->institucion_id;
        $perfilesAprendizajeAsignables = collect();
        $perfilesAprendizajePersonalizadoAsignables = collect();

        if ($institucionId) {
            $perfilesAprendizajeAsignables = PerfilAprendizajeOrden::query()
                ->where('institucion_id', $institucionId)
                ->where('activa', true)
                ->whereHas('perfilAprendizaje', fn ($q) => $q->where('eliminado', 0)->where('id', '!=', 1))
                ->with('perfilAprendizaje:id,codigo,nombre,descripcion_corta,color_hex')
                ->orderBy('orden')
                ->get()
                ->pluck('perfilAprendizaje')
                ->filter();

            $perfilesAprendizajePersonalizadoAsignables = PerfilAprendizajePersonalizadoOrden::query()
                ->where('institucion_id', $institucionId)
                ->where('activa', true)
                ->whereHas('perfilAprendizajePersonalizado', fn ($q) => $q->where('estado', 1))
                ->with('perfilAprendizajePersonalizado:id,codigo,etiqueta,descripcion_interna')
                ->orderBy('orden')
                ->get()
                ->pluck('perfilAprendizajePersonalizado')
                ->filter();
        }

        return [
            'perfilesAprendizajeAsignables' => $perfilesAprendizajeAsignables,
            'perfilesAprendizajePersonalizadoAsignables' => $perfilesAprendizajePersonalizadoAsignables,
        ];
    }

    private function respuestaCardEstudianteListado(Estudiante $estudiante): string
    {
        $estudiante->loadMissing([
            'perfilAprendizaje:id,nombre',
            'configuracionPin',
            'piar',
            'perfilAprendizajePersonalizadoActiva.perfilAprendizajePersonalizado',
        ]);

        return view('panel.estudiantes.partials._card', array_merge(
            ['e' => $estudiante],
            $this->datosPerfilesAsignablesInstitucion()
        ))->render();
    }

    /**
     * @return array<string, mixed>
     */
    private function datosPerfilesAprendizajeFicha(Estudiante $estudiante): array
    {
        $datosPersonalizado = $this->datosPerfilAprendizajePersonalizadoFicha($estudiante);
        $asignables = $this->datosPerfilesAsignablesInstitucion();

        return [
            ...$datosPersonalizado,
            'perfilesAprendizaje' => $asignables['perfilesAprendizajeAsignables'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function datosPerfilAprendizajePersonalizadoFicha(Estudiante $estudiante): array
    {
        $estudiante->loadMissing([
            'perfilAprendizajePersonalizadoActiva.perfilAprendizajePersonalizado',
            'perfilAprendizajePersonalizadoActiva.docente.user',
        ]);

        $institucionId = Auth::guard('docente')->user()->institucion_id;
        $docente = Auth::guard('docente')->user()->docente;
        $perfilesAprendizajePersonalizado = collect();

        if ($institucionId) {
            $perfilesAprendizajePersonalizado = PerfilAprendizajePersonalizadoOrden::query()
                ->where('institucion_id', $institucionId)
                ->where('activa', true)
                ->whereHas('perfilAprendizajePersonalizado', fn ($q) => $q->where('estado', 1))
                ->with('perfilAprendizajePersonalizado:id,codigo,etiqueta,descripcion_interna')
                ->orderBy('orden')
                ->get()
                ->pluck('perfilAprendizajePersonalizado')
                ->filter();
        }

        $historialPerfilesAprendizajePersonalizado = $estudiante->asignacionesPerfilAprendizajePersonalizado()
            ->with(['perfilAprendizajePersonalizado', 'docente.user'])
            ->orderByDesc('fecha_activacion')
            ->get();

        $puedeDesactivarPerfilAprendizajePersonalizado = $estudiante->perfilAprendizajePersonalizadoActiva
            && $docente
            && (int) $estudiante->perfilAprendizajePersonalizadoActiva->docente_id === (int) $docente->id;

        return [
            'perfilesAprendizajePersonalizado' => $perfilesAprendizajePersonalizado,
            'perfilAprendizajePersonalizadoActiva' => $estudiante->perfilAprendizajePersonalizadoActiva,
            'historialPerfilesAprendizajePersonalizado' => $historialPerfilesAprendizajePersonalizado,
            'puedeDesactivarPerfilAprendizajePersonalizado' => $puedeDesactivarPerfilAprendizajePersonalizado,
            'motivosCierreTransitoria' => EstudiantePerfilAprendizajePersonalizadoService::MOTIVOS_CIERRE,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function datosAsignacionPerfilAprendizaje(Estudiante $estudiante): array
    {
        $datos = $this->datosPerfilesAprendizajeFicha($estudiante);
        $datos['estudiante'] = $estudiante;

        return $datos;
    }

    private function respuestaFragmentosPerfilesAprendizaje(Estudiante $estudiante): JsonResponse
    {
        $datos = $this->datosAsignacionPerfilAprendizaje($estudiante);

        return response()->json([
            'success' => true,
            'estudiante_id' => $estudiante->id,
            'card_html' => $this->respuestaCardEstudianteListado($estudiante),
            'perfil_normal_html' => view('panel.estudiantes.partials._perfilAprendizajeActivo', $datos)->render(),
            'activo_html' => view('panel.estudiantes.partials._perfilAprendizajePersonalizadoActivo', $datos)->render(),
            'acciones_html' => view('panel.estudiantes.partials._accionesPerfilesAprendizaje', $datos)->render(),
            'historial_html' => view('panel.estudiantes.partials._historialPerfilesAprendizajePersonalizado', $datos)->render(),
            'mostrar_tab_historial' => $datos['historialPerfilesAprendizajePersonalizado']->isNotEmpty(),
            'perfil_personalizado_activo_etiqueta' => $datos['perfilAprendizajePersonalizadoActiva']
                ? ($datos['perfilAprendizajePersonalizadoActiva']->perfilAprendizajePersonalizado?->etiqueta ?? 'Perfil personalizado')
                : null,
        ]);
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

    public function obtenerEstudiantes(Ambiente $ambiente, int $grado, int $grupo)
    {
        $estudiantes = Estudiante::where('activo', true)
            ->whereHas('matriculaActiva', function ($query) use ($grado, $grupo) {
                $query->where('grado_id', $grado)
                    ->where('grupo_id', $grupo)
                    ->where('anio_lectivo', date('Y'));
            })
            ->whereDoesntHave('ambientes', function ($query) use ($ambiente) {
                $query->where('ambientes.id', $ambiente->id)
                    ->where('estudiante_ambiente.anio_lectivo', date('Y'))
                    ->where('estudiante_ambiente.estado', 'activo');
            })
            ->get()

            ->map(function ($e) {

                return [
                    'id' => $e->id,
                    'nombre' => $e->nombre,
                    'avatar_url' => $e->avatar_url,
                    'iniciales' => $e->iniciales ?? mb_strtoupper(mb_substr($e->nombre, 0, 2)),
                    'color_avatar' => $e->color_avatar ?? '#2563EB',
                    'edad' => $e->edad,
                ];

            });

        return response()->json([
            'success' => true,
            'data' => $estudiantes,
        ]);
    }

    public function agregarEstudiantes(Request $request, $ambienteId)
    {
        $datos = $request->validate([
            'estudiante_ids' => 'required|array',
            'estudiante_ids.*' => 'exists:estudiantes,id',
            'anio_lectivo' => 'required|integer',
        ]);

        $creadas = 0;

        foreach ($datos['estudiante_ids'] as $estudianteId) {
            $existe = EstudianteAmbiente::where('estudiante_id', $estudianteId)
                ->where('ambiente_id', $ambienteId)
                ->where('anio_lectivo', $datos['anio_lectivo'])
                ->exists();

            if ($existe) {
                continue;
            }

            EstudianteAmbiente::create([
                'estudiante_id' => $estudianteId,
                'ambiente_id' => $ambienteId,
                'anio_lectivo' => $datos['anio_lectivo'],
                'estado' => 'activo',
            ]);
            $creadas++;
        }

        return response()->json([
            'success' => true,
            'creadas' => $creadas,
            'message' => $creadas > 0
                ? "{$creadas} estudiante(s) asignado(s) al ambiente."
                : 'Los estudiantes ya estaban asignados al ambiente.',
        ]);
    }

    public function obtenerGradosPorAmbiente($idAmbiente)
    {
        $gradoIds = CargaDocente::where('docente_id', Auth::guard('docente')->user()->docente->id)
            ->where('anio_lectivo', date('Y'))
            ->where('ambiente_id', $idAmbiente)
            ->pluck('grado_id');

        $grados = Grado::whereIn('id', $gradoIds)->get();

        return response()->json([
            'data' => $grados,
        ]);
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

    public function cambiarEstadoAmbienteEstudiante(Request $request)
    {
        $datos = $request->validate([
            'idAmbiente' => 'required|exists:ambientes,id',
            'idEstudiante' => 'required|exists:estudiantes,id',
            'activo' => 'required|boolean',
        ]);

        $ambiente = Ambiente::findOrFail($datos['idAmbiente']);
        $estudiante = Estudiante::findOrFail($datos['idEstudiante']);

        if (! $ambiente || ! $estudiante) {
            return response()->json([
                'success' => false,
                'message' => 'Ambiente o estudiante no encontrado.',
            ]);
        }

        $estudianteAmbiente = EstudianteAmbiente::where('estudiante_id', $datos['idEstudiante'])
            ->where('ambiente_id', $datos['idAmbiente'])
            ->update(['activo' => $datos['activo']]);

        if ($estudianteAmbiente) {
            if ($datos['activo'] == 1) {
                $tipo_alerta = 'success';
                $message = 'El estudiante '.$estudiante->nombre.' '.$estudiante->apellido.' ha sido activado del ambiente '.$ambiente->nombre.' correctamente.';
            } else {
                $tipo_alerta = 'warning';
                $message = 'El estudiante '.$estudiante->nombre.' '.$estudiante->apellido.' ha sido desactivado del ambiente '.$ambiente->nombre.' correctamente.';
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'tipo_alerta' => $tipo_alerta,
            ]);

        } else {
            return response()->json([
                'success' => false,
                'message' => 'Error al cambiar el estado del ambiente del estudiante.',
            ]);
        }
    }
}
