<?php

/**
 * Barrido: Asocia sonido e imagen (Multisensorial).
 * Uso: php scripts/barrido-asocia-sonido-e-imagen.php
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

$rel = 'Multisensorial/AsociaSonidoEImagen';
$dir = public_path('catalogo_juegos/'.$rel);
echo "=== ASOCIA SONIDO E IMAGEN: filesystem ===\n";

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
    'inicio-elementos',
    'data-laboratorio',
    'texto_voz.js',
    'edad-nivel.js',
    'logica.js',
    'sfx.js',
    'id="btn-escuchar"',
    'id="area-seleccion"',
    'id="opciones"',
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
    'escucharOtraVez',
    'esperaAntesDeOpciones',
    'responderAcierto',
    'animarFotogramas',
    'chorroDeAgua',
    'burbujasDeLimpieza',
    'pintarPista',
    'prepararInsignia',
    'hablarCierre',
    'granCierre',
    'pista.gen',
    'pednia:perfil',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach (['.btn-escuchar', '.area-seleccion', '.opcion.vibra', '.opcion.despega', '.opcion.avanza', '.opcion.limpia', '.p-gota', '.p-burbuja', '.opciones.cant-5', 'body.laboratorio', '.trofeo.insignia', '.pj.celebra'] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

echo "\n=== ASOCIA SONIDO E IMAGEN: config.json ===\n";

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
    foreach (array_merge([$e['img'] ?? ''], $e['fotogramas'] ?? []) as $img) {
        if (! $img || ! is_file($dir.'/'.$img)) {
            fail("Elemento {$id}: falta imagen {$img}");
        }
    }
    ok("Elemento {$id}");
}

$esperados = [
    '3' => ['3-4 años', 5, [3, 3]],
    '5' => ['5-6 años', 6, [4, 5]],
];
$ids = [];
foreach ($config['niveles'] ?? [] as $nivel) {
    $id = (string) ($nivel['id'] ?? '');
    $ids[] = $id;
    if (! isset($esperados[$id])) {
        fail("Nivel id={$id} fuera de 3/5");
        continue;
    }
    [$edad, $cant, [$min, $max]] = $esperados[$id];
    if (($nivel['edad'] ?? '') !== $edad) {
        fail("Nivel {$id}: edad ".($nivel['edad'] ?? '?').", esperado {$edad}");
    }
    $retos = $nivel['retos'] ?? [];
    if (count($retos) !== $cant) {
        fail("Nivel {$id}: ".count($retos)." retos, esperado {$cant}");
    } else {
        ok("Nivel {$id}: {$cant} retos");
    }
    foreach ($retos as $r) {
        $ops = $r['opciones'] ?? [];
        if (count($ops) < $min || count($ops) > $max) {
            fail("Nivel {$id} reto {$r['id']}: ".count($ops)." opciones");
        }
        if (! in_array($r['correcto'] ?? '', $ops, true)) {
            fail("Nivel {$id} reto {$r['id']}: la correcta no está entre las opciones");
        }
        foreach ($ops as $o) {
            if (! isset($config['elementos'][$o])) {
                fail("Nivel {$id} reto {$r['id']}: elemento desconocido {$o}");
            }
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
    $n = 0;
    foreach ($config['niveles'] ?? [] as $nivel) {
        $n += count($nivel['retos'] ?? []);
    }
    warn("Sin grabaciones en audios.sonidos: los {$n} sonidos de los retos son sintetizados (provisionales)");
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

echo "\n=== ASOCIA SONIDO E IMAGEN: BD (solo lectura) ===\n";

if (! Schema::hasTable('juegos')) {
    fail('Tabla juegos no existe');
    goto resumen;
}

$fila = DB::table('juegos')->where('ruta', 'like', '%AsociaSonidoEImagen%')->first();

if (! $fila) {
    fail('No hay fila en juegos para AsociaSonidoEImagen (no se crea desde el barrido)');
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
echo "\n========== RESUMEN ASOCIA SONIDO E IMAGEN ==========\n";
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
