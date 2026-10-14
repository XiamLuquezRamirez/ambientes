<?php

/**
 * Barrido: Busca las diferencias (Multisensorial).
 * Uso: php scripts/barrido-busca-las-diferencias.php
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

$rel = 'Multisensorial/BuscaLasDiferencias';
$dir = public_path('catalogo_juegos/'.$rel);
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
    'sweetalert',
    'id="escena-A"',
    'id="escena-B"',
    'id="frame-A"',
    'id="frame-B"',
    'id="hallazgos"',
    'id="capa-efectos"',
    'logica.js',
    'sfx.js',
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
    'responder',
    'moverLupa',
    'deslizarBsobreA',
    'gameConfig.demo',
    'pednia:perfil',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach (['.par-imagenes', '.escena-wrap', '.lupa', '.marca', '.ranura'] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

echo "\n=== BUSCA LAS DIFERENCIAS: config.json y media ===\n";

$config = json_decode(file_get_contents($dir.'/config.json'), true);
if (! is_array($config)) {
    fail('config.json inválido');
    goto resumen;
}

$imagenes = [];
foreach ($config['escenas'] ?? [] as $nombre => $esc) {
    $imagenes[] = $esc['fondo'] ?? '';
    foreach ($esc['elementos'] ?? [] as $idEl => $el) {
        $imagenes[] = $el['img'] ?? '';
        foreach (['x', 'y', 'w', 'h'] as $k) {
            if (! isset($el[$k]) || ! is_numeric($el[$k])) {
                fail("Escena {$nombre}: {$idEl} sin {$k} numérico");
            }
        }
    }
}

$esperados = ['3' => 3, '5' => 4];
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
    if (count($retos) !== $esp) {
        fail("Nivel {$id}: ".count($retos)." retos, esperado {$esp}");
    } else {
        ok("Nivel {$id}: {$esp} retos");
    }
    if (! isset($config['escenas'][$nivel['escena'] ?? ''])) {
        fail("Nivel {$id}: escena inexistente");
    }
    foreach ($retos as $r) {
        foreach ($r['cambiosB'] ?? [] as $img) {
            if ($img) {
                $imagenes[] = $img;
            }
        }
    }
}

foreach (array_keys($esperados) as $idEsp) {
    if (! in_array((string) $idEsp, $ids, true)) {
        fail("Falta nivel id={$idEsp}");
    }
}

foreach (array_unique(array_filter($imagenes)) as $img) {
    if (! is_file($dir.'/'.ltrim($img, '/'))) {
        fail("Falta imagen {$img}");
    } else {
        ok("Imagen {$img}");
    }
}

$demoEscena = $config['demo']['escena'] ?? '';
$escenasNiveles = array_map(fn ($n) => $n['escena'] ?? '', $config['niveles'] ?? []);
if ($demoEscena === '' || ! isset($config['escenas'][$demoEscena])) {
    fail('Demo sin escena propia');
} elseif (in_array($demoEscena, $escenasNiveles, true)) {
    fail('La demo usa la escena de un nivel (revelaría una respuesta)');
} else {
    ok("Demo con escena propia ({$demoEscena})");
}

$conv = $config['textos']['conversacion'] ?? [];
if (! is_array($conv) || count($conv) < 1) {
    fail('conversacion vacía');
} else {
    ok('conversación en config ('.count($conv).' líneas)');
}

require __DIR__.'/barrido-multisensorial-shell.php';

echo "\n=== BUSCA LAS DIFERENCIAS: reglas (node) ===\n";

exec('node '.escapeshellarg(__DIR__.'/probar-busca-diferencias.js').' 2>&1', $salidaNode, $codigoNode);
$ultimaNode = trim((string) end($salidaNode));
if ($codigoNode !== 0) {
    fail("probar-busca-diferencias.js: {$ultimaNode}");
} else {
    ok("probar-busca-diferencias.js: {$ultimaNode}");
}

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
