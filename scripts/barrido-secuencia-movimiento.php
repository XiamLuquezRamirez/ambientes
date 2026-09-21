<?php

/**
 * Barrido: Secuencia de movimiento (Polimotor).
 * Uso: php scripts/barrido-secuencia-movimiento.php
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

$rel = 'Polimotor/SecuenciaDeMovimiento';
$dir = public_path('catalogo_juegos/'.$rel);

echo "=== SECUENCIA MOVIMIENTO: filesystem ===\n";

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
    'id="riel"',
    'id="opciones"',
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
    'iniciarRetoActual',
    'reproducirSecuencia',
    'resolverRespuesta',
    'pednia:perfil',
    'encolarFrases',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach (['.riel', '.slot-pose', '.tarjeta-opcion', 'entradaIzquierda'] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

echo "\n=== SECUENCIA MOVIMIENTO: media (reusa Memoria Corporal) ===\n";

$movIds = [
    'manos_arriba', 'manos_abajo', 'tocar_cabeza', 'tocar_barriga',
    'tocar_hombros', 'tocar_rodillas', 'abrir_brazos', 'manos_al_frente',
];
$memBase = public_path('catalogo_juegos/Polimotor/MemoriaCorporal/img');
foreach (['nina', 'nino'] as $cuerpo) {
    foreach ($movIds as $s) {
        $p = $memBase.'/'.$cuerpo.'/'.$s.'.png';
        if (! is_file($p)) {
            fail("Falta MemoriaCorporal/img/{$cuerpo}/{$s}.png");
        } else {
            ok("PNG Memoria {$cuerpo}/{$s}");
        }
    }
}

$svgDir = $dir.'/img';
if (is_dir($svgDir)) {
    $svgsRestantes = glob($svgDir.'/*.svg') ?: [];
    if ($svgsRestantes) {
        warn('Quedan SVG locales en img/ ('.count($svgsRestantes).'); el juego ya no los usa');
    } else {
        ok('Sin SVG locales propios (reusa Memoria)');
    }
}

foreach ([
    'images/correcto.gif',
    'images/incorrecto.gif',
    'images/victoria.gif',
    'images/nube.png',
    'images/zeus_normal.gif',
    'images/zeus_hablando.gif',
    'images/zoe_normal.gif',
    'images/zoe_hablando.gif',
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

echo "\n=== SECUENCIA MOVIMIENTO: config.json ===\n";

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

$movs = $config['movimientos'] ?? [];
foreach ($movIds as $s) {
    if (empty($movs[$s]['archivo']) && empty($movs[$s]['img'])) {
        fail("movimientos.{$s} sin archivo/img");
    }
}
ok('Catálogo de movimientos completo ('.count($movIds).')');

$cuerpos = $config['cuerpos'] ?? [];
foreach (['nina', 'nino'] as $cuerpo) {
    $carpeta = (string) ($cuerpos[$cuerpo]['carpeta'] ?? '');
    if ($carpeta === '' || ! str_contains($carpeta, 'MemoriaCorporal')) {
        fail("cuerpos.{$cuerpo}.carpeta debe apuntar a MemoriaCorporal");
    } else {
        ok("cuerpos.{$cuerpo} → {$carpeta}");
    }
}

$esperados = [
    '3' => 3,
    '4' => 3,
    '5' => 4,
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
    if (count($retos) !== $esp) {
        fail("Nivel {$id}: se esperan {$esp} retos, hay ".count($retos));
    } else {
        ok("Nivel {$id}: ".count($retos).' retos');
    }
    foreach ($retos as $i => $reto) {
        $n = $i + 1;
        if (empty($reto['prefijo']) || ! is_array($reto['prefijo'])) {
            fail("Nivel {$id} reto {$n}: falta prefijo");
            continue;
        }
        if (empty($reto['correcta'])) {
            fail("Nivel {$id} reto {$n}: falta correcta");
            continue;
        }
        if (! isset($movs[$reto['correcta']])) {
            fail("Nivel {$id} reto {$n}: correcta desconocida {$reto['correcta']}");
        }
        foreach ($reto['prefijo'] as $p) {
            if (! isset($movs[$p])) {
                fail("Nivel {$id} reto {$n}: prefijo desconocido {$p}");
            }
        }
        foreach ($reto['distractores'] ?? [] as $d) {
            if (! isset($movs[$d])) {
                fail("Nivel {$id} reto {$n}: distractor desconocido {$d}");
            }
            if ($d === $reto['correcta']) {
                fail("Nivel {$id} reto {$n}: distractor = correcta");
            }
        }
        ok("Nivel {$id} reto {$n}: prefijo=".count($reto['prefijo']).' opts='.(1 + count($reto['distractores'] ?? [])));
    }
}

foreach (array_keys($esperados) as $idEsp) {
    if (! in_array((string) $idEsp, $ids, true)) {
        fail("Falta nivel id={$idEsp}");
    }
}

$intro = json_decode(file_get_contents(public_path('catalogo_juegos/intro.json')), true);
if (! is_array($intro) || empty($intro['personajes']) || count($intro['personajes']) < 2) {
    fail('intro.json compartido incompleto');
} else {
    ok('intro.json compartido ('.count($intro['personajes']).' personajes)');
}
$conv = $config['textos']['conversacion'] ?? [];
if (! is_array($conv) || count($conv) < 1) {
    fail('config.textos.conversacion vacío');
} else {
    ok('conversación en config ('.count($conv).' líneas)');
}

$tipos = \App\Models\Juego::tiposCatalogo();
if (isset($tipos['secuencia_movimiento'])) {
    ok('tipos_juegos incluye secuencia_movimiento');
} else {
    fail('tipos_juegos sin secuencia_movimiento');
}

echo "\n=== SECUENCIA MOVIMIENTO: BD ===\n";

if (\Illuminate\Support\Facades\Schema::hasTable('juegos')) {
    $fila = \Illuminate\Support\Facades\DB::table('juegos')
        ->where('ruta', 'like', '%SecuenciaDeMovimiento%')
        ->first();
    if (! $fila) {
        warn('No hay fila en juegos para SecuenciaDeMovimiento');
    } else {
        $tipoSlug = null;
        if (! empty($fila->tipo_juego_id) && \Illuminate\Support\Facades\Schema::hasTable('tipos_juegos')) {
            $tipoSlug = \App\Models\TiposJuego::query()->whereKey($fila->tipo_juego_id)->value('slug');
        }
        if ($tipoSlug !== 'secuencia_movimiento') {
            fail('BD tipo='.($tipoSlug ?: 'null').', esperado secuencia_movimiento');
        } else {
            ok("BD slug={$fila->slug} activo=".((int) $fila->activo)." tipo={$tipoSlug}");
        }
        $idx = public_path(trim($fila->ruta, '/').'/index.html');
        if (! is_file($idx)) {
            fail('BD apunta a ruta sin index.html');
        } else {
            ok('BD ruta ↔ disco OK');
        }
        if (! (int) $fila->activo) {
            warn('Juego inactivo en BD');
        }
    }
} else {
    fail('Tabla juegos no existe');
}

resumen:
echo "\n========== RESUMEN SECUENCIA MOVIMIENTO ==========\n";
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

echo "\nBarrido Secuencia de movimiento sin fallos.\n";
exit(0);
