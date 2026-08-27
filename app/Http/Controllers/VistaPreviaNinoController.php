<?php

namespace App\Http\Controllers;

use App\Models\Experiencia;
use App\Services\BloqueExperienciaService;
use App\Services\TextoAVozService;
use App\Services\VistaPreviaNinoService;
use Illuminate\Http\Request;

class VistaPreviaNinoController extends Controller
{
    public function __construct(
        private VistaPreviaNinoService $sesiones,
        private BloqueExperienciaService $bloques,
    ) {}

    public function mostrar(string $token)
    {
        $sesion = $this->sesiones->obtener($token);
        if (! $sesion) {
            return response()->view('experiencias.vista-previa-nino-expirada', [], 410);
        }

        $experiencia = Experiencia::query()->find($sesion['experiencia_id']);
        if (! $experiencia) {
            return response()->view('experiencias.vista-previa-nino-expirada', [], 410);
        }

        $bloques = $this->bloques->listar($experiencia);
        $version = $this->sesiones->version($experiencia, $sesion);
        $mediaBase = asset('storage/experiencias/'.$experiencia->id.'/bloques');

        return view('experiencias.vista-previa-nino', [
            'token' => $token,
            'experiencia' => $experiencia,
            'bloques' => $bloques,
            'version' => $version,
            'mediaBase' => $mediaBase,
            'urlEstado' => route('vista-previa-nino.estado', $token),
            'urlTts' => route('vista-previa-nino.tts', $token),
        ]);
    }

    public function estado(Request $request, string $token)
    {
        $sesion = $this->sesiones->obtener($token);
        if (! $sesion) {
            return response()->json([
                'success' => false,
                'message' => 'Este enlace ya no es válido.',
            ], 410);
        }

        $experiencia = Experiencia::query()->find($sesion['experiencia_id']);
        if (! $experiencia) {
            return response()->json([
                'success' => false,
                'message' => 'La experiencia ya no existe.',
            ], 410);
        }

        $version = $this->sesiones->version($experiencia, $sesion);
        $data = [
            'version' => $version,
            'foco_seq' => (int) ($sesion['foco_seq'] ?? 0),
            'foco_bloque_id' => $sesion['foco_bloque_id'] ?? null,
        ];

        if ($request->query('version') !== $version) {
            $data['bloques'] = $this->bloques->listar($experiencia);
            $data['nombre'] = $experiencia->nombre;
            $data['media_base'] = asset('storage/experiencias/'.$experiencia->id.'/bloques');
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function tts(Request $request, string $token)
    {
        if (! $this->sesiones->obtener($token)) {
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
