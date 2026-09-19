<?php

/**
 * Barrido: Arrastrar y soltar objetos (Polimotor).
 * Uso: php scripts/barrido-arrastrar-soltar.php
 */

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

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

$rel = 'Polimotor/ArrastrarYSoltarObjetos';
$dir = public_path('catalogo_juegos/'.$rel);

echo "=== ARRASTRAR Y SOLTAR: filesystem ===\n";

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

foreach ([
    'btn-empecemos',
    'pantalla-inicio',
    'texto_voz.js',
    'id="zona-destinos"',
    'id="zona-objetos"',
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
    'iniciarRonda',
    'resolverSoltar',
    'pointerdown',
    'pednia:perfil',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach (['.zona-destinos', '.zona-objetos', '.destino', '.objeto', '.objeto-drag-proxy'] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

echo "\n=== ARRASTRAR Y SOLTAR: media ===\n";

$pngs = [
    'FONDO', 'MANZANA', 'TALADRO', 'PATO',
    'CAJA_MANZANA', 'CAJA_HERRAMIENTAS', 'CAJA_JUGUETES', 'CAJA_ROPA', 'CAJA_ALIMENTOS',
];
foreach ($pngs as $s) {
    $p = $dir.'/img/'.$s.'.png';
    if (! is_file($p)) {
        fail("Falta img/{$s}.png");
    } else {
        ok("PNG {$s}");
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
] as $m) {
    if (! is_file(public_path('catalogo_juegos/'.$m))) {
        fail("Media faltante: {$m}");
    } else {
        ok("Media OK: {$m}");
    }
}

echo "\n=== ARRASTRAR Y SOLTAR: config.json ===\n";

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

$pares = $config['pares'] ?? [];
$objetos = $config['objetos'] ?? [];
$destinos = $config['destinos'] ?? [];

foreach (['manzana', 'taladro', 'pato'] as $obj) {
    if (empty($objetos[$obj]['img'])) {
        fail("objeto {$obj} sin img");
    } elseif (! is_file($dir.'/'.ltrim($objetos[$obj]['img'], '/'))) {
        fail("objeto {$obj} img no existe en disco");
    } else {
        ok("objeto {$obj} OK");
    }
    $dest = $pares[$obj] ?? null;
    if (! $dest || empty($destinos[$dest]['img'])) {
        fail("par {$obj} → destino inválido");
    } else {
        ok("par {$obj} → {$dest}");
    }
}

foreach (['caja_ropa', 'caja_alimentos'] as $d) {
    if (empty($destinos[$d]['img'])) {
        fail("destino distractor {$d} sin img");
    } else {
        ok("distractor {$d} OK");
    }
}

$esperados = ['3' => 1, '4' => 2, '5' => 3];
$ids = [];
foreach ($config['niveles'] ?? [] as $nivel) {
    $id = (string) ($nivel['id'] ?? '');
    $ids[] = $id;
    $esp = $esperados[$id] ?? null;
    if ($esp === null) {
        warn("Nivel id={$id} fuera de 3/4/5");
        continue;
    }
    $rondas = (int) ($nivel['rondas'] ?? 0);
    if ($rondas !== $esp) {
        fail("Nivel {$id}: se esperan {$esp} rondas, hay {$rondas}");
    } else {
        ok("Nivel {$id}: {$rondas} rondas, destinos=".count($nivel['destinos'] ?? []));
    }
    foreach ($nivel['objetos'] ?? [] as $o) {
        if (! isset($objetos[$o]) || ! isset($pares[$o])) {
            fail("Nivel {$id}: objeto desconocido {$o}");
        }
    }
    foreach ($nivel['destinos'] ?? [] as $d) {
        if (! isset($destinos[$d])) {
            fail("Nivel {$id}: destino desconocido {$d}");
        }
    }
}

foreach (array_keys($esperados) as $idEsp) {
    if (! in_array((string) $idEsp, $ids, true)) {
        fail("Falta nivel id={$idEsp}");
    }
}

$tipos = \App\Models\Juego::tiposCatalogo();
if (isset($tipos['arrastrar'])) {
    ok('tipos_juegos incluye arrastrar');
} else {
    fail('tipos_juegos sin arrastrar');
}

echo "\n=== ARRASTRAR Y SOLTAR: BD ===\n";

if (\Illuminate\Support\Facades\Schema::hasTable('juegos')) {
    $fila = \Illuminate\Support\Facades\DB::table('juegos')
        ->where('ruta', 'like', '%ArrastrarYSoltarObjetos%')
        ->first();
    if (! $fila) {
        fail('No hay fila en juegos para ArrastrarYSoltarObjetos');
    } else {
        $tipoSlug = null;
        if (! empty($fila->tipo_juego_id) && \Illuminate\Support\Facades\Schema::hasTable('tipos_juegos')) {
            $tipoSlug = \App\Models\TiposJuego::query()->whereKey($fila->tipo_juego_id)->value('slug');
        }
        if ($tipoSlug !== 'arrastrar') {
            fail('BD tipo='.($tipoSlug ?: 'null').', esperado arrastrar');
        } else {
            ok("BD slug={$fila->slug} activo=".((int) $fila->activo)." tipo={$tipoSlug}");
        }
        $idx = public_path(trim($fila->ruta, '/').'/index.html');
        if (! is_file($idx)) {
            fail('BD apunta a ruta sin index.html');
        } else {
            ok('BD ruta ↔ disco OK');
        }
    }
} else {
    fail('Tabla juegos no existe');
}

resumen:
echo "\n========== RESUMEN ARRASTRAR Y SOLTAR ==========\n";
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

echo "\nBarrido Arrastrar y soltar sin fallos.\n";
exit(0);
