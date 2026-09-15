<?php

/**
 * Barrido: Lateralidad espacial (Polimotor).
 * Uso: php scripts/barrido-lateralidad.php
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

$rel = 'Polimotor/Lateralidad';
$dir = public_path('catalogo_juegos/'.$rel);

echo "=== LATERALIDAD: filesystem ===\n";

if (! is_dir($dir)) {
    fail("No existe {$rel}");
    goto resumen;
}

foreach (['index.html', 'style.css', 'script.js', 'config.json', 'intro.json'] as $f) {
    if (! is_file($dir.'/'.$f)) {
        fail("Falta {$rel}/{$f}");
    } else {
        ok("Presente {$f}");
    }
}

if (is_file($dir.'/lateralidad.js')) {
    fail('lateralidad.js legacy aún presente (debe eliminarse)');
} else {
    ok('Sin lateralidad.js legacy');
}

$html = file_get_contents($dir.'/index.html');
$js = file_get_contents($dir.'/script.js');
$css = file_get_contents($dir.'/style.css');

if (str_contains($html, 'Reconocimiento/script.js') || str_contains($html, '../Reconocimiento/style.css')) {
    fail('HTML aún depende de Reconocimiento');
} else {
    ok('Independiente de Reconocimiento');
}

if (str_contains($html, 'Paquete en construcción') || str_contains($html, 'stub-wrap')) {
    fail('index.html aún muestra stub');
} else {
    ok('Stub visual eliminado');
}

foreach ([
    'btn-empecemos',
    'pantalla-inicio',
    'texto_voz.js',
    'id="tablero"',
    'sweetalert',
    'id="intro-lados"',
] as $needle) {
    if (! str_contains($html, $needle)) {
        fail("index.html sin '{$needle}'");
    } else {
        ok("HTML tiene {$needle}");
    }
}

foreach ([
    'TextoVoz',
    'confirmarNivel',
    'instanciarReto',
    'reproducirEstatico',
    'reproducirDinamico',
    'reproducirImitacion',
    'mostrarIntroLados',
    'pednia:perfil',
    'resolverRespuesta',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach (['btn-mano', 'zona-slot', 'entradaIzquierda', 'actor-movil'] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

echo "\n=== LATERALIDAD: media ===\n";

$configPreview = json_decode(file_get_contents($dir.'/config.json'), true);
$imgsConfig = [];
foreach (($configPreview['objetos'] ?? []) as $meta) {
    if (! empty($meta['img'])) {
        $imgsConfig[] = $meta['img'];
    }
}
$imgsConfig = array_values(array_unique($imgsConfig));
foreach ($imgsConfig as $relImg) {
    $p = $dir.'/'.$relImg;
    if (! is_file($p)) {
        fail("Falta {$relImg}");
    } else {
        ok("Asset {$relImg}");
    }
}
if (is_dir($dir.'/img')) {
    $svgsLegacy = glob($dir.'/img/*.svg') ?: [];
    if ($svgsLegacy) {
        warn('Quedan SVG legacy en img/: '.implode(', ', array_map('basename', $svgsLegacy)));
    } else {
        ok('Sin SVG legacy en img/');
    }
}

foreach ([
    'images/correcto.gif',
    'images/incorrecto.gif',
    'images/victoria.gif',
    'images/nube.png',
    'images/normal1.gif',
    'images/ciencia/normal1.gif',
    'sounds/ok.mp3',
    'sounds/over.mp3',
    'sounds/victory.mp3',
    'sounds/fondo.mp3',
    'texto_voz.js',
] as $m) {
    if (! is_file(public_path('catalogo_juegos/'.$m))) {
        fail("Media faltante: {$m}");
    } else {
        ok("Media OK: {$m}");
    }
}

echo "\n=== LATERALIDAD: config.json ===\n";

$config = json_decode(file_get_contents($dir.'/config.json'), true);
if (! is_array($config)) {
    fail('config.json inválido');
    goto resumen;
}

if (! empty($config['stub'])) {
    fail('config aún con stub=true');
} else {
    ok('config sin stub');
}

if (! empty($config['cuerpos'])) {
    fail('config aún tiene cuerpos/figura (legacy)');
} else {
    ok('Sin cuerpos legacy');
}

$esperados = [
    '3' => ['retos' => 3, 'tipos' => ['estatico', 'dinamico', 'imitacion']],
    '4' => ['retos' => 3, 'tipos' => ['estatico', 'dinamico', 'imitacion']],
    '5' => ['retos' => 3, 'tipos' => ['estatico', 'dinamico', 'imitacion']],
];

$ids = [];
foreach ($config['niveles'] ?? [] as $nivel) {
    $id = (string) ($nivel['id'] ?? '');
    $ids[] = $id;
    $esp = $esperados[$id] ?? null;
    if (! $esp) {
        warn("Nivel id={$id} fuera de 3/4/5");
        continue;
    }
    $retos = $nivel['retos'] ?? [];
    if (count($retos) !== $esp['retos']) {
        fail("Nivel {$id}: se esperan {$esp['retos']} retos, hay ".count($retos));
    } else {
        ok("Nivel {$id}: ".count($retos).' retos');
    }
    foreach ($retos as $i => $reto) {
        $tipo = $reto['tipo'] ?? '';
        if ($tipo !== $esp['tipos'][$i]) {
            fail("Nivel {$id} reto ".($i + 1).": tipo={$tipo}, esperado {$esp['tipos'][$i]}");
        } else {
            ok("Nivel {$id} reto ".($i + 1).": {$tipo}");
        }
        if (empty($reto['modoRespuesta'])) {
            fail("Nivel {$id} reto ".($i + 1).": falta modoRespuesta");
        }
    }
}

foreach (array_keys($esperados) as $idEsp) {
    if (! in_array((string) $idEsp, $ids, true)) {
        fail("Falta nivel id={$idEsp}");
    }
}

echo "\n=== LATERALIDAD: requisitos mecánicos ===\n";

$fbError = $config['feedback']['error']['texto'] ?? '';
if ($fbError !== 'Inténtalo otra vez. ¡Tú puedes!') {
    fail("Feedback error distinto al req: «{$fbError}»");
} else {
    ok('Feedback error según req');
}

$cols = $config['coloresZona'] ?? [];
foreach (['izquierda' => '#ffd43b', 'centro' => '#4dabf7', 'derecha' => '#51cf66'] as $z => $hex) {
    if (strcasecmp((string) ($cols[$z] ?? ''), $hex) !== 0) {
        fail("Color zona {$z} incorrecto");
    } else {
        ok("Color {$z}={$hex}");
    }
}

$porId = [];
foreach ($config['niveles'] as $n) {
    $porId[(string) $n['id']] = $n;
}

$checks = [
    '3' => [
        ['modoRespuesta' => 'zona', 'flags' => []],
        ['modoRespuesta' => 'zona', 'flags' => ['salirEscena' => true]],
        ['modoRespuesta' => 'zona', 'flags' => []],
    ],
    '4' => [
        ['modoRespuesta' => 'zona', 'flags' => []],
        ['modoRespuesta' => 'zona', 'flags' => []],
        ['modoRespuesta' => 'zona', 'flags' => ['caminaAlFinal' => true]],
    ],
    '5' => [
        ['modoRespuesta' => 'objeto', 'flags' => []],
        ['modoRespuesta' => 'objeto', 'flags' => []],
        ['modoRespuesta' => 'botones', 'flags' => []],
    ],
];

foreach ($checks as $nid => $rets) {
    $nivel = $porId[$nid] ?? null;
    if (! $nivel) {
        continue;
    }
    foreach ($rets as $i => $esp) {
        $reto = $nivel['retos'][$i] ?? [];
        $modo = $reto['modoRespuesta'] ?? '';
        if ($modo !== $esp['modoRespuesta']) {
            fail("Nivel {$nid} reto ".($i + 1).": modo={$modo}, esperado {$esp['modoRespuesta']}");
        } else {
            ok("Nivel {$nid} reto ".($i + 1)." modo={$modo}");
        }
        foreach ($esp['flags'] as $flag => $val) {
            if (empty($reto[$flag]) !== ! $val) {
                fail("Nivel {$nid} reto ".($i + 1).": falta {$flag}=".json_encode($val));
            } else {
                ok("Nivel {$nid} reto ".($i + 1)." {$flag}");
            }
        }
    }
}

if (! str_contains($js, 'salirEscena') || ! str_contains($js, 'pctFuera')) {
    fail('script.js sin salida de escena (salirEscena/pctFuera)');
} else {
    ok('JS sale de escena en dinámico 3 años');
}
if (! str_contains($js, 'caminaAlFinal') || ! str_contains($js, 'caminando')) {
    fail('script.js sin caminata final de Zoe');
} else {
    ok('JS camina Zoe al final (4 años)');
}
if (! str_contains($js, '["izquierda", "centro", "derecha"]') && ! str_contains($js, "['izquierda', 'centro', 'derecha']")) {
    // mostrarIntroLados usa array literal
    if (! preg_match('/orden\s*=\s*\[\s*"izquierda"\s*,\s*"centro"\s*,\s*"derecha"\s*\]/', $js)) {
        fail('Intro de lados no fija izquierda→centro→derecha');
    } else {
        ok('Intro siempre L→C→R');
    }
} else {
    ok('Intro siempre L→C→R');
}
if (! preg_match('/function pctParaZona\(zona\)/', $js)) {
    fail('pctParaZona aún depende del conteo de zonas');
} else {
    ok('pctParaZona por nombre de zona');
}
if (! str_contains($js, 'Dinosaurio.png') && ! str_contains(json_encode($config), 'Dinosaurio.png')) {
    fail('Ruta dino no apunta a Dinosaurio.png');
} else {
    ok('Dinosaurio.png referenciado');
}

$intro = json_decode(file_get_contents($dir.'/intro.json'), true);
if (! is_array($intro) || empty($intro['personajes']) || empty($intro['conversacion'])) {
    fail('intro.json incompleto');
} else {
    ok('intro.json OK ('.count($intro['conversacion']).' líneas)');
}

echo "\n=== LATERALIDAD: BD ===\n";

if (Schema::hasTable('juegos')) {
    $fila = DB::table('juegos')
        ->where('ruta', 'like', '%Lateralidad%')
        ->first();
    if (! $fila) {
        warn('No hay fila en juegos para Lateralidad');
    } else {
        ok("BD slug={$fila->slug} activo=".((int) $fila->activo)." tipo={$fila->tipo}");
        $idx = public_path(trim($fila->ruta, '/').'/index.html');
        if (! is_file($idx)) {
            fail('BD apunta a ruta sin index.html');
        } else {
            ok('BD ruta ↔ disco OK');
        }
    }
} else {
    fail('Tabla juegos no existe');
}

resumen:
echo "\n========== RESUMEN LATERALIDAD ==========\n";
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

echo "\nBarrido Lateralidad sin fallos.\n";
exit(0);
