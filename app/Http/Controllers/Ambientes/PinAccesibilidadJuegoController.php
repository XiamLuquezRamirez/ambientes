<?php

namespace App\Http\Controllers\Ambientes;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use App\Services\PinAccesibilidadDocenteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PinAccesibilidadJuegoController extends Controller
{
    public function verificar(Request $request, PinAccesibilidadDocenteService $servicio): JsonResponse
    {
        $estudiante = $request->attributes->get('estudiante_nino');

        if (! $estudiante instanceof Estudiante) {
            return response()->json(['ok' => false, 'message' => 'Sesión no válida.'], 401);
        }

        $datos = $request->validate([
            'pin' => 'required|digits:4',
        ], [
            'pin.required' => 'Ingresa los 4 dígitos.',
            'pin.digits' => 'El PIN tiene 4 dígitos.',
        ]);

        $resultado = $servicio->verificar(
            (int) $estudiante->institucion_id,
            $datos['pin'],
            'est-'.$estudiante->id
        );

        if ($resultado['bloqueado']) {
            return response()->json([
                'ok' => false,
                'message' => 'Demasiados intentos. Espera un momento.',
            ], 429);
        }

        if (! $resultado['ok']) {
            return response()->json([
                'ok' => false,
                'message' => 'PIN incorrecto.',
            ], 422);
        }

        return response()->json(['ok' => true]);
    }
}
