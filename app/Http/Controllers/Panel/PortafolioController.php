<?php
namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use App\Models\Observacion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PortafolioController extends Controller
{
    public function listar()
    {
        return view('panel.portafolio.index');
    }

    public function verEstudiante($estudiante)
    {
        $estudiante = Estudiante::with(['portafolios' => function ($query) {
            $query->orderByDesc('creado_en');
        }])->findOrFail($estudiante);

        return view('panel.portafolio.estudiante', compact('estudiante'));
    }

    public function guardarObservacion(Request $request, $estudiante)
    {
        $estudiante = Estudiante::findOrFail($estudiante);
        $user = Auth::guard('docente')->user();

        $datos = $request->validate([
            'contenido' => 'required|string|max:2000',
            'tipo' => 'required|in:general,logro',
            'tema_id' => 'nullable|integer|exists:temas,id',
        ]);

        Observacion::create([
            'estudiante_id' => $estudiante->id,
            'user_id' => $user->id,
            'tema_id' => $datos['tema_id'] ?? null,
            'contenido' => $datos['contenido'],
            'tipo' => $datos['tipo'],
        ]);

        return redirect()
            ->route('panel.estudiantes.show', $estudiante)
            ->with('success', 'Observación registrada.');
    }

    public function exportar($estudiante)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }
}
