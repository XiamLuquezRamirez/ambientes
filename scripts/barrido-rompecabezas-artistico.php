<?php

/**
 * Barrido: Rompecabezas artistico (Expresion Artistica).
 * Uso: php scripts/barrido-rompecabezas-artistico.php
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

$rel = 'ExpresionArtistica/RompecabezasArtistico';
$dir = public_path('catalogo_juegos/'.$rel);
echo "=== ROMPECABEZAS ARTISTICO: filesystem ===\n";

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

if (str_contains($html, 'Paquete en construcción') || str_contains($js, 'Stub de catálogo')) {
    fail('El paquete sigue en stub');
} else {
    ok('Stub eliminado');
}

foreach ([
    'btn-empecemos', 'texto_voz.js', 'edad-nivel.js', 'logica.js', 'sfx.js',
    'id="estacion"', 'id="concierto"', 'id="pj-zoe"', 'id="dialogo"', 'sweetalert',
] as $needle) {
    if (! str_contains($html, $needle)) {
        fail("index.html sin '{$needle}'");
    } else {
        ok("HTML tiene {$needle}");
    }
}

foreach ([
    'retoPuzzle', 'evaluarEncaje', 'mezclar', 'mostrarCierre', 'granCierre',
    'guia-color', 'sonrie', 'eleva', 'casita-viva', 'pednia:perfil',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach ([
    '.tema-caballete', '.tema-taller', '.hueco .guia', '.hueco .guia-color',
    '.lienzo.sonrie', '.lienzo.eleva', '.lienzo.casita-viva', '.lienzo.arco-lleno', '.trofeo.insignia',
] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

if (preg_match('/\.destello\b/', $css)) {
    fail('style.css define .destello y choca con final.css');
} else {
    ok('CSS sin .destello');
}

echo "\n=== ROMPECABEZAS ARTISTICO: config.json ===\n";
$config = json_decode(file_get_contents($dir.'/config.json'), true);
if (! is_array($config) || ! empty($config['stub'])) {
    fail('config.json invalido o en stub');
    goto resumen;
}
ok('config sin stub');

foreach ($config['elementos'] ?? [] as $id => $e) {
    if (empty($e['img']) || ! is_file($dir.'/'.$e['img'])) {
        fail("Elemento {$id}: falta imagen");
    } else {
        ok("Elemento {$id}");
    }
}
foreach ($config['escenas'] ?? [] as $id => $img) {
    if (! is_file($dir.'/'.$img)) {
        fail("Escena {$id} falta");
    } else {
        ok("Escena {$id}");
    }
}

$esperados = [
    '3' => ['3-4 años', 'caballete', ['encaje', 'encaje', 'color', 'encaje']],
    '5' => ['5-6 años', 'taller', ['giro', 'encaje', 'encaje', 'encaje']],
];
foreach ($config['niveles'] ?? [] as $nivel) {
    $id = (string) ($nivel['id'] ?? '');
    if (! isset($esperados[$id])) {
        fail("Nivel {$id} inesperado");
        continue;
    }
    [$edad, $tema, $tipos] = $esperados[$id];
    $reales = array_map(fn ($r) => $r['tipo'] ?? '?', $nivel['retos'] ?? []);
    if (($nivel['edad'] ?? '') !== $edad || ($nivel['tema'] ?? '') !== $tema || $reales !== $tipos) {
        fail("Nivel {$id} no coincide");
    } else {
        ok("Nivel {$id}");
    }
    if (empty($nivel['insignia']['img']) || ! is_file($dir.'/'.$nivel['insignia']['img'])) {
        fail("Nivel {$id}: sin medalla");
    } else {
        ok("Medalla nivel {$id}");
    }
}

if (empty($config['audios']['sonidos'])) {
    warn('Sin grabaciones: el iman, las notas y los festejos son sintetizados (provisionales)');
}

require __DIR__.'/barrido-multisensorial-shell.php';

echo "\n=== ROMPECABEZAS ARTISTICO: BD ===\n";
if (! Schema::hasTable('juegos')) {
    fail('Tabla juegos no existe');
    goto resumen;
}
$fila = DB::table('juegos')->where('ruta', 'catalogo_juegos/'.$rel)->first();
if (! $fila) {
    fail("No hay fila en juegos para catalogo_juegos/{$rel}");
    goto resumen;
}
ok("BD slug={$fila->slug} activo=".((int) $fila->activo));
$ambiente = DB::table('ambientes')->where('id', $fila->ambiente_id)->value('slug');
if ($ambiente !== 'expresion-artistica') {
    warn('ambiente '.($ambiente ?? '?'));
} else {
    ok('ambiente Expresion Artistica');
}

resumen:
echo "\n========== RESUMEN ROMPECABEZAS ARTISTICO ==========\n";
echo 'OK: '.count($oks)."\nWARN: ".count($avisos)."\nFAIL: ".count($fallos)."\n";
if ($avisos) {
    echo "\nAvisos:\n - ".implode("\n - ", $avisos)."\n";
}
if ($fallos) {
    echo "\nFallos:\n - ".implode("\n - ", $fallos)."\n";
    exit(1);
}
echo "\nBarrido OK.\n";
exit(0);
