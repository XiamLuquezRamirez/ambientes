<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\FigurasModel;
use App\Services\ClaseKioscoService;
use App\Services\RecorridoNinoService;
use App\Services\SesionNinoService;
use Illuminate\Http\Request;

$sesion = app(SesionNinoService::class);
$claseKiosco = app(ClaseKioscoService::class);
$recorrido = app(RecorridoNinoService::class);

$ambiente = $sesion->obtenerAmbiente();
$clase = $claseKiosco->claseActivaHoy($ambiente);

echo "=== Recorrido acotado ===\n";
if (! $clase) {
    echo "SKIP: no hay clase activa única\n";
    exit(0);
}

$arbolFull = $recorrido->armarArbol($ambiente);
$arbolClase = $recorrido->armarArbol($ambiente, null, $clase);

echo "Módulos sin filtro: ".count($arbolFull['modulos'])."\n";
echo "Módulos con clase: ".count($arbolClase['modulos'])."\n";

$mod = $arbolClase['modulos'][0] ?? null;
if ($mod) {
    echo "Módulo clase: id={$mod['id']} esperado={$clase->modulo_id} ".((int)$mod['id'] === (int)$clase->modulo_id ? 'OK' : 'FAIL')."\n";
    $eje = $mod['ejes'][0] ?? null;
    if ($eje) {
        echo "Eje: id={$eje['id']} esperado={$clase->eje_id} ".((int)$eje['id'] === (int)$clase->eje_id ? 'OK' : 'FAIL')."\n";
        $tem = $eje['tematicas'][0] ?? null;
        if ($tem) {
            echo "Temática exp_id={$tem['experiencia_id']} esperado={$clase->experiencia_id} ".((int)$tem['experiencia_id'] === (int)$clase->experiencia_id ? 'OK' : 'FAIL')."\n";
        }
    }
}

$estudiantes = $claseKiosco->estudiantesDeClase($clase);
$candidato = null;
foreach ($estudiantes as $e) {
    $pin = $e->configuracionPin;
    if ($pin && FigurasModel::esIconoValido($pin->figura_1)) {
        $candidato = $e;
        break;
    }
}

if (! $candidato) {
    echo "\nSKIP HTTP: ningún estudiante de la clase con PIN FA\n";
    exit(0);
}

echo "\n=== Flujo sesión simulada (estudiante {$candidato->id}) ===\n";
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$session = $app['session']->driver();
$session->start();
$session->put(SesionNinoService::SESSION_ESTUDIANTE_ID, $candidato->id);
$session->put(SesionNinoService::SESSION_CLASE_ID, $clase->id);
$session->put(SesionNinoService::SESSION_ESTADO_AMBIENTE, 'activo');
$session->save();

$cookieName = config('session.cookie');
$cookieValue = $session->getId();

$reqRec = Request::create('/recorrido', 'GET', [], [$cookieName => $cookieValue]);
$reqRec->setLaravelSession($session);
$resRec = $kernel->handle($reqRec);
echo "/recorrido => {$resRec->getStatusCode()}\n";
$bodyRec = $resRec->getContent();
echo (str_contains($bodyRec, 'data-modo="sesion"') ? 'OK' : 'FAIL').": modo sesion\n";
echo (str_contains($bodyRec, 'data-ui="camino-lineal"') ? 'OK' : 'FAIL').": ui camino-lineal\n";
echo (str_contains($bodyRec, 'data-paso-inicial="camino"') ? 'OK' : 'FAIL').": paso camino\n";
echo (str_contains($bodyRec, 'id="rn-camino"') ? 'OK' : 'FAIL').": payload camino\n";
$kernel->terminate($reqRec, $resRec);

$expId = (int) $clase->experiencia_id;
$reqExpOk = Request::create("/experiencia/{$expId}", 'GET', [], [$cookieName => $cookieValue]);
$reqExpOk->setLaravelSession($session);
$resExpOk = $kernel->handle($reqExpOk);
echo "/experiencia/{$expId} => {$resExpOk->getStatusCode()} ".($resExpOk->getStatusCode() === 200 ? 'OK' : 'FAIL')."\n";
$kernel->terminate($reqExpOk, $resExpOk);

$reqExpBad = Request::create('/experiencia/1', 'GET', [], [$cookieName => $cookieValue]);
$reqExpBad->setLaravelSession($session);
$resExpBad = $kernel->handle($reqExpBad);
echo "/experiencia/1 (otra) => {$resExpBad->getStatusCode()} ".(in_array($resExpBad->getStatusCode(), [403, 404], true) ? 'OK bloqueada' : 'FAIL')."\n";
$kernel->terminate($reqExpBad, $resExpBad);

$reqListo = Request::create('/listo', 'GET', [], [$cookieName => $cookieValue]);
$reqListo->setLaravelSession($session);
$resListo = $kernel->handle($reqListo);
echo "/listo => {$resListo->getStatusCode()} ".($resListo->getStatusCode() === 200 ? 'OK' : 'FAIL')."\n";
$kernel->terminate($reqListo, $resListo);

echo "\n=== experienciaPermitidaEnSesion ===\n";
$exp = App\Models\Experiencia::find($expId);
$permOk = $recorrido->experienciaPermitidaEnSesion(['ambiente_id' => $ambiente->id, 'experiencia_id' => $expId], $exp);
$permBad = $recorrido->experienciaPermitidaEnSesion(['ambiente_id' => $ambiente->id, 'experiencia_id' => 1], App\Models\Experiencia::find(1) ?? new App\Models\Experiencia(['id' => 1]));
echo "Clase exp: ".($permOk ? 'OK' : 'FAIL')."\n";
echo "Otra exp: ".($permBad ? 'FAIL' : 'OK bloqueada')."\n";

echo "\nDone.\n";
