<?php

namespace App\Http\Controllers;

use App\Models\Ambiente;
use App\Models\Experiencia;
use App\Services\RecorridoNinoService;
use App\Services\TextoAVozService;
use Illuminate\Http\Request;

class RecorridoNinoController extends Controller
{
    public function __construct(
        private RecorridoNinoService $recorrido,
    ) {}

    public function mostrar(string $token)
    {
        $sesion = $this->recorrido->obtener($token);
        if (! $sesion) {
            return response()->view('experiencias.recorrido-nino-expirado', [], 410);
        }

        $ambiente = Ambiente::query()->find($sesion['ambiente_id'] ?? 0);
        if (! $ambiente || ! $this->recorrido->esAmbienteDemo($ambiente)) {
            return response()->view('experiencias.recorrido-nino-expirado', [], 410);
        }

        $arbol = $this->recorrido->armarArbol(
            $ambiente,
            isset($sesion['experiencia_origen_id']) ? (int) $sesion['experiencia_origen_id'] : null
        );

        return view('experiencias.recorrido-nino', [
            'token' => $token,
            'arbol' => $arbol,
            'urlExperienciaTemplate' => url('/recorrido-nino/'.$token.'/experiencia/__ID__'),
            'urlTts' => route('recorrido-nino.tts', $token),
        ]);
    }

    public function experiencia(string $token, Experiencia $experiencia)
    {
        $sesion = $this->recorrido->obtener($token);
        if (! $sesion) {
            return response()->json([
                'success' => false,
                'message' => 'Este enlace ya no es válido.',
            ], 410);
        }

        if (! $this->recorrido->experienciaPermitidaEnSesion($sesion, $experiencia)) {
            return response()->json([
                'success' => false,
                'message' => 'La experiencia no pertenece a este recorrido.',
            ], 403);
        }

        $payload = $this->recorrido->payloadExperiencia($experiencia);
        if (! $payload) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo cargar la experiencia.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $payload,
        ]);
    }

    public function tts(Request $request, string $token)
    {
        if (! $this->recorrido->obtener($token)) {
            return response()->json([
                'success' => false,
                'message' => 'Este enlace ya no es válido.',
            ], 410);
        }

        $datos = $request->validate([
            'texto' => ['required', 'string', 'max:800'],
        ]);

        try {
            $url = app(TextoAVozService::class)->urlPublica($datos['texto']);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo generar la voz.',
            ], 502);
        }

        return response()->json([
            'success' => true,
            'data' => ['url' => $url],
        ]);
    }
}
