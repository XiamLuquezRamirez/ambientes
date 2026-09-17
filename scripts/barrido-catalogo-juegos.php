<?php

/**
 * Barrido de validación: catálogo de juegos PedNia.
 * Uso: php scripts/barrido-catalogo-juegos.php
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

echo "=== PASO 1: filesystem ===\n";

$base = public_path('catalogo_juegos');
if (! is_dir($base)) {
    fail('No existe public/catalogo_juegos');
} else {
    ok('Existe public/catalogo_juegos');
}

if (is_dir($base.'/.git')) {
    fail('Sigue existiendo .git anidado en catalogo_juegos');
} else {
    ok('Sin .git anidado');
}

foreach (['fontawesome', 'bootstrap', 'nunito', 'Poppins', 'iconos'] as $dir) {
    if (is_dir($base.'/'.$dir)) {
        fail("Vendor/legacy no debería existir: catalogo_juegos/{$dir}");
    } else {
        ok("Ausente (correcto): {$dir}/");
    }
}

foreach (['Index.html', 'inicio.html', 'styleJuego.css'] as $f) {
    if (is_file($base.'/'.$f)) {
        fail("Hub legacy presente: {$f}");
    }
}

$paquetes = [
    'Polimotor/Rompecabezas',
    'Polimotor/Reconocimiento',
    'Polimotor/Lateralidad',
    'Polimotor/LaberintosDeCoordinacion',
    'Polimotor/SecuenciaDeMovimiento',
];
foreach ($paquetes as $rel) {
    $idx = $base.'/'.$rel.'/index.html';
    if (! is_file($idx)) {
        fail("Falta index.html de paquete: {$rel}");
    } else {
        ok("Paquete OK: {$rel}/index.html");
    }
}

$assetsPednia = [
    'assets/css/fontawesome/css/all.min.css',
    'assets/css/bootstrap/css/bootstrap.min.css',
    'assets/css/fonts.css',
    'assets/css/sweetalert2.min.css',
    'assets/js/jquery-4.0.0.min.js',
    'assets/js/sweetalert.js',
];
foreach ($assetsPednia as $rel) {
    if (! is_file(public_path($rel))) {
        fail("Asset PedNia faltante: {$rel}");
    } else {
        ok("Asset PedNia: {$rel}");
    }
}

$media = [
    'images/correcto.gif',
    'images/incorrecto.gif',
    'images/victoria.gif',
    'images/nube.png',
    'images/zeus_normal.gif',
    'images/zeus_hablando.gif',
    'images/zoe_normal.gif',
    'images/zoe_hablando.gif',
    'sounds/ok.mp3',
    'sounds/fondo.mp3',
];
foreach ($media as $rel) {
    if (! is_file($base.'/'.$rel)) {
        fail("Media faltante: catalogo_juegos/{$rel}");
    }
}

foreach ($paquetes as $rel) {
    $html = file_get_contents($base.'/'.$rel.'/index.html');
    if (str_contains($html, '../../bootstrap') || str_contains($html, '../../fontawesome') || str_contains($html, '../../nunito')) {
        fail("{$rel}/index.html aún apunta a vendors locales");
    }
    if (! str_contains($html, '/assets/css/fontawesome/css/all.min.css')) {
        fail("{$rel}/index.html no usa FA de PedNia");
    } else {
        ok("{$rel} retarget a /assets/…");
    }
    $css = file_get_contents($base.'/'.$rel.'/style.css');
    if (str_contains($css, '../../nunito') || str_contains($css, 'nunito_bold')) {
        fail("{$rel}/style.css aún referencia nunito local");
    }
}

echo "\n=== PASO 2: base de datos ===\n";

if (! Schema::hasTable('juegos')) {
    fail('Tabla juegos no existe');
} else {
    ok('Tabla juegos existe');
}

if (Schema::hasColumn('juegos', 'canal')) {
    fail('Columna canal aún existe (debió eliminarse)');
} else {
    ok('Sin columna canal');
}

if (! Schema::hasColumn('juegos', 'ruta')) {
    fail('Falta columna ruta en juegos');
} else {
    ok('Columna ruta presente');
}

$total = DB::table('juegos')->count();
$sinRuta = DB::table('juegos')->whereNull('ruta')->orWhere('ruta', '')->count();
$motores = DB::table('juegos')->whereIn('tipo', ['rompecabezas', 'memoria', 'colorear', 'secuencia'])->count();

echo "juegos total={$total} sin_ruta={$sinRuta} tipos_motor_legacy={$motores}\n";

if ($motores > 0) {
    fail("Hay {$motores} filas con tipos de motor (no deben estar en juegos)");
} else {
    ok('Sin filas de motores embebidos en juegos');
}

if ($sinRuta > 0) {
    warn("Hay {$sinRuta} juegos sin ruta (catálogo incompleto)");
}

$paquetesDb = DB::table('juegos')->whereNotNull('ruta')->where('ruta', '!=', '')->get(['slug', 'tipo', 'ruta', 'activo', 'nombre']);
foreach ($paquetesDb as $j) {
    $idx = public_path(trim($j->ruta, '/').'/index.html');
    if (! is_file($idx)) {
        fail("BD slug={$j->slug} ruta={$j->ruta} sin index.html en disco");
    } else {
        ok("BD slug={$j->slug} {$j->nombre} → disco OK");
    }
}

if ($paquetesDb->isEmpty()) {
    fail('No hay paquetes en BD (se esperan al menos Rompecabezas/Reconocimiento)');
}

foreach ([
    '2026_09_09_000001_create_sesiones_juego_table',
    '2026_09_09_000002_create_sesiones_juego_elementos_table',
    '2026_09_09_000003_add_canal_ruta_to_juegos_table',
    '2026_09_09_000004_juegos_solo_catalogo_paquetes',
    '2026_09_09_000005_seed_juego_lateralidad',
] as $m) {
    $ok = DB::table('migrations')->where('migration', $m)->exists();
    if ($ok) {
        ok("Migración registrada: {$m}");
    } else {
        fail("Migración NO registrada: {$m}");
    }
}

foreach (['sesiones_juego', 'sesiones_juego_elementos'] as $t) {
    if (Schema::hasTable($t)) {
        ok("Tabla {$t} existe");
    } else {
        fail("Falta tabla {$t}");
    }
}

if (Schema::hasTable('sesiones_juego') && Schema::hasColumn('sesiones_juego', 'eje_id')) {
    fail('sesiones_juego aún tiene eje_id (debió quitarse del diseño)');
}

echo "\n=== PASO 3: modelo / servicio / rutas ===\n";

try {
    $juego = App\Models\Juego::query()->whereNotNull('ruta')->first();
    if (! $juego) {
        fail('No se pudo cargar un Juego con ruta');
    } else {
        $url = $juego->urlPaquete();
        if (! $url) {
            fail('urlPaquete() devolvió null con ruta llena');
        } else {
            ok('urlPaquete()='.$url);
        }
        $label = $juego->tipoLabel();
        ok('tipoLabel()='.$label);

        $svc = new App\Services\JuegoCatalogoService;
        $tarjeta = $svc->serializarTarjeta($juego);
        foreach (['slug', 'tipo', 'ruta', 'url_paquete', 'nombre', 'cadena'] as $k) {
            if (! array_key_exists($k, $tarjeta)) {
                fail("serializarTarjeta sin clave {$k}");
            }
        }
        if (array_key_exists('canal', $tarjeta)) {
            fail('serializarTarjeta aún expone canal');
        } else {
            ok('serializarTarjeta sin canal');
        }

        $req = Illuminate\Http\Request::create('/x', 'GET', ['json' => 1, 'per_page' => 48]);
        $datos = $svc->listarDesdeRequest($req, true);
        ok('listarDesdeRequest activos total='.$datos['juegos']->total());
    }
} catch (Throwable $e) {
    fail('Excepción modelo/servicio: '.$e->getMessage());
}

$routeNames = [
    'superadmin.catalogo.juegos',
    'superadmin.catalogo.juegos.preview',
    'admin.catalogo.juegos',
    'panel.catalogo.juegos',
];
foreach ($routeNames as $name) {
    try {
        $url = route($name, $name === 'superadmin.catalogo.juegos.preview' && isset($juego)
            ? ['juego' => $juego->slug]
            : []);
        ok("Ruta {$name} → {$url}");
    } catch (Throwable $e) {
        fail("Ruta {$name}: ".$e->getMessage());
    }
}

if (isset($juego)) {
    try {
        $ctrl = app(App\Http\Controllers\SuperAdmin\JuegosSuperAdminController::class);
        $view = $ctrl->preview($juego);
        if ($view->name() !== 'superAdmin.catalogo.juegos.preview') {
            fail('preview() vista inesperada: '.$view->name());
        } else {
            $data = $view->getData();
            if (empty($data['perfilPayload']['valores'])) {
                warn('preview sin valores de perfil (¿valoresEstandar vacío?)');
            } else {
                ok('preview() OK con perfilPayload');
            }
        }
    } catch (Throwable $e) {
        fail('preview() falló: '.$e->getMessage());
    }
}

echo "\n=== PASO 4: constructor (integración modal) ===\n";

$ctorJs = public_path('assets/js/constructor-experiencia.js');
$ctorBlade = resource_path('views/partials/experiencias/_constructor.blade.php');

foreach (['urlJuegosCatalogo', 'cxModalJuegosModulo', 'aplicarJuegoCatalogo', 'cxBtnJuegosModulo', 'juego_catalogo_id'] as $needle) {
    if (! str_contains(file_get_contents($ctorJs), $needle)) {
        fail("constructor-experiencia.js sin '{$needle}'");
    } else {
        ok("JS tiene {$needle}");
    }
}

// No debe pisar juego_id con tipo de paquete (evitar match en juego_catalogo_id)
$js = file_get_contents($ctorJs);
if (preg_match('/function aplicarJuegoCatalogo\s*\([^)]*\)\s*\{([\s\S]*?)\n    \}/', $js, $m)
    && preg_match('/\bdatos\.juego_id\s*=/', $m[1])) {
    fail('aplicarJuegoCatalogo vuelve a asignar juego_id (mezclaría motor y paquete)');
} else {
    ok('aplicarJuegoCatalogo no pisa juego_id');
}

$blade = file_get_contents($ctorBlade);
foreach (['url-juegos-catalogo', 'cxModalJuegosModulo', 'formFiltrosJuegosConstructor'] as $needle) {
    if (! str_contains($blade, $needle)) {
        fail("_constructor.blade.php sin '{$needle}'");
    } else {
        ok("Blade tiene {$needle}");
    }
}

foreach ([
    App\Http\Controllers\SuperAdmin\ExperienciasSuperAdminController::class,
    App\Http\Controllers\Admin\ExperienciasAdminController::class,
    App\Http\Controllers\Panel\ExperienciasPanelController::class,
] as $class) {
    $ref = new ReflectionClass($class);
    $src = file_get_contents($ref->getFileName());
    if (! str_contains($src, "'juegos_catalogo'")) {
        fail("{$class} no inyecta juegos_catalogo en constructorUrls");
    } else {
        ok(class_basename($class).' expone juegos_catalogo');
    }
}

echo "\n=== PASO 5: constantes / deuda ===\n";

if (defined('App\Models\Juego::CANAL_BANCO') || property_exists(App\Models\Juego::class, 'CANAL_BANCO')) {
    // const check
}
$juegoSrc = file_get_contents(app_path('Models/Juego.php'));
if (str_contains($juegoSrc, 'CANAL_') || str_contains($juegoSrc, 'TIPO_ROMPECABEZAS')) {
    fail('Modelo Juego aún tiene constantes de canal/motores');
} else {
    ok('Modelo Juego limpio (solo catálogo)');
}

if (str_contains($juegoSrc, 'rompecabezas_cuerpo') && str_contains($juegoSrc, 'lateralidad')) {
    ok('TIPOS_LABELS de paquetes presentes (incl. lateralidad)');
} elseif (str_contains($juegoSrc, 'rompecabezas_cuerpo')) {
    fail('TIPOS_LABELS sin lateralidad');
}

$banco = file_get_contents(public_path('assets/js/banco-juegos.js'));
if (str_contains($banco, 'JUEGOS_MOCK') || str_contains($banco, 'memoria-animales')) {
    fail('banco-juegos.js aún usa juegos mock/genéricos');
} else {
    ok('banco-juegos.js usa catálogo PedNia');
}
if (! str_contains($banco, 'url_paquete') || ! str_contains($banco, 'bj-iframe')) {
    fail('banco-juegos.js no abre paquetes en iframe');
} else {
    ok('banco-juegos.js abre paquetes en iframe');
}

$vn = file_get_contents(public_path('assets/js/constructor-vista-nino.js'));
if (! str_contains($vn, 'juego_catalogo_url') || ! str_contains($vn, 'vn-catalogo-iframe')) {
    fail('Vista Niño no renderiza paquetes del catálogo');
} else {
    ok('Vista Niño soporta juego_catalogo_url');
}

if (str_contains(file_get_contents(resource_path('views/superAdmin/catalogo/juegos/partials/_card.blade.php')), 'target="_blank"')) {
    fail('Vista previa SuperAdmin aún abre en pestaña nueva');
} else {
    ok('Vista previa SuperAdmin usa overlay (sin target=_blank)');
}
if (! str_contains(file_get_contents(resource_path('views/superAdmin/catalogo/juegos/index.blade.php')), 'cjPreviewOverlay')) {
    fail('Falta overlay cjPreviewOverlay en index de juegos SuperAdmin');
} else {
    ok('Overlay tablet de preview presente en SuperAdmin juegos');
}

try {
    $urlCat = route('ambiente.juegos-catalogo');
    ok('Ruta ambiente.juegos-catalogo → '.$urlCat);
} catch (Throwable $e) {
    fail('Ruta ambiente.juegos-catalogo: '.$e->getMessage());
}

echo "\n========== RESUMEN ==========\n";
echo 'OK: '.count($oks)."\n";
echo 'WARN: '.count($avisos)."\n";
echo 'FAIL: '.count($fallos)."\n";

if ($fallos) {
    echo "\nFallos:\n - ".implode("\n - ", $fallos)."\n";
    exit(1);
}

echo "\nBarrido sin fallos.\n";
exit(0);
