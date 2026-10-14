<?php

/**
 * Barrido: Completa La Figura (Multisensorial).
 * Uso: php scripts/barrido-completa-la-figura.php
 */

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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

$rel = 'Multisensorial/CompletaLaFigura';
$dir = public_path('catalogo_juegos/'.$rel);

echo "=== COMPLETA LA FIGURA: filesystem ===\n";

if (! is_dir($dir)) {
    fail("No existe {$rel}");
    goto resumen;
}

foreach (['index.html', 'style.css', 'script.js', 'config.json'] as $f) {
    if (! is_file($dir.'/'.$f)) {
        fail("Falta {$rel}/{$f}");
    } else {
        ok("Presente {$f}");
    }
}

$html = file_get_contents($dir.'/index.html');
$js = file_get_contents($dir.'/script.js');
$css = file_get_contents($dir.'/style.css');

if (str_contains($html, 'Paquete en construcción') || str_contains($html, 'stub-wrap')) {
    fail('index.html aún muestra stub');
} else {
    ok('Stub visual eliminado');
}

if (str_contains($js, 'Stub PedNia') || str_contains($js, 'Stub de catálogo')) {
    fail('script.js aún es stub');
} else {
    ok('script.js implementado');
}

foreach ([
    'btn-empecemos',
    'pantalla-inicio',
    'texto_voz.js',
    'id="zona-piezas"',
    'id="figura"',
    'id="escenario"',
    'sweetalert',
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
    'iniciarReto',
    'elegir',
    'pintarPiezas',
    'pintarFigura',
    'pednia:perfil',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach (['.zona-piezas', '.pieza', '.figura', '.escenario'] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

echo "\n=== COMPLETA LA FIGURA: media ===\n";

$config = json_decode(file_get_contents($dir.'/config.json'), true);
if (! is_array($config)) {
    fail('config.json inválido');
    goto resumen;
}

$piezas = $config['piezas'] ?? [];

$imagenesConfig = [];
array_walk_recursive($config, function ($v) use (&$imagenesConfig) {
    if (is_string($v) && preg_match('#^img/.+\.(svg|png|gif|jpe?g|webp)$#i', $v)) {
        $imagenesConfig[$v] = true;
    }
});
foreach (array_keys($imagenesConfig) as $relImg) {
    if (! is_file($dir.'/'.$relImg)) {
        fail("Falta imagen {$relImg}");
    } else {
        ok("Imagen {$relImg}");
    }
}

foreach ([
    'images/correcto.gif',
    'images/incorrecto.gif',
    'images/victoria.gif',
    'images/nube.png',
    'sounds/ok.mp3',
    'sounds/over.mp3',
    'sounds/victory.mp3',
    'sounds/fondo.mp3',
    'texto_voz.js',
    'intro.json',
] as $m) {
    if (! is_file(public_path('catalogo_juegos/'.$m))) {
        fail("Media faltante: {$m}");
    } else {
        ok("Media OK: {$m}");
    }
}

echo "\n=== COMPLETA LA FIGURA: config.json ===\n";

if (! empty($config['stub'])) {
    fail('config aún con stub=true');
} else {
    ok('config sin stub');
}

// Documento: dos grupos (3-4 y 5-6 años).
$esperados = [
    '3' => ['retos' => 3, 'opciones' => 3],
    '5' => ['retos' => 3, 'opciones' => 5],
];

$ids = [];
foreach ($config['niveles'] ?? [] as $nivel) {
    $id = (string) ($nivel['id'] ?? '');
    $ids[] = $id;
    $esp = $esperados[$id] ?? null;
    if ($esp === null) {
        fail("Nivel id={$id} fuera de 3 (3-4 años) / 5 (5-6 años)");
        continue;
    }
    $retos = $nivel['retos'] ?? [];
    if (count($retos) !== $esp['retos']) {
        fail("Nivel {$id}: ".count($retos)." retos, esperado {$esp['retos']}");
    } else {
        ok("Nivel {$id}: {$esp['retos']} retos");
    }
    foreach ($retos as $ri => $reto) {
        $fig = $reto['figura'] ?? "#{$ri}";
        $ops = $reto['opciones'] ?? [];
        if (count($ops) !== $esp['opciones']) {
            fail("Nivel {$id} reto {$fig}: ".count($ops)." opciones, esperado {$esp['opciones']}");
        }
        $correcta = $reto['correcta'] ?? '';
        if ($correcta === '' || ! in_array($correcta, $ops, true)) {
            fail("Nivel {$id} reto {$fig}: la pieza correcta no está en opciones");
        }
        foreach ($ops as $p) {
            if (! isset($piezas[$p])) {
                fail("Nivel {$id} reto {$fig}: pieza desconocida {$p}");
            }
        }
        ok("Nivel {$id} reto {$fig}: OK");
    }
}

foreach (array_keys($esperados) as $idEsp) {
    if (! in_array((string) $idEsp, $ids, true)) {
        fail("Falta nivel id={$idEsp}");
    }
}

$conv = $config['textos']['conversacion'] ?? [];
if (! is_array($conv) || count($conv) < 1) {
    fail('conversacion vacía');
} else {
    ok('conversación en config ('.count($conv).' líneas)');
}

require __DIR__.'/barrido-multisensorial-shell.php';

echo "\n=== COMPLETA LA FIGURA: reglas (node) ===\n";

exec('node '.escapeshellarg(__DIR__.'/probar-completa-figura.js').' 2>&1', $salidaNode, $codigoNode);
$ultimaNode = trim((string) end($salidaNode));
if ($codigoNode !== 0) {
    fail("probar-completa-figura.js: {$ultimaNode}");
} else {
    ok("probar-completa-figura.js: {$ultimaNode}");
}

echo "\n=== COMPLETA LA FIGURA: BD (sin cambiar tipo) ===\n";

if (! Schema::hasTable('juegos')) {
    fail('Tabla juegos no existe');
    goto resumen;
}

$fila = DB::table('juegos')->where('slug', 'completa-la-figura')->first();
if (! $fila) {
    $fila = DB::table('juegos')->where('ruta', 'like', '%CompletaLaFigura%')->first();
}

if (! $fila) {
    fail('No hay fila en juegos para CompletaLaFigura (no se crea desde el barrido)');
    goto resumen;
}

ok("BD slug={$fila->slug} activo=".((int) $fila->activo));

$idx = public_path(trim($fila->ruta, '/').'/index.html');
if (! is_file($idx)) {
    fail('BD apunta a ruta sin index.html');
} else {
    ok('BD ruta ↔ disco OK');
}

if ((int) $fila->ambiente_id !== 9) {
    warn('ambiente_id='.$fila->ambiente_id.' (esperado 9 Multisensorial)');
} else {
    ok('ambiente_id Multisensorial');
}

resumen:
echo "\n========== RESUMEN COMPLETA LA FIGURA ==========\n";
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

echo "\nBarrido OK.\n";
exit(0);
