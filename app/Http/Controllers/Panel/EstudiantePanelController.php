<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\CargaDocente;
use App\Models\Condicion;
use App\Models\Estudiante;
use App\Models\Matricula;
use App\Models\SyncQueue;
use App\Services\Docente\DocenteAsignacionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EstudiantePanelController extends Controller
{
    public function listar(Request $request)
    {
        $docente = Auth::guard('docente')->user()->docente;

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
        $conPiar = $paraStats->filter(fn ($e) => $e->piar !== null)->count();
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

        $estudiantes = $consulta->paginate(9)->withQueryString();

        $condiciones = Condicion::where('estado', true)->orderBy('nombre')->get();
        $ambiente = $cargas->first()?->ambiente;
        $filtros = $request->only(['q', 'condicion_id', 'estado', 'filtro', 'orden']);
        $vista = $request->get('vista', 'grid');

        return view('panel.estudiantes.index', compact(
            'ambiente',
            'estudiantes',
            'estadisticas',
            'cargas',
            'condiciones',
            'filtros',
            'vista'
        ));
    }

    public function verFicha(Estudiante $estudiante)
    {
        $estudiante->load(['configuracionPin', 'piar', 'matriculas' => function ($query) {
            $query->where('anio_lectivo', date('Y'))->where('estado', 'activo')->with(['grado', 'grupo']);
        }]);

        return view('panel.estudiantes.show', compact('estudiante'));
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
}
