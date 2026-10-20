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

    /** Porcentaje Edge TTS si el cliente no envía `rate` (`accesibilidad.rate`). */
    public const RATE_DEFECTO = 5;

    /**
     * Edge TTS: Lorena (Zoe) y Jorge (Zeus). El rate no va por personaje:
     * llega del cliente (`accesibilidad.rate`) o usa RATE_DEFECTO.
     *
     * @var array<string, array{voz: string, pitch: string}>
     */
    private const VOCES = [
        self::PERSONAJE_ZOE => [
            'voz' => 'es-SV-LorenaNeural',
            'pitch' => '+30Hz',
        ],
        self::PERSONAJE_ZEUS => [
            'voz' => 'es-MX-JorgeNeural',
            'pitch' => '+45Hz',
        ],
    ];

    public function urlPublica(string $texto, ?string $personaje = null, mixed $rate = null): string
    {
        $texto = $this->normalizarTexto($texto);
        $params = $this->parametrosDePersonaje($personaje, $rate);
        $relativo = $this->rutaMp3($texto, $params);
        $this->mp3EnDisco($texto, $params);

        return $this->urlArchivoPublico($relativo);
    }

    public function binario(string $texto, ?string $personaje = null, mixed $rate = null): string
    {
        $texto = $this->normalizarTexto($texto);
        $params = $this->parametrosDePersonaje($personaje, $rate);

        return $this->mp3EnDisco($texto, $params);
    }

    public function vozDePersonaje(?string $personaje): string
    {
        return $this->parametrosDePersonaje($personaje)['voz'];
    }

    /**
     * @return array{voz: string, rate: string, pitch: string}
     */
    public function parametrosDePersonaje(?string $personaje, mixed $rate = null): array
    {
        $clave = strtolower(trim((string) $personaje));
        $base = self::VOCES[$clave] ?? self::VOCES[self::PERSONAJE_ZOE];
        $base['rate'] = $this->formatearRate($rate);

        return $base;
    }

    /**
     * Un solo rate para Zoe y Zeus. `5` → `+5%`.
     */
    public function formatearRate(mixed $rate): string
    {
        $n = self::RATE_DEFECTO;
        if (is_string($rate)) {
            $rate = trim($rate);
            if (preg_match('/^([+-]?)(\d+(?:\.\d+)?)%?$/', $rate, $m)) {
                $n = (int) round((float) $m[2]);
                if ($m[1] === '-') {
                    $n = -$n;
                }
            }
        } elseif (is_numeric($rate)) {
            $n = (int) round((float) $rate);
        }
        $n = max(-50, min(100, $n));

        return ($n >= 0 ? '+' : '').$n.'%';
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
    private function rutaMp3(string $texto, array $params): string
    {
        return 'tts/'.$this->hashDe($texto, $params).'.mp3';
    }

    /**
     * Una sola generación a Microsoft a la vez. El juego dispara muchas frases
     * distintas; sin caché ni candado cada una vuelve 502 por 429.
     *
     * @param  array{voz: string, rate: string, pitch: string}  $params
     */
    private function mp3EnDisco(string $texto, array $params): string
    {
        $relativo = $this->rutaMp3($texto, $params);
        $disk = Storage::disk('public');
        if ($disk->exists($relativo) && $disk->size($relativo) > 0) {
            return $disk->get($relativo);
        }

        $lockPath = storage_path('app/tts-generate.lock');
        if (! is_dir(dirname($lockPath))) {
            mkdir(dirname($lockPath), 0777, true);
        }
        $handle = fopen($lockPath, 'c');
        if ($handle === false) {
            throw new RuntimeException('No se pudo bloquear TTS.');
        }
        if (! flock($handle, LOCK_EX)) {
            fclose($handle);
            throw new RuntimeException('No se pudo bloquear TTS.');
        }
        try {
            if ($disk->exists($relativo) && $disk->size($relativo) > 0) {
                return $disk->get($relativo);
            }
            $disk->makeDirectory('tts');
            $binario = $this->solicitarMp3($texto, $params);
            $disk->put($relativo, $binario);

            return $binario;
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
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

        $timeout = (int) config('services.edge_tts.timeout', 60);
        $url = $base.'/api/tts';
        $ultimo = 'sin respuesta';

        for ($intento = 1; $intento <= 2; $intento++) {
            $respuesta = Http::timeout($timeout)
                ->connectTimeout(8)
                ->accept('audio/mpeg')
                ->asJson()
                ->post($url, [
                    'text' => $texto,
                    'voice' => $params['voz'],
                    'pitch' => $params['pitch'],
                    'rate' => $params['rate'],
                ]);

            if ($respuesta->successful() && $respuesta->body() !== '') {
                return $respuesta->body();
            }

            $ultimo = 'HTTP '.$respuesta->status();
            Log::warning('Edge TTS local falló', [
                'url' => $url,
                'status' => $respuesta->status(),
                'intento' => $intento,
                'cuerpo' => substr($respuesta->body(), 0, 200),
            ]);

            if ($intento < 2) {
                usleep(3_000_000);
            }
        }

        throw new RuntimeException('No se pudo generar la voz ('.$ultimo.').');
    }
}
