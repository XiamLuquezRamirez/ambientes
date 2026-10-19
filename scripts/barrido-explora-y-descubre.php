<?php

/**
 * Barrido: Explora y descubre (Multisensorial).
 * Uso: php scripts/barrido-explora-y-descubre.php
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

$rel = 'Multisensorial/ExploraYDescubre';
$dir = public_path('catalogo_juegos/'.$rel);
echo "=== EXPLORA Y DESCUBRE: filesystem ===\n";

if (! is_dir($dir)) {
    fail("No existe {$rel}");
    goto resumen;
}

foreach (['index.html', 'style.css', 'script.js', 'config.json', 'logica.js', 'sfx.js', 'docs/requerimientos.md'] as $f) {
    if (! is_file($dir.'/'.$f)) {
        fail("Falta {$rel}/{$f}");
    } else {
        ok("Presente {$f}");
    }
}

$html = file_get_contents($dir.'/index.html');
$js = file_get_contents($dir.'/script.js');
$css = file_get_contents($dir.'/style.css');
$config = json_decode(file_get_contents($dir.'/config.json'), true);

if (str_contains($html, 'Paquete en construcción') || str_contains($html, 'stub-wrap')) {
    fail('index.html aún muestra stub');
} else {
    ok('Stub visual eliminado');
}

if (! empty($config['stub'])) {
    fail('config.json sigue en stub');
} else {
    ok('config sin stub');
}

$esperados = [
    '3' => ['3-4 años', 4, 'caja'],
    '5' => ['5-6 años', 4, 'radar'],
];
foreach ($config['niveles'] ?? [] as $nivel) {
    $id = (string) ($nivel['id'] ?? '');
    if (! isset($esperados[$id])) {
        fail("Nivel id={$id} fuera de 3/5");
        continue;
    }
    [$edad, $cant, $escena] = $esperados[$id];
    if (($nivel['edad'] ?? '') !== $edad) {
        fail("Nivel {$id}: edad inesperada");
    }
    if (($nivel['escena'] ?? '') !== $escena) {
        fail("Nivel {$id}: escena inesperada");
    } else {
        ok("Nivel {$id}: escena {$escena}");
    }
    $retos = $nivel['retos'] ?? [];
    if (count($retos) !== $cant) {
        fail("Nivel {$id}: ".count($retos)." retos, esperado {$cant}");
    } else {
        ok("Nivel {$id}: {$cant} retos");
    }
    $insignia = $nivel['insignia']['img'] ?? '';
    if (! $insignia || ! is_file($dir.'/'.$insignia)) {
        fail("Nivel {$id}: falta la insignia");
    } else {
        ok("Nivel {$id}: insignia");
    }
}

require __DIR__.'/barrido-multisensorial-shell.php';

echo "\n=== EXPLORA Y DESCUBRE: BD (solo lectura) ===\n";

if (! Schema::hasTable('juegos')) {
    fail('Tabla juegos no existe');
    goto resumen;
}

$fila = DB::table('juegos')->where('slug', 'explora-y-descubre')->first();

if (! $fila) {
    fail('No hay fila en juegos para explora-y-descubre (no se crea desde el barrido)');
    goto resumen;
}

ok('BD slug='.$fila->slug.' activo='.((int) $fila->activo));

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

if ((int) $fila->tematica_id !== 28) {
    warn('tematica_id='.$fila->tematica_id.' (esperado 28 Explora y descubre)');
} else {
    ok('tematica_id 28');
}

resumen:
echo "\n========== RESUMEN EXPLORA Y DESCUBRE ==========\n";
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
