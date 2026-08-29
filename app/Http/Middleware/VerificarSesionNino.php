<?php

namespace App\Http\Middleware;

use App\Services\AccesoAmbienteService;
use App\Services\ClaseKioscoService;
use App\Services\SesionNinoService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerificarSesionNino
{
    public function __construct(
        private SesionNinoService $sesionNino,
        private AccesoAmbienteService $accesoAmbiente,
        private ClaseKioscoService $claseKiosco,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $estudianteId = $request->session()->get(SesionNinoService::SESSION_ESTUDIANTE_ID);
        $estudiante = $this->sesionNino->estudianteSesionValido(
            is_numeric($estudianteId) ? (int) $estudianteId : null
        );

        if (! $estudiante) {
            return $this->rechazar($request);
        }

        $claseId = $this->sesionNino->claseIdEnSesion($request);
        $clase = $this->claseKiosco->obtenerClaseSesion($claseId);

        if (! $clase) {
            return $this->rechazar($request);
        }

        $activaHoy = $this->claseKiosco->claseActivaHoy(
            $this->sesionNino->obtenerAmbiente($request)
        );

        if (! $activaHoy || (int) $activaHoy->id !== (int) $clase->id) {
            return $this->rechazar($request);
        }

        if (! $this->claseKiosco->estudiantePerteneceAClase($clase, (int) $estudiante->id)) {
            return $this->rechazar($request);
        }

        $estado = $this->accesoAmbiente->estadoAsignacion($estudiante)
            ?? AccesoAmbienteService::ESTADO_ACTIVO;

        $request->session()->put(SesionNinoService::SESSION_ESTADO_AMBIENTE, $estado);
        $request->attributes->set('estudiante_nino', $estudiante);
        $request->attributes->set('clase_kiosco', $clase);
        $request->attributes->set(
            'estudiante_ambiente_adaptado',
            $estado === AccesoAmbienteService::ESTADO_ADAPTADO
        );

        return $next($request);
    }

    private function rechazar(Request $request): Response
    {
        $this->sesionNino->limpiar($request);

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json([
                'ok' => false,
                'mensaje' => 'Sesión no válida',
                'redirect' => route('ambiente.inicio'),
            ], 401);
        }

        return redirect()->route('ambiente.inicio');
    }
}
