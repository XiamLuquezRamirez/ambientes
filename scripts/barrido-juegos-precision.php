<?php

/**
 * Barrido: Juegos de precisión (Polimotor).
 * Uso: php scripts/barrido-juegos-precision.php
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

$rel = 'Polimotor/JuegosDePrecision';
$dir = public_path('catalogo_juegos/'.$rel);

echo "=== PRECISIÓN: filesystem ===\n";

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
    'id="capa-aros"',
    'id="capa-cohete"',
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
    'iniciarRuta',
    'evaluarPaso',
    'pintarRuta',
    'pointerdown',
    'pednia:perfil',
    'aro-trasera',
    'aro-frontal',
    'className = "aro"',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach ([
    '.capa-aros',
    '.aro',
    '.aro-capa',
    '.cohete',
    '.meta-estrella',
] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

echo "\n=== PRECISIÓN: media ===\n";

$config = json_decode(file_get_contents($dir.'/config.json'), true);
if (! is_array($config) || ! empty($config['stub'])) {
    fail('config.json inválido o stub');
    goto resumen;
}
ok('config sin stub');

$assets = [
    'Img/FONDO.png',
    'Img/COHETE.png',
    'Img/ESTRELLA.png',
    'Img/ARO_AZUL_PARTE-1.png',
    'Img/ARO_AZUL_PARTE-2.png',
    'Img/ARO_AMARILLO_PARTE-1.png',
    'Img/ARO_AMARILLO_PARTE-2.png',
    'Img/ARO_MORADO_PARTE-1.png',
    'Img/ARO_MORADO_PARTE-2.png',
    'Img/ARO_ROSADO_PARTE-1.png',
    'Img/ARO_ROSADO_PARTE-2.png',
];

foreach ($assets as $a) {
    if (! is_file($dir.'/'.$a)) {
        fail("Falta asset {$a}");
    } else {
        ok("Asset {$a}");
    }
}

foreach ([
    'images/correcto.gif',
    'images/incorrecto.gif',
    'images/victoria.gif',
    'sounds/ok.mp3',
    'sounds/over.mp3',
    'sounds/victory.mp3',
    'sounds/fondo.mp3',
    'texto_voz.js',
] as $shared) {
    $p = public_path('catalogo_juegos/'.$shared);
    if (! is_file($p)) {
        fail("Media compartida falta: {$shared}");
    } else {
        ok("Media OK: {$shared}");
    }
}

echo "\n=== PRECISIÓN: requisitos mecánicos ===\n";

$fbOk = $config['textos']['aciertoAro'] ?? '';
if ($fbOk !== '¡Muy bien! Sigue avanzando.') {
    fail("Texto acierto aro distinto: «{$fbOk}»");
} else {
    ok('Texto acierto aro según req');
}

$fbErr = $config['textos']['error'] ?? '';
if ($fbErr !== '¡Inténtalo otra vez! Mueve el cohete con cuidado.') {
    fail("Texto error distinto: «{$fbErr}»");
} else {
    ok('Texto error según req');
}

$cierre = $config['textos']['cierre'] ?? '';
if ($cierre !== '¡Excelente! Completaste el recorrido de precisión.') {
    fail("Cierre distinto: «{$cierre}»");
} else {
    ok('Cierre según req');
}

$esperados = [
    '3' => ['rutas' => 3, 'aros' => 3],
    '4' => ['rutas' => 4, 'aros' => 5],
    '5' => ['rutas' => 5, 'aros' => 7],
];

$ids = [];
foreach ($config['niveles'] ?? [] as $nivel) {
    $id = (string) ($nivel['id'] ?? '');
    $ids[] = $id;
    $esp = $esperados[$id] ?? null;
    if (! $esp) {
        fail("Nivel id={$id} no esperado");
        continue;
    }
    $rutas = $nivel['rutas'] ?? [];
    if (count($rutas) !== $esp['rutas']) {
        fail("Nivel {$id}: ".count($rutas)." rutas, esperado {$esp['rutas']}");
    } else {
        ok("Nivel {$id}: {$esp['rutas']} recorridos");
    }
    foreach ($rutas as $ri => $ruta) {
        $nAros = count($ruta['aros'] ?? []);
        if ($nAros !== $esp['aros']) {
            fail("Nivel {$id} ruta {$ri}: {$nAros} aros, esperado {$esp['aros']}");
        }
        if (empty($ruta['inicio']) || empty($ruta['meta'])) {
            fail("Nivel {$id} ruta {$ri}: falta inicio/meta");
        }
    }
    ok("Nivel {$id}: {$esp['aros']} aros por recorrido");
}

foreach (array_keys($esperados) as $idEsp) {
    if (! in_array((string) $idEsp, $ids, true)) {
        fail("Falta nivel id={$idEsp}");
    }
}

if (! str_contains($js, 'aro-trasera') || ! str_contains($js, 'aro-frontal') || ! str_contains($js, 'className = "aro"')) {
    fail('JS no compone aro con contenedor + trasera/frontal');
} else {
    ok('JS apila parte trasera y frontal del aro en un contenedor');
}

$conv = $config['textos']['conversacion'] ?? [];
if (! is_array($conv) || count($conv) < 1) {
    fail('conversacion vacía');
} else {
    ok('conversación en config ('.count($conv).' líneas)');
}

echo "\n=== PRECISIÓN: BD ===\n";

if (Schema::hasTable('tipos_juegos')) {
    $tipo = TiposJuego::query()->firstOrCreate(
        ['slug' => 'precision'],
        ['nombre' => 'Precisión', 'activo' => true]
    );
    if ($tipo->wasRecentlyCreated) {
        ok('Creado tipo_juego precision');
    } else {
        ok('tipo_juego precision presente');
    }
} else {
    fail('Tabla tipos_juegos no existe');
    $tipo = null;
}

if (Schema::hasTable('juegos')) {
    $fila = DB::table('juegos')->where('slug', 'juegos-de-precision')->first();
    if (! $fila) {
        $fila = DB::table('juegos')->where('ruta', 'like', '%JuegosDePrecision%')->first();
    }
    if (! $fila) {
        fail('No hay fila en juegos para JuegosDePrecision');
    } else {
        if ($tipo && (int) $fila->tipo_juego_id !== (int) $tipo->id) {
            DB::table('juegos')->where('slug', $fila->slug)->update([
                'tipo_juego_id' => $tipo->id,
                'updated_at' => now(),
            ]);
            ok('BD tipo_juego_id actualizado a precision');
        } else {
            ok("BD slug={$fila->slug} activo=".((int) $fila->activo));
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
echo "\n========== RESUMEN PRECISIÓN ==========\n";
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

echo "\nBarrido Juegos de precisión sin fallos.\n";
exit(0);
