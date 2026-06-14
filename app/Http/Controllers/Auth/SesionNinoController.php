<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Estudiante;
use Illuminate\Http\Request;

class SesionNinoController extends Controller
{
    private function ambiente(): Ambiente
    {
        return Ambiente::where('slug', config('ambiente.slug'))->where('activo', true)->firstOrFail();
    }

    public function bienvenida()
    {
        $ambiente = $this->ambiente();
        return view('auth.bienvenida', compact('ambiente'));
    }

    public function seleccionarAlumno()
    {
        $ambiente = $this->ambiente();
        $estudiantes = $ambiente->estudiantes()->where('activo', true)->get();
        return view('auth.seleccionar-alumno', compact('ambiente', 'estudiantes'));
    }

    public function mostrarPin(int $estudianteId)
    {
        $ambiente = $this->ambiente();
        $estudiante = $ambiente->estudiantes()->where('estudiantes.id', $estudianteId)->firstOrFail();
        return view('auth.pin-figuras', compact('ambiente', 'estudiante'));
    }

    public function verificarPin(Request $request, int $estudianteId)
    {
        $ambiente = $this->ambiente();
        $estudiante = $ambiente->estudiantes()->where('estudiantes.id', $estudianteId)->firstOrFail();
        $pin = $estudiante->configuracionPin;

        if (!$pin) {
            return response()->json(['ok' => false, 'mensaje' => 'Sin PIN configurado'], 422);
        }

        $f1 = $request->input('figura_1');
        $f2 = $request->input('figura_2');
        $f3 = $request->input('figura_3');

        if ($pin->verificar($f1, $f2, $f3)) {
            $pin->update(['intentos_fallidos' => 0]);
            $request->session()->put('estudiante_id', $estudiante->id);
            return response()->json([
                'ok' => true,
                'redirect' => route('auth.bienvenida-ambiente'),
            ]);
        }

        $pin->increment('intentos_fallidos');
        return response()->json(['ok' => false, 'mensaje' => 'PIN incorrecto'], 422);
    }

    public function bienvenidaAmbiente()
    {
        $ambiente = $this->ambiente();
        $estudiante = Estudiante::findOrFail(session('estudiante_id'));
        return view('auth.bienvenida-ambiente', compact('ambiente', 'estudiante'));
    }
}
