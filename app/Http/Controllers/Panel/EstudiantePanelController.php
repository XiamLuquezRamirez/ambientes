<?php
namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use App\Models\SyncQueue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EstudiantePanelController extends Controller
{
    private function obtenerAmbiente()
    {
        return Auth::guard('docente')->user()->docente->ambiente;
    }

    public function listar()
    {
        $ambiente    = $this->obtenerAmbiente();
        $estudiantes = $ambiente->estudiantes()->orderBy('nombre')->get();
        return view('panel.estudiantes.index', compact('ambiente', 'estudiantes'));
    }

    public function formularioCrear()
    {
        $condiciones = ['estandar', 'tea', 'tdah', 'disc_visual', 'disc_auditiva', 'disc_motriz', 'down'];
        return view('panel.estudiantes.create', compact('condiciones'));
    }

    public function guardar(Request $request)
    {
        $ambiente = $this->obtenerAmbiente();

        $datos = $request->validate([
            'nombre'       => 'required|string|max:100',
            'iniciales'    => 'required|string|max:3',
            'color_avatar' => 'required|string|max:9',
            'condicion'    => 'required|in:estandar,tea,tdah,disc_visual,disc_auditiva,disc_motriz,down',
        ]);

        $datos['activo'] = true;
        $estudiante = Estudiante::create($datos);
        $ambiente->estudiantes()->attach($estudiante->id);

        SyncQueue::create([
            'entidad'         => 'Estudiante',
            'entidad_id'      => $estudiante->id,
            'accion'          => 'create',
            'servidor_origen' => config('ambiente.slug'),
            'payload'         => $datos,
            'estado'          => 'pendiente',
        ]);

        return redirect()->route('panel.estudiantes')->with('success', 'Estudiante creado exitosamente.');
    }

    public function formularioEditar($estudiante)
    {
        $estudiante  = Estudiante::findOrFail($estudiante);
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
