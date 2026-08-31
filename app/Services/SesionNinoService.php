<?php

namespace App\Services;

use App\Models\Ambiente;
use App\Models\Estudiante;
use Illuminate\Http\Request;

class SesionNinoService
{
    public const SESSION_ESTUDIANTE_ID = 'estudiante_id';

    public const SESSION_ESTADO_AMBIENTE = 'estudiante_ambiente_estado';

    public const SESSION_CLASE_ID = 'clase_id';

    /** Solo local: simula la IP del nodo (?nodo_ip=) sin tocar la red. */
    public const SESSION_NODO_IP = 'nodo_ip_prueba';

    public function __construct(
        private AccesoAmbienteService $accesoAmbiente,
    ) {}

    public function slugAmbienteBd(): string
    {
        $slug = config('ambiente.slug');

        return config("ambiente.slugs_bd.{$slug}", $slug);
    }

    /**
     * Ambiente del nodo: IP en ambiente_institucion (producción), o AMBIENTE_SLUG en dev.
     */
    public function obtenerAmbiente(?Request $request = null): Ambiente
    {
        $request = $request ?? request();

        if (! config('ambiente.priorizar_slug', false)) {
            foreach ($this->ipsParaResolucionAmbiente($request) as $ip) {
                if ($this->esLoopback($ip)) {
                    continue;
                }

                $ambiente = $this->ambientePorIpInstitucion($ip);
                if ($ambiente) {
                    return $ambiente;
                }
            }
        }

        return Ambiente::query()
            ->where('slug', $this->slugAmbienteBd())
            ->where('activo', true)
            ->firstOrFail();
    }

    /**
     * Resuelve ambiente activo cuya IP está en el pivot ambiente_institucion.
     */
    public function ambientePorIpInstitucion(string $ip): ?Ambiente
    {
        return Ambiente::query()
            ->where('activo', true)
            ->whereHas('instituciones', function ($q) use ($ip) {
                $q->where('ambiente_institucion.ip', $ip)
                    ->where('ambiente_institucion.activo', true);
            })
            ->first();
    }

    /**
     * @return array{ambiente: ?Ambiente, ip: ?string, fuente: string}
     */
    public function diagnosticarResolucionAmbiente(?Request $request = null): array
    {
        $request = $request ?? request();

        if (! config('ambiente.priorizar_slug', false)) {
            foreach ($this->ipsParaResolucionAmbiente($request) as $ip) {
                if ($this->esLoopback($ip)) {
                    continue;
                }

                $ambiente = $this->ambientePorIpInstitucion($ip);
                if ($ambiente) {
                    return [
                        'ambiente' => $ambiente,
                        'ip' => $ip,
                        'fuente' => $this->fuenteResolucionIp($request, $ip),
                    ];
                }
            }
        }

        try {
            $ambiente = Ambiente::query()
                ->where('slug', $this->slugAmbienteBd())
                ->where('activo', true)
                ->firstOrFail();

            return [
                'ambiente' => $ambiente,
                'ip' => null,
                'fuente' => config('ambiente.priorizar_slug', false) ? 'ambiente_slug_forzado' : 'ambiente_slug',
            ];
        } catch (\Throwable) {
            return [
                'ambiente' => null,
                'ip' => null,
                'fuente' => 'error',
            ];
        }
    }

    public function limpiar(Request $request): void
    {
        $request->session()->forget([
            self::SESSION_ESTUDIANTE_ID,
            self::SESSION_ESTADO_AMBIENTE,
            self::SESSION_CLASE_ID,
        ]);
    }

    /**
     * Estudiante con acceso válido al kiosco (activo/adaptado, pivot activo).
     */
    public function estudianteSesionValido(?int $estudianteId): ?Estudiante
    {
        if (! $estudianteId) {
            return null;
        }

        try {
            $ambiente = $this->obtenerAmbiente();
        } catch (\Throwable) {
            return null;
        }

        return $this->accesoAmbiente->obtenerParaKiosco($ambiente, $estudianteId);
    }

