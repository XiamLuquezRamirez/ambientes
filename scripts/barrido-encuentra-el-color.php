<?php

/**
 * Barrido: Encuentra el Color (Multisensorial).
 * Uso: php scripts/barrido-encuentra-el-color.php
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

$rel = 'Multisensorial/EncuentraElColor';
$dir = public_path('catalogo_juegos/'.$rel);

echo "=== ENCUENTRA EL COLOR: filesystem ===\n";

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
    'id="zona-objetos"',
    'id="muestra-color"',
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
    'feedbackAcierto',
    'pednia:perfil',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach (['.zona-objetos', '.objeto', '.muestra-color', '.objeto.is-acierto'] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

if (str_contains($css, 'img/FONDO.png')) {
    fail('CSS aún referencia FONDO.png inexistente');
} else {
    ok('CSS sin FONDO.png');
}

echo "\n=== ENCUENTRA EL COLOR: media ===\n";

$pngs = ['Manzana', 'Sol', 'Carro', 'Rana', 'Zanahoria', 'Uvas', 'Flor'];
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
    'intro.json',
] as $m) {
    if (! is_file(public_path('catalogo_juegos/'.$m))) {
        fail("Media faltante: {$m}");
    } else {
        ok("Media OK: {$m}");
    }
}

echo "\n=== ENCUENTRA EL COLOR: config.json ===\n";

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

$objetos = $config['objetos'] ?? [];
$colores = $config['colores'] ?? [];

$mapaEsperado = [
    'manzana' => 'rojo',
    'sol' => 'amarillo',
    'carro' => 'azul',
    'rana' => 'verde',
    'zanahoria' => 'naranja',
    'uvas' => 'morado',
    'flor' => 'rosado',
];

foreach ($mapaEsperado as $obj => $color) {
    if (empty($objetos[$obj]['img'])) {
        fail("objeto {$obj} sin img");
    } elseif (! is_file($dir.'/'.ltrim($objetos[$obj]['img'], '/'))) {
        fail("objeto {$obj} img no existe en disco");
    } else {
        ok("objeto {$obj} OK");
    }
    if (($objetos[$obj]['color'] ?? null) !== $color) {
        fail("objeto {$obj}: color=".($objetos[$obj]['color'] ?? 'null').", esperado {$color}");
    } else {
        ok("objeto {$obj} → {$color}");
    }
    if (empty($colores[$color]['nombre'])) {
        fail("falta meta color {$color}");
    }
}

$esperados = [
    '3' => ['objetos' => 3, 'colores' => 3],
    '4' => ['objetos' => 5, 'colores' => 5],
    '5' => ['objetos' => 7, 'colores' => 7],
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
    $nObj = count($nivel['objetos'] ?? []);
    $nCol = count($nivel['colores'] ?? []);
    if ($nObj !== $esp['objetos'] || $nCol !== $esp['colores']) {
        fail("Nivel {$id}: objetos={$nObj} colores={$nCol}, esperado {$esp['objetos']}/{$esp['colores']}");
    } else {
        ok("Nivel {$id}: {$nObj} objetos, {$nCol} colores");
    }
    foreach ($nivel['objetos'] ?? [] as $o) {
        if (! isset($objetos[$o])) {
            fail("Nivel {$id}: objeto desconocido {$o}");
        }
    }
    foreach ($nivel['colores'] ?? [] as $c) {
        if (! isset($colores[$c])) {
            fail("Nivel {$id}: color desconocido {$c}");
        }
        $hayObjeto = false;
        foreach ($nivel['objetos'] ?? [] as $o) {
            if (($objetos[$o]['color'] ?? null) === $c) {
                $hayObjeto = true;
                break;
            }
        }
        if (! $hayObjeto) {
            fail("Nivel {$id}: color {$c} sin objeto en el tablero");
        }
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

if (empty($config['textos']['consignaPlantilla']) || empty($config['textos']['aciertoPlantilla'])) {
    fail('faltan plantillas consigna/acierto');
} else {
    ok('plantillas consigna/acierto presentes');
}

require __DIR__.'/barrido-multisensorial-shell.php';

echo "\n=== ENCUENTRA EL COLOR: BD ===\n";

$tipo = null;
if (Schema::hasTable('tipos_juegos')) {
    $tipo = TiposJuego::query()->firstOrCreate(
        ['slug' => 'encuentra_color'],
        [
            'nombre' => 'Encuentra el color',
            'descripcion' => 'Juego para reconocer e identificar colores en objetos.',
            'activo' => true,
        ]
    );
    if ($tipo->wasRecentlyCreated) {
        ok('Creado tipo_juego encuentra_color');
    } else {
        ok('tipo_juego encuentra_color presente');
    }
} else {
    fail('Tabla tipos_juegos no existe');
}

if (Schema::hasTable('juegos')) {
    $fila = DB::table('juegos')->where('slug', 'encuentra-el-color')->first();
    if (! $fila) {
        $fila = DB::table('juegos')->where('ruta', 'like', '%EncuentraElColor%')->first();
    }
    if (! $fila) {
        fail('No hay fila en juegos para EncuentraElColor');
    } else {
        if ($tipo && (int) $fila->tipo_juego_id !== (int) $tipo->id) {
            DB::table('juegos')->where('slug', $fila->slug)->update([
                'tipo_juego_id' => $tipo->id,
                'updated_at' => now(),
            ]);
            ok('BD tipo_juego_id actualizado a encuentra_color');
        } else {
            ok("BD slug={$fila->slug} activo=".((int) $fila->activo).' tipo=encuentra_color');
        }
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
    }
} else {
    fail('Tabla juegos no existe');
}

resumen:
echo "\n========== RESUMEN ENCUENTRA EL COLOR ==========\n";
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
