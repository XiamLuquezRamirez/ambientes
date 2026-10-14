<?php

/**
 * Barrido: Encuentra el sonido (Multisensorial).
 * Uso: php scripts/barrido-encuentra-el-sonido.php
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

$rel = 'Multisensorial/EncuentraElSonido';
$dir = public_path('catalogo_juegos/'.$rel);
echo "=== ENCUENTRA EL SONIDO: filesystem ===\n";

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
    'inicio-parque',
    'texto_voz.js',
    'edad-nivel.js',
    'logica.js',
    'sfx.js',
    'id="btn-escuchar"',
    'id="escena"',
    'id="elementos"',
    'id="zonas"',
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
    'conversacionInicial',
    'reproducirSonido',
    'escucharOtraVez',
    'llegarElementos',
    'viajar',
    'repetirViajero',
    'responderAcierto',
    'responderError',
    'lloverPantalla',
    'prepararInsignia',
    'granCierre',
    'pednia:perfil',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach (['.parque-fondo', '.escena', '.zonas', '.elemento', '.elemento.viaja', '.elemento.pulso', '.elemento.aletea', '.elemento.sacude', '.elemento.ilumina', '.btn-escuchar.sonando', '.gota', '.trofeo.insignia', '.pj.celebra'] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

echo "\n=== ENCUENTRA EL SONIDO: config.json ===\n";

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

foreach ($config['elementos'] ?? [] as $id => $e) {
    foreach (['img', 'imgAlas', 'imgAbierto'] as $k) {
        if ($k !== 'img' && empty($e[$k])) {
            continue;
        }
        if (empty($e[$k]) || ! is_file($dir.'/'.$e[$k])) {
            fail("Elemento {$id}: falta imagen ".($e[$k] ?? $k));
        } else {
            ok("Elemento {$id} ({$k})");
        }
    }
}

$esperados = [
    '3' => ['3-4 años', ['buscar', 'buscar', 'buscar', 'buscar', 'buscar'], [3, 3, 3, 3, 3]],
    '5' => ['5-6 años', ['buscar', 'zonas', 'buscar', 'viajero', 'buscar'], [4, 4, 4, 4, 5]],
];
$ids = [];
foreach ($config['niveles'] ?? [] as $nivel) {
    $id = (string) ($nivel['id'] ?? '');
    $ids[] = $id;
    if (! isset($esperados[$id])) {
        fail("Nivel id={$id} fuera de 3/5");
        continue;
    }
    [$edad, $tipos, $cantidades] = $esperados[$id];
    if (($nivel['edad'] ?? '') !== $edad) {
        fail("Nivel {$id}: edad ".($nivel['edad'] ?? '?').", esperado {$edad}");
    }
    $retos = $nivel['retos'] ?? [];
    $tiposReales = array_map(fn ($r) => $r['tipo'] ?? '?', $retos);
    $cantReales = array_map(fn ($r) => count($r['elementos'] ?? []), $retos);
    if ($tiposReales !== $tipos || $cantReales !== $cantidades) {
        fail("Nivel {$id}: tipos ".implode(',', $tiposReales).' / elementos '.implode(',', $cantReales));
    } else {
        ok("Nivel {$id}: 5 retos (".implode(', ', $tipos).'; elementos '.implode(',', $cantidades).')');
    }
    foreach ($retos as $r) {
        foreach ($r['elementos'] ?? [] as $o) {
            if (! isset($config['elementos'][$o])) {
                fail("Nivel {$id} reto {$r['id']}: elemento desconocido {$o}");
            }
        }
        $correcto = $r['correcto'] ?? '';
        if ($correcto !== 'azar' && ! in_array($correcto, $r['elementos'] ?? [], true)) {
            fail("Nivel {$id} reto {$r['id']}: la respuesta no está en el escenario");
        }
    }
    $insignia = $nivel['insignia']['img'] ?? '';
    if (! $insignia || ! is_file($dir.'/'.$insignia)) {
        fail("Nivel {$id}: falta la insignia");
    } else {
        ok("Nivel {$id}: insignia {$insignia}");
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

if (empty($config['audios']['sonidos']) || ! is_array($config['audios']['sonidos'])) {
    warn('Sin grabaciones en audios.sonidos: los '.count($config['elementos'] ?? []).' sonidos son sintetizados (provisionales)');
} else {
    foreach ($config['audios']['sonidos'] as $id => $ruta) {
        if (! is_file($dir.'/'.$ruta)) {
            fail("Grabación de {$id} no existe: {$ruta}");
        } else {
            ok("Grabación {$id}");
        }
    }
}

require __DIR__.'/barrido-multisensorial-shell.php';

echo "\n=== ENCUENTRA EL SONIDO: BD (solo lectura) ===\n";

if (! Schema::hasTable('juegos')) {
    fail('Tabla juegos no existe');
    goto resumen;
}

$fila = DB::table('juegos')->where('ruta', 'like', '%EncuentraElSonido%')->first();

if (! $fila) {
    fail('No hay fila en juegos para EncuentraElSonido (no se crea desde el barrido)');
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
echo "\n========== RESUMEN ENCUENTRA EL SONIDO ==========\n";
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
