<?php

/**
 * Checks compartidos Multisensorial: intro3d + final + tutorial.
 * Uso: require desde un barrido de juego (tras cargar $html, $js, $config, fail/ok/warn).
 */

if (! isset($html, $js) || ! function_exists('ok') || ! function_exists('fail')) {
    throw new RuntimeException('barrido-multisensorial-shell.php requiere $html, $js, ok(), fail()');
}

echo "\n=== INTEGRACIÓN: intro3d / final / tutorial ===\n";

foreach ([
    'intro3d-root',
    'btn-omitir-intro3d',
    'btn-continuar-intro3d',
    'id="victoria"',
    'id="tutorial-zoe"',
    'final/final.css',
    'final/final.js',
    'intro3d/css/intro.css',
    'intro3d/js/config.js',
    'intro3d/js/intro.js',
    'intro3d/js/three-scene.js',
    'tutorial/tutorial.css',
    'tutorial/tutorial.js',
] as $needle) {
    if (! str_contains($html, $needle)) {
        fail("index.html sin '{$needle}'");
    } else {
        ok("HTML integración: {$needle}");
    }
}

foreach ([
    'mostrarIntro3d',
    'iniciarDemo',
    'PedniaTutorial',
    'iniciarSecuenciaVictoria',
    'mostrarCierre',
] as $needle) {
    if (! str_contains($js, $needle)) {
        fail("script.js sin '{$needle}'");
    } else {
        ok("JS integración: {$needle}");
    }
}

$configLocal = $config ?? null;
if (! is_array($configLocal) && isset($dir) && is_file($dir.'/config.json')) {
    $configLocal = json_decode(file_get_contents($dir.'/config.json'), true);
}

if (is_array($configLocal)) {
    if (empty($configLocal['accesibilidad']['mostrarIntro'])) {
        fail('config sin accesibilidad.mostrarIntro=true');
    } else {
        ok('config mostrarIntro activo');
    }
    if (empty($configLocal['textos']['demostracion']) || empty($configLocal['textos']['demostracionFin'])) {
        fail('config sin textos demostracion/demostracionFin');
    } else {
        ok('config textos de demostración');
    }
}

foreach ([
    'intro3d/js/config.js',
    'intro3d/js/intro.js',
    'intro3d/js/three-scene.js',
    'intro3d/css/intro.css',
    'intro3d/models/nino.glb',
    'intro3d/models/nina.glb',
    'final/final.js',
    'final/final.css',
    'tutorial/tutorial.js',
    'tutorial/tutorial.css',
    'img/fondo.png',
    'img/excelente.png',
    'img/trofeo.png',
    'img/cortina_izq.png',
    'img/cortina_der.png',
    'img/zeus_normal.gif',
    'img/zoe_normal.gif',
    'images/zoe_hablando.gif',
] as $m) {
    if (! is_file(public_path('catalogo_juegos/'.$m))) {
        fail("Asset compartido faltante: {$m}");
    } else {
        ok("Asset compartido: {$m}");
    }
}

if (str_contains($html, 'class="overlay"') || str_contains($html, 'id="personajes-container"')) {
    fail('HTML aún tiene overlay GIF legacy');
} else {
    ok('HTML sin overlay GIF legacy');
}

if (isset($css) && str_contains($css, 'victoria.gif')) {
    fail('style.css aún usa victoria.gif en .final');
} else {
    ok('CSS final sin victoria.gif local');
}
