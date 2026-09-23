<?php

/**
 * Barrido: Busca la sombra (Multisensorial).
 * Uso: php scripts/barrido-busca-la-sombra.php
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

$rel = 'Multisensorial/BuscaLaSombra';
$dir = public_path('catalogo_juegos/'.$rel);

echo "=== BUSCA LA SOMBRA: filesystem ===\n";

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
    'id="zona-sombras"',
    'id="objeto-objetivo"',
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
    'pintarSombras',
    'pednia:perfil',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

foreach (['.zona-sombras', '.sombra', '.objeto-objetivo', '.sombra.is-acierto'] as $needle) {
    if (! str_contains($css, $needle)) {
        fail("style.css sin '{$needle}'");
    } else {
        ok("CSS tiene {$needle}");
    }
}

echo "\n=== BUSCA LA SOMBRA: media ===\n";

$config = json_decode(file_get_contents($dir.'/config.json'), true);
if (! is_array($config)) {
    fail('config.json inválido');
    goto resumen;
}

$objetos = $config['objetos'] ?? [];
foreach ($objetos as $id => $meta) {
    foreach (['img', 'sombra'] as $campo) {
        $relImg = $meta[$campo] ?? '';
        if ($relImg === '' || ! is_file($dir.'/'.ltrim($relImg, '/'))) {
            fail("Falta {$campo} de {$id}: {$relImg}");
        } else {
            ok("Asset {$id}.{$campo}");
        }
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

echo "\n=== BUSCA LA SOMBRA: config.json ===\n";

if (! empty($config['stub'])) {
    fail('config aún con stub=true');
} else {
    ok('config sin stub');
}

$esperados = [
    '3' => ['retos' => 3, 'sombras' => 3],
    '4' => ['retos' => 3, 'sombras' => 4],
    '5' => ['retos' => 3, 'sombras' => 5],
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
    if (count($retos) !== $esp['retos']) {
        fail("Nivel {$id}: ".count($retos)." retos, esperado {$esp['retos']}");
    } else {
        ok("Nivel {$id}: {$esp['retos']} retos");
    }
    foreach ($retos as $ri => $reto) {
        $obj = $reto['objeto'] ?? '';
        $soms = $reto['sombras'] ?? [];
        if (! isset($objetos[$obj])) {
            fail("Nivel {$id} reto {$ri}: objeto desconocido {$obj}");
            continue;
        }
        if (count($soms) !== $esp['sombras']) {
            fail("Nivel {$id} reto {$obj}: ".count($soms)." sombras, esperado {$esp['sombras']}");
        }
        if (! in_array($obj, $soms, true)) {
            fail("Nivel {$id} reto {$obj}: la sombra correcta no está entre las opciones");
        }
        foreach ($soms as $s) {
            if (! isset($objetos[$s])) {
                fail("Nivel {$id} reto {$obj}: sombra desconocida {$s}");
            }
        }
        ok("Nivel {$id} reto {$obj}: OK");
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

echo "\n=== BUSCA LA SOMBRA: BD ===\n";

$tipo = null;
if (Schema::hasTable('tipos_juegos')) {
    $tipo = TiposJuego::query()->firstOrCreate(
        ['slug' => 'busca_sombra'],
        [
            'nombre' => 'Busca la sombra',
            'descripcion' => 'Juego para relacionar un objeto con su sombra por la forma.',
            'activo' => true,
        ]
    );
    if ($tipo->wasRecentlyCreated) {
        ok('Creado tipo_juego busca_sombra');
    } else {
        ok('tipo_juego busca_sombra presente');
    }
} else {
    fail('Tabla tipos_juegos no existe');
}

if (Schema::hasTable('juegos')) {
    $fila = DB::table('juegos')->where('slug', 'busca-la-sombra')->first();
    if (! $fila) {
        $fila = DB::table('juegos')->where('ruta', 'like', '%BuscaLaSombra%')->first();
    }
    if (! $fila) {
        DB::table('juegos')->insert([
            'slug' => 'busca-la-sombra',
            'ambiente_id' => 9,
            'eje_id' => null,
            'tematica_id' => null,
            'modulo_id' => null,
            'tipo_juego_id' => $tipo ? $tipo->id : null,
            'ruta' => 'catalogo_juegos/Multisensorial/BuscaLaSombra',
            'nombre' => 'Busca la sombra',
            'descripcion' => 'Tocar la sombra que corresponde al objeto según el nivel de edad.',
            'icono' => 'fa-cloud',
            'color' => '#64748b',
            'orden' => 10,
            'activo' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        ok('Creada fila juegos busca-la-sombra');
        $fila = DB::table('juegos')->where('slug', 'busca-la-sombra')->first();
    }

    if ($fila) {
        $updates = [];
        if ($tipo && (int) $fila->tipo_juego_id !== (int) $tipo->id) {
            $updates['tipo_juego_id'] = $tipo->id;
        }
        if (trim((string) $fila->ruta, '/') !== 'catalogo_juegos/Multisensorial/BuscaLaSombra') {
            $updates['ruta'] = 'catalogo_juegos/Multisensorial/BuscaLaSombra';
        }
        if ($updates) {
            $updates['updated_at'] = now();
            DB::table('juegos')->where('slug', $fila->slug)->update($updates);
            ok('BD actualizada ('.implode(', ', array_keys($updates)).')');
        } else {
            ok("BD slug={$fila->slug} activo=".((int) $fila->activo).' tipo=busca_sombra');
        }
        $idx = public_path(trim($fila->ruta, '/').'/index.html');
        // Re-read ruta after possible update
        $ruta = $updates['ruta'] ?? $fila->ruta;
        $idx = public_path(trim($ruta, '/').'/index.html');
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
echo "\n========== RESUMEN BUSCA LA SOMBRA ==========\n";
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
