<?php

/**
 * Barrido: Sigue el ritmo (EA) — 6 juegos.
 * Uso: php scripts/barrido-sigue-el-ritmo.php
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

$juegos = [
    ['carpeta' => 'ElLatidoDelTambor', 'slug' => 'el-latido-del-tambor', 'reto' => 'pulso', 'edad' => '3-4 años'],
    ['carpeta' => 'AplausosAlCompas', 'slug' => 'aplausos-al-compas', 'reto' => 'aplausos', 'edad' => '3-4 años'],
    ['carpeta' => 'DosGolpesYUnaPausa', 'slug' => 'dos-golpes-y-una-pausa', 'reto' => 'pasos', 'edad' => '3-4 años'],
    ['carpeta' => 'PalmadaYTambor', 'slug' => 'palmada-y-tambor', 'reto' => 'buho', 'edad' => '5-6 años'],
    ['carpeta' => 'LosGrandesInstrumentos', 'slug' => 'los-grandes-instrumentos', 'reto' => 'instrumentos', 'edad' => '5-6 años'],
    ['carpeta' => 'MemoriaYCoordinacion', 'slug' => 'memoria-y-coordinacion', 'reto' => 'bateria', 'edad' => '5-6 años'],
];

echo "=== SIGUE EL RITMO (EA): 6 paquetes ===\n";

if (is_file(public_path('catalogo_juegos/ExpresionArtistica/SigueElRitmo/config.json'))) {
    fail('Queda un paquete plano en SigueElRitmo/');
}

foreach ($juegos as $meta) {
    $rel = 'ExpresionArtistica/SigueElRitmo/'.$meta['carpeta'];
    $dir = public_path('catalogo_juegos/'.$rel);
    echo "\n--- {$meta['carpeta']} ---\n";

    if (! is_dir($dir)) {
        fail("No existe {$rel}");
        continue;
    }

    foreach (['index.html', 'style.css', 'script.js', 'config.json', 'logica.js', 'sfx.js'] as $f) {
        if (! is_file($dir.'/'.$f)) {
            fail("Falta {$f}");
        } else {
            ok("Presente {$f}");
        }
    }

    $config = json_decode((string) file_get_contents($dir.'/config.json'), true);
    $nivel = ($config['niveles'] ?? [])[0] ?? [];
    $reto = ($nivel['retos'] ?? [])[0] ?? [];

    if (count($config['niveles'] ?? []) !== 1) {
        fail('debe tener 1 nivel');
    } else {
        ok('1 nivel');
    }
    if (($nivel['edad'] ?? '') !== $meta['edad']) {
        fail('edad');
    } else {
        ok('edad');
    }
    if (($reto['id'] ?? '') !== $meta['reto']) {
        fail('reto');
    } else {
        ok('reto '.$meta['reto']);
    }

    if (! Schema::hasTable('juegos')) {
        continue;
    }

    $fila = DB::table('juegos')->where('slug', $meta['slug'])->first();
    if (! $fila || ! (int) $fila->activo) {
        fail('BD '.$meta['slug']);
    } else {
        ok('BD activo');
    }
    if ((int) ($fila->tematica_id ?? 0) !== 50) {
        fail('temática');
    } else {
        ok('temática 50');
    }
    if (($fila->ruta ?? '') !== 'catalogo_juegos/'.$rel) {
        fail('ruta');
    } else {
        ok('ruta');
    }
}

if (Schema::hasTable('juegos')) {
    echo "\n=== Legacy ===\n";
    if (DB::table('juegos')->where('slug', 'sigue-el-ritmo')->exists()) {
        fail('sigue-el-ritmo sigue en BD');
    } else {
        ok('sin slug único');
    }
    $tem = DB::table('tematicas')->where('id', 50)->first();
    if (! $tem || ! (int) $tem->activo) {
        fail('temática 50');
    } else {
        ok('temática 50: '.$tem->nombre);
    }
}

echo "\n========== RESUMEN ==========\n";
echo 'OK: '.count($oks).' FAIL: '.count($fallos)."\n";
if ($fallos) {
    echo implode("\n", $fallos)."\n";
    exit(1);
}
echo "Barrido OK.\n";
exit(0);
