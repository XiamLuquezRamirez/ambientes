<?php

/**
 * Barrido de validación: tipos de juego (catálogo SuperAdmin).
 * Uso: php scripts/barrido-tipos-juegos.php
 */

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\SuperAdmin\TiposJuegosSuperAdminController;
use App\Models\Juego;
use App\Models\TiposJuego;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

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

function archivoDebeContener(string $path, string $needle, string $label): void
{
    if (! is_file($path)) {
        fail("No existe {$label}: {$path}");

        return;
    }
    $src = file_get_contents($path);
    if (! str_contains($src, $needle)) {
        fail("{$label} no contiene '{$needle}'");
    } else {
        ok("{$label} tiene {$needle}");
    }
}

function archivoNoDebeContener(string $path, string $needle, string $label): void
{
    if (! is_file($path)) {
        return;
    }
    if (str_contains(file_get_contents($path), $needle)) {
        fail("{$label} aún contiene '{$needle}'");
    } else {
        ok("{$label} sin {$needle}");
    }
}

echo "=== PASO 1: filesystem / patrón ===\n";

$archivos = [
    'controller' => app_path('Http/Controllers/SuperAdmin/TiposJuegosSuperAdminController.php'),
    'model' => app_path('Models/TiposJuego.php'),
    'js' => public_path('assets/js/superAdmin/tipos-juegos.js'),
    'index' => resource_path('views/superAdmin/catalogo_juegos/tipos_juegos/index.blade.php'),
    'tabla' => resource_path('views/superAdmin/catalogo_juegos/tipos_juegos/_tabla.blade.php'),
    'modal' => resource_path('views/superAdmin/catalogo_juegos/tipos_juegos/modalCrearTipo.blade.php'),
    'layout' => resource_path('views/layouts/superAdmin.blade.php'),
    'web' => base_path('routes/web.php'),
];

foreach ($archivos as $label => $path) {
    if (is_file($path)) {
        ok("Existe {$label}");
    } else {
        fail("Falta {$label}: {$path}");
    }
}

$ctrlSrc = is_file($archivos['controller']) ? file_get_contents($archivos['controller']) : '';
$jsSrc = is_file($archivos['js']) ? file_get_contents($archivos['js']) : '';
$indexSrc = is_file($archivos['index']) ? file_get_contents($archivos['index']) : '';
$tablaSrc = is_file($archivos['tabla']) ? file_get_contents($archivos['tabla']) : '';
$modalSrc = is_file($archivos['modal']) ? file_get_contents($archivos['modal']) : '';
$modelSrc = is_file($archivos['model']) ? file_get_contents($archivos['model']) : '';
$webSrc = is_file($archivos['web']) ? file_get_contents($archivos['web']) : '';
$layoutSrc = is_file($archivos['layout']) ? file_get_contents($archivos['layout']) : '';

foreach (['function listar', 'function guardar', 'function mostrar', 'function actualizar', 'function actualizarEstado', 'function generarSlugUnico'] as $fn) {
    if (str_contains($ctrlSrc, $fn)) {
        ok("Controller {$fn}");
    } else {
        fail("Controller sin {$fn}");
    }
}

foreach (['function preview', 'function eliminar', 'function cambiarEstado', 'function ver('] as $fn) {
    if (preg_match('/'.preg_quote($fn, '/').'/', $ctrlSrc)) {
        fail("Controller aún tiene {$fn} (no es patrón de catálogo)");
    } else {
        ok("Controller sin {$fn}");
    }
}

if (str_contains($ctrlSrc, "->route('superadmin.tipos_juegos") || str_contains($ctrlSrc, 'redirect()')) {
    fail('Controller aún redirige o usa nombres legacy superadmin.tipos_juegos');
} else {
    ok('Controller solo JSON (sin redirect legacy)');
}

if (str_contains($modelSrc, "hasMany(Juego::class, 'tipo_juego_id')")) {
    ok('Modelo TiposJuego::juegos()');
} else {
    fail('Modelo sin relación juegos()');
}

foreach (['X-CSRF-TOKEN', "method: 'PATCH'", 'cargarTabla', 'btn-editar', 'toggle-activo'] as $needle) {
    archivoDebeContener($archivos['js'], $needle, 'tipos-juegos.js');
}

foreach (['window.location.reload', 'tipoPost', 'btn-eliminar', 'URL_TIPOS_JUEGOS', 'validation.email'] as $needle) {
    archivoNoDebeContener($archivos['js'], $needle, 'tipos-juegos.js');
}

