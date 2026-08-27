<?php

namespace App\Services;

use App\Models\Experiencia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class VistaPreviaNinoService
{
    public const TTL_SEGUNDOS = 3600;

    public function crear(Experiencia $experiencia, int $userId): array
    {
        $this->invalidarAnterior($experiencia->id, $userId);

        $token = bin2hex(random_bytes(20));
        $payload = [
            'experiencia_id' => $experiencia->id,
            'user_id' => $userId,
            'foco_bloque_id' => null,
            'foco_seq' => 0,
        ];

        Cache::put($this->keyToken($token), $payload, self::TTL_SEGUNDOS);
        Cache::put($this->keyUsuario($experiencia->id, $userId), $token, self::TTL_SEGUNDOS);

        return [
            'token' => $token,
            'expira_en' => self::TTL_SEGUNDOS,
        ];
    }

    public function obtener(string $token): ?array
    {
        $payload = Cache::get($this->keyToken($token));

        return is_array($payload) ? $payload : null;
    }

    public function actualizarFoco(string $token, int $experienciaId, ?int $bloqueId): bool
    {
        $payload = $this->obtener($token);
        if (! $payload || (int) $payload['experiencia_id'] !== $experienciaId) {
            return false;
        }

        $payload['foco_bloque_id'] = $bloqueId;
        $payload['foco_seq'] = (int) ($payload['foco_seq'] ?? 0) + 1;
        Cache::put($this->keyToken($token), $payload, self::TTL_SEGUNDOS);

        return true;
    }

    /**
     * @return array{url: string, host_local: bool, ip_lan: ?string, aviso_red: ?string}
     */
    public function armarUrlTablet(Request $request, string $token): array
    {
        $host = strtolower((string) $request->getHost());
        $scheme = $request->getScheme();
        $port = (int) $request->getPort();
        $path = route('vista-previa-nino.mostrar', ['token' => $token], false);
        $portSuffix = ($port && ! in_array($port, [80, 443], true)) ? ':'.$port : '';

        $hostLocal = in_array($host, ['localhost', '127.0.0.1', '::1'], true);
        $ipLan = $this->detectarIpLan();
        $urlHost = $hostLocal && $ipLan ? $ipLan : $host;
        $avisoRed = null;

        if ($hostLocal) {
            if ($ipLan) {
                $avisoRed = 'Enlace generado con la IP de red '
                    .'<strong>'.$ipLan.$portSuffix.'</strong>. '
                    .'Si la tablet no conecta, abra el constructor con esa dirección (no localhost) y genere el enlace de nuevo. '
                    .'En desarrollo puede usar <code>php artisan serve --host=0.0.0.0 --port='.$port.'</code>.';
            } else {
                $avisoRed = 'Este enlace usa <strong>localhost</strong>: la tablet no podrá abrirlo. '
                    .'Entre al constructor con la IP del PC (por ejemplo <code>http://192.168.1.10:8000</code>) '
                    .'o ejecute <code>php artisan serve --host=0.0.0.0 --port=8000</code> y genere el enlace de nuevo.';
            }
        }

        return [
            'url' => $scheme.'://'.$urlHost.$portSuffix.$path,
            'host_local' => $hostLocal,
            'ip_lan' => $ipLan,
            'aviso_red' => $avisoRed,
        ];
    }

    public function version(Experiencia $experiencia, array $sesion): string
    {
        $row = $experiencia->bloques()
            ->selectRaw('COUNT(*) as total, MAX(updated_at) as ultima')
            ->first();

        return sha1(implode('|', [
            (string) ($row->total ?? 0),
            (string) ($row->ultima ?? ''),
            (string) ($sesion['foco_seq'] ?? 0),
            (string) ($sesion['foco_bloque_id'] ?? ''),
        ]));
    }

    private function detectarIpLan(): ?string
    {
        $candidatas = [];

        if (function_exists('socket_create')) {
            $sock = @socket_create(AF_INET, SOCK_DGRAM, SOL_UDP);
            if ($sock) {
                @socket_connect($sock, '8.8.8.8', 80);
                @socket_getsockname($sock, $addr);
                @socket_close($sock);
                if (! empty($addr) && $this->esIpPrivada($addr)) {
                    $candidatas[] = $addr;
                }
            }
        }

        $hostname = gethostname();
        if (is_string($hostname) && $hostname !== '') {
            $ip = gethostbyname($hostname);
            if ($ip && $ip !== $hostname && $this->esIpPrivada($ip)) {
                $candidatas[] = $ip;
            }
        }

        return $candidatas[0] ?? null;
    }

    private function esIpPrivada(string $ip): bool
    {
        if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return false;
        }

        return preg_match('/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/', $ip) === 1;
    }

    private function invalidarAnterior(int $experienciaId, int $userId): void
    {
        $anterior = Cache::get($this->keyUsuario($experienciaId, $userId));
        if (is_string($anterior) && $anterior !== '') {
            Cache::forget($this->keyToken($anterior));
        }
    }

    private function keyToken(string $token): string
    {
        return 'vista_previa_nino:'.$token;
    }

    private function keyUsuario(int $experienciaId, int $userId): string
    {
        return 'vista_previa_nino:exp:'.$experienciaId.':user:'.$userId;
    }
}
