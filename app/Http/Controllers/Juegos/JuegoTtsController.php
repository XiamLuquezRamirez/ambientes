<?php

namespace App\Http\Controllers\Juegos;

use App\Http\Controllers\Controller;
use App\Services\TextoAVozService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class JuegoTtsController extends Controller
{
    public function tts(Request $request)
    {
        $datos = $request->validate([
            'texto' => ['required', 'string', 'max:800'],
            'personaje' => ['nullable', 'string', 'in:zoe,zeus'],
            'rate' => ['nullable'],
        ]);

        try {
            $binario = app(TextoAVozService::class)->binario(
                $datos['texto'],
                $datos['personaje'] ?? 'zoe',
                $datos['rate'] ?? null
            );
        } catch (\Throwable $e) {
            Log::warning('juegos.tts falló', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'No se pudo generar la voz.',
            ], 502);
        }

        return response($binario, 200, [
            'Content-Type' => 'audio/mpeg',
            'Cache-Control' => 'no-store',
        ]);
    }
}
