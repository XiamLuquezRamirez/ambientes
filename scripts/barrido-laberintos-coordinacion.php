<?php

/**
 * Barrido específico: Laberintos de coordinación (Polimotor).
 * Uso: php scripts/barrido-laberintos-coordinacion.php
 */

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$fallos = [];
$avisos = [];
$oks = [];

function ok(string $msg): void
{
    global $oks;
    $oks[] = $msg;
    echo "[OK]  {$msg}\n";
}

function fail(string $msg): void
{
    global $fallos;
    $fallos[] = $msg;
    echo "[FAIL] {$msg}\n";
}

function warn(string $msg): void
{
    global $avisos;
    $avisos[] = $msg;
    echo "[WARN] {$msg}\n";
}

$rel = 'Polimotor/LaberintosDeCoordinacion';
$dir = public_path('catalogo_juegos/'.$rel);
$imgDir = $dir.'/img';

echo "=== LABERINTOS: filesystem ===\n";

if (! is_dir($dir)) {
    fail("No existe {$rel}");
    goto resumen;
}

foreach (['index.html', 'style.css', 'script.js', 'config.json', 'intro.json', 'laberintos-fijos.json'] as $f) {
    if (! is_file($dir.'/'.$f)) {
        fail("Falta {$rel}/{$f}");
    } else {
        ok("Presente {$f}");
    }
}

if (! is_dir($imgDir)) {
    fail('Falta carpeta img/');
} else {
    ok('Presente img/');
}

$html = file_get_contents($dir.'/index.html');
$js = file_get_contents($dir.'/script.js');
$css = file_get_contents($dir.'/style.css');

if (str_contains($html, 'Paquete en construcción') || str_contains($html, 'stub-wrap')) {
    fail('index.html aún muestra stub');
} else {
    ok('Stub visual eliminado');
}

foreach ([
    'btn-empecemos',
    'pantalla-inicio',
    'texto_voz.js',
    'id="lienzo"',
    'sweetalert',
    '/assets/css/fontawesome',
    'img/ESCENARIO.png',
    'img/COHETE_SIN-SOMBRA.png',
] as $needle) {
    if (! str_contains($html, $needle)) {
        fail("index.html sin '{$needle}'");
    } else {
        ok("HTML tiene {$needle}");
    }
}

if (str_contains($html, 'pelota') || str_contains($html, 'Reconocimiento/img')) {
    fail('index.html aún referencia pelota o avatar legacy de Reconocimiento');
} else {
    ok('HTML sin referencias legacy pelota/Reconocimiento');
}

foreach ([
    'TextoVoz',
    'confirmarNivel',
    'dentroDeRed',
    'redDePasillos',
    'soltarEsFallo',
    'pednia:perfil',
    'exitoMeta',
    'falloCamino',
    'iniciarAnimacionIntro',
    'mostrarNubeYConversacion',
    'entradaIzquierda',
    'programarRedibujo',
    'generarLaberintosNivel',
    'barajar',
    'poolLaberintosNivel',
    'dibujarCohete',
    'resolverGenero',
    'modoVictoria',
    'assetUrl',
    'zonaJuego',
    'escenarioImg',
    'avatarVictoriaImg',
    'laberintos-fijos.json',
] as $needle) {
    if (! str_contains($js, $needle) && ! str_contains($css, $needle)) {
        fail("paquete sin '{$needle}'");
    } else {
        ok("Tiene {$needle}");
    }
}

if (str_contains($js, 'generarCaminoOrtogonal') || str_contains($js, 'generarDistractores(')) {
    fail('script.js aún genera caminos al azar (debería usar pool fijo)');
} else {
    ok('JS sin generador aleatorio de caminos');
}

if (str_contains($js, 'dibujarPelota') || preg_match('/avatar\s*\|\|\s*"\.\.\/Reconocimiento/', $js)) {
    fail('script.js aún usa pelota o avatar Reconocimiento');
} else {
    ok('JS sin pelota/avatar Reconocimiento');
}

