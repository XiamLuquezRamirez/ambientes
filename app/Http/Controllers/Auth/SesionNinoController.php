<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\FigurasModel;
use App\Services\AccesoAmbienteService;
use App\Services\ClaseKioscoService;
use App\Services\SesionNinoService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SesionNinoController extends Controller
{
    public function __construct(
        private SesionNinoService $sesionNino,
        private AccesoAmbienteService $accesoAmbiente,
        private ClaseKioscoService $claseKiosco,
    ) {}

    public function mostrarBienvenida(Request $request)
    {
        $this->sesionNino->limpiar($request);

        return redirect()->route('ambiente.inicio', $request->query());
    }

    public function mostrarSeleccionAlumno()
    {
        $ambiente = $this->sesionNino->obtenerAmbiente();
        $resuelto = $this->claseKiosco->resolverClaseKiosco($ambiente);
        $clase = $resuelto['clase'];
        $motivo = $resuelto['motivo'];

        if (! $clase) {
            return view('auth.sin-clase', compact('ambiente', 'motivo'));
        }

        $estudiantes = $this->claseKiosco->estudiantesDeClase($clase);

        return view('auth.seleccionar-alumno', compact('ambiente', 'estudiantes', 'clase'));
    }

    public function mostrarPin(int $estudianteId)
    {
        $ambiente = $this->sesionNino->obtenerAmbiente();
        $clase = $this->claseKiosco->claseActivaHoy($ambiente);

        if (! $clase) {
            return redirect()->route('auth.alumnos');
        }

        $estudiante = $this->claseKiosco->obtenerParaKioscoDeClase($clase, $estudianteId);

        if (! $estudiante) {
            abort(404);
        }

        $figuras = FigurasModel::getFiguras();
        $sinPin = $estudiante->configuracionPin === null;
        $pinBloqueado = $estudiante->configuracionPin?->estaBloqueado() ?? false;

        return view('auth.pin-figuras', compact(
            'ambiente',
            'estudiante',
            'figuras',
            'sinPin',
            'pinBloqueado'
        ));
    }

    public function verificarPin(Request $request, int $estudianteId)
    {
        $ambiente = $this->sesionNino->obtenerAmbiente();
        $clase = $this->claseKiosco->claseActivaHoy($ambiente);

        if (! $clase) {
            return response()->json([
                'ok' => false,
                'mensaje' => 'Hoy no hay clase. Pide ayuda a tu profe.',
            ], 403);
        }

        $estudiante = $this->claseKiosco->obtenerParaKioscoDeClase($clase, $estudianteId);

        if (! $estudiante) {
            return response()->json([
                'ok' => false,
                'mensaje' => 'No puedes entrar a este ambiente. Pide ayuda a tu profe.',
            ], 403);
        }

        $pin = $estudiante->configuracionPin;

        if (! $pin) {
            return response()->json(['ok' => false, 'mensaje' => 'Sin PIN configurado. Pide ayuda a tu profe.'], 422);
        }

        if ($pin->estaBloqueado()) {
            return response()->json(['ok' => false, 'mensaje' => 'PIN bloqueado. Pide ayuda a tu profe.'], 423);
        }

        $iconosValidos = FigurasModel::iconosValidos();

        $request->validate([
            'figura_1' => ['required', 'string', Rule::in($iconosValidos)],
            'figura_2' => ['required', 'string', Rule::in($iconosValidos)],
            'figura_3' => ['required', 'string', Rule::in($iconosValidos)],
        ]);

        $figura1 = $request->input('figura_1');
        $figura2 = $request->input('figura_2');
        $figura3 = $request->input('figura_3');

        if ($pin->verificar($figura1, $figura2, $figura3)) {
            $pin->update(['intentos_fallidos' => 0]);
            $this->sesionNino->iniciarSesion($request, $estudiante, $clase->id);

            return response()->json(['ok' => true, 'redirect' => route('auth.bienvenida-ambiente')]);
        }

        $pin->increment('intentos_fallidos');
        $pin->refresh();

        if ($pin->estaBloqueado()) {
            return response()->json(['ok' => false, 'mensaje' => 'PIN bloqueado. Pide ayuda a tu profe.'], 423);
        }

        return response()->json(['ok' => false, 'mensaje' => 'PIN incorrecto. Inténtalo de nuevo.'], 422);
    }

    public function mostrarBienvenidaAmbiente(Request $request)
    {
        $ambiente = $this->sesionNino->obtenerAmbiente();
        $estudiante = $request->attributes->get('estudiante_nino')
            ?? $this->sesionNino->estudianteSesionValido((int) session(SesionNinoService::SESSION_ESTUDIANTE_ID));

        return view('auth.bienvenida-ambiente', compact('ambiente', 'estudiante'));
    }

    public function cerrarSesion(Request $request)
    {
        $this->sesionNino->limpiar($request);

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json([
                'ok' => true,
                'redirect' => route('ambiente.inicio', $request->query()),
            ]);
        }

        return redirect()->route('ambiente.inicio', $request->query());
    }
}
