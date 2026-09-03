<?php

namespace App\Services;

use Afaya\EdgeTTS\Service\EdgeTTS;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class TextoAVozService
{
    public const PERSONAJE_ZOE = 'zoe';

    public const PERSONAJE_ZEUS = 'zeus';

    private const VOCES = [
        self::PERSONAJE_ZOE => 'es-CO-SalomeNeural',
        self::PERSONAJE_ZEUS => 'es-CO-GonzaloNeural',
    ];

    public function urlPublica(string $texto, ?string $personaje = null): string
    {
        $texto = trim(preg_replace('/\s+/u', ' ', $texto) ?? '');
        if ($texto === '') {
            throw new RuntimeException('No hay texto para leer.');
        }

        $voz = $this->vozDePersonaje($personaje);
        $hash = sha1($voz.'|'.$texto);
        $relativo = "tts/{$hash}.mp3";

        if (! Storage::disk('public')->exists($relativo)) {
            $this->generar($texto, $relativo, $voz);
        }

        return $this->urlArchivoPublico($relativo);
    }

    public function vozDePersonaje(?string $personaje): string
    {
        $clave = strtolower(trim((string) $personaje));

        return self::VOCES[$clave] ?? self::VOCES[self::PERSONAJE_ZOE];
    }

    private function urlArchivoPublico(string $rutaRelativa): string
    {
        return '/storage/'.ltrim(str_replace('\\', '/', $rutaRelativa), '/');
    }

    private function generar(string $texto, string $relativo, string $voz): void
    {
        Storage::disk('public')->makeDirectory('tts');

        $tts = new EdgeTTS();
        try {
            $tts->synthesize($texto, $voz, [
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