archivoDebeContener($archivos['index'], 'tiposJuegosPage', 'index.blade.php');
archivoDebeContener($archivos['index'], 'assets/js/superAdmin/tipos-juegos.js', 'index.blade.php');
archivoDebeContener($archivos['index'], "route('superadmin.catalogo_juegos.tipos.index')", 'index.blade.php');
archivoNoDebeContener($archivos['index'], 'superadmin.tipos_juegos', 'index.blade.php');
archivoNoDebeContener($archivos['index'], 'var tipoPost', 'index.blade.php');
archivoNoDebeContener($archivos['index'], 'function guardarTipoJuego', 'index.blade.php');

if (str_contains($indexSrc, 'tipos-juegos.js') && str_contains($indexSrc, "@push('scripts')")) {
    ok('index carga JS externo vía @push scripts');
} else {
    fail('index no carga tipos-juegos.js vía @push scripts');
}

archivoNoDebeContener($archivos['tabla'], 'btn-eliminar', '_tabla.blade.php');
archivoDebeContener($archivos['tabla'], 'toggle-activo', '_tabla.blade.php');
archivoDebeContener($archivos['tabla'], 'data-juegos-count', '_tabla.blade.php');
archivoDebeContener($archivos['tabla'], 'btn-editar', '_tabla.blade.php');

archivoDebeContener($archivos['modal'], '@csrf', 'modal');
archivoDebeContener($archivos['modal'], 'formCrearTipoJuego', 'modal');
archivoNoDebeContener($archivos['modal'], 'modal-xl', 'modal');

archivoDebeContener($archivos['layout'], 'superadmin.catalogo_juegos.tipos.index', 'layout');
archivoNoDebeContener($archivos['layout'], 'superadmin.tipos_juegos', 'layout');

if (str_contains($webSrc, 'tipos_juegos.preview') || str_contains($webSrc, "TiposJuegosSuperAdminController::class, 'preview'")) {
    fail('routes/web.php aún registra preview de tipos');
} else {
    ok('Rutas sin preview de tipos');
}

if (preg_match("/TiposJuegosSuperAdminController::class, 'eliminar'/", $webSrc)) {
    fail('routes/web.php registra eliminar de tipos');
} else {
    ok('Rutas sin eliminar de tipos');
}

if (str_contains($webSrc, 'superadmin.tipos_juegos.')) {
    fail('routes/web.php aún usa nombres superadmin.tipos_juegos.*');
} else {
    ok('Nombres de ruta catalogo_juegos.tipos.*');
}

echo "\n=== PASO 2: rutas Laravel ===\n";

$esperadas = [
    'superadmin.catalogo_juegos.tipos.index' => ['GET', 'listar'],
    'superadmin.catalogo_juegos.tipos.guardar' => ['POST', 'guardar'],
    'superadmin.catalogo_juegos.tipos.mostrar' => ['GET', 'mostrar'],
    'superadmin.catalogo_juegos.tipos.actualizar' => ['PUT', 'actualizar'],
    'superadmin.catalogo_juegos.tipos.estado' => ['PATCH', 'actualizarEstado'],
];

foreach ($esperadas as $name => [$method, $action]) {
    try {
        $route = Route::getRoutes()->getByName($name);
        if (! $route) {
            fail("No existe ruta {$name}");

            continue;
        }
        $okMethod = in_array($method, array_map('strtoupper', $route->methods()), true);
        $actionOk = str_ends_with($route->getActionName(), '@'.$action);
        $uri = $route->uri();
        if ($okMethod && $actionOk) {
            ok("{$method} {$name} → {$action} ({$uri})");
        } else {
            fail("{$name} method/action inesperados: ".implode('|', $route->methods()).' '.$route->getActionName());
        }
        if (in_array($action, ['mostrar', 'actualizar', 'actualizarEstado'], true)
            && ! str_contains($uri, '{tipoJuego}')) {
            fail("{$name} no usa {tipoJuego} (binding roto)");
        }
    } catch (Throwable $e) {
        fail("Ruta {$name}: ".$e->getMessage());
    }
}

foreach (['superadmin.tipos_juegos.index', 'superadmin.tipos_juegos.preview', 'superadmin.tipos_juegos.ver'] as $legacy) {
    if (Route::getRoutes()->getByName($legacy)) {
        fail("Ruta legacy aún registrada: {$legacy}");
    } else {
        ok("Sin ruta legacy {$legacy}");
    }
}

