<?php

/**
 * Barrido: Busca las diferencias (Multisensorial).
 * Uso: php scripts/barrido-busca-las-diferencias.php
 *
 * No modifica tipo_juego_id (debe permanecer reconocimiento).
 */

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\TiposJuego;
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

$rel = 'Multisensorial/BuscaLasDiferencias';
$dir = public_path('catalogo_juegos/'.$rel);
$tipoEsperado = 'reconocimiento';

echo "=== BUSCA LAS DIFERENCIAS: filesystem ===\n";

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
    'id="zona-hotspots"',
    'id="img-izq"',
    'id="img-der"',
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
    'iniciarPartida',
    'resolverDiff',
    'pintarHotspots',
    'pednia:perfil',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach (['.par-imagenes', '.hotspot', '.zona-hotspots', '.hotspot.is-encontrada', '.escena-wrap'] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

echo "\n=== BUSCA LAS DIFERENCIAS: media ===\n";

$config = json_decode(file_get_contents($dir.'/config.json'), true);
if (! is_array($config)) {
    fail('config.json inválido');
    goto resumen;
}

$escena = $config['escena'] ?? [];
$izq = $escena['izquierda'] ?? '';
if ($izq === '' || ! is_file($dir.'/'.ltrim($izq, '/'))) {
    fail("Falta escena izquierda: {$izq}");
} else {
    ok("Escena izquierda OK");
}

$diffs = $config['diferencias'] ?? [];
foreach ($diffs as $id => $meta) {
    foreach (['x', 'y', 'w', 'h'] as $k) {
        if (! isset($meta[$k]) || ! is_numeric($meta[$k])) {
            fail("Diferencia {$id} sin {$k} numérico");
        }
    }
    ok("Hotspot {$id}");
}

echo "\n=== BUSCA LAS DIFERENCIAS: config.json ===\n";

if (! empty($config['stub'])) {
    fail('config aún con stub=true');
} else {
    ok('config sin stub');
}

$esperados = [
    '3' => 3,
    '4' => 4,
    '5' => 5,
];

$ids = [];
foreach ($config['niveles'] ?? [] as $nivel) {
    $id = (string) ($nivel['id'] ?? '');
    $ids[] = $id;
    $esp = $esperados[$id] ?? null;
    if ($esp === null) {
        warn("Nivel id={$id} fuera de 3/4/5");
        continue;
    }
    $lista = $nivel['diferencias'] ?? [];
    if (count($lista) !== $esp) {
        fail("Nivel {$id}: ".count($lista)." diferencias, esperado {$esp}");
    } else {
        ok("Nivel {$id}: {$esp} diferencias");
    }
    $der = $nivel['derecha'] ?? '';
    if ($der === '' || ! is_file($dir.'/'.ltrim($der, '/'))) {
        fail("Nivel {$id}: falta imagen derecha {$der}");
    } else {
        ok("Nivel {$id} derecha OK");
    }
    foreach ($lista as $d) {
        if (! isset($diffs[$d])) {
            fail("Nivel {$id}: diferencia desconocida {$d}");
        }
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

echo "\n=== BUSCA LAS DIFERENCIAS: BD (sin cambiar tipo) ===\n";

if (! Schema::hasTable('juegos')) {
    fail('Tabla juegos no existe');
    goto resumen;
}

$fila = DB::table('juegos')->where('slug', 'busca-las-diferencias')->first();
if (! $fila) {
    $fila = DB::table('juegos')->where('ruta', 'like', '%BuscaLasDiferencias%')->first();
}

if (! $fila) {
    fail('No hay fila en juegos para BuscaLasDiferencias (no se crea desde el barrido)');
    goto resumen;
}

$tipoSlug = null;
if (! empty($fila->tipo_juego_id) && Schema::hasTable('tipos_juegos')) {
    $tipoSlug = TiposJuego::query()->whereKey($fila->tipo_juego_id)->value('slug');
}

if ($tipoSlug !== $tipoEsperado) {
    fail('BD tipo='.($tipoSlug ?: 'null').", esperado {$tipoEsperado} (no se modifica)");
} else {
    ok("BD tipo={$tipoSlug} intacto (id={$fila->tipo_juego_id})");
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
echo "\n========== RESUMEN BUSCA LAS DIFERENCIAS ==========\n";
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
