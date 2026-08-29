<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Estudiante;
use App\Services\RecorridoNinoService;
use App\Services\SesionNinoService;
use Illuminate\Http\Request;

$sesion = app(SesionNinoService::class);
$recorrido = app(RecorridoNinoService::class);
$ambiente = $sesion->obtenerAmbiente();
$arbol = $recorrido->armarArbol($ambiente);

echo "ambiente={$ambiente->slug}\n";
echo 'modulos='.count($arbol['modulos'])."\n";
foreach ($arbol['modulos'] as $m) {
    echo "- modulo {$m['id']}: {$m['nombre']} (ejes={$m['ejes_count']})\n";
}

// Simular request autenticado a /inicio
$estudiante = Estudiante::find(13);
$request = Request::create('/inicio', 'GET');
$request->setLaravelSession($app['session']->driver());
$request->session()->put('estudiante_id', $estudiante->id);
$request->attributes->set('estudiante_nino', $estudiante);

$controller = app(\App\Http\Controllers\Ambientes\AmbienteNinoController::class);
$response = $controller->inicio($request);
$view = $response->name();
$data = $response->getData();

echo "vista={$view}\n";
echo 'modo='.($data['modo'] ?? 'n/a')."\n";
echo 'url_experiencia='.($data['urlExperienciaTemplate'] ?? 'n/a')."\n";
echo 'estudiante='.($data['estudiante']->nombre ?? 'n/a')."\n";
echo 'tiene_portada='.(! empty($data['portadaImg']) ? 'SI' : 'NO')."\n";

// HTTP sin sesión
$sinSesion = $kernel->handle(Request::create('http://127.0.0.1:8000/inicio', 'GET'));
echo 'inicio_sin_sesion_status='.$sinSesion->getStatusCode()."\n";
echo 'inicio_sin_sesion_location='.$sinSesion->headers->get('Location')."\n";
