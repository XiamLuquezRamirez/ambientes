<?php

/**
 * Barrido específico: Laberintos de coordinación (Polimotor).
 * Uso: php scripts/barrido-laberintos-coordinacion.php
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

function contarGiros(array $path): int
{
    if (count($path) < 3) {
        return 0;
    }
    $giros = 0;
    for ($i = 1; $i < count($path) - 1; $i++) {
        $ax = $path[$i][0] - $path[$i - 1][0];
        $ay = $path[$i][1] - $path[$i - 1][1];
        $bx = $path[$i + 1][0] - $path[$i][0];
        $by = $path[$i + 1][1] - $path[$i][1];
        // Cruce de producto ≈ 0 → colineal
        if (abs($ax * $by - $ay * $bx) > 0.01) {
            $giros++;
        }
    }

    return $giros;
}

function puntoEnCaja(array $p): bool
{
    return isset($p[0], $p[1])
        && is_numeric($p[0]) && is_numeric($p[1])
        && $p[0] >= 0 && $p[0] <= 100
        && $p[1] >= 0 && $p[1] <= 100;
}

$rel = 'Polimotor/LaberintosDeCoordinacion';
$dir = public_path('catalogo_juegos/'.$rel);

echo "=== LABERINTOS: filesystem ===\n";

if (! is_dir($dir)) {
    fail("No existe {$rel}");
    goto resumen;
}

foreach (['index.html', 'style.css', 'script.js', 'config.json', 'intro.json'] as $f) {
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
    'id="lienzo"',
    'sweetalert',
    '/assets/css/fontawesome',
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
    'dentroDelCamino',
    'soltarEsFallo',
    'pednia:perfil',
    'exitoMeta',
    'falloCamino',
    'iniciarAnimacionIntro',
    'mostrarNubeYConversacion',
    'entradaIzquierda',
    'programarRedibujo',
    'generarLaberintosNivel',
] as $needle) {
    if (! str_contains($js, $needle) && ! str_contains($css, $needle)) {
        fail("paquete sin '{$needle}'");
    } else {
        ok("Tiene {$needle}");
    }
}

if (str_contains($css, 'stub-wrap') && ! str_contains($css, 'pantalla-inicio')) {
    fail('style.css parece stub');
} else {
    ok('style.css con shell de juego');
}

echo "\n=== LABERINTOS: media referenciada ===\n";

$media = [
    'images/correcto.gif',
    'images/incorrecto.gif',
    'images/victoria.gif',
    'images/nube.png',
    'images/normal1.gif',
    'images/normal2.gif',
    'images/ciencia/normal1.gif',
    'images/ciencia/normal2.gif',
    'sounds/ok.mp3',
    'sounds/over.mp3',
    'sounds/victory.mp3',
    'sounds/fondo.mp3',
    'texto_voz.js',
    'Polimotor/Reconocimiento/img/nino/7/cabeza.png',
];
foreach ($media as $m) {
    if (! is_file(public_path('catalogo_juegos/'.$m))) {
        fail("Media faltante: {$m}");
    } else {
        ok("Media OK: {$m}");
    }
}

echo "\n=== LABERINTOS: config.json ===\n";

$config = json_decode(file_get_contents($dir.'/config.json'), true);
if (! is_array($config)) {
    fail('config.json inválido');
    goto resumen;
}

if (! empty($config['stub'])) {
    fail('config.json aún tiene stub=true');
} else {
    ok('config sin stub');
}

$avatarRel = $config['avatar'] ?? '';
if ($avatarRel === '') {
    warn('config sin avatar (usa fallback dibujado)');
} else {
    // Resolver relativo al paquete (../… → public/catalogo_juegos/…)
    $avatarFs = realpath($dir.'/'.$avatarRel);
    if (! $avatarFs || ! is_file($avatarFs)) {
        fail("Avatar config no existe: {$avatarRel}");
    } elseif (stripos($avatarFs, 'ped_') !== false) {
        warn("Avatar parece logo Ped/PlayZone ({$avatarRel}); preferir sprite de niño");
    } else {
        ok("Avatar OK: {$avatarRel}");
    }
}

$esperados = [
    '3' => [
        'cantidad' => 3,
        'giros_min' => 2,
        'giros_max' => 4,
        'distractores_max' => 0,
        'soltar' => false,
    ],
    '4' => [
        'cantidad' => 4,
        'giros_min' => 4,
        'giros_max' => 6,
        'distractores_max' => 1,
        'soltar' => false,
    ],
    '5' => [
        'cantidad' => 5,
        'giros_min' => 6,
        'giros_max' => 10,
        'distractores_max' => 3,
        'soltar' => true,
    ],
];

$ids = [];
foreach ($config['niveles'] ?? [] as $nivel) {
    $id = (string) ($nivel['id'] ?? '');
    $ids[] = $id;
    $esp = $esperados[$id] ?? null;
    if (! $esp) {
        warn("Nivel id={$id} fuera de 3/4/5");
        continue;
    }

    $cantidad = (int) ($nivel['cantidad'] ?? 0);
    if ($cantidad !== $esp['cantidad']) {
        fail("Nivel {$id}: cantidad debería ser {$esp['cantidad']}, hay {$cantidad}");
    } else {
        ok("Nivel {$id}: cantidad={$cantidad}");
    }

    $soltar = (bool) ($nivel['soltarEsFallo'] ?? false);
    if ($soltar !== $esp['soltar']) {
        fail("Nivel {$id}: soltarEsFallo debería ser ".($esp['soltar'] ? 'true' : 'false'));
    } else {
        ok("Nivel {$id}: soltarEsFallo=".($soltar ? 'true' : 'false'));
    }

    if (! isset($nivel['anchoCamino']) || ! is_numeric($nivel['anchoCamino'])) {
        fail("Nivel {$id}: falta anchoCamino");
    }

    $gen = $nivel['generacion'] ?? null;
    if (! is_array($gen)) {
        fail("Nivel {$id}: falta bloque generacion (caminos aleatorios)");
        continue;
    }

    foreach (['girosMin', 'girosMax', 'distractoresMin', 'distractoresMax', 'margen', 'segMin', 'segMax'] as $clave) {
        if (! isset($gen[$clave]) || ! is_numeric($gen[$clave])) {
            fail("Nivel {$id}: generacion.{$clave} inválido");
        }
    }

    if ((int) $gen['girosMin'] < $esp['giros_min']) {
        fail("Nivel {$id}: girosMin={$gen['girosMin']} < mínimo esperado {$esp['giros_min']}");
    } else {
        ok("Nivel {$id}: giros {$gen['girosMin']}..{$gen['girosMax']}");
    }

    if ((int) $gen['girosMax'] < (int) $gen['girosMin']) {
        fail("Nivel {$id}: girosMax < girosMin");
    }

    if ((int) $gen['distractoresMax'] > $esp['distractores_max']) {
        fail("Nivel {$id}: distractoresMax={$gen['distractoresMax']} > {$esp['distractores_max']}");
    } else {
        ok("Nivel {$id}: distractores {$gen['distractoresMin']}..{$gen['distractoresMax']}");
    }

    if (! empty($nivel['laberintos'])) {
        warn("Nivel {$id}: aún tiene laberintos fijos (se ignoran si hay generacion)");
    }
}

if (! str_contains($js, 'generarLaberintosNivel') || ! str_contains($js, 'generarCaminoOrtogonal')) {
    fail('script.js sin generador aleatorio de laberintos');
} else {
    ok('JS con generador aleatorio de laberintos');
}

foreach (array_keys($esperados) as $idEsp) {
    // array_keys convierte '3'→3; comparar como string.
    if (! in_array((string) $idEsp, $ids, true)) {
        fail("Falta nivel id={$idEsp}");
    }
}

$intro = json_decode(file_get_contents($dir.'/intro.json'), true);
if (! is_array($intro) || empty($intro['personajes']) || empty($intro['conversacion'])) {
    fail('intro.json incompleto');
} else {
    ok('intro.json con personajes y conversación ('.count($intro['conversacion']).' líneas)');
}

echo "\n=== LABERINTOS: BD ===\n";

if (Schema::hasTable('juegos')) {
    $fila = DB::table('juegos')
        ->where('ruta', 'like', '%LaberintosDeCoordinacion%')
        ->first();
    if (! $fila) {
        warn('No hay fila en juegos para LaberintosDeCoordinacion (¿solo stub local?)');
    } else {
        ok("BD slug={$fila->slug} activo=".((int) $fila->activo)." tipo={$fila->tipo}");
        $idx = public_path(trim($fila->ruta, '/').'/index.html');
        if (! is_file($idx)) {
            fail('BD apunta a ruta sin index.html');
        } else {
            ok('BD ruta ↔ disco OK');
        }
        if (! empty($fila->activo) === false) {
            warn('Juego inactivo en BD');
        }
    }
} else {
    fail('Tabla juegos no existe');
}

resumen:
echo "\n========== RESUMEN LABERINTOS ==========\n";
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

echo "\nBarrido Laberintos sin fallos.\n";
exit(0);