if (! str_contains($js, 'COHETE_CON-SOMBRA')) {
    ok('JS no usa cohete con sombra');
} else {
    fail('JS aún referencia COHETE_CON-SOMBRA');
}

if (str_contains($css, 'stub-wrap') && ! str_contains($css, 'pantalla-inicio')) {
    fail('style.css parece stub');
} else {
    ok('style.css con shell de juego');
}

echo "\n=== LABERINTOS: assets img/ ===\n";

$assetsObligatorios = [
    'ESCENARIO.png',
    'COHETE_SIN-SOMBRA.png',
    'NIÑO_COMIENZO.png',
    'NIÑO_VICTORIA_META.png',
    'NIÑA_COMIENZO.png',
    'NIÑA_VICTORIA_META.png',
];
foreach ($assetsObligatorios as $nombre) {
    $ruta = $imgDir.DIRECTORY_SEPARATOR.$nombre;
    if (! is_file($ruta)) {
        fail("Falta img/{$nombre}");
    } else {
        ok("Asset OK: img/{$nombre} (".filesize($ruta).' bytes)');
    }
}

if (is_file($imgDir.'/COHETE_CON-SOMBRA.png')) {
    ok('COHETE_CON-SOMBRA.png presente (no usado; reservado)');
}

echo "\n=== LABERINTOS: media compartida ===\n";

$media = [
    'images/correcto.gif',
    'images/incorrecto.gif',
    'images/victoria.gif',
    'images/nube.png',
    'images/zoe_normal.gif',
    'images/zoe_hablando.gif',
    'images/zeus_normal.gif',
    'images/zeus_hablando.gif',
    'sounds/ok.mp3',
    'sounds/over.mp3',
    'sounds/victory.mp3',
    'sounds/fondo.mp3',
    'texto_voz.js',
];
foreach ($media as $m) {
    if (! is_file(public_path('catalogo_juegos/'.$m))) {
        fail("Media faltante: {$m}");
    } else {
        ok("Media OK: {$m}");
    }
}

// Intro debe apuntar a GIFs existentes (no a normal1.gif legacy).
$introCheck = json_decode(file_get_contents($dir.'/intro.json'), true);
foreach (($introCheck['personajes'] ?? []) as $i => $pj) {
    foreach (['gif_idle', 'gif_hablando'] as $clave) {
        $relGif = $pj[$clave] ?? '';
        $fsGif = realpath($dir.'/'.$relGif);
        if (! $fsGif || ! is_file($fsGif)) {
            fail("intro personajes[{$i}].{$clave} no existe: {$relGif}");
        } else {
            ok("intro GIF OK: {$relGif}");
        }
    }
}

echo "\n=== LABERINTOS: config.json ===\n";

$config = json_decode(file_get_contents($dir.'/config.json'), true);
if (! is_array($config)) {
    fail('config.json inválido');
    goto resumen;
}

if (! empty($config['stub'])) {
    fail('config.json aún tiene stub=true');
} else {
    ok('config sin stub');
}

$escenario = $config['escenario']['fondo'] ?? '';
$metaImg = $config['meta']['imagen'] ?? '';
if ($escenario !== 'img/ESCENARIO.png' || ! is_file($dir.'/'.$escenario)) {
    fail('escenario.fondo inválido');
} else {
    ok("escenario.fondo={$escenario}");
}

$zona = $config['escenario']['zona'] ?? null;
if (! is_array($zona) || ! isset($zona['x'], $zona['y'], $zona['w'], $zona['h'])) {
    fail('escenario.zona incompleta');
} else {
    ok("escenario.zona x={$zona['x']} y={$zona['y']} w={$zona['w']} h={$zona['h']}");
}

if ($metaImg !== 'img/COHETE_SIN-SOMBRA.png' || ! is_file($dir.'/'.$metaImg)) {
    fail('meta.imagen debe ser COHETE_SIN-SOMBRA.png');
} else {
    ok("meta.imagen={$metaImg}");
}

