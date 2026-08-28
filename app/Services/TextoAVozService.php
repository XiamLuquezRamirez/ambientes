<?php

namespace App\Services;

use Afaya\EdgeTTS\Service\EdgeTTS;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class TextoAVozService
{
    private const VOZ = 'es-CO-SalomeNeural';

    public function urlPublica(string $texto): string
    {
        $texto = trim(preg_replace('/\s+/u', ' ', $texto) ?? '');
        if ($texto === '') {
            throw new RuntimeException('No hay texto para leer.');
        }

        $hash = sha1(self::VOZ.'|'.$texto);
        $relativo = "tts/{$hash}.mp3";

        if (! Storage::disk('public')->exists($relativo)) {
            $this->generar($texto, $relativo);
        }

        return $this->urlArchivoPublico($relativo);
    }

    private function urlArchivoPublico(string $rutaRelativa): string
    {
        return '/storage/'.ltrim(str_replace('\\', '/', $rutaRelativa), '/');
    }

    private function generar(string $texto, string $relativo): void
    {
        Storage::disk('public')->makeDirectory('tts');

        $tts = new EdgeTTS();
        try {
            $tts->synthesize($texto, self::VOZ, [
                'rate' => '-8%',
                'volume' => '+0%',
                'pitch' => '+0Hz',
            ]);
            $binario = $tts->toRaw();
        } catch (Throwable $e) {
            throw new RuntimeException('No se pudo generar la voz: '.$e->getMessage(), 0, $e);
        }

        if ($binario === '') {
            throw new RuntimeException('La voz llegó vacía.');
        }

        Storage::disk('public')->put($relativo, $binario);
    }
}
