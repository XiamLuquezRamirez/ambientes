<?php

namespace App\Services;

use App\Models\Ambiente;
use App\Models\Clase;
use App\Models\Eje;
use App\Models\Experiencia;
use App\Models\Modulo;
use App\Models\Tematica;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Demo del recorrido niño (portada → módulos → ejes → camino → info → experiencia).
 * Por ahora solo ambiente Expresión Artística.
 */
class RecorridoNinoService
{
    public const TTL_SEGUNDOS = 3600;

    public const SLUG_DEMO = 'expresion-artistica';

    public function __construct(
        private BloqueExperienciaService $bloques,
    ) {}

    public function ambienteDemo(): ?Ambiente
    {
        return Ambiente::query()
            ->where('slug', self::SLUG_DEMO)
            ->where('activo', true)
            ->first();
    }

    public function esAmbienteDemo(?Ambiente $ambiente): bool
    {
        return $ambiente !== null && $ambiente->slug === self::SLUG_DEMO;
    }

    public function ambienteDeExperiencia(Experiencia $experiencia): ?Ambiente
    {
        $experiencia->loadMissing('tematica.eje.modulo.ambiente');

        return $experiencia->tematica?->eje?->modulo?->ambiente;
    }

    public function crear(Ambiente $ambiente, int $userId, ?int $experienciaOrigenId = null): array
    {
        if (! $this->esAmbienteDemo($ambiente)) {
            throw new \InvalidArgumentException('El recorrido demo solo está disponible para Expresión Artística.');
        }

        $this->invalidarAnterior($ambiente->id, $userId);

        $token = bin2hex(random_bytes(20));
        $payload = [
            'ambiente_id' => $ambiente->id,
            'user_id' => $userId,
            'experiencia_origen_id' => $experienciaOrigenId,
        ];

        Cache::put($this->keyToken($token), $payload, self::TTL_SEGUNDOS);
        Cache::put($this->keyUsuario($ambiente->id, $userId), $token, self::TTL_SEGUNDOS);

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

    /**
     * @return array{url: string, host_local: bool, ip_lan: ?string, aviso_red: ?string}
     */
    public function armarUrlTablet(Request $request, string $token): array
    {
        $host = strtolower((string) $request->getHost());
        $scheme = $request->getScheme();
        $port = (int) $request->getPort();
        $path = route('recorrido-nino.mostrar', ['token' => $token], false);
        $portSuffix = ($port && ! in_array($port, [80, 443], true)) ? ':'.$port : '';

        $hostLocal = in_array($host, ['localhost', '127.0.0.1', '::1'], true);
        $ipLan = $this->detectarIpLan();
        $urlHost = $hostLocal && $ipLan ? $ipLan : $host;
        $avisoRed = null;

        if ($hostLocal) {
            if ($ipLan) {
                $avisoRed = 'Enlace generado con la IP de red '
                    .'<strong>'.$ipLan.$portSuffix.'</strong>. '
                    .'Si la tablet no conecta, abra el constructor con esa dirección (no localhost) y genere el enlace de nuevo.';
            } else {
                $avisoRed = 'Este enlace usa <strong>localhost</strong>: la tablet no podrá abrirlo. '
                    .'Entre al constructor con la IP del PC y genere el enlace de nuevo.';
            }
        }

        return [
            'url' => $scheme.'://'.$urlHost.$portSuffix.$path,
            'host_local' => $hostLocal,
            'ip_lan' => $ipLan,
            'aviso_red' => $avisoRed,
        ];
    }

    /**
     * Árbol curricular: módulos → ejes → temáticas (camino).
     * Con $clase se acota a módulo/eje/temática/experiencia de esa clase.
     *
     * @return array{ambiente: array, modulos: array<int, array>}
     */
    public function armarArbol(Ambiente $ambiente, ?int $experienciaOrigenId = null, ?Clase $clase = null): array
    {
        $experienciaOrigen = null;
        if ($clase?->experiencia_id) {
            $experienciaOrigen = Experiencia::query()->find($clase->experiencia_id);
        } elseif ($experienciaOrigenId) {
            $experienciaOrigen = Experiencia::query()->find($experienciaOrigenId);
        }

        $modulosQuery = $ambiente->modulos()
            ->where('activo', true)
            ->orderBy('orden')
            ->orderBy('id');

        if ($clase?->modulo_id) {
            $modulosQuery->where('id', $clase->modulo_id);
        }

        $modulos = $modulosQuery
            ->with([
                'ejes' => function ($q) use ($clase) {
                    $q->where('activo', true)->orderBy('orden')->orderBy('id');
                    if ($clase?->eje_id) {
                        $q->where('id', $clase->eje_id);
                    }
                },
            ])
            ->get();

        $modulosPayload = $modulos->map(function (Modulo $modulo) use ($experienciaOrigen, $clase) {
            $ejes = collect($modulo->ejes)->map(function (Eje $eje) use ($experienciaOrigen, $clase) {
                $tematicasQuery = Tematica::query()
                    ->where('eje_id', $eje->id)
                    ->where('activo', true)
                    ->where('estado', '!=', Tematica::ESTADO_ARCHIVADA)
                    ->with(['catalogosDba:id,codigo,descripcion'])
                    ->orderBy('id');

                if ($clase?->tematica_id) {
                    $tematicasQuery->where('id', $clase->tematica_id);
                }

                $tematicas = $tematicasQuery
                    ->get()
                    ->map(fn (Tematica $t) => $this->serializarTematicaCamino($t, $experienciaOrigen))
                    ->values()
                    ->all();

                return [
                    'id' => $eje->id,
                    'nombre' => $eje->nombre,
                    'descripcion' => $eje->descripcion,
                    'orden' => (int) $eje->orden,
                    'tematicas' => $tematicas,
                    'tematicas_count' => count($tematicas),
                ];
            })
                ->values()
                ->all();

            return [
                'id' => $modulo->id,
                'nombre' => $modulo->nombre,
                'descripcion' => $modulo->descripcion,
                'icono' => $modulo->icono ?: '📚',
                'orden' => (int) $modulo->orden,
                'ejes' => $ejes,
                'ejes_count' => count($ejes),
            ];
        })
            ->values()
            ->all();

        return [
            'ambiente' => [
                'id' => $ambiente->id,
                'nombre' => $ambiente->nombre,
                'slug' => $ambiente->slug,
                'color_hex' => $ambiente->color_hex ?: '#0EA5E9',
                'icono' => $ambiente->icono ?: '🎨',
            ],
            'modulos' => $modulosPayload,
        ];
    }

    /**
     * Valida que el árbol acotado por clase sea una sola ruta curricular.
     */
    public function arbolEsCaminoUnico(array $arbol, Clase $clase): bool
    {
        return $this->motivoArbolNoLineal($arbol, $clase) === null;
    }

    public function motivoArbolNoLineal(array $arbol, Clase $clase): ?string
    {
        $modulos = $arbol['modulos'] ?? [];

        if (count($modulos) !== 1) {
            return 'Se esperaba un solo módulo en el recorrido de la clase.';
        }

        $modulo = $modulos[0];
        $ejes = $modulo['ejes'] ?? [];

        if (count($ejes) !== 1) {
            return 'Se esperaba un solo eje en el recorrido de la clase.';
        }

        $eje = $ejes[0];
        $tematicas = $eje['tematicas'] ?? [];

        if (count($tematicas) !== 1) {
            return 'Se esperaba una sola temática en el recorrido de la clase.';
        }

        $tematica = $tematicas[0];
        $expId = (int) ($tematica['experiencia_id'] ?? 0);

        if ($expId <= 0) {
            return 'La temática de la clase no tiene experiencia asociada.';
        }

        if ((int) $clase->experiencia_id !== $expId) {
            return 'La experiencia del árbol no coincide con la clase activa.';
        }

        if ((int) $modulo['id'] !== (int) $clase->modulo_id
            || (int) $eje['id'] !== (int) $clase->eje_id
            || (int) $tematica['id'] !== (int) $clase->tematica_id) {
            return 'El árbol curricular no coincide con la clase activa.';
        }

        return null;
    }

    /**
     * Datos del camino lineal del kiosco (paradas + coordenadas del mapa).
     *
     * @return array<string, mixed>|null
     */
    public function armarCaminoLineal(array $arbol, Clase $clase, ?\App\Models\Estudiante $estudiante = null): ?array
    {
        if ($this->motivoArbolNoLineal($arbol, $clase) !== null) {
            return null;
        }

        $modulo = $arbol['modulos'][0];
        $eje = $modulo['ejes'][0];
        $tematica = $eje['tematicas'][0];
        $ambiente = $arbol['ambiente'] ?? [];
        $nombreEst = $estudiante?->nombre ?? 'Amigo';

        $paradas = [
            [
                'id' => 'inicio',
                'etiqueta' => 'Inicio',
                'titulo' => '¡Hola, '.$nombreEst.'!',
                'texto' => 'Hoy explorarás '.$ambiente['nombre'].' '.$ambiente['icono'].'. ¡Vamos a recorrer el camino!',
            ],
            [
                'id' => 'modulo',
                'etiqueta' => 'Módulo',
                'titulo' => $modulo['nombre'],
                'texto' => $modulo['descripcion'] ?: 'Este es el módulo de la clase de hoy.',
                'icono' => $modulo['icono'] ?? '📚',
            ],
            [
                'id' => 'eje',
                'etiqueta' => 'Eje',
                'titulo' => $eje['nombre'],
                'texto' => $eje['descripcion'] ?: 'Seguimos por este eje de aprendizaje.',
            ],
            [
                'id' => 'tematica',
                'etiqueta' => 'Temática',
                'titulo' => $tematica['nombre'],
                'texto' => trim(implode("\n\n", array_filter([
                    $tematica['competencia'] ?? null,
                    $tematica['experiencia_objetivo'] ?? null,
                    $tematica['experiencia_proposito'] ?? null,
                ]))) ?: 'Llegaste a la temática del día.',
                'tematica' => $tematica,
            ],
            [
                'id' => 'experiencia',
                'etiqueta' => 'Experiencia',
                'titulo' => $tematica['experiencia_nombre'] ?? 'Experiencia',
                'texto' => $tematica['experiencia_objetivo'] ?? '¡Es hora de vivir la experiencia!',
                'experiencia_id' => (int) $tematica['experiencia_id'],
            ],
            [
                'id' => 'fin',
                'etiqueta' => 'Fin',
                'titulo' => '¡Terminaste!',
                'texto' => 'Completaste el recorrido de hoy. ¡Muy bien!',
            ],
        ];

        // Camino horizontal sinuoso (izquierda → derecha), generado según el
        // número real de paradas para que coincida siempre con ellas.
        $total = count($paradas);
        $puntos = [];
        for ($i = 0; $i < $total; $i++) {
            $t = $total > 1 ? $i / ($total - 1) : 0.5;
            $puntos[] = [
                'x' => (int) round(8 + $t * 84),                    // de 8% a 92%
                'y' => (int) round(52 + sin($t * M_PI * 2.4) * 18), // serpentea 34%–70%
            ];
        }

        return [
            'paradas' => $paradas,
            'puntos' => $puntos,
            'experiencia_id' => (int) $tematica['experiencia_id'],
            'tematica' => $tematica,
            'modulo' => ['id' => $modulo['id'], 'nombre' => $modulo['nombre']],
            'eje' => ['id' => $eje['id'], 'nombre' => $eje['nombre']],
        ];
    }

    /**
     * @return array{experiencia: array, bloques: array, media_base: string}|null
     */
    public function payloadExperiencia(Experiencia $experiencia): ?array
    {
        $bloques = $this->bloques->listar($experiencia);

        return [
            'experiencia' => [
                'id' => $experiencia->id,
                'nombre' => $experiencia->nombre,
                'objetivo' => $experiencia->objetivo,
                'duracion_minutos' => $experiencia->duracion_minutos,
            ],
            'bloques' => $bloques,
            'media_base' => asset('storage/experiencias/'.$experiencia->id.'/bloques'),
        ];
    }

    public function experienciaPermitidaEnSesion(array $sesion, Experiencia $experiencia): bool
    {
        $ambienteId = (int) ($sesion['ambiente_id'] ?? 0);
        $claseExperienciaId = isset($sesion['experiencia_id']) ? (int) $sesion['experiencia_id'] : null;

        if ($claseExperienciaId) {
            return (int) $experiencia->id === $claseExperienciaId;
        }

        $experiencia->loadMissing('tematica.eje.modulo');

        return $experiencia->tematica?->eje?->modulo
            && (int) $experiencia->tematica->eje->modulo->ambiente_id === $ambienteId;
    }

    private function serializarTematicaCamino(Tematica $tematica, ?Experiencia $experienciaOrigen): array
    {
        $experiencia = $this->elegirExperiencia($tematica, $experienciaOrigen);

        if (! $tematica->relationLoaded('catalogosDba')) {
            $tematica->load(['catalogosDba:id,codigo,descripcion']);
        }

        $dbas = $tematica->catalogosDba
            ->map(fn ($dba) => [
                'id' => $dba->id,
                'codigo' => $dba->codigo,
                'descripcion' => $dba->descripcion,
            ])
            ->values()
            ->all();

        return [
            'id' => $tematica->id,
            'nombre' => $tematica->nombre,
            'competencia' => $tematica->competencia,
            'requiere_ra' => (bool) $tematica->requiere_ra,
            'requiere_acompanamiento' => (bool) $tematica->requiere_acompanamiento,
            'experiencia_id' => $experiencia?->id,
            'experiencia_nombre' => $experiencia?->nombre,
            'experiencia_objetivo' => $experiencia?->objetivo,
            'experiencia_proposito' => $experiencia?->proposito,
            'dbas' => $dbas,
            'es_origen' => $experienciaOrigen
                && $experiencia
                && (int) $experiencia->id === (int) $experienciaOrigen->id,
        ];
    }

    private function elegirExperiencia(Tematica $tematica, ?Experiencia $experienciaOrigen): ?Experiencia
    {
        if (
            $experienciaOrigen
            && (int) $experienciaOrigen->tematica_id === (int) $tematica->id
        ) {
            return $experienciaOrigen;
        }

        $activa = Experiencia::query()
            ->where('tematica_id', $tematica->id)
            ->activas()
            ->orderBy('id')
            ->first();

        if ($activa) {
            return $activa;
        }

        // Demo: si no hay activas, usar cualquier experiencia con bloques.
        return Experiencia::query()
            ->where('tematica_id', $tematica->id)
            ->where('activo', true)
            ->whereHas('bloques')
            ->orderBy('id')
            ->first();
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

    private function invalidarAnterior(int $ambienteId, int $userId): void
    {
        $anterior = Cache::get($this->keyUsuario($ambienteId, $userId));
        if (is_string($anterior) && $anterior !== '') {
            Cache::forget($this->keyToken($anterior));
        }
    }

    private function keyToken(string $token): string
    {
        return 'recorrido_nino:'.$token;
    }

    private function keyUsuario(int $ambienteId, int $userId): string
    {
        return 'recorrido_nino:amb:'.$ambienteId.':user:'.$userId;
    }
}
