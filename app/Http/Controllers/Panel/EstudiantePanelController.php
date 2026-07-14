<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\CargaDocente;
use App\Models\Estudiante;
use App\Models\SyncQueue;
use App\Services\Docente\DocenteAsignacionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EstudiantePanelController extends Controller
{
    private function obtenerAmbiente()
    {
        return Ambiente::where('slug', config('ambiente.slug'))
            ->where('activo', true)
            ->firstOrFail();
    }

    public function listar()
    {
        $ambiente = $this->obtenerAmbiente();
        $estudiantes = $ambiente->estudiantes()
            ->wherePivot('anio_lectivo', date('Y'))
            ->orderBy('nombre')
            ->get();

        return view('panel.estudiantes.index', compact('ambiente', 'estudiantes'));
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