foreach (['nino', 'nina'] as $g) {
    $pj = $config['personajes'][$g] ?? null;
    if (! is_array($pj) || empty($pj['comienzo']) || empty($pj['victoria'])) {
        fail("personajes.{$g} incompleto");
        continue;
    }
    foreach (['comienzo', 'victoria'] as $clave) {
        $relAsset = $pj[$clave];
        if (! is_file($dir.'/'.$relAsset)) {
            fail("personajes.{$g}.{$clave} no existe: {$relAsset}");
        } else {
            ok("personajes.{$g}.{$clave} OK");
        }
    }
}

$colores = $config['coloresCamino'] ?? [];
foreach (['pasillo', 'pared', 'borde'] as $c) {
    if (empty($colores[$c])) {
        fail("coloresCamino.{$c} faltante");
    } else {
        ok("coloresCamino.{$c}={$colores[$c]}");
    }
}

$textos = $config['textos'] ?? [];
foreach (['enunciado', 'enunciadoNino', 'enunciadoNina', 'cierre'] as $t) {
    if (empty($textos[$t])) {
        fail("textos.{$t} faltante");
    } elseif (stripos((string) $textos[$t], 'pelota') !== false) {
        fail("textos.{$t} aún menciona pelota");
    } else {
        ok("textos.{$t} OK");
    }
}

$fbAcierto = $config['feedback']['acierto']['texto'] ?? '';
if (stripos($fbAcierto, 'pelota') !== false) {
    fail('feedback.acierto aún menciona pelota');
} elseif ($fbAcierto === '') {
    fail('feedback.acierto.texto vacío');
} else {
    ok('feedback.acierto sin pelota');
}

// Laberintos fijos: pool de 10 por edad; partida toma cantidad sin repetir.
$esperados = [
    '3' => [
        'cantidad' => 3,
        'pool' => 10,
        'soltar' => false,
    ],
    '4' => [
        'cantidad' => 4,
        'pool' => 10,
        'soltar' => false,
    ],
    '5' => [
        'cantidad' => 5,
        'pool' => 10,
        'soltar' => true,
    ],
];

$fijosPath = $dir.'/laberintos-fijos.json';
if (! is_file($fijosPath)) {
    fail('Falta laberintos-fijos.json');
    $fijos = null;
} else {
    $fijos = json_decode(file_get_contents($fijosPath), true);
    if (! is_array($fijos)) {
        fail('laberintos-fijos.json inválido');
        $fijos = null;
    } else {
        ok('laberintos-fijos.json presente');
    }
}

$ids = [];
foreach ($config['niveles'] ?? [] as $nivel) {
    $id = (string) ($nivel['id'] ?? '');
    $ids[] = $id;
    $esp = $esperados[$id] ?? null;
    if (! $esp) {
        warn("Nivel id={$id} fuera de 3/4/5");
        continue;
    }

    $cantidad = (int) ($nivel['cantidad'] ?? 0);
    if ($cantidad !== $esp['cantidad']) {
        fail("Nivel {$id}: cantidad debería ser {$esp['cantidad']}, hay {$cantidad}");
    } else {
        ok("Nivel {$id}: cantidad={$cantidad}");
    }

    $soltar = (bool) ($nivel['soltarEsFallo'] ?? false);
    if ($soltar !== $esp['soltar']) {
        fail("Nivel {$id}: soltarEsFallo debería ser ".($esp['soltar'] ? 'true' : 'false'));
    } else {
        ok("Nivel {$id}: soltarEsFallo=".($soltar ? 'true' : 'false'));
    }

    if (! isset($nivel['anchoCamino']) || ! is_numeric($nivel['anchoCamino'])) {
        fail("Nivel {$id}: falta anchoCamino");
    } else {
        ok("Nivel {$id}: anchoCamino={$nivel['anchoCamino']}");
    }

    if (! empty($nivel['generacion'])) {
        warn("Nivel {$id}: aún tiene bloque generacion (ya no se usa)");
    }

    if ($fijos !== null) {
        $pool = $fijos[$id] ?? null;
        if (! is_array($pool) || count($pool) !== $esp['pool']) {
            fail("Nivel {$id}: pool fijo debería tener {$esp['pool']}, hay ".(is_array($pool) ? count($pool) : 0));
        } else {
            ok("Nivel {$id}: pool fijo=".count($pool));
        }
    }
}

