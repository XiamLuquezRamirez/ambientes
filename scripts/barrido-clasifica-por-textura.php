<?php

/**
 * Barrido: Clasifica por textura (Multisensorial).
 * Uso: php scripts/barrido-clasifica-por-textura.php
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

$rel = 'Multisensorial/ClasificaPorTextura';
$dir = public_path('catalogo_juegos/'.$rel);
echo "=== CLASIFICA POR TEXTURA: filesystem ===\n";

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
    'id="mesa"',
    'id="piezas"',
    'id="zona-central"',
    'id="riel"',
    'id="cesta-escena"',
    'id="descarte"',
    'id="modulos"',
    'id="lupa"',
    'id="pj-zoe"',
    'id="pj-zeus"',
    'id="dialogo"',
    'id="gran-final"',
    'id="confeti-texturas"',
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
    'tocarPieza',
    'mostrarLupa',
    'iniciarArrastre',
    'tramoTropiezo',
    'navigator.vibrate',
    'mandarADescarte',
    'responderColocar',
    'rechazar',
    'desfileCestas',
    'iniciarConfetiTexturas',
    'granCierre',
    'pednia:perfil',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach (['.mesa', '.pieza', '.cesta', '.descarte', '.riel', '.pinza', '.modulo', '.cojin', '.tolva', '.rampa', '.trituradora', '.lupa', '.desfile', '.trofeo.premio', '.ct-rugoso', 'bailarZeus'] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

echo "\n=== CLASIFICA POR TEXTURA: config.json ===\n";

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

$esperados = [
    '3' => ['3-4 años', 3, 'cestas', 4, ['nube', 'roca']],
    '5' => ['5-6 años', 4, 'estacion', 5, ['suave', 'aspero', 'liso', 'rugoso']],
];
$ids = [];
foreach ($config['niveles'] ?? [] as $nivel) {
    $id = (string) ($nivel['id'] ?? '');
    $ids[] = $id;
    if (! isset($esperados[$id])) {
        fail("Nivel id={$id} fuera de 3/5");
        continue;
    }
    [$edad, $nRetos, $escenario, $nObjetos, $grupos] = $esperados[$id];
    if (($nivel['edad'] ?? '') !== $edad) {
        fail("Nivel {$id}: edad ".($nivel['edad'] ?? '?').", esperado {$edad}");
    }
    if (($nivel['escenario'] ?? '') !== $escenario) {
        fail("Nivel {$id}: escenario ".($nivel['escenario'] ?? '?').", esperado {$escenario}");
    }
    $idsGrupos = array_column($nivel['grupos'] ?? [], 'id');
    if ($idsGrupos !== $grupos) {
        fail("Nivel {$id}: grupos ".implode(',', $idsGrupos).', esperado '.implode(',', $grupos));
    } else {
        ok("Nivel {$id}: grupos ".implode(', ', $grupos));
    }
    foreach ($nivel['grupos'] ?? [] as $g) {
        if (! empty($g['img']) && ! is_file($dir.'/'.$g['img'])) {
            fail("Nivel {$id}: falta imagen de {$g['id']}");
        }
    }
    $retos = $nivel['retos'] ?? [];
    if (count($retos) !== $nRetos) {
        fail("Nivel {$id}: ".count($retos)." retos, esperado {$nRetos}");
    } else {
        ok("Nivel {$id}: {$nRetos} retos");
    }
    foreach ($retos as $r) {
        $objetos = $r['objetos'] ?? [];
        if (count($objetos) !== $nObjetos) {
            fail("Nivel {$id} reto {$r['id']}: ".count($objetos)." objetos, esperado {$nObjetos}");
        }
        foreach (array_merge($objetos, $r['correctos'] ?? []) as $m) {
            if (! isset($config['materiales'][$m])) {
                fail("Nivel {$id} reto {$r['id']}: material desconocido {$m}");
            }
        }
        if (! in_array($r['grupo'] ?? '', $idsGrupos, true)) {
            fail("Nivel {$id} reto {$r['id']}: grupo inexistente");
        }
    }
    if (empty($nivel['premio']['nombre'])) {
        fail("Nivel {$id}: sin premio");
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

echo "\n=== CLASIFICA POR TEXTURA: BD (solo lectura) ===\n";

if (! Schema::hasTable('juegos')) {
    fail('Tabla juegos no existe');
    goto resumen;
}

$fila = DB::table('juegos')->where('slug', 'clasifica-por-textura')->first();
if (! $fila) {
    $fila = DB::table('juegos')->where('ruta', 'like', '%ClasificaPorTextura%')->first();
}

if (! $fila) {
    fail('No hay fila en juegos para ClasificaPorTextura (no se crea desde el barrido)');
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
echo "\n========== RESUMEN CLASIFICA POR TEXTURA ==========\n";
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
