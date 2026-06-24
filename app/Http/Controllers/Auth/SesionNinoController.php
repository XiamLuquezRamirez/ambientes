<?php
namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Estudiante;
use Illuminate\Http\Request;

class SesionNinoController extends Controller
{
    private function obtenerAmbiente(): Ambiente
    {
        return Ambiente::where('slug', config('ambiente.slug'))->where('activo', true)->firstOrFail();
    }

    public function mostrarBienvenida()
    {
        $ambiente = $this->obtenerAmbiente();
        return view('auth.bienvenida', compact('ambiente'));
    }

    public function mostrarSeleccionAlumno()
    {
        $ambiente    = $this->obtenerAmbiente();
        $estudiantes = $ambiente->estudiantes()
            ->wherePivot('anio_lectivo', date('Y'))
            ->where('activo', true)
            ->orderBy('nombre')
            ->get();
        return view('auth.seleccionar-alumno', compact('ambiente', 'estudiantes'));
    }

    public function mostrarPin(int $estudianteId)
    {
        $ambiente   = $this->obtenerAmbiente();
        $estudiante = $ambiente->estudiantes()
            ->wherePivot('anio_lectivo', date('Y'))
            ->where('estudiantes.id', $estudianteId)
            ->firstOrFail();
        return view('auth.pin-figuras', compact('ambiente', 'estudiante'));
    }

    public function verificarPin(Request $request, int $estudianteId)
    {
        $ambiente   = $this->obtenerAmbiente();
        $estudiante = $ambiente->estudiantes()
            ->wherePivot('anio_lectivo', date('Y'))
            ->where('estudiantes.id', $estudianteId)
            ->firstOrFail();
        $pin        = $estudiante->configuracionPin;

        if (!$pin) {
            return response()->json(['ok' => false, 'mensaje' => 'Sin PIN configurado'], 422);
        }

        $figura1 = $request->input('figura_1');
        $figura2 = $request->input('figura_2');
        $figura3 = $request->input('figura_3');

        if ($pin->verificar($figura1, $figura2, $figura3)) {
            $pin->update(['intentos_fallidos' => 0]);
            $request->session()->put('estudiante_id', $estudiante->id);
            return response()->json(['ok' => true, 'redirect' => route('auth.bienvenida-ambiente')]);
        }

        $pin->increment('intentos_fallidos');
        return response()->json(['ok' => false, 'mensaje' => 'PIN incorrecto'], 422);
    }

    public function mostrarBienvenidaAmbiente()
    {
        $ambiente   = $this->obtenerAmbiente();
        $estudiante = Estudiante::findOrFail(session('estudiante_id'));
        return view('auth.bienvenida-ambiente', compact('ambiente', 'estudiante'));
    }
}
