<?php

/**
 * Barrido: Encuentra la pareja (Multisensorial).
 * Uso: php scripts/barrido-encuentra-la-pareja.php
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

$rel = 'Multisensorial/EncuentraLaPareja';
$dir = public_path('catalogo_juegos/'.$rel);
echo "=== ENCUENTRA LA PAREJA: filesystem ===\n";

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

if (str_contains($html, 'Paquete en construcción') || str_contains($html, 'stub-wrap')) {
    fail('index.html aún muestra stub');
} else {
    ok('Stub visual eliminado');
}

foreach ([
    'btn-empecemos',
    'pantalla-inicio',
    'texto_voz.js',
    'edad-nivel.js',
    'logica.js',
    'sfx.js',
    'id="estimulo"',
    'id="opciones"',
    'id="area-organos"',
    'id="tablero-sensorial"',
    'id="cable"',
    'id="progreso"',
    'id="pj-zoe"',
    'id="pj-zeus"',
    'id="dialogo"',
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
    'mostrarEstimulo',
    'responderAcierto',
    'pista.gen',
    'tablero-sensorial',
    'laboratorio-sensorial',
    'prepararInsignia',
    'hablarCierre',
    'granCierre',
    'pednia:perfil',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach (['.estimulo', '.area-organos', '.opcion', '.cable', '.tablero-sensorial', 'body.laboratorio-sensorial', '.trofeo.insignia'] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

echo "\n=== ENCUENTRA LA PAREJA: config.json ===\n";

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

foreach ($config['elementos'] ?? [] as $id => $e) {
    $img = $e['img'] ?? '';
    if (! $img || ! is_file($dir.'/'.$img)) {
        fail("Elemento {$id}: falta imagen {$img}");
    } else {
        ok("Elemento {$id}");
    }
}

$esperados = [
    '3' => ['3-4 años', 4, 4],
    '5' => ['5-6 años', 4, 5],
];
$ids = [];
foreach ($config['niveles'] ?? [] as $nivel) {
    $id = (string) ($nivel['id'] ?? '');
    $ids[] = $id;
    if (! isset($esperados[$id])) {
        fail("Nivel id={$id} fuera de 3/5");
        continue;
    }
    [$edad, $cant, $ops] = $esperados[$id];
    if (($nivel['edad'] ?? '') !== $edad) {
        fail("Nivel {$id}: edad inesperada");
    }
    $retos = $nivel['retos'] ?? [];
    if (count($retos) !== $cant) {
        fail("Nivel {$id}: ".count($retos)." retos, esperado {$cant}");
    } else {
        ok("Nivel {$id}: {$cant} retos");
    }
    foreach ($retos as $r) {
        if (count($r['opciones'] ?? []) !== $ops) {
            fail("Nivel {$id} reto {$r['id']}: opciones");
        }
        if (! in_array($r['correcto'] ?? '', $r['opciones'] ?? [], true)) {
            fail("Nivel {$id} reto {$r['id']}: correcta fuera");
        }
    }
    $insignia = $nivel['insignia']['img'] ?? '';
    if (! $insignia || ! is_file($dir.'/'.$insignia)) {
        fail("Nivel {$id}: falta la insignia");
    } else {
        ok("Nivel {$id}: insignia");
    }
}

require __DIR__.'/barrido-multisensorial-shell.php';

echo "\n=== ENCUENTRA LA PAREJA: BD (solo lectura) ===\n";

if (! Schema::hasTable('juegos')) {
    fail('Tabla juegos no existe');
    goto resumen;
}

$fila = DB::table('juegos')->where('ruta', 'like', '%EncuentraLaPareja%')->first();

if (! $fila) {
    fail('No hay fila en juegos para EncuentraLaPareja (no se crea desde el barrido)');
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
echo "\n========== RESUMEN ENCUENTRA LA PAREJA ==========\n";
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
