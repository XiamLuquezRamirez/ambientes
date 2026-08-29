<?php

namespace App\Services;

use App\Models\Ambiente;
use App\Models\Clase;
use App\Models\ClaseExperiencia;
use App\Models\Eje;
use App\Models\Experiencia;
use App\Models\Modulo;
use App\Models\Tematica;

/**
 * Recorrido del niño en kiosco (árbol curricular, camino lineal, payload de experiencia).
 */
class RecorridoNinoService
{
    public function __construct(
        private BloqueExperienciaService $bloques,
        private CurriculoMediaService $mediaCurriculo,
    ) {}

    /**
     * Árbol curricular: módulos → ejes → temáticas (camino).
     * Con $clase se acota a módulo/eje/temática/experiencia de esa clase.
     *
     * @return array{ambiente: array, modulos: array<int, array>}
     */
    public function armarArbol(Ambiente $ambiente, ?int $experienciaOrigenId = null, ?Clase $clase = null): array
    {
        $clase?->loadMissing('experienciasClase');
        $itemsClase = $clase?->experienciasClase ?? collect();
        $itemsPorTematica = $itemsClase->groupBy('tematica_id');

        $experienciaOrigen = null;
        if ($itemsClase->isNotEmpty()) {
            $experienciaOrigen = Experiencia::query()->find($itemsClase->first()->experiencia_id);
        } elseif ($clase?->experiencia_id) {
            $experienciaOrigen = Experiencia::query()->find($clase->experiencia_id);
        } elseif ($experienciaOrigenId) {
            $experienciaOrigen = Experiencia::query()->find($experienciaOrigenId);
        }

        $modulosQuery = $ambiente->modulos()
            ->where('activo', true)
            ->orderBy('orden')
            ->orderBy('id');

        if ($itemsClase->isNotEmpty()) {
            $modulosQuery->whereIn('id', $itemsClase->pluck('modulo_id')->unique());
        } elseif ($clase?->modulo_id) {
            $modulosQuery->where('id', $clase->modulo_id);
        }

        $modulos = $modulosQuery
            ->with([
                'ejes' => function ($q) {
                    $q->where('activo', true)->orderBy('orden')->orderBy('id');
                },
            ])
            ->get();

        $modulosPayload = $modulos->map(function (Modulo $modulo) use ($experienciaOrigen, $clase, $itemsClase, $itemsPorTematica) {
            $ejes = collect($modulo->ejes);

            if ($itemsClase->isNotEmpty()) {
                $ejeIds = $itemsClase->where('modulo_id', $modulo->id)->pluck('eje_id')->unique();
                $ejes = $ejes->whereIn('id', $ejeIds->all());
            } elseif ($clase?->eje_id) {
                $ejes = $ejes->where('id', $clase->eje_id);
            }

            $ejes = $ejes->map(function (Eje $eje) use ($experienciaOrigen, $clase, $itemsClase, $itemsPorTematica) {
                $tematicasQuery = Tematica::query()
                    ->where('eje_id', $eje->id)
                    ->where('activo', true)
                    ->where('estado', '!=', Tematica::ESTADO_ARCHIVADA)
                    ->with(['catalogosDba:id,codigo,descripcion'])
                    ->orderBy('id');

                if ($itemsClase->isNotEmpty()) {
                    $tematicaIds = $itemsClase->where('eje_id', $eje->id)->pluck('tematica_id')->unique();
                    $tematicasQuery->whereIn('id', $tematicaIds);
                } elseif ($clase?->tematica_id) {
                    $tematicasQuery->where('id', $clase->tematica_id);
                }

                $tematicas = $tematicasQuery
                    ->get()
                    ->map(function (Tematica $t) use ($experienciaOrigen, $itemsPorTematica) {
                        $items = $itemsPorTematica->get($t->id, collect());

                        if ($items->isNotEmpty()) {
                            $experiencias = $items
                                ->sortBy('orden')
                                ->values()
                                ->map(function (ClaseExperiencia $item) {
                                    $exp = Experiencia::query()->find($item->experiencia_id);
                                    if (! $exp) {
                                        return null;
                                    }

                                    return [
                                        'id' => $exp->id,
                                        'nombre' => $exp->nombre,
                                        'objetivo' => $exp->objetivo,
                                        'proposito' => $exp->proposito,
                                        'orden' => (int) $item->orden,
                                    ];
                                })
                                ->filter()
                                ->values()
                                ->all();

                            $primera = Experiencia::query()->find(
                                $items->sortBy('orden')->first()->experiencia_id
                            );
                            $payload = $this->serializarTematicaCamino($t, $primera);
                            $payload['experiencias'] = $experiencias;

                            return $payload;
                        }

                        return $this->serializarTematicaCamino($t, $experienciaOrigen);
                    })
                    ->values()
                    ->all();

                return [
                    'id' => $eje->id,
                    'nombre' => $eje->nombre,
                    'descripcion' => $eje->descripcion,
                    'orden' => (int) $eje->orden,
                    'tematicas' => $tematicas,
                    'tematicas_count' => count($tematicas),
                ] + $this->mediaCurriculo->serializarParaKiosco($eje);
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
            ] + $this->mediaCurriculo->serializarParaKiosco($modulo);
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
        if ($clase->exists) {
            $clase->loadMissing('experienciasClase');
        }

        $totalExperiencias = $clase->relationLoaded('experienciasClase')
            ? $clase->experienciasClase->count()
            : 0;

        if ($totalExperiencias <= 1) {
            return $this->motivoArbolNoLineal($arbol, $clase) === null;
        }

        return $this->motivoArbolNoCubreClase($arbol, $clase) === null;
    }

    public function motivoArbolNoCubreClase(array $arbol, Clase $clase): ?string
    {
        if ($clase->exists) {
            $clase->loadMissing('experienciasClase');
        }

        if (! $clase->relationLoaded('experienciasClase') || $clase->experienciasClase->isEmpty()) {
            return 'La clase no tiene experiencias asociadas.';
        }

        foreach ($clase->experienciasClase as $item) {
            $encontrada = false;

            foreach ($arbol['modulos'] ?? [] as $modulo) {
                if ((int) $modulo['id'] !== (int) $item->modulo_id) {
                    continue;
                }

                foreach ($modulo['ejes'] ?? [] as $eje) {
                    if ((int) $eje['id'] !== (int) $item->eje_id) {
                        continue;
                    }

                    foreach ($eje['tematicas'] ?? [] as $tematica) {
                        if ((int) $tematica['id'] === (int) $item->tematica_id
                            && $this->experienciaEstaEnTematicaArbol($tematica, (int) $item->experiencia_id)) {
                            $encontrada = true;
                            break 3;
                        }
                    }
                }
            }

            if (! $encontrada) {
                return 'El árbol no incluye todas las experiencias de la clase activa.';
            }
        }

        return null;
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
        $camino = $this->armarCaminoInterno($arbol, $clase, $estudiante);
        // Adjuntar datos del ambiente (para la casa temática del inicio en el 3D).
        if ($camino !== null && isset($arbol['ambiente'])) {
            $camino['ambiente'] = [
                'id' => $arbol['ambiente']['id'] ?? null,
                'nombre' => $arbol['ambiente']['nombre'] ?? '',
                'slug' => $arbol['ambiente']['slug'] ?? '',
                'color_hex' => $arbol['ambiente']['color_hex'] ?? null,
                'icono' => $arbol['ambiente']['icono'] ?? null,
            ];
        }

        return $camino;
    }

    private function armarCaminoInterno(array $arbol, Clase $clase, ?\App\Models\Estudiante $estudiante = null): ?array
    {
        if ($clase->exists) {
            $clase->loadMissing('experienciasClase');
        }

        $items = $clase->relationLoaded('experienciasClase')
            ? $clase->experienciasClase
            : collect();

        if ($items->isEmpty()) {
            if ($this->motivoArbolNoLineal($arbol, $clase) !== null) {
                return null;
            }

            $modulo = $arbol['modulos'][0];
            $eje = $modulo['ejes'][0];
            $tematica = $eje['tematicas'][0];

            return $this->empaquetarCaminoLineal(
                [
                    $this->paradaInicio($arbol['ambiente'] ?? [], $estudiante?->nombre ?? 'Amigo'),
                    $this->paradaModulo($modulo),
                    $this->paradaEje($eje),
                    $this->paradaTematica($tematica),
                    $this->paradaExperiencia(
                        (int) $tematica['experiencia_id'],
                        $tematica['experiencia_nombre'] ?? 'Experiencia',
                        $tematica['experiencia_objetivo'] ?? '¡Es hora de vivir la experiencia!',
                        'experiencia'
                    ),
                    $this->paradaFin(),
                ],
                (int) $tematica['experiencia_id'],
                $tematica,
                $modulo,
                $eje
            );
        }

        if ($items->count() === 1) {
            if ($this->motivoArbolNoLineal($arbol, $clase) !== null) {
                return null;
            }
        } elseif ($this->motivoArbolNoCubreClase($arbol, $clase) !== null) {
            return null;
        }

        $primera = $items->first();
        $modulo = $this->buscarModuloEnArbol($arbol, $primera);
        $eje = $this->buscarEjeEnArbol($arbol, $primera);
        $tematica = $this->buscarTematicaEnArbol($arbol, $primera);

        if (! $modulo || ! $eje || ! $tematica) {
            return null;
        }

        // Una sola experiencia → camino LINEAL (comportamiento clásico).
        if ($items->count() === 1) {
            $expNode = $this->buscarExperienciaEnArbol($arbol, $primera);
            if (! $expNode) {
                return null;
            }

            $paradas = [
                $this->paradaInicio($arbol['ambiente'] ?? [], $estudiante?->nombre ?? 'Amigo'),
                $this->paradaModulo($modulo),
                $this->paradaEje($eje),
                $this->paradaTematica($tematica),
                $this->paradaExperiencia(
                    (int) $primera->experiencia_id,
                    $expNode['experiencia_nombre'] ?? 'Experiencia',
                    $expNode['experiencia_objetivo'] ?? '¡Es hora de vivir la experiencia!',
                    'experiencia'
                ),
                $this->paradaFin(),
            ];

            return $this->empaquetarCaminoLineal(
                $paradas, (int) $primera->experiencia_id, $tematica, $modulo, $eje
            );
        }

        // Varias experiencias → camino RAMIFICADO (grafo con bifurcación por rama).
        return $this->armarCaminoRamificado($arbol, $items, $modulo, $estudiante);
    }

    /**
     * @param  array<string, mixed>  $ambiente
     * @return array<string, mixed>
     */
    private function paradaInicio(array $ambiente, string $nombreEst): array
    {
        return [
            'id' => 'inicio',
            'etiqueta' => 'Inicio',
            'titulo' => '¡Hola, '.$nombreEst.'!',
            'texto' => 'Hoy explorarás '.$ambiente['nombre'].' '.$ambiente['icono'].'. ¡Vamos a recorrer el camino!',
        ];
    }

    /**
     * @param  array<string, mixed>  $modulo
     * @return array<string, mixed>
     */
    private function paradaModulo(array $modulo): array
    {
        return array_merge([
            'id' => 'modulo',
            'etiqueta' => 'Módulo',
            'titulo' => $modulo['nombre'],
            'texto' => $modulo['descripcion'] ?: 'Este es el módulo de la clase de hoy.',
            'icono' => $modulo['icono'] ?? '📚',
        ], $this->extraerMediaParada($modulo));
    }

    /**
     * @param  array<string, mixed>  $eje
     * @return array<string, mixed>
     */
    private function paradaEje(array $eje): array
    {
        return array_merge([
            'id' => 'eje',
            'etiqueta' => 'Eje',
            'titulo' => $eje['nombre'],
            'texto' => $eje['descripcion'] ?: 'Seguimos por este eje de aprendizaje.',
        ], $this->extraerMediaParada($eje));
    }

    /**
     * @param  array<string, mixed>  $nodo
     * @return array<string, mixed>
     */
    private function extraerMediaParada(array $nodo): array
    {
        $campos = ['tipo_media', 'media_origen', 'media_embed', 'media_url', 'imagen_url', 'video_url', 'embed_url'];
        $out = [];

        foreach ($campos as $campo) {
            if (array_key_exists($campo, $nodo) && $nodo[$campo] !== null) {
                $out[$campo] = $nodo[$campo];
            }
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $tematica
     * @return array<string, mixed>
     */
    private function paradaTematica(array $tematica): array
    {
        return [
            'id' => 'tematica',
            'etiqueta' => 'Temática',
            'titulo' => $tematica['nombre'],
            'texto' => trim(implode("\n\n", array_filter([
                $tematica['competencia'] ?? null,
                $tematica['experiencia_objetivo'] ?? null,
                $tematica['experiencia_proposito'] ?? null,
            ]))) ?: 'Llegaste a la temática del día.',
            'tematica' => $tematica,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function paradaExperiencia(int $experienciaId, string $nombre, string $texto, string $paradaId): array
    {
        return [
            'id' => $paradaId,
            'etiqueta' => 'Experiencia',
            'titulo' => $nombre,
            'texto' => $texto,
            'experiencia_id' => $experienciaId,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function paradaFin(): array
    {
        return [
            'id' => 'fin',
            'etiqueta' => 'Fin',
            'titulo' => '¡Terminaste!',
            'texto' => 'Completaste el recorrido de hoy. ¡Muy bien!',
        ];
    }

    /**
     * Empaqueta un camino LINEAL: cada parada apunta a la siguiente por su id
     * (campo `siguientes`), de modo que backend y frontend hablen siempre en
     * términos de grafo. `ramificado` = false.
     *
     * @param  list<array<string, mixed>>  $paradas
     * @return array<string, mixed>
     */
    private function empaquetarCaminoLineal(
        array $paradas,
        int $ultimaExperienciaId,
        array $tematica,
        array $modulo,
        array $eje
    ): array {
        $total = count($paradas);

        // Encadenar: parada[i].siguientes = [parada[i+1].id]; la última = [].
        for ($i = 0; $i < $total; $i++) {
            $paradas[$i]['siguientes'] = $i < $total - 1 ? [$paradas[$i + 1]['id']] : [];
            $paradas[$i]['rama'] = 0; // tronco único
        }

        $puntos = [];
        for ($i = 0; $i < $total; $i++) {
            $t = $total > 1 ? $i / ($total - 1) : 0.5;
            $puntos[] = [
                'x' => (int) round(8 + $t * 84),
                'y' => (int) round(52 + sin($t * M_PI * 2.4) * 18),
            ];
        }

        return [
            'paradas' => $paradas,
            'puntos' => $puntos,
            'ramificado' => false,
            'experiencia_id' => $ultimaExperienciaId,
            'tematica' => $tematica,
            'modulo' => ['id' => $modulo['id'], 'nombre' => $modulo['nombre']],
            'eje' => ['id' => $eje['id'], 'nombre' => $eje['nombre']],
        ];
    }

    /**
     * Construye un recorrido RAMIFICADO: tronco común (inicio → módulo) y luego
     * una rama por cada experiencia de la clase (eje → temática → experiencia),
     * todas convergiendo en un único `fin`. El punto de bifurcación es el módulo.
     *
     * @param  array<string, mixed>  $arbol
     * @param  \Illuminate\Support\Collection<int, ClaseExperiencia>  $items
     * @param  array<string, mixed>  $modulo
     * @return array<string, mixed>|null
     */
    private function armarCaminoRamificado(
        array $arbol,
        $items,
        array $modulo,
        ?\App\Models\Estudiante $estudiante
    ): ?array {
        // Resolver eje/temática/experiencia de cada item.
        $ramasData = [];
        foreach ($items as $item) {
            $eje = $this->buscarEjeEnArbol($arbol, $item);
            $tematica = $this->buscarTematicaEnArbol($arbol, $item);
            $expNode = $this->buscarExperienciaEnArbol($arbol, $item);
            if (! $eje || ! $tematica || ! $expNode) {
                return null;
            }
            $ramasData[] = [
                'eje' => $eje, 'tematica' => $tematica, 'exp' => $expNode,
                'expId' => (int) $item->experiencia_id,
            ];
        }

        // ¿Qué comparten TODAS las experiencias? Eso define dónde bifurca:
        //  - ejes distintos           → bifurca en el MÓDULO
        //  - mismo eje, temáticas ≠   → bifurca en el EJE
        //  - misma temática, exps ≠   → bifurca en la TEMÁTICA
        $ejeComun = $this->todasIguales($ramasData, fn ($d) => (int) $d['eje']['id']);
        $temComun = $ejeComun && $this->todasIguales($ramasData, fn ($d) => (int) $d['tematica']['id']);

        $inicio = $this->paradaInicio($arbol['ambiente'] ?? [], $estudiante?->nombre ?? 'Amigo');
        $inicio['rama'] = 0;
        $paradaModulo = $this->paradaModulo($modulo);
        $paradaModulo['rama'] = 0;

        // Tronco común: inicio → modulo → [eje] → [tematica] (según lo compartido).
        $tronco = ['modulo'];               // ids del tronco, en orden (tras 'inicio')
        $paradas = [$inicio, $paradaModulo];
        $primerEje = $ramasData[0]['eje'];
        $primeraTematica = $ramasData[0]['tematica'];

        if ($ejeComun) {
            $pEje = $this->paradaEje($primerEje);
            $pEje['id'] = 'eje';
            $pEje['rama'] = 0;
            $paradas[] = $pEje;
            $tronco[] = 'eje';
        }
        if ($temComun) {
            $pTem = $this->paradaTematica($primeraTematica);
            $pTem['id'] = 'tematica';
            $pTem['rama'] = 0;
            $paradas[] = $pTem;
            $tronco[] = 'tematica';
        }

        $fin = $this->paradaFin();
        $fin['rama'] = 0;
        $fin['siguientes'] = [];

        $idsRamaInicial = []; // primer nodo de cada rama → hijos del nodo de bifurcación
        $ultimaExperienciaId = null;

        $r = 0;
        foreach ($ramasData as $d) {
            $r++;
            $sufijo = '-'.$d['expId'];
            $nodosRama = []; // ids en orden dentro de la rama

            // Cada rama incluye SOLO lo que NO es común (lo que la distingue).
            if (! $ejeComun) {
                $pEje = $this->paradaEje($d['eje']);
                $pEje['id'] = 'eje'.$sufijo; $pEje['rama'] = $r;
                $paradas[] = $pEje; $nodosRama[] = $pEje['id'];
            }
            if (! $temComun) {
                $pTem = $this->paradaTematica($d['tematica']);
                $pTem['id'] = 'tematica'.$sufijo; $pTem['rama'] = $r;
                $paradas[] = $pTem; $nodosRama[] = $pTem['id'];
            }
            $pExp = $this->paradaExperiencia(
                $d['expId'],
                $d['exp']['experiencia_nombre'] ?? 'Experiencia',
                $d['exp']['experiencia_objetivo'] ?? '¡Es hora de vivir la experiencia!',
                'experiencia'.$sufijo
            );
            $pExp['rama'] = $r;
            $paradas[] = $pExp; $nodosRama[] = $pExp['id'];

            // Encadenar los nodos de la rama en orden y el último → fin.
            for ($k = 0; $k < count($nodosRama); $k++) {
                $idNodo = $nodosRama[$k];
                $sig = ($k < count($nodosRama) - 1) ? [$nodosRama[$k + 1]] : ['fin'];
                // localizar la parada por id y setear 'siguientes'
                foreach ($paradas as &$par) {
                    if ($par['id'] === $idNodo) { $par['siguientes'] = $sig; break; }
                }
                unset($par);
            }

            $idsRamaInicial[] = $nodosRama[0];
            $ultimaExperienciaId = $d['expId'];
        }

        // Encadenar el tronco: inicio → modulo → ... → [nodo de bifurcación].
        $paradas[0]['siguientes'] = ['modulo'];
        for ($t = 0; $t < count($tronco); $t++) {
            $idNodo = $tronco[$t];
            $esUltimoTronco = ($t === count($tronco) - 1);
            $sig = $esUltimoTronco ? $idsRamaInicial : [$tronco[$t + 1]];
            foreach ($paradas as &$par) {
                if ($par['id'] === $idNodo) { $par['siguientes'] = $sig; break; }
            }
            unset($par);
        }

        $paradas[] = $fin;

        return [
            'paradas' => $paradas,
            'puntos' => [],
            'ramificado' => true,
            'ramas' => $r,
            'bifurca_en' => end($tronco) ?: 'modulo', // dónde se abre el camino
            'experiencia_id' => $ultimaExperienciaId,
            'tematica' => $primeraTematica,
            'modulo' => ['id' => $modulo['id'], 'nombre' => $modulo['nombre']],
            'eje' => ['id' => $primerEje['id'], 'nombre' => $primerEje['nombre']],
        ];
    }

    /**
     * ¿La función `$fn` devuelve el mismo valor para todos los elementos?
     *
     * @param  array<int, mixed>  $lista
     */
    private function todasIguales(array $lista, callable $fn): bool
    {
        if (count($lista) <= 1) {
            return true;
        }
        $primero = $fn($lista[0]);
        foreach ($lista as $el) {
            if ($fn($el) !== $primero) {
                return false;
            }
        }

        return true;
    }

    private function buscarModuloEnArbol(array $arbol, ClaseExperiencia $item): ?array
    {
        foreach ($arbol['modulos'] ?? [] as $modulo) {
            if ((int) $modulo['id'] === (int) $item->modulo_id) {
                return $modulo;
            }
        }

        return null;
    }

    private function buscarEjeEnArbol(array $arbol, ClaseExperiencia $item): ?array
    {
        $modulo = $this->buscarModuloEnArbol($arbol, $item);
        if (! $modulo) {
            return null;
        }

        foreach ($modulo['ejes'] ?? [] as $eje) {
            if ((int) $eje['id'] === (int) $item->eje_id) {
                return $eje;
            }
        }

        return null;
    }

    private function buscarTematicaEnArbol(array $arbol, ClaseExperiencia $item): ?array
    {
        $eje = $this->buscarEjeEnArbol($arbol, $item);
        if (! $eje) {
            return null;
        }

        foreach ($eje['tematicas'] ?? [] as $tematica) {
            if ((int) $tematica['id'] === (int) $item->tematica_id) {
                return $tematica;
            }
        }

        return null;
    }

    private function buscarExperienciaEnArbol(array $arbol, ClaseExperiencia $item): ?array
    {
        $tematica = $this->buscarTematicaEnArbol($arbol, $item);
        if (! $tematica) {
            return null;
        }

        foreach ($tematica['experiencias'] ?? [] as $exp) {
            if ((int) ($exp['id'] ?? 0) === (int) $item->experiencia_id) {
                return array_merge($tematica, [
                    'experiencia_id' => $exp['id'],
                    'experiencia_nombre' => $exp['nombre'] ?? 'Experiencia',
                    'experiencia_objetivo' => $exp['objetivo'] ?? null,
                    'experiencia_proposito' => $exp['proposito'] ?? null,
                ]);
            }
        }

        if ($this->experienciaEstaEnTematicaArbol($tematica, (int) $item->experiencia_id)) {
            return $tematica;
        }

        return null;
    }

    private function experienciaEstaEnTematicaArbol(array $tematica, int $experienciaId): bool
    {
        foreach ($tematica['experiencias'] ?? [] as $exp) {
            if ((int) ($exp['id'] ?? 0) === $experienciaId) {
                return true;
            }
        }

        return (int) ($tematica['experiencia_id'] ?? 0) === $experienciaId;
    }

    /**
     * @return array{experiencia: array, bloques: array, media_base: string}|null
     */
    public function payloadExperiencia(Experiencia $experiencia): ?array
    {
        if (! $experiencia->activo || $experiencia->estado === Experiencia::ESTADO_ARCHIVADA) {
            return null;
        }

        $bloques = $this->bloques->listar($experiencia)
            ->filter(fn (array $b) => ($b['activo'] ?? true))
            ->values()
            ->all();

        if ($bloques === []) {
            return null;
        }

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
        $claseId = isset($sesion['clase_id']) ? (int) $sesion['clase_id'] : null;

        if ($claseId) {
            return ClaseExperiencia::query()
                ->where('clase_id', $claseId)
                ->where('experiencia_id', $experiencia->id)
                ->exists();
        }

        $claseExperienciaId = isset($sesion['experiencia_id']) ? (int) $sesion['experiencia_id'] : null;

        if (! $claseExperienciaId) {
            return false;
        }

        return (int) $experiencia->id === $claseExperienciaId;
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

        return Experiencia::query()
            ->where('tematica_id', $tematica->id)
            ->where('activo', true)
            ->whereHas('bloques')
            ->orderBy('id')
            ->first();
    }
}