    public function iniciarSesion(Request $request, Estudiante $estudiante, ?int $claseId = null): void
    {
        $estado = $this->accesoAmbiente->estadoAsignacion($estudiante)
            ?? AccesoAmbienteService::ESTADO_ACTIVO;

        $request->session()->put(self::SESSION_ESTUDIANTE_ID, $estudiante->id);
        $request->session()->put(self::SESSION_ESTADO_AMBIENTE, $estado);

        if ($claseId) {
            $request->session()->put(self::SESSION_CLASE_ID, $claseId);
        } else {
            $request->session()->forget(self::SESSION_CLASE_ID);
        }
    }

    public function claseIdEnSesion(Request $request): ?int
    {
        $id = $request->session()->get(self::SESSION_CLASE_ID);

        return is_numeric($id) ? (int) $id : null;
    }

    public function estadoAmbienteEnSesion(Request $request): ?string
    {
        $estado = $request->session()->get(self::SESSION_ESTADO_AMBIENTE);

        return is_string($estado) ? $estado : null;
    }

    public function sesionEsAdaptada(Request $request): bool
    {
        return $this->estadoAmbienteEnSesion($request) === AccesoAmbienteService::ESTADO_ADAPTADO;
    }

    public function ipServidor(?Request $request = null): ?string
    {
        $ips = $this->ipsCandidatasNodo($request);

        return $ips[0] ?? null;
    }

    /**
     * IPs usadas para resolver el ambiente del kiosco.
     * Producción: IPv4 del Host (http://{ip-bd}:8000).
     * Local: ?nodo_ip= simula la IP de ambiente_institucion sin alias de red.
     *
     * @return list<string>
     */
    public function ipsParaResolucionAmbiente(?Request $request = null): array
    {
        $request = $request ?? request();

        $ipSimulada = $this->ipSimuladaLocal($request);
        if ($ipSimulada !== null) {
            return [$ipSimulada];
        }

        $host = $request->getHost();

        if (is_string($host) && filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return [$host];
        }

        return array_values(array_filter(
            $this->ipsCandidatasNodo($request),
            fn (string $ip) => ! $this->esLoopback($ip)
        ));
    }

    public function ipSimuladaLocal(?Request $request = null): ?string
    {
        if (! app()->environment('local')) {
            return null;
        }

        $request = $request ?? request();
        $nodoIp = $request->query('nodo_ip');

        if (in_array($nodoIp, ['reset', 'clear'], true)) {
            $request->session()->forget(self::SESSION_NODO_IP);

            return null;
        }

        if (is_string($nodoIp) && filter_var($nodoIp, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $request->session()->put(self::SESSION_NODO_IP, $nodoIp);

            return $nodoIp;
        }

        $guardada = $request->session()->get(self::SESSION_NODO_IP);

        if (is_string($guardada) && filter_var($guardada, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return $guardada;
        }

        $configIp = config('ambiente.nodo_ip_local');
        if (is_string($configIp) && filter_var($configIp, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return $configIp;
        }

        return null;
    }

    private function fuenteResolucionIp(Request $request, string $ip): string
    {
        if (app()->environment('local') && $this->ipSimuladaLocal($request) === $ip) {
            return 'ambiente_institucion_simulada';
        }

        return 'ambiente_institucion';
    }

    /**
     * IPs para cruzar con ambiente_institucion.ip (diagnóstico).
     * Prioridad: Host de la URL → IP del servidor → LAN detectada.
     *
     * @return list<string>
     */
    public function ipsCandidatasNodo(?Request $request = null): array
    {
        $request = $request ?? request();
        $ips = [];

        $host = $request->getHost();
        if (is_string($host) && filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $ips[] = $host;
        }

        $serverAddr = $request->server('SERVER_ADDR');
        if (is_string($serverAddr) && filter_var($serverAddr, FILTER_VALIDATE_IP)) {
            $ips[] = $serverAddr;
        }

        foreach ($this->detectarIpsLan() as $ip) {
            $ips[] = $ip;
        }

        $unicas = [];
        foreach ($ips as $ip) {
            if (! in_array($ip, $unicas, true)) {
                $unicas[] = $ip;
            }
        }

        return $unicas;
    }

    /**
     * @return list<string>
     */
    private function detectarIpsLan(): array
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

        return $candidatas;
    }

    private function esIpPrivada(string $ip): bool
    {
        if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return false;
        }

        return preg_match('/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/', $ip) === 1;
    }

    private function esLoopback(string $ip): bool
    {
        return in_array($ip, ['127.0.0.1', '::1'], true)
            || str_starts_with($ip, '127.');
    }
}
