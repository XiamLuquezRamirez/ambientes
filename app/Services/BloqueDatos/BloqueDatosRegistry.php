<?php

namespace App\Services\BloqueDatos;

use App\Models\BloqueExperiencia;

class BloqueDatosRegistry
{
    public const CATEGORIA_NARRATIVOS = 'narrativos';

    public const CATEGORIA_INTERACTIVOS = 'interactivos';

    public const CATEGORIA_EVALUATIVOS = 'evaluativos';

    public const CATEGORIA_CIERRE = 'cierre';

    /**
     * @return array<int, array<string, mixed>>
     */
    public function catalogo(): array
    {
        return [
            $this->meta(BloqueExperiencia::TIPO_BIENVENIDA, 'Bienvenida', 'Saludo e instrucción inicial', 'fa-house', self::CATEGORIA_NARRATIVOS, true),
            $this->meta(BloqueExperiencia::TIPO_AUDIO, 'Audio', 'Reproduce un sonido o narración', 'fa-volume-high', self::CATEGORIA_NARRATIVOS, false),
            $this->meta(BloqueExperiencia::TIPO_VIDEO, 'Video', 'Muestra un video corto', 'fa-film', self::CATEGORIA_NARRATIVOS, false),
            $this->meta(BloqueExperiencia::TIPO_IMAGEN, 'Imagen', 'Muestra una imagen con narración', 'fa-image', self::CATEGORIA_NARRATIVOS, false),
            $this->meta(BloqueExperiencia::TIPO_HISTORIA, 'Historia', 'Cuento por páginas con audio', 'fa-book-open', self::CATEGORIA_NARRATIVOS, false),
            $this->meta(BloqueExperiencia::TIPO_RA, 'Realidad Aumentada', 'Activa contenido con marcador', 'fa-cube', self::CATEGORIA_INTERACTIVOS, false),
            $this->meta(BloqueExperiencia::TIPO_EVIDENCIA, 'Evidencia', 'Captura foto, audio o video', 'fa-camera', self::CATEGORIA_INTERACTIVOS, false),
            $this->meta(BloqueExperiencia::TIPO_JUEGO, 'Juego Interactivo', 'Rompecabezas, memoria u otro', 'fa-gamepad', self::CATEGORIA_INTERACTIVOS, false),
            $this->meta(BloqueExperiencia::TIPO_DIBUJO, 'Dibujo libre', 'Canvas de dibujo para el niño', 'fa-paintbrush', self::CATEGORIA_INTERACTIVOS, false),
            $this->meta(BloqueExperiencia::TIPO_PREGUNTA, 'Pregunta', 'Pregunta con opciones', 'fa-circle-question', self::CATEGORIA_EVALUATIVOS, false),
            $this->meta(BloqueExperiencia::TIPO_EMPAREJAR, 'Emparejar', 'Conecta pares relacionados', 'fa-link', self::CATEGORIA_EVALUATIVOS, false),
            $this->meta(BloqueExperiencia::TIPO_CLASIFICACION, 'Clasificación', 'Clasifica ítems en categorías', 'fa-table-cells-large', self::CATEGORIA_EVALUATIVOS, false),
            $this->meta(BloqueExperiencia::TIPO_ARRASTRAR, 'Arrastrar', 'Arrastra a zonas destino', 'fa-hand', self::CATEGORIA_EVALUATIVOS, false),
            $this->meta(BloqueExperiencia::TIPO_RETO, 'Reto', 'Secuencia de pasos con opciones', 'fa-flag-checkered', self::CATEGORIA_EVALUATIVOS, false),
            $this->meta(BloqueExperiencia::TIPO_EMOCION, 'Emoción', 'Pregunta cómo se siente el niño', 'fa-face-smile', self::CATEGORIA_CIERRE, false),
            $this->meta(BloqueExperiencia::TIPO_RECOMPENSA, 'Recompensa', 'Cierre con trofeo o insignia', 'fa-trophy', self::CATEGORIA_CIERRE, true),
        ];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function catalogoIndexado(): array
    {
        $out = [];
        foreach ($this->catalogo() as $item) {
            $out[$item['tipo']] = $item;
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    public function metaTipo(string $tipo): array
    {
        return $this->catalogoIndexado()[$tipo] ?? [
            'tipo' => $tipo,
            'nombre' => ucfirst($tipo),
            'descripcion' => '',
            'icono' => 'fa-cube',
            'categoria' => self::CATEGORIA_NARRATIVOS,
            'categoria_label' => 'Narrativos',
            'obligatorio' => false,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function defaults(string $tipo): array
    {
        return match ($tipo) {
            BloqueExperiencia::TIPO_BIENVENIDA => [
                'instruccion' => '',
                'personaje' => 'personaje',
                'tipo_media' => 'ninguno',
                'imagen' => '',
                'video' => '',
                'descripcion_accesible' => '',
            ],
            BloqueExperiencia::TIPO_AUDIO => [
                'instruccion' => '',
                'archivo' => '',
                'repeticiones' => '1 vez',
                'descripcion_accesible' => '',
            ],
            BloqueExperiencia::TIPO_VIDEO => [
                'instruccion' => '',
                'archivo' => '',
                'descripcion_accesible' => '',
            ],
            BloqueExperiencia::TIPO_IMAGEN => [
                'instruccion' => '',
                'archivo' => '',
                'descripcion' => '',
            ],
            BloqueExperiencia::TIPO_HISTORIA => [
                'instruccion' => '',
                'paginas' => '3',
                'paginas_data' => [
                    ['imagen' => '', 'audio' => ''],
                    ['imagen' => '', 'audio' => ''],
                    ['imagen' => '', 'audio' => ''],
                ],
            ],
            BloqueExperiencia::TIPO_RA => [
                'instruccion' => '',
                'marcador' => '',
                'contenido' => 'Animación 3D',
            ],
            BloqueExperiencia::TIPO_EVIDENCIA => [
                'instruccion' => '',
                'tipo' => 'Foto',
            ],
            BloqueExperiencia::TIPO_JUEGO => [
                'instruccion' => '',
                'juego_id' => null,
                'juego_catalogo_id' => null,
                'juego_nombre' => '',
                'juego_imagen' => '',
                'juego_piezas' => '',
                'colores_zonas' => [],
                'imagen_1' => '',
                'imagen_2' => '',
                'imagen_3' => '',
                'imagen_4' => '',
                'imagen_5' => '',
                'imagen_6' => '',
                'seq_1' => '',
                'seq_2' => '',
                'seq_3' => '',
                'seq_4' => '',
            ],
            BloqueExperiencia::TIPO_DIBUJO => [
                'instruccion' => '',
                'fondo' => '',
                'guardar_evidencia' => true,
                'nota_evidencia' => '',
            ],
            BloqueExperiencia::TIPO_PREGUNTA => [
                'instruccion' => '',
                'texto' => '',
                'imagen' => '',
                'tipo_opts' => 'emoji_texto',
                'opciones' => [
                    ['texto' => '', 'emoji' => '', 'imagen' => '', 'correcta' => true],
                    ['texto' => '', 'emoji' => '', 'imagen' => '', 'correcta' => false],
                ],
                'fb_ok' => '¡Muy bien!',
                'fb_err' => 'Inténtalo de nuevo.',
                'intentos' => '2',
                'al_agotar' => 'Mostrar respuesta correcta',
            ],
            BloqueExperiencia::TIPO_EMPAREJAR => [
                'instruccion' => '',
                'modo' => 'texto',
                'pares' => [
                    ['izq' => '', 'izqImg' => '', 'der' => '', 'derImg' => ''],
                    ['izq' => '', 'izqImg' => '', 'der' => '', 'derImg' => ''],
                ],
                'fb_ok' => '¡Correcto! 🎉',
                'fb_err' => 'Ese no va ahí...',
                'intentos' => 'Sin límite',
            ],
            BloqueExperiencia::TIPO_CLASIFICACION => [
                'instruccion' => '',
                'categorias' => [],
                'items' => [
                    ['texto' => '', 'imagen' => '', 'categoria' => ''],
                    ['texto' => '', 'imagen' => '', 'categoria' => ''],
                ],
            ],
            BloqueExperiencia::TIPO_ARRASTRAR => [
                'instruccion' => '',
                'zonas' => [
                    ['nombre' => 'Zona 1', 'color' => '#0F6E56'],
                    ['nombre' => 'Zona 2', 'color' => '#534AB7'],
                ],
                'items' => [
                    ['texto' => '', 'imagen' => '', 'zona' => 'Zona 1'],
                    ['texto' => '', 'imagen' => '', 'zona' => 'Zona 2'],
                ],
            ],
            BloqueExperiencia::TIPO_RETO => [
                'instruccion' => '',
                'descripcion' => '',
                'pasos' => [
                    $this->pasoRetoDefault(),
                    $this->pasoRetoDefault(),
                ],
                'fb_ok' => '¡Correcto! 🎉',
                'fb_err' => 'Casi...',
                'intentos' => '2',
                'al_agotar' => 'Mostrar respuesta correcta',
            ],
            BloqueExperiencia::TIPO_EMOCION => [
                'instruccion' => '',
                'cantidad' => '6',
            ],
            BloqueExperiencia::TIPO_RECOMPENSA => [
                'instruccion' => '',
                'tipo' => 'Trofeo',
                'insignia' => '',
            ],
            default => [],
        };
    }

    /**
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public function normalizar(string $tipo, array $datos): array
    {
        $base = $this->defaults($tipo);
        $merged = array_replace_recursive($base, $datos);

        if ($tipo === BloqueExperiencia::TIPO_HISTORIA) {
            $n = max(2, min(5, (int) ($merged['paginas'] ?? 3)));
            $merged['paginas'] = (string) $n;
            $paginas = is_array($merged['paginas_data'] ?? null) ? $merged['paginas_data'] : [];
            while (count($paginas) < $n) {
                $paginas[] = ['imagen' => '', 'audio' => ''];
            }
            $merged['paginas_data'] = array_slice($paginas, 0, $n);
        }

        if ($tipo === BloqueExperiencia::TIPO_JUEGO) {
            if ($merged['juego_id'] === '' || $merged['juego_id'] === false) {
                $merged['juego_id'] = null;
            }
            if ($merged['juego_catalogo_id'] === '' || $merged['juego_catalogo_id'] === false) {
                $merged['juego_catalogo_id'] = null;
            }
        }

        if ($tipo === BloqueExperiencia::TIPO_BIENVENIDA) {
            $tipoMedia = $merged['tipo_media'] ?? 'ninguno';
            if (! in_array($tipoMedia, ['ninguno', 'imagen', 'video'], true)) {
                $tipoMedia = 'ninguno';
            }
            $merged['tipo_media'] = $tipoMedia;
            if ($tipoMedia !== 'imagen') {
                $merged['imagen'] = '';
            }
            if ($tipoMedia !== 'video') {
                $merged['video'] = '';
            }
        }

        if ($tipo === BloqueExperiencia::TIPO_CLASIFICACION) {
            $merged = $this->normalizarClasificacion($merged);
        }

        return $merged;
    }

    /**
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    private function normalizarClasificacion(array $datos): array
    {
        $cats = is_array($datos['categorias'] ?? null) ? $datos['categorias'] : [];
        $cats = array_values(array_filter(array_map(
            fn ($c) => trim((string) $c),
            $cats
        ), fn ($c) => $c !== '' && ! $this->esCategoriaPlaceholderClasificacion($c)));

        $datos['categorias'] = $cats;

        if (! is_array($datos['items'] ?? null)) {
            return $datos;
        }

        $datos['items'] = array_map(function ($item) use ($cats) {
            if (! is_array($item)) {
                return $item;
            }

            $cat = trim((string) ($item['categoria'] ?? ''));
            if ($this->esCategoriaPlaceholderClasificacion($cat) || ($cat !== '' && ! in_array($cat, $cats, true))) {
                $item['categoria'] = '';
            }

            return $item;
        }, $datos['items']);

        return $datos;
    }

    private function esCategoriaPlaceholderClasificacion(string $nombre): bool
    {
        return preg_match('/^Cat\s*\d+$/i', trim($nombre)) === 1;
    }

    /**
     * @param  array<string, mixed>  $datos
     * @return list<string>
     */
    public function pendientes(string $tipo, array $datos): array
    {
        $datos = $this->normalizar($tipo, $datos);
        $pendientes = [];

        $req = function (string $campo, string $label) use (&$pendientes, $datos): void {
            if ($this->vacio($datos[$campo] ?? null)) {
                $pendientes[] = $label;
            }
        };

        switch ($tipo) {
            case BloqueExperiencia::TIPO_BIENVENIDA:
                $req('instruccion', 'Instrucción de audio');
                $tipoMedia = $datos['tipo_media'] ?? 'ninguno';
                if ($tipoMedia === 'imagen' && $this->vacio($datos['imagen'] ?? null)) {
                    $pendientes[] = 'Imagen de bienvenida';
                }
                if ($tipoMedia === 'video' && $this->vacio($datos['video'] ?? null)) {
                    $pendientes[] = 'Video de bienvenida';
                }
                break;

            case BloqueExperiencia::TIPO_EMOCION:
                $req('instruccion', 'Instrucción de audio');
                break;

            case BloqueExperiencia::TIPO_AUDIO:
            case BloqueExperiencia::TIPO_VIDEO:
            case BloqueExperiencia::TIPO_IMAGEN:
                $req('instruccion', 'Instrucción de audio');
                $req('archivo', 'Archivo');
                break;

            case BloqueExperiencia::TIPO_HISTORIA:
                $req('instruccion', 'Instrucción de audio');
                foreach ($datos['paginas_data'] as $i => $pagina) {
                    $n = $i + 1;
                    if ($this->vacio($pagina['imagen'] ?? null)) {
                        $pendientes[] = "Página {$n}: imagen";
                    }
                    if ($this->vacio($pagina['audio'] ?? null)) {
                        $pendientes[] = "Página {$n}: audio";
                    }
                }
                break;

            case BloqueExperiencia::TIPO_RA:
                $req('instruccion', 'Instrucción de audio');
                $req('marcador', 'Marcador');
                break;

            case BloqueExperiencia::TIPO_EVIDENCIA:
            case BloqueExperiencia::TIPO_RECOMPENSA:
                $req('instruccion', 'Instrucción de audio');
                if ($tipo === BloqueExperiencia::TIPO_RECOMPENSA
                    && ($datos['tipo'] ?? '') === 'Insignia especial'
                    && $this->vacio($datos['insignia'] ?? null)
                ) {
                    $pendientes[] = 'Imagen de insignia';
                }
                break;

            case BloqueExperiencia::TIPO_JUEGO:
                $req('instruccion', 'Instrucción de audio');
                if ($this->vacio($datos['juego_id'] ?? null)) {
                    $pendientes[] = 'Juego';
                } else {
                    $pendientes = array_merge($pendientes, $this->pendientesJuego($datos));
                }
                break;

            case BloqueExperiencia::TIPO_DIBUJO:
                $req('instruccion', 'Instrucción de audio');
                break;

            case BloqueExperiencia::TIPO_PREGUNTA:
                $req('instruccion', 'Instrucción de audio');
                $req('texto', 'Texto de la pregunta');
                $pendientes = array_merge($pendientes, $this->pendientesOpciones($datos['opciones'] ?? [], $datos['tipo_opts'] ?? 'emoji_texto'));
                break;

            case BloqueExperiencia::TIPO_EMPAREJAR:
                $req('instruccion', 'Instrucción de audio');
                $pendientes = array_merge($pendientes, $this->pendientesPares($datos));
                break;

            case BloqueExperiencia::TIPO_CLASIFICACION:
                $req('instruccion', 'Instrucción de audio');
                $pendientes = array_merge($pendientes, $this->pendientesClasificacion($datos));
                break;

            case BloqueExperiencia::TIPO_ARRASTRAR:
                $req('instruccion', 'Instrucción de audio');
                $pendientes = array_merge($pendientes, $this->pendientesArrastrar($datos));
                break;

            case BloqueExperiencia::TIPO_RETO:
                $req('instruccion', 'Instrucción de audio');
                $req('descripcion', 'Nombre del reto');
                $pendientes = array_merge($pendientes, $this->pendientesReto($datos));
                break;
        }

        return array_values(array_unique($pendientes));
    }

    /**
     * @param  array<string, mixed>  $datos
     */
    public function estaCompleto(string $tipo, array $datos): bool
    {
        return $this->pendientes($tipo, $datos) === [];
    }

    /**
     * @param  array<string, mixed>  $datos
     * @return list<string>
     */
    public function validar(string $tipo, array $datos): array
    {
        if (! in_array($tipo, BloqueExperiencia::TIPOS, true)) {
            return ['Tipo de bloque no válido.'];
        }

        return $this->pendientes($tipo, $datos);
    }

    /**
     * @return array<string, mixed>
     */
    private function meta(
        string $tipo,
        string $nombre,
        string $descripcion,
        string $icono,
        string $categoria,
        bool $obligatorio
    ): array {
        $labels = [
            self::CATEGORIA_NARRATIVOS => 'Narrativos',
            self::CATEGORIA_INTERACTIVOS => 'Interactivos',
            self::CATEGORIA_EVALUATIVOS => 'Evaluativos',
            self::CATEGORIA_CIERRE => 'Cierre',
        ];

        return [
            'tipo' => $tipo,
            'nombre' => $nombre,
            'descripcion' => $descripcion,
            'icono' => $icono,
            'categoria' => $categoria,
            'categoria_label' => $labels[$categoria] ?? $categoria,
            'obligatorio' => $obligatorio,
        ];
    }

    /**
     * Tipos que se pueden agregar desde el catálogo (no auto-creados).
     *
     * @return array<int, array<string, mixed>>
     */
    public function catalogoAgregable(): array
    {
        return array_values(array_filter(
            $this->catalogo(),
            fn (array $item) => ! $item['obligatorio']
        ));
    }

    /**
     * @return array<string, mixed>
     */
    private function pasoRetoDefault(): array
    {
        return [
            'pregunta' => '',
            'opciones' => [
                ['emoji' => '', 'label' => '', 'imagen' => '', 'correcta' => true],
                ['emoji' => '', 'label' => '', 'imagen' => '', 'correcta' => false],
                ['emoji' => '', 'label' => '', 'imagen' => '', 'correcta' => false],
                ['emoji' => '', 'label' => '', 'imagen' => '', 'correcta' => false],
            ],
        ];
    }

    private function vacio(mixed $valor): bool
    {
        if ($valor === null) {
            return true;
        }
        if (is_string($valor)) {
            return trim($valor) === '';
        }
        if (is_array($valor)) {
            return $valor === [];
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $datos
     * @return list<string>
     */
    private function pendientesJuego(array $datos): array
    {
        $id = (string) ($datos['juego_id'] ?? '');
        $out = [];

        if (in_array($id, ['rompecabezas', 'colorear'], true)) {
            if ($this->vacio($datos['juego_imagen'] ?? null)) {
                $out[] = 'Imagen del juego';
            }
            if ($this->vacio($datos['juego_piezas'] ?? null)) {
                $out[] = $id === 'colorear' ? 'Colores en la paleta' : 'Dificultad / piezas';
            }
        }

        if ($id === 'colorear') {
            $piezas = (string) ($datos['juego_piezas'] ?? '');
            $n = str_contains($piezas, '9') ? 9 : (str_contains($piezas, '6') ? 6 : (str_contains($piezas, '4') ? 4 : 0));
            $cols = is_array($datos['colores_zonas'] ?? null) ? $datos['colores_zonas'] : [];
            $llenas = 0;
            foreach ($cols as $c) {
                if (! $this->vacio($c)) {
                    $llenas++;
                }
            }
            if ($n > 0 && $llenas < $n) {
                $out[] = "Colorear: define los {$n} colores de la paleta";
            }
        }

        if ($id === 'memoria') {
            $llenas = 0;
            foreach (['imagen_1', 'imagen_2', 'imagen_3', 'imagen_4', 'imagen_5', 'imagen_6'] as $k) {
                if (! $this->vacio($datos[$k] ?? null)) {
                    $llenas++;
                }
            }
            if ($llenas < 2) {
                $out[] = 'Memoria: al menos 2 pares de imagen';
            }
        }

        if ($id === 'secuencia') {
            $llenas = 0;
            foreach (['seq_1', 'seq_2', 'seq_3', 'seq_4'] as $k) {
                if (! $this->vacio($datos[$k] ?? null)) {
                    $llenas++;
                }
            }
            if ($llenas < 3) {
                $out[] = 'Secuencia: sube 3 o 4 imágenes en el orden correcto';
            }
        }

        return $out;
    }

    /**
     * @param  mixed  $opciones
     * @return list<string>
     */
    private function pendientesOpciones($opciones, string $tipoOpts): array
    {
        $out = [];
        if (! is_array($opciones) || count($opciones) < 2 || count($opciones) > 4) {
            return ['Opciones: entre 2 y 4'];
        }

        $correctas = 0;
        foreach ($opciones as $i => $op) {
            $n = $i + 1;
            $texto = trim((string) ($op['texto'] ?? ''));
            $emoji = trim((string) ($op['emoji'] ?? ''));
            $imagen = trim((string) ($op['imagen'] ?? ''));
            $ok = ! empty($op['correcta']);

            if ($ok) {
                $correctas++;
            }

            $valida = match ($tipoOpts) {
                'solo_texto' => $texto !== '',
                'imagen_texto' => $imagen !== '' || $texto !== '',
                default => $emoji !== '' || $texto !== '',
            };

            if (! $valida) {
                $out[] = "Opción {$n} incompleta";
            }
        }

        if ($correctas !== 1) {
            $out[] = 'Debe haber exactamente una opción correcta';
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $datos
     * @return list<string>
     */
    private function pendientesPares(array $datos): array
    {
        $pares = $datos['pares'] ?? [];
        $modo = (string) ($datos['modo'] ?? 'texto');
        if (! is_array($pares) || count($pares) < 2) {
            return ['Pares: mínimo 2'];
        }

        $out = [];
        foreach ($pares as $i => $par) {
            $n = $i + 1;
            $izq = trim((string) ($par['izq'] ?? ''));
            $izqImg = trim((string) ($par['izqImg'] ?? ''));
            $der = trim((string) ($par['der'] ?? ''));
            $derImg = trim((string) ($par['derImg'] ?? ''));

            $ok = match ($modo) {
                'imagen' => $izqImg !== '' && $derImg !== '',
                'imagen_texto' => $izqImg !== '' && $der !== '',
                default => $izq !== '' && $der !== '',
            };

            if (! $ok) {
                $out[] = "Par {$n} incompleto";
            }
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $datos
     * @return list<string>
     */
    private function pendientesClasificacion(array $datos): array
    {
        $cats = $datos['categorias'] ?? [];
        $items = $datos['items'] ?? [];
        $out = [];

        if (! is_array($cats) || count($cats) < 2) {
            $out[] = 'Categorías: mínimo 2';
        }

        foreach ((array) $cats as $i => $cat) {
            if ($this->vacio($cat)) {
                $out[] = 'Categoría '.($i + 1).': nombre';
            }
        }

        if (! is_array($items) || count($items) < 2) {
            $out[] = 'Ítems: mínimo 2';
        }

        $catSet = is_array($cats) ? array_map('strval', $cats) : [];

        foreach ((array) $items as $i => $item) {
            $n = $i + 1;
            $texto = trim((string) ($item['texto'] ?? ''));
            $imagen = trim((string) ($item['imagen'] ?? ''));
            $cat = (string) ($item['categoria'] ?? '');
            if ($texto === '' && $imagen === '') {
                $out[] = "Ítem {$n}: texto o imagen";
            }
            if ($cat === '' || ! in_array($cat, $catSet, true)) {
                $out[] = "Ítem {$n}: categoría inválida";
            }
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $datos
     * @return list<string>
     */
    private function pendientesArrastrar(array $datos): array
    {
        $zonas = $datos['zonas'] ?? [];
        $items = $datos['items'] ?? [];
        $out = [];

        if (! is_array($zonas) || count($zonas) < 2) {
            $out[] = 'Zonas: mínimo 2';
        }

        $nombres = [];
        foreach ((array) $zonas as $i => $zona) {
            $nombre = trim((string) ($zona['nombre'] ?? ''));
            if ($nombre === '') {
                $out[] = 'Zona '.($i + 1).': nombre';
            } else {
                $nombres[] = $nombre;
            }
        }

        if (! is_array($items) || count($items) < 2) {
            $out[] = 'Ítems: mínimo 2';
        }

        foreach ((array) $items as $i => $item) {
            $n = $i + 1;
            $texto = trim((string) ($item['texto'] ?? ''));
            $imagen = trim((string) ($item['imagen'] ?? ''));
            $zona = (string) ($item['zona'] ?? '');
            if ($texto === '' && $imagen === '') {
                $out[] = "Ítem {$n}: texto o imagen";
            }
            if ($zona === '' || ! in_array($zona, $nombres, true)) {
                $out[] = "Ítem {$n}: zona inválida";
            }
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $datos
     * @return list<string>
     */
    private function pendientesReto(array $datos): array
    {
        $pasos = $datos['pasos'] ?? [];
        if (! is_array($pasos) || count($pasos) < 2) {
            return ['Pasos: mínimo 2'];
        }

        $out = [];
        foreach ($pasos as $i => $paso) {
            $n = $i + 1;
            if ($this->vacio($paso['pregunta'] ?? null)) {
                $out[] = "Paso {$n}: pregunta";
            }
            $ops = $paso['opciones'] ?? [];
            if (! is_array($ops) || count($ops) !== 4) {
                $out[] = "Paso {$n}: debe tener 4 opciones";
                continue;
            }
            $correctas = 0;
            foreach ($ops as $j => $op) {
                if (! empty($op['correcta'])) {
                    $correctas++;
                }
                $emoji = trim((string) ($op['emoji'] ?? ''));
                $label = trim((string) ($op['label'] ?? ''));
                $imagen = trim((string) ($op['imagen'] ?? ''));
                if ($emoji === '' && $label === '' && $imagen === '') {
                    $out[] = "Paso {$n}, opción ".($j + 1).' vacía';
                }
            }
            if ($correctas !== 1) {
                $out[] = "Paso {$n}: exactamente una opción correcta";
            }
        }

        return $out;
    }
}
