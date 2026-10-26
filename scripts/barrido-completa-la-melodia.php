<?php

/**
 * Barrido: Completa la melodía (Expresión Artística).
 * Uso: php scripts/barrido-completa-la-melodia.php
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

$rel = 'ExpresionArtistica/CompletaLaMelodia';
$dir = public_path('catalogo_juegos/'.$rel);
echo "=== COMPLETA LA MELODÍA: filesystem ===\n";

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

if (str_contains($html, 'Paquete en construcción') || str_contains($html, 'stub-wrap') || str_contains($js, 'Stub de catálogo')) {
    fail('El paquete sigue en stub');
} else {
    ok('Stub eliminado');
}

foreach ([
    'btn-empecemos', 'pantalla-inicio', 'inicio-vitrina', 'texto_voz.js', 'edad-nivel.js',
    'aplicar-perfil-juego.js', 'logica.js', 'sfx.js', 'id="escena-fondo"', 'id="estacion"',
    'id="progreso"', 'id="concierto"', 'id="pj-zoe"', 'id="pj-zeus"', 'id="dialogo"', 'sweetalert',
] as $needle) {
    if (! str_contains($html, $needle)) {
        fail("index.html sin '{$needle}'");
    } else {
        ok("HTML tiene {$needle}");
    }
}

foreach ([
    'TextoVoz', 'confirmarNivel', 'conversacionInicial', 'retoToque', 'retoOpcion', 'retoArrastre',
    'evaluarToque', 'evaluarOpcion', 'evaluarEncaje', 'reproducirFrase', 'mostrarCierre', 'granCierre',
    'pednia:perfil', 'VOLUMEN_FONDO_ESCUCHA = 0',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach ([
    '.tema-estacion', '.tema-estudio', '.pad.listo', '.paso.vacio', '.hueco', '.pieza',
    '.extra.oculto', '.concierto', '.trofeo.insignia', '.pj.celebra',
] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

if (preg_match('/\.destello\b/', $css)) {
    fail('style.css define .destello y choca con final.css');
} else {
    ok('CSS sin .destello');
}

echo "\n=== COMPLETA LA MELODÍA: config.json ===\n";

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
    if (empty($e['img']) || ! is_file($dir.'/'.$e['img'])) {
        fail("Elemento {$id}: falta imagen ".($e['img'] ?? ''));
    } elseif (empty($e['nombre'])) {
        fail("Elemento {$id}: sin nombre");
    } else {
        ok("Elemento {$id}");
    }
}

foreach ($config['escenas'] ?? [] as $id => $img) {
    if (! is_file($dir.'/'.$img)) {
        fail("Escena {$id}: falta {$img}");
    } else {
        ok("Escena {$id}");
    }
}

$esperados = [
    '3' => ['3-4 años', 'estacion', ['toque', 'toque', 'toque', 'arrastre']],
    '5' => ['5-6 años', 'estudio', ['arrastre', 'opcion', 'arrastre', 'toque']],
];
$ids = [];
foreach ($config['niveles'] ?? [] as $nivel) {
    $id = (string) ($nivel['id'] ?? '');
    $ids[] = $id;
    if (! isset($esperados[$id])) {
        fail("Nivel id={$id} fuera de 3/5");
        continue;
    }
    [$edad, $tema, $tipos] = $esperados[$id];
    if (($nivel['edad'] ?? '') !== $edad || ($nivel['tema'] ?? '') !== $tema) {
        fail("Nivel {$id}: edad/tema ".($nivel['edad'] ?? '?').'/'.($nivel['tema'] ?? '?'));
    }
    $tiposReales = array_map(fn ($r) => $r['tipo'] ?? '?', $nivel['retos'] ?? []);
    if ($tiposReales !== $tipos) {
        fail("Nivel {$id}: retos ".implode(',', $tiposReales));
    } else {
        ok("Nivel {$id}: ".count($tipos).' retos');
    }
    if (empty($config['escenas'][$nivel['escena'] ?? ''])) {
        fail("Nivel {$id}: escena desconocida");
    }
    $insignia = $nivel['insignia']['img'] ?? '';
    if (! $insignia || ! is_file($dir.'/'.$insignia)) {
        fail("Nivel {$id}: falta la medalla");
    } else {
        ok("Nivel {$id}: medalla {$insignia}");
    }
}

foreach (array_keys($esperados) as $idEsp) {
    if (! in_array((string) $idEsp, $ids, true)) {
        fail("Falta nivel id={$idEsp}");
    }
}

$conv = $config['textos']['conversacion'] ?? [];
if (! is_array($conv) || count($conv) < 2) {
    fail('conversacion incompleta');
} else {
    ok('conversación en config ('.count($conv).' líneas)');
}

if (empty($config['audios']['sonidos']) || ! is_array($config['audios']['sonidos'])) {
    warn('Sin grabaciones en audios.sonidos: el timbre, las notas y el tren son sintetizados (provisionales)');
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

echo "\n=== COMPLETA LA MELODÍA: BD (solo lectura) ===\n";

if (! Schema::hasTable('juegos')) {
    fail('Tabla juegos no existe');
    goto resumen;
}

$fila = DB::table('juegos')->where('ruta', 'catalogo_juegos/'.$rel)->first();

if (! $fila) {
    fail("No hay fila en juegos para catalogo_juegos/{$rel} (no se crea desde el barrido)");
    goto resumen;
}

ok("BD slug={$fila->slug} activo=".((int) $fila->activo));

$ambiente = DB::table('ambientes')->where('id', $fila->ambiente_id)->value('slug');
if ($ambiente !== 'expresion-artistica') {
    warn('ambiente_id='.$fila->ambiente_id.' ('.($ambiente ?? '?').'), esperado expresion-artistica');
} else {
    ok('ambiente Expresión Artística');
}

resumen:
echo "\n========== RESUMEN COMPLETA LA MELODÍA ==========\n";
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