if (! str_contains($js, 'generarLaberintosNivel') || ! str_contains($js, 'barajar')) {
    fail('script.js sin selección aleatoria sobre pool fijo');
} else {
    ok('JS con selección aleatoria sobre laberintos fijos');
}

// Validación geométrica estricta (Node).
$validador = base_path('scripts/validar-laberintos-fijos.js');
if (is_file($validador)) {
    $cmd = 'node '.escapeshellarg($validador);
    $out = [];
    $code = 0;
    exec($cmd.' 2>&1', $out, $code);
    if ($code !== 0) {
        fail('validar-laberintos-fijos.js falló');
        foreach (array_slice($out, -8) as $linea) {
            echo "       {$linea}\n";
        }
    } else {
        ok('validar-laberintos-fijos.js PASS');
    }
} else {
    warn('No está scripts/validar-laberintos-fijos.js');
}

foreach (array_keys($esperados) as $idEsp) {
    if (! in_array((string) $idEsp, $ids, true)) {
        fail("Falta nivel id={$idEsp}");
    }
}

echo "\n=== LABERINTOS: intro.json ===\n";

$intro = json_decode(file_get_contents($dir.'/intro.json'), true);
if (! is_array($intro) || empty($intro['personajes']) || empty($intro['conversacion'])) {
    fail('intro.json incompleto');
} else {
    ok('intro.json con personajes y conversación ('.count($intro['conversacion']).' líneas)');
    $textoIntro = implode(' ', array_map(static fn ($l) => (string) ($l['texto'] ?? ''), $intro['conversacion']));
    if (stripos($textoIntro, 'pelota') !== false) {
        fail('intro aún menciona pelota');
    } else {
        ok('intro sin pelota');
    }
    if (stripos($textoIntro, 'laberinto') === false && stripos($textoIntro, 'callejón') === false) {
        warn('intro no menciona laberinto/callejón');
    } else {
        ok('intro habla de laberinto/callejones');
    }
}

echo "\n=== LABERINTOS: BD ===\n";

if (Schema::hasTable('juegos')) {
    $fila = DB::table('juegos')
        ->where('ruta', 'like', '%LaberintosDeCoordinacion%')
        ->first();
    if (! $fila) {
        warn('No hay fila en juegos para LaberintosDeCoordinacion (¿solo stub local?)');
    } else {
        ok('BD slug='.($fila->slug ?? '?').' activo='.((int) ($fila->activo ?? 0)).
            (isset($fila->tipo) ? " tipo={$fila->tipo}" : '').
            (isset($fila->tipo_juego_id) ? " tipo_juego_id={$fila->tipo_juego_id}" : ''));
        $idx = public_path(trim($fila->ruta, '/').'/index.html');
        if (! is_file($idx)) {
            fail('BD apunta a ruta sin index.html');
        } else {
            ok('BD ruta ↔ disco OK');
        }
        if (empty($fila->activo)) {
            warn('Juego inactivo en BD');
        }
    }
} else {
    fail('Tabla juegos no existe');
}

resumen:
echo "\n========== RESUMEN LABERINTOS ==========\n";
echo 'OK: '.count($oks)."\n";
echo 'WARN: '.count($avisos)."\n";
echo 'FAIL: '.count($fallos)."\n";

if ($avisos) {
    echo "\nAvisos:\n - ".implode("\n - ", $avisos)."\n";
}
if ($fallos) {
    echo "\nFallos:\n - ".implode("\n - ", $fallos)."\n";
    exit(1);
}

echo "\nBarrido Laberintos: PASS\n";
exit(0);