$ref = new ReflectionClass(TiposJuegosSuperAdminController::class);
foreach (['actualizar', 'mostrar', 'actualizarEstado'] as $method) {
    $params = $ref->getMethod($method)->getParameters();
    $found = false;
    foreach ($params as $p) {
        if ($p->getName() === 'tipoJuego' && $p->getType()?->getName() === TiposJuego::class) {
            $found = true;
        }
    }
    if ($found) {
        ok("Binding {$method}(TiposJuego \$tipoJuego)");
    } else {
        fail("{$method} no type-hinta TiposJuego \$tipoJuego");
    }
}

echo "\n=== PASO 3: esquema y datos ===\n";

if (! Schema::hasTable('tipos_juegos')) {
    fail('Tabla tipos_juegos no existe');
} else {
    ok('Tabla tipos_juegos existe');
    foreach (['id', 'slug', 'nombre', 'descripcion', 'activo'] as $col) {
        if (Schema::hasColumn('tipos_juegos', $col)) {
            ok("Columna tipos_juegos.{$col}");
        } else {
            fail("Falta columna tipos_juegos.{$col}");
        }
    }
}

if (Schema::hasTable('juegos')) {
    if (Schema::hasColumn('juegos', 'tipo_juego_id')) {
        ok('juegos.tipo_juego_id presente');
    } else {
        fail('juegos sin tipo_juego_id');
    }
    if (Schema::hasColumn('juegos', 'tipo')) {
        warn('juegos aún tiene columna tipo (fuente duplicada vs tipo_juego_id)');
    } else {
        ok('juegos sin columna tipo (solo tipo_juego_id)');
    }
}

$totalTipos = TiposJuego::query()->count();
$activos = TiposJuego::query()->where('activo', true)->count();
echo "tipos total={$totalTipos} activos={$activos}\n";

if ($totalTipos < 1) {
    fail('No hay tipos de juego en BD');
} else {
    ok("Hay {$totalTipos} tipos en BD");
}

$slugs = TiposJuego::query()->pluck('slug');
if ($slugs->count() !== $slugs->unique()->count()) {
    fail('Hay slugs duplicados en tipos_juegos');
} else {
    ok('Slugs únicos');
}

$slugsInvalidos = $slugs->filter(fn ($s) => ! preg_match('/^[a-z][a-z0-9_]*$/', (string) $s));
if ($slugsInvalidos->isNotEmpty()) {
    fail('Slugs fuera de snake_case: '.$slugsInvalidos->implode(', '));
} else {
    ok('Slugs en snake_case (compatible con Juego::tipoEsValido)');
}

$huerfanos = 0;
$juegosSinTipo = 0;
if (Schema::hasColumn('juegos', 'tipo_juego_id')) {
    $ids = TiposJuego::query()->pluck('id');
    $huerfanos = Juego::query()
        ->whereNotNull('tipo_juego_id')
        ->whereNotIn('tipo_juego_id', $ids)
        ->count();
    $juegosSinTipo = Juego::query()->whereNull('tipo_juego_id')->count();
    if ($huerfanos > 0) {
        fail("Hay {$huerfanos} juegos con tipo_juego_id huérfano");
    } else {
        ok('Sin juegos huérfanos de tipo');
    }
    if ($juegosSinTipo > 0) {
        warn("Hay {$juegosSinTipo} juegos sin tipo_juego_id");
    }
}

$conteos = TiposJuego::query()->withCount('juegos')->get();
foreach ($conteos as $tipo) {
    ok("{$tipo->slug} → {$tipo->juegos_count} juego(s)");
}

echo "\n=== PASO 4: CRUD controlador (transacción) ===\n";

$controller = app(TiposJuegosSuperAdminController::class);

