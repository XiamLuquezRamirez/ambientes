<?php
namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use App\Models\SyncQueue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EstudiantePanelController extends Controller
{
    private function ambiente()
    {
        return Auth::guard('docente')->user()->perfil->ambiente;
    }

    public function index()
    {
        $ambiente    = $this->ambiente();
        $estudiantes = $ambiente->estudiantes()->orderBy('nombre')->get();
        return view('panel.estudiantes.index', compact('ambiente', 'estudiantes'));
    }

    public function create()
    {
        $condiciones = ['estandar', 'tea', 'tdah', 'disc_visual', 'disc_auditiva', 'disc_motriz', 'down'];
        return view('panel.estudiantes.create', compact('condiciones'));
    }

    public function store(Request $request)
    {
        $ambiente = $this->ambiente();
        $data = $request->validate([
            'nombre'       => 'required|string|max:100',
            'iniciales'    => 'required|string|max:3',
            'color_avatar' => 'required|string|max:9',
            'condicion'    => 'required|in:estandar,tea,tdah,disc_visual,disc_auditiva,disc_motriz,down',
        ]);
        $data['activo'] = true;
        $estudiante = Estudiante::create($data);
        $ambiente->estudiantes()->attach($estudiante->id);

        SyncQueue::create([
            'entidad'         => 'Estudiante',
            'entidad_id'      => $estudiante->id,
            'accion'          => 'create',
            'servidor_origen' => config('ambiente.slug'),
            'payload'         => $data,
            'estado'          => 'pendiente',
        ]);

        return redirect()->route('panel.estudiantes')->with('success', 'Estudiante creado.');
    }

    public function edit($estudiante) {}
    public function update(Request $request, $estudiante) {}
    public function editPin($estudiante) {}
    public function updatePin(Request $request, $estudiante) {}
}
