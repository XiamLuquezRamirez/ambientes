<?php

namespace App\Services;

use App\Models\Docente;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

class PinAccesibilidadDocenteService
{
    private const INTENTOS = 5;

    private const BLOQUEO_SEGUNDOS = 60;

    public function generar(int $institucionId): string
    {
        $usados = array_flip($this->pinsDeInstitucion($institucionId));

        for ($i = 0; $i < 40; $i++) {
            $pin = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);

            if (! isset($usados[$pin])) {
                return $pin;
            }
        }

        throw new RuntimeException('No hay un PIN de accesibilidad libre en esta institución.');
    }

    public function estaLibre(int $institucionId, string $pin, ?int $exceptoDocenteId = null): bool
    {
        $consulta = Docente::query()
            ->where('pin_accesibilidad', $pin)
            ->whereHas('user', fn ($q) => $q->where('institucion_id', $institucionId));

        if ($exceptoDocenteId) {
            $consulta->where('id', '!=', $exceptoDocenteId);
        }

        return ! $consulta->exists();
    }

    /**
     * @return array{ok: bool, bloqueado: bool}
     */
    public function verificar(int $institucionId, string $pin, string $llave): array
    {
        if (! preg_match('/^\d{4}$/', $pin)) {
            return ['ok' => false, 'bloqueado' => false];
        }

        if ($this->bloqueado($llave)) {
            return ['ok' => false, 'bloqueado' => true];
        }

        $pins = Docente::query()
            ->where('estado', 'activo')
            ->whereNotNull('pin_accesibilidad')
            ->whereHas('user', fn ($q) => $q
                ->where('institucion_id', $institucionId)
                ->where('estado', 'activo'))
            ->pluck('pin_accesibilidad');

        $coincide = false;

        foreach ($pins as $guardado) {
            if (is_string($guardado) && hash_equals($guardado, $pin)) {
                $coincide = true;
            }
        }

        if (! $coincide) {
            $this->registrarFallo($llave);

            return ['ok' => false, 'bloqueado' => $this->bloqueado($llave)];
        }

        Cache::forget($this->claveIntentos($llave));
        Cache::forget($this->claveBloqueo($llave));

        return ['ok' => true, 'bloqueado' => false];
    }

    /**
     * @return list<string>
     */
    private function pinsDeInstitucion(int $institucionId): array
    {
        return Docente::query()
            ->whereNotNull('pin_accesibilidad')
            ->whereHas('user', fn ($q) => $q->where('institucion_id', $institucionId))
            ->pluck('pin_accesibilidad')
            ->map(fn ($pin) => (string) $pin)
            ->all();
    }

    private function bloqueado(string $llave): bool
    {
        return Cache::has($this->claveBloqueo($llave));
    }

    private function registrarFallo(string $llave): void
    {
        $clave = $this->claveIntentos($llave);
        $intentos = (int) Cache::get($clave, 0) + 1;
        Cache::put($clave, $intentos, now()->addSeconds(self::BLOQUEO_SEGUNDOS));

        if ($intentos >= self::INTENTOS) {
            Cache::put($this->claveBloqueo($llave), 1, now()->addSeconds(self::BLOQUEO_SEGUNDOS));
            Cache::forget($clave);
        }
    }

    private function claveIntentos(string $llave): string
    {
        return 'pin-accesibilidad:intentos:'.$llave;
    }

    private function claveBloqueo(string $llave): string
    {
        return 'pin-accesibilidad:bloqueo:'.$llave;
    }
}