try {
    DB::beginTransaction();

    $reqListar = Request::create('/superadmin/catalogo_juegos/tipos', 'GET');
    $reqListar->headers->set('X-Requested-With', 'XMLHttpRequest');
    $reqListar->headers->set('Accept', 'application/json');
    $listar = $controller->listar($reqListar);
    $payloadListar = $listar->getData(true);
    if (! empty($payloadListar['success']) && str_contains((string) ($payloadListar['html'] ?? ''), 'toggle-activo')) {
        ok('listar AJAX devuelve html de tabla');
    } else {
        fail('listar AJAX no devolvió html esperado');
    }

    $vista = $controller->listar(Request::create('/superadmin/catalogo_juegos/tipos', 'GET'));
    if (method_exists($vista, 'name') && $vista->name() === 'superAdmin.catalogo_juegos.tipos_juegos.index') {
        ok('listar no-AJAX → vista index');
    } else {
        fail('listar no-AJAX vista inesperada');
    }

    $reqActivo0 = Request::create('/superadmin/catalogo_juegos/tipos', 'GET', ['activo' => '0']);
    $reqActivo0->headers->set('X-Requested-With', 'XMLHttpRequest');
    $reqActivo0->headers->set('Accept', 'application/json');
    $filtro0 = $controller->listar($reqActivo0)->getData(true);
    if (empty($filtro0['success'])) {
        fail('Filtro activo=0 no responde success');
    } else {
        ok('Filtro activo=0 no se traga filled() (PHP empty("0"))');
    }

    $nombre = 'Barrido Tipo '.uniqid();
    $reqGuardar = Request::create('/superadmin/catalogo_juegos/tipos', 'POST', [
        'nombre' => $nombre,
        'descripcion' => 'Creado por barrido',
    ]);
    $reqGuardar->headers->set('Accept', 'application/json');
    $guardar = $controller->guardar($reqGuardar);
    $payloadGuardar = $guardar->getData(true);
    $slug = $payloadGuardar['data']['slug'] ?? '';
    if ($guardar->getStatusCode() === 201 && ! empty($payloadGuardar['success']) && preg_match('/^[a-z][a-z0-9_]*$/', $slug)) {
        ok("guardar 201 slug={$slug}");
    } else {
        fail('guardar no creó tipo con slug snake_case');
    }

    $tipo = TiposJuego::query()->find($payloadGuardar['data']['id'] ?? 0);
    if (! $tipo) {
        fail('No se encontró el tipo recién creado');
        throw new RuntimeException('abort CRUD');
    }

    $catalogo = Juego::tiposCatalogo();
    if (isset($catalogo[$tipo->slug]) && $catalogo[$tipo->slug] === $tipo->nombre) {
        ok('tiposCatalogo() incluye el tipo nuevo (slug → nombre)');
    } else {
        fail('tiposCatalogo() no incluye el tipo recién creado');
    }

    $mostrar = $controller->mostrar($tipo)->getData(true);
    foreach (['id', 'slug', 'nombre', 'descripcion', 'activo', 'juegos_count'] as $k) {
        if (! array_key_exists($k, $mostrar['data'] ?? [])) {
            fail("mostrar() sin clave {$k}");
        }
    }
    if (($mostrar['data']['nombre'] ?? null) === $nombre) {
        ok('mostrar() serializa el tipo');
    }

    $slugAntes = $tipo->slug;
    $reqUp = Request::create('/superadmin/catalogo_juegos/tipos/'.$tipo->id, 'PUT', [
        'nombre' => $nombre.' editado',
        'descripcion' => 'Actualizado',
    ]);
    $controller->actualizar($reqUp, $tipo);
    $tipo->refresh();
    if ($tipo->nombre === $nombre.' editado' && $tipo->slug === $slugAntes) {
        ok('actualizar cambia nombre y conserva slug');
    } else {
        fail("actualizar regeneró slug ({$slugAntes} → {$tipo->slug}) o no cambió nombre");
    }

    $activoAntes = $tipo->activo;
    $estado = $controller->actualizarEstado($tipo)->getData(true);
    $tipo->refresh();
    if ($tipo->activo !== $activoAntes && array_key_exists('juegos_count', $estado)) {
        ok('actualizarEstado alterna activo y expone juegos_count');
    } else {
        fail('actualizarEstado no alternó activo');
    }

    if ($tipo->activo === false && ! array_key_exists($tipo->slug, Juego::tiposCatalogo())) {
        ok('tiposCatalogo() oculta tipos inactivos');
    } else {
        fail('tiposCatalogo() aún muestra el tipo inactivo');
    }

    $controller->actualizarEstado($tipo);

    $reqDup = Request::create('/superadmin/catalogo_juegos/tipos', 'POST', [
        'nombre' => $tipo->nombre,
        'descripcion' => 'dup',
    ]);
    $reqDup->headers->set('Accept', 'application/json');
    try {
        $controller->guardar($reqDup);
        fail('guardar aceptó nombre duplicado');
    } catch (ValidationException $e) {
        ok('guardar rechaza nombre duplicado');
    }

    $reqVacio = Request::create('/superadmin/catalogo_juegos/tipos', 'POST', [
        'nombre' => '???',
        'descripcion' => '',
    ]);
    $reqVacio->headers->set('Accept', 'application/json');
    try {
        $controller->guardar($reqVacio);
        fail('guardar aceptó nombre que no produce slug');
    } catch (ValidationException $e) {
        ok('guardar rechaza nombre sin slug válido');
    }

    $reqColision = Request::create('/superadmin/catalogo_juegos/tipos', 'POST', [
        'nombre' => 'Barrido  Colision',
        'descripcion' => '',
    ]);
    $controller->guardar($reqColision);
    $reqColision2 = Request::create('/superadmin/catalogo_juegos/tipos', 'POST', [
        'nombre' => 'Barrido-Colision',
        'descripcion' => '',
    ]);
    $colision = $controller->guardar($reqColision2)->getData(true);
    $slug2 = $colision['data']['slug'] ?? '';
    if ($slug2 !== '' && $slug2 !== 'barrido_colision' && str_starts_with($slug2, 'barrido_colision')) {
        ok("slug colisiona con sufijo único ({$slug2})");
    } else {
        fail("slug de colisión inesperado: {$slug2}");
    }

    DB::rollBack();
    ok('CRUD revertido (rollback)');
} catch (Throwable $e) {
    DB::rollBack();
    fail('Excepción CRUD: '.$e->getMessage());
}

