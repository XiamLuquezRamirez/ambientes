<?php

/**
 * Barrido: Encuentra la textura (Multisensorial).
 * Uso: php scripts/barrido-encuentra-la-textura.php
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

$rel = 'Multisensorial/EncuentraLaTextura';
$dir = public_path('catalogo_juegos/'.$rel);
echo "=== ENCUENTRA LA TEXTURA: filesystem ===\n";

if (! is_dir($dir)) {
    fail("No existe {$rel}");
    goto resumen;
}

foreach (['index.html', 'style.css', 'script.js', 'config.json', 'logica.js', 'sfx.js'] as $f) {
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
    'id="muestras"',
    'id="almohadilla"',
    'id="cinta"',
    'id="objeto-central"',
    'id="bloque-ensayo"',
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
    'tocarMuestra',
    'elegir',
    'probarEnBloque',
    'usarFrote',
    'sumarRelleno',
    'golpesDelNino',
    'granCierre',
    'pednia:perfil',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach (['.muestra', '.almohadilla', '.cinta', '.bloque-ensayo', '.funda', '.tablero', '.hoja', '.trofeo.premio'] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

echo "\n=== ENCUENTRA LA TEXTURA: config.json ===\n";

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

foreach ($config['materiales'] ?? [] as $id => $m) {
    if (empty($m['img']) || ! is_file($dir.'/'.$m['img'])) {
        fail("Material {$id}: falta imagen ".($m['img'] ?? ''));
    } else {
        ok("Material {$id}");
    }
}

$esperados = ['3' => ['3-4 años', 3], '5' => ['5-6 años', 5]];
$ids = [];
foreach ($config['niveles'] ?? [] as $nivel) {
    $id = (string) ($nivel['id'] ?? '');
    $ids[] = $id;
    if (! isset($esperados[$id])) {
        fail("Nivel id={$id} fuera de 3/5");
        continue;
    }
    [$edad, $porReto] = $esperados[$id];
    if (($nivel['edad'] ?? '') !== $edad) {
        fail("Nivel {$id}: edad ".($nivel['edad'] ?? '?').", esperado {$edad}");
    }
    $retos = $nivel['retos'] ?? [];
    if (count($retos) !== 3) {
        fail("Nivel {$id}: ".count($retos).' retos, esperado 3');
    } else {
        ok("Nivel {$id}: 3 retos");
    }
    foreach ($retos as $r) {
        $muestras = $r['muestras'] ?? [];
        if (count($muestras) !== $porReto) {
            fail("Nivel {$id} reto {$r['id']}: ".count($muestras)." muestras, esperado {$porReto}");
        }
        if (! in_array($r['correcta'] ?? '', $muestras, true)) {
            fail("Nivel {$id} reto {$r['id']}: la correcta no está entre las muestras");
        }
        foreach ($muestras as $m) {
            if (! isset($config['materiales'][$m])) {
                fail("Nivel {$id} reto {$r['id']}: material desconocido {$m}");
            }
        }
    }
    if (empty($nivel['premio']['nombre'])) {
        fail("Nivel {$id}: sin medalla");
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

echo "\n=== ENCUENTRA LA TEXTURA: BD (sin cambiar tipo) ===\n";

if (! Schema::hasTable('juegos')) {
    fail('Tabla juegos no existe');
    goto resumen;
}

$fila = DB::table('juegos')->where('slug', 'encuentra-la-textura')->first();
if (! $fila) {
    $fila = DB::table('juegos')->where('ruta', 'like', '%EncuentraLaTextura%')->first();
}

if (! $fila) {
    fail('No hay fila en juegos para EncuentraLaTextura (no se crea desde el barrido)');
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
echo "\n========== RESUMEN ENCUENTRA LA TEXTURA ==========\n";
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
