<?php

/**
 * Barrido: Descubre el instrumento (Expresión Artística).
 * Uso: php scripts/barrido-descubre-el-instrumento.php
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

$rel = 'ExpresionArtistica/DescubreElInstrumento';
$dir = public_path('catalogo_juegos/'.$rel);
echo "=== DESCUBRE EL INSTRUMENTO: filesystem ===\n";

if (! is_dir($dir)) {
    fail("No existe {$rel}");
    goto resumen;
}

foreach (['index.html', 'style.css', 'script.js', 'config.json', 'logica.js', 'sfx.js', 'docs/requerimientos.md', 'img/caja_regalo.svg', 'img/guitarra_muda.svg'] as $f) {
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
    'inicio-vitrina',
    'texto_voz.js',
    'edad-nivel.js',
    'aplicar-perfil-juego.js',
    'logica.js',
    'sfx.js',
    'id="escena-fondo"',
    'id="estacion"',
    'id="progreso"',
    'id="concierto"',
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
    'hacerArrastrable',
    'manoArrastrar',
    'manoDeslizar',
    'retoCaja',
    'retoCuerdas',
    'retoFlauta',
    'retoEstuches',
    'retoFamilias',
    'retoDuelo',
    'retoDirector',
    'reproducirArreglo',
    'lluviaDeNotas',
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

foreach (['.tema-teatro', '.caja-zona', '.tambor-btn.bota', '.guitarra-wrap.afinada', '.cuerda-slot.puesta', '.rollo', '.tubo.dormido', '.guia-paso', '.estuche.cerrado', '.estuche-silueta', '.zona', '.foco', '.vibra-grave', '.vibra-agudo', '.casilla.llena', '.seccion.iluminada', '.concierto', '.trofeo.insignia', '.pj.celebra'] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

echo "\n=== DESCUBRE EL INSTRUMENTO: config.json ===\n";

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

foreach ($config['instrumentos'] ?? [] as $id => $e) {
    if (empty($e['img']) || ! is_file($dir.'/'.$e['img'])) {
        fail("Instrumento {$id}: falta imagen ".($e['img'] ?? ''));
    } elseif (empty($config['familias'][$e['familia'] ?? ''])) {
        fail("Instrumento {$id}: familia desconocida");
    } else {
        ok("Instrumento {$id}");
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
    '3' => ['3-4 años', 'tienda', ['caja', 'cuerdas', 'flauta', 'estuches']],
    '5' => ['5-6 años', 'teatro', ['familias', 'duelo', 'director']],
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
        fail("Nivel {$id}: edad/tema ".($nivel['edad'] ?? '?').'/'.($nivel['tema'] ?? '?').", esperado {$edad}/{$tema}");
    }
    $tiposReales = array_map(fn ($r) => $r['tipo'] ?? '?', $nivel['retos'] ?? []);
    if ($tiposReales !== $tipos) {
        fail("Nivel {$id}: retos ".implode(',', $tiposReales).', esperado '.implode(',', $tipos));
    } else {
        ok("Nivel {$id}: ".count($tipos).' retos ('.implode(', ', $tipos).')');
    }
    foreach ($nivel['retos'] ?? [] as $r) {
        if (empty($config['escenas'][$r['escena'] ?? ''])) {
            fail("Nivel {$id} reto {$r['id']}: escena desconocida");
        }
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
if (! is_array($conv) || count($conv) < 1) {
    fail('conversacion vacía');
} else {
    ok('conversación en config ('.count($conv).' líneas)');
}

if (empty($config['audios']['sonidos']) || ! is_array($config['audios']['sonidos'])) {
    warn('Sin grabaciones en audios.sonidos: los instrumentos son sintetizados (provisionales)');
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

echo "\n=== DESCUBRE EL INSTRUMENTO: BD (solo lectura) ===\n";

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
echo "\n========== RESUMEN DESCUBRE EL INSTRUMENTO ==========\n";
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
