<?php

/**
 * Barrido: Descubre el instrumento (EA) — 7 juegos.
 * Uso: php scripts/barrido-descubre-el-instrumento.php
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

$juegos = [
    ['carpeta' => 'ElTambor', 'slug' => 'el-tambor', 'reto' => 'caja-sorpresa', 'edad' => '3-4 años'],
    ['carpeta' => 'LaGuitarra', 'slug' => 'la-guitarra', 'reto' => 'cuerdas', 'edad' => '3-4 años'],
    ['carpeta' => 'LaFlautaMagica', 'slug' => 'la-flauta-magica', 'reto' => 'flauta-magica', 'edad' => '3-4 años'],
    ['carpeta' => 'GuardarLosInstrumentos', 'slug' => 'guardar-los-instrumentos', 'reto' => 'estuches', 'edad' => '3-4 años'],
    ['carpeta' => 'CuerdaVientoYPercusion', 'slug' => 'cuerda-viento-y-percusion', 'reto' => 'orquesta', 'edad' => '5-6 años'],
    ['carpeta' => 'AgudoVsGrave', 'slug' => 'agudo-vs-grave', 'reto' => 'duelo', 'edad' => '5-6 años'],
    ['carpeta' => 'DirectorDeOrquesta', 'slug' => 'director-de-orquesta', 'reto' => 'director', 'edad' => '5-6 años'],
];

echo "=== DESCUBRE EL INSTRUMENTO (EA): 7 paquetes ===\n";

if (is_file(public_path('catalogo_juegos/ExpresionArtistica/DescubreElInstrumento/config.json'))) {
    fail('Queda un paquete plano en DescubreElInstrumento/');
}

foreach ($juegos as $meta) {
    $rel = 'ExpresionArtistica/DescubreElInstrumento/'.$meta['carpeta'];
    $dir = public_path('catalogo_juegos/'.$rel);
    echo "\n--- {$meta['carpeta']} ---\n";

    if (! is_dir($dir)) {
        fail("No existe {$rel}");
        continue;
    }

    foreach (['index.html', 'style.css', 'script.js', 'config.json', 'logica.js', 'sfx.js', 'docs/requerimientos.md'] as $f) {
        if (! is_file($dir.'/'.$f)) {
            fail("Falta {$rel}/{$f}");
        } else {
            ok("Presente {$f}");
        }
    }

    $config = json_decode((string) file_get_contents($dir.'/config.json'), true);
    if (! is_array($config)) {
        fail("config inválido en {$rel}");
        continue;
    }

    $niveles = $config['niveles'] ?? [];
    if (count($niveles) !== 1) {
        fail("{$rel}: debe tener 1 nivel");
    } else {
        ok('1 nivel');
    }

    $nivel = $niveles[0] ?? [];
    if (($nivel['edad'] ?? '') !== $meta['edad']) {
        fail("{$rel}: edad esperada {$meta['edad']}");
    } else {
        ok('edad '.$meta['edad']);
    }

    $retos = $nivel['retos'] ?? [];
    if (count($retos) !== 1 || ($retos[0]['id'] ?? '') !== $meta['reto']) {
        fail("{$rel}: debe tener solo el reto {$meta['reto']}");
    } else {
        ok('reto '.$meta['reto']);
    }

    if (empty($nivel['cierre']) || empty($nivel['insignia']['img'])) {
        fail("{$rel}: falta cierre/insignia");
    } else {
        ok('cierre e insignia');
    }

    if (! Schema::hasTable('juegos')) {
        continue;
    }

    $fila = DB::table('juegos')->where('slug', $meta['slug'])->first();
    if (! $fila) {
        fail("BD: falta {$meta['slug']}");
        continue;
    }
    if (! (int) $fila->activo) {
        fail("BD: {$meta['slug']} inactivo");
    } else {
        ok("BD {$meta['slug']} activo");
    }
    if ((int) $fila->tematica_id !== 49) {
        fail("BD: {$meta['slug']} tematica_id={$fila->tematica_id}, esperado 49");
    } else {
        ok('temática 49');
    }
    if ($fila->ruta !== 'catalogo_juegos/'.$rel) {
        fail("BD ruta: {$fila->ruta}");
    } else {
        ok('ruta ok');
    }
}

if (Schema::hasTable('juegos')) {
    echo "\n=== Legacy ===\n";
    if (DB::table('juegos')->where('slug', 'descubre-el-instrumento')->exists()) {
        fail('slug descubre-el-instrumento sigue en BD');
    } else {
        ok('sin slug único legacy');
    }
    $tem = DB::table('tematicas')->where('id', 49)->first();
    if (! $tem || ! (int) $tem->activo) {
        fail('temática 49 ausente o inactiva');
    } else {
        ok('temática 49: '.$tem->nombre);
    }
}

echo "\n========== RESUMEN DESCUBRE EL INSTRUMENTO ==========\n";
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
