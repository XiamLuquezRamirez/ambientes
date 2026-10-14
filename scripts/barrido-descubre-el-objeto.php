<?php

/**
 * Barrido: Descubre el objeto (Multisensorial).
 * Uso: php scripts/barrido-descubre-el-objeto.php
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

$rel = 'Multisensorial/DescubreElObjeto';
$dir = public_path('catalogo_juegos/'.$rel);
echo "=== DESCUBRE EL OBJETO: filesystem ===\n";

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
    'id="escena-cofre"',
    'id="escena-radar"',
    'id="radar-luces"',
    'id="radar-pantalla"',
    'id="escena-lab"',
    'id="ventana-polvo"',
    'id="ventana-hueco"',
    'id="btn-altavoz"',
    'id="tarjetas"',
    'id="pj-zoe"',
    'id="pj-zeus"',
    'id="dialogo"',
    'id="gran-final"',
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
    'decirPista',
    'encenderLuz',
    'marcarRadar',
    'abrirCofre',
    'repetirPista',
    'enlazarFrote',
    'ventanaLimpia',
    'aciertoVentana',
    'galeriaHallazgos',
    'granCierre',
    'pednia:perfil',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach (['.cofre', '.cerradura', '.amb-tiembla', '.amb-hojas', '.amb-reflejos', '.altavoz', '.radar-pantalla', '.luz.casi', '.ventana', '.ventana-polvo', '.tarjeta', '.repisa', '.trofeo.premio'] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

echo "\n=== DESCUBRE EL OBJETO: config.json ===\n";

$config = json_decode(file_get_contents($dir.'/config.json'), true);
if (! is_array($config)) {
    fail('config.json inválido');
    goto resumen;
}

if (! empty($config['stub'])) {
    fail('config aún con stub=true (el catálogo borraría la carpeta)');
} else {
    ok('config sin stub');
}

foreach ($config['objetos'] ?? [] as $id => $o) {
    if (empty($o['img']) || ! is_file($dir.'/'.$o['img'])) {
        fail("Objeto {$id}: falta imagen ".($o['img'] ?? ''));
    } else {
        ok("Objeto {$id}");
    }
}

$esperados = [
    '3' => ['3-4 años', 'cofre', [4, 4, 4]],
    '5' => ['5-6 años', 'radar', [4, 5, 3]],
];
$ids = [];
foreach ($config['niveles'] ?? [] as $nivel) {
    $id = (string) ($nivel['id'] ?? '');
    $ids[] = $id;
    if (! isset($esperados[$id])) {
        fail("Nivel id={$id} fuera de 3/5");
        continue;
    }
    [$edad, $escenario, $opciones] = $esperados[$id];
    if (($nivel['edad'] ?? '') !== $edad) {
        fail("Nivel {$id}: edad ".($nivel['edad'] ?? '?').", esperado {$edad}");
    }
    if (($nivel['escenario'] ?? '') !== $escenario) {
        fail("Nivel {$id}: escenario ".($nivel['escenario'] ?? '?').", esperado {$escenario}");
    } else {
        ok("Nivel {$id}: escenario {$escenario}");
    }
    $retos = $nivel['retos'] ?? [];
    $conteo = array_map(fn ($r) => count($r['opciones'] ?? []), $retos);
    if ($conteo !== $opciones) {
        fail("Nivel {$id}: opciones ".implode(',', $conteo).', esperado '.implode(',', $opciones));
    } else {
        ok("Nivel {$id}: opciones ".implode(', ', $opciones));
    }
    foreach ($retos as $r) {
        foreach ($r['opciones'] ?? [] as $o) {
            if (! isset($config['objetos'][$o])) {
                fail("Nivel {$id} reto {$r['id']}: objeto desconocido {$o}");
            }
        }
        if (! in_array($r['correcto'] ?? '', $r['opciones'] ?? [], true)) {
            fail("Nivel {$id} reto {$r['id']}: la respuesta no está entre las opciones");
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

echo "\n=== DESCUBRE EL OBJETO: BD (solo lectura) ===\n";

if (! Schema::hasTable('juegos')) {
    fail('Tabla juegos no existe');
    goto resumen;
}

$fila = DB::table('juegos')->where('ruta', 'like', '%DescubreElObjeto%')->first();

if (! $fila) {
    fail('No hay fila en juegos para DescubreElObjeto (no se crea desde el barrido)');
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
echo "\n========== RESUMEN DESCUBRE EL OBJETO ==========\n";
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
