<?php

/**
 * Barrido: Completa La Figura (Multisensorial).
 * Uso: php scripts/barrido-completa-la-figura.php
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

$rel = 'Multisensorial/CompletaLaFigura';
$dir = public_path('catalogo_juegos/'.$rel);
$tipoEsperado = 'reconocimiento';

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
    'id="figura-escena"',
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
    'iniciarConsigna',
    'resolverToque',
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

foreach (['.zona-piezas', '.pieza', '.figura-escena', '.pieza.is-acierto'] as $needle) {
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

$figuras = $config['figuras'] ?? [];
$piezas = $config['piezas'] ?? [];

foreach ($figuras as $id => $meta) {
    foreach (['base', 'completa'] as $campo) {
        $relImg = $meta[$campo] ?? '';
        if ($relImg === '' || ! is_file($dir.'/'.ltrim($relImg, '/'))) {
            fail("Falta figura {$id}.{$campo}: {$relImg}");
        } else {
            ok("Figura {$id}.{$campo}");
        }
    }
    $pc = $meta['piezaCorrecta'] ?? '';
    if ($pc === '' || ! isset($piezas[$pc])) {
        fail("Figura {$id}: piezaCorrecta inválida");
    } else {
        ok("Figura {$id} → pieza {$pc}");
    }
}

foreach ($piezas as $id => $meta) {
    $relImg = $meta['img'] ?? '';
    if ($relImg === '' || ! is_file($dir.'/'.ltrim($relImg, '/'))) {
        fail("Falta pieza {$id}: {$relImg}");
    } else {
        ok("Pieza {$id}");
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

$esperados = [
    '3' => ['retos' => 3, 'opciones' => 3],
    '4' => ['retos' => 3, 'opciones' => 4],
    '5' => ['retos' => 3, 'opciones' => 5],
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
    $retos = $nivel['retos'] ?? [];
    if (count($retos) !== $esp['retos']) {
        fail("Nivel {$id}: ".count($retos)." retos, esperado {$esp['retos']}");
    } else {
        ok("Nivel {$id}: {$esp['retos']} retos");
    }
    foreach ($retos as $ri => $reto) {
        $fig = $reto['figura'] ?? '';
        $ops = $reto['opciones'] ?? [];
        if (! isset($figuras[$fig])) {
            fail("Nivel {$id} reto {$ri}: figura desconocida {$fig}");
            continue;
        }
        if (count($ops) !== $esp['opciones']) {
            fail("Nivel {$id} reto {$fig}: ".count($ops)." opciones, esperado {$esp['opciones']}");
        }
        $correcta = $figuras[$fig]['piezaCorrecta'] ?? '';
        if (! in_array($correcta, $ops, true)) {
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
