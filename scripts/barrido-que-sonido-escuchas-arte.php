<?php

/**
 * Barrido: ¿Qué sonido escuchas? (Expresión Artística) — 6 juegos.
 * Uso: php scripts/barrido-que-sonido-escuchas-arte.php
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

$juegos = [
    [
        'carpeta' => 'SonidosDeLaNaturalezaYAnimales',
        'slug' => 'sonidos-de-la-naturaleza-y-animales',
        'reto' => 'establo',
        'edad' => '3-4 años',
    ],
    [
        'carpeta' => 'SonidosDelEntornoCotidiano',
        'slug' => 'sonidos-del-entorno-cotidiano',
        'reto' => 'cocina',
        'edad' => '3-4 años',
    ],
    [
        'carpeta' => 'SonidosDeVehiculosYTransporte',
        'slug' => 'sonidos-de-vehiculos-y-transporte',
        'reto' => 'calle',
        'edad' => '3-4 años',
    ],
    [
        'carpeta' => 'SonidosUrbanosYDeTransito',
        'slug' => 'sonidos-urbanos-y-de-transito',
        'reto' => 'gran-ciudad',
        'edad' => '5-6 años',
    ],
    [
        'carpeta' => 'NaturalezaSalvaje',
        'slug' => 'naturaleza-salvaje',
        'reto' => 'bosque-nocturno',
        'edad' => '5-6 años',
    ],
    [
        'carpeta' => 'EfectosEspecialesYClima',
        'slug' => 'efectos-especiales-y-clima',
        'reto' => 'tormenta',
        'edad' => '5-6 años',
    ],
];

echo "=== ¿QUÉ SONIDO ESCUCHAS? (EA): 6 paquetes ===\n";

$legacyTmp = public_path('catalogo_juegos/ExpresionArtistica/_QueSonidoEscuchas_legacy_tmp');
if (is_dir($legacyTmp)) {
    fail('Queda _QueSonidoEscuchas_legacy_tmp; debe borrarse');
}
$legacyPlano = public_path('catalogo_juegos/ExpresionArtistica/QueSonidoEscuchas/config.json');
if (is_file($legacyPlano)) {
    fail('Queda un paquete plano en ExpresionArtistica/QueSonidoEscuchas');
}

foreach ($juegos as $meta) {
    $rel = 'ExpresionArtistica/QueSonidoEscuchas/'.$meta['carpeta'];
    $dir = public_path('catalogo_juegos/'.$rel);
    echo "\n--- {$meta['carpeta']} ---\n";

    if (! is_dir($dir)) {
        fail("No existe {$rel}");
        continue;
    }

    foreach (['index.html', 'style.css', 'script.js', 'config.json', 'logica.js', 'sfx.js', 'docs/requerimientos.md', 'img/bocina.svg'] as $f) {
        if (! is_file($dir.'/'.$f)) {
            fail("Falta {$rel}/{$f}");
        } else {
            ok("Presente {$f}");
        }
    }

    $config = json_decode((string) file_get_contents($dir.'/config.json'), true);
    if (! is_array($config)) {
        fail("config.json inválido en {$rel}");
        continue;
    }

    $niveles = $config['niveles'] ?? [];
    if (count($niveles) !== 1) {
        fail("{$rel}: debe tener exactamente 1 nivel");
    } else {
        ok('1 nivel de edad');
    }

    $nivel = $niveles[0] ?? [];
    if (($nivel['edad'] ?? '') !== $meta['edad']) {
        fail("{$rel}: edad esperada {$meta['edad']}");
    } else {
        ok('edad '.$meta['edad']);
    }

    $retos = $nivel['retos'] ?? [];
    if (count($retos) !== 1 || ($retos[0]['id'] ?? '') !== $meta['reto']) {
        fail("{$rel}: debe tener solo el reto {$meta['reto']}");
    } else {
        ok('reto '.$meta['reto']);
    }

    if (empty($nivel['cierre']) || empty($nivel['insignia']['img'])) {
        fail("{$rel}: falta cierre/insignia");
    } else {
        ok('cierre e insignia presentes');
        if (! is_file($dir.'/'.$nivel['insignia']['img'])) {
            fail("{$rel}: medalla no existe en disco");
        }
    }

    if (! Schema::hasTable('juegos')) {
        warn('Tabla juegos no existe (se omite chequeo BD de este paquete)');
        continue;
    }

    $fila = DB::table('juegos')->where('slug', $meta['slug'])->first();
    if (! $fila) {
        fail("BD: falta slug {$meta['slug']}");
        continue;
    }
    if (! (int) $fila->activo) {
        fail("BD: {$meta['slug']} inactivo");
    } else {
        ok("BD slug={$meta['slug']} activo");
    }
    if ($fila->ruta !== 'catalogo_juegos/'.$rel) {
        fail("BD ruta distinta: {$fila->ruta}");
    } else {
        ok('BD ruta ok');
    }
    $ambiente = DB::table('ambientes')->where('id', $fila->ambiente_id)->value('slug');
    if ($ambiente !== 'expresion-artistica') {
        warn("{$meta['slug']}: ambiente={$ambiente}");
    } else {
        ok('ambiente Expresión Artística');
    }
}

if (Schema::hasTable('juegos')) {
    echo "\n=== Temática y legacy ===\n";
    if (DB::table('juegos')->where('slug', 'que-sonido-escuchas-2')->exists()) {
        fail('que-sonido-escuchas-2 sigue en BD');
    } else {
        ok('sin slug que-sonido-escuchas-2');
    }

    $tem = DB::table('tematicas')->where('id', 48)->first();
    if (! $tem) {
        fail('falta temática 48 ¿Qué sonido escuchas?');
    } elseif ((int) $tem->activo !== 1) {
        fail('temática 48 inactiva');
    } else {
        ok('temática 48 activa: '.$tem->nombre);
    }

    $mal = DB::table('juegos')
        ->whereIn('slug', array_column($juegos, 'slug'))
        ->where(function ($q) {
            $q->whereNull('tematica_id')->orWhere('tematica_id', '!=', 48);
        })
        ->pluck('slug')
        ->all();
    if ($mal) {
        fail('juegos sin temática 48: '.implode(', ', $mal));
    } else {
        ok('los 6 juegos apuntan a temática 48');
    }

    $espurias = DB::table('tematicas')->whereIn('id', [73, 74, 75, 76, 77, 78])->count();
    if ($espurias > 0) {
        fail("quedan {$espurias} temáticas espurias (73-78)");
    } else {
        ok('sin temáticas espurias 73-78');
    }
}

echo "\n========== RESUMEN ¿QUÉ SONIDO ESCUCHAS? (EA) ==========\n";
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
