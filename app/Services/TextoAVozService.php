<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class TextoAVozService
{
    public const PERSONAJE_ZOE = 'zoe';

    public const PERSONAJE_ZEUS = 'zeus';

    /**
     * Edge TTS: Lorena (Zoe) y Jorge (Zeus).
     *
     * @var array<string, array{voz: string, rate: string, pitch: string}>
     */
    private const VOCES = [
        self::PERSONAJE_ZOE => [
            'voz' => 'es-SV-LorenaNeural',
            'rate' => '+5%',
            'pitch' => '+30Hz',
        ],
        self::PERSONAJE_ZEUS => [
            'voz' => 'es-MX-JorgeNeural',
            'rate' => '+5%',
            'pitch' => '+45Hz',
        ],
    ];

    public function urlPublica(string $texto, ?string $personaje = null): string
    {
        $texto = $this->normalizarTexto($texto);
        $params = $this->parametrosDePersonaje($personaje);
        $relativo = 'tts/'.$this->hashDe($texto, $params).'.mp3';

        if (! Storage::disk('public')->exists($relativo)) {
            Storage::disk('public')->makeDirectory('tts');
            Storage::disk('public')->put($relativo, $this->solicitarMp3($texto, $params));
        }

        return $this->urlArchivoPublico($relativo);
    }

    public function binario(string $texto, ?string $personaje = null): string
    {
        $texto = $this->normalizarTexto($texto);
        $params = $this->parametrosDePersonaje($personaje);

        return $this->solicitarMp3($texto, $params);
    }

    public function vozDePersonaje(?string $personaje): string
    {
        return $this->parametrosDePersonaje($personaje)['voz'];
    }

    /**
     * @return array{voz: string, rate: string, pitch: string}
     */
    public function parametrosDePersonaje(?string $personaje): array
    {
        $clave = strtolower(trim((string) $personaje));

        return self::VOCES[$clave] ?? self::VOCES[self::PERSONAJE_ZOE];
    }

    private function urlArchivoPublico(string $rutaRelativa): string
    {
        return '/storage/'.ltrim(str_replace('\\', '/', $rutaRelativa), '/');
    }

    private function normalizarTexto(string $texto): string
    {
        $texto = trim(preg_replace('/\s+/u', ' ', $texto) ?? '');
        if ($texto === '') {
            throw new RuntimeException('No hay texto para leer.');
        }

        return $texto;
    }

    /**
     * @param  array{voz: string, rate: string, pitch: string}  $params
     */
    private function hashDe(string $texto, array $params): string
    {
        return sha1($params['voz'].'|'.$params['rate'].'|'.$params['pitch'].'|'.$texto);
    }

    /**
     * @param  array{voz: string, rate: string, pitch: string}  $params
     */
    private function solicitarMp3(string $texto, array $params): string
    {
        $base = rtrim((string) config('services.edge_tts.url'), '/');
        if ($base === '') {
            throw new RuntimeException('Falta EDGE_TTS_URL.');
        }

        $respuesta = Http::timeout((int) config('services.edge_tts.timeout', 30))
            ->accept('audio/mpeg')
            ->asJson()
            ->post($base.'/api/tts', [
                'text' => $texto,
                'voice' => $params['voz'],
                'pitch' => $params['pitch'],
                'rate' => $params['rate'],
            ]);

        if (! $respuesta->successful()) {
            Log::warning('Edge TTS local falló', [
                'url' => $base.'/api/tts',
                'status' => $respuesta->status(),
                'cuerpo' => substr($respuesta->body(), 0, 200),
            ]);
            throw new RuntimeException('No se pudo generar la voz (HTTP '.$respuesta->status().').');
        }

        $binario = $respuesta->body();
        if ($binario === '') {
            throw new RuntimeException('La voz llegó vacía.');
        }

        return $binario;
    }
}