$restos = TiposJuego::query()
    ->where(function ($q) {
        $q->where('nombre', 'like', 'Barrido%')
            ->orWhere('nombre', 'like', 'Tipo QA %')
            ->orWhere('nombre', 'like', 'Coordinacion QA%')
            ->orWhere('slug', 'like', '%_qa')
            ->orWhere('slug', 'like', 'barrido_%');
    })
    ->count();
if ($restos > 0) {
    warn("Quedan {$restos} tipos de prueba (Barrido/QA) en BD");
} else {
    ok('Sin restos de tipos de prueba en BD');
}

echo "\n=== PASO 5: integración con juegos ===\n";

try {
    $juegoConTipo = Juego::query()->whereNotNull('tipo_juego_id')->first();
    if (! $juegoConTipo) {
        warn('No hay juegos con tipo_juego_id para probar tipoLabel()');
    } else {
        $label = $juegoConTipo->tipoLabel();
        if (is_string($label) && $label !== '') {
            ok("tipoLabel()='{$label}' para {$juegoConTipo->slug}");
        } else {
            fail('tipoLabel() vacío');
        }
    }
} catch (Throwable $e) {
    fail('tipoLabel() lanzó: '.$e->getMessage());
}

$juegoSrc = file_get_contents(app_path('Models/Juego.php'));
if (preg_match('/function tipoLabel\(\)[^{]*\{([\s\S]*?)\n    \}/', $juegoSrc, $m)
    && str_contains($m[1], "where('activo'")) {
    fail('tipoLabel() filtra activo: un tipo desactivado rompe el catálogo de juegos');
} else {
    ok('tipoLabel() no depende de activo');
}

$svcSrc = file_get_contents(app_path('Services/JuegoCatalogoService.php'));
if (str_contains($svcSrc, "'tipo' => (string) \$datos['tipo']") && ! str_contains($svcSrc, 'tipo_juego_id')) {
    fail('JuegoCatalogoService escribe columna tipo en vez de resolver tipo_juego_id');
} elseif (! str_contains($svcSrc, 'tipo_juego_id')) {
    warn('JuegoCatalogoService no referencia tipo_juego_id');
} else {
    ok('JuegoCatalogoService usa tipo_juego_id');
}

$ctrlJuegos = file_get_contents(app_path('Http/Controllers/SuperAdmin/JuegosSuperAdminController.php'));
if (str_contains($ctrlJuegos, "'tipo' => \$juego->tipo") && ! str_contains($ctrlJuegos, 'tipoJuego')) {
    warn('JuegosSuperAdminController::mostrar expone juego.tipo sin cargar tipoJuego');
} else {
    ok('JuegosSuperAdminController::mostrar carga tipoJuego y expone slug vía tipo');
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
