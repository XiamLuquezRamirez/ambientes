<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

function hit($kernel, $path, $method = 'GET', $server = []) {
    $req = Illuminate\Http\Request::create($path, $method, [], [], [], $server);
    $res = $kernel->handle($req);
    $loc = $res->headers->get('Location') ?? '';
    echo "$path => {$res->getStatusCode()}".($loc ? " -> $loc" : '')."\n";
    $kernel->terminate($req, $res);
    return $res;
}

echo "=== Rutas kiosco ===\n";
hit($kernel, '/');
hit($kernel, '/inicio');
hit($kernel, '/alumnos');
hit($kernel, '/login');
hit($kernel, '/listo');
hit($kernel, '/recorrido');

echo "\n=== Contenido /inicio ===\n";
$req = Illuminate\Http\Request::create('/inicio', 'GET');
$res = $kernel->handle($req);
$b = $res->getContent();
foreach (['data-modo="portada"', 'data-url-continuar="/alumnos"', 'rnBtnIniciarAmbiente'] as $m) {
    echo (str_contains($b, $m) ? "OK" : "MISSING").": $m\n";
}
$kernel->terminate($req, $res);

echo "\n=== Contenido /alumnos ===\n";
$req = Illuminate\Http\Request::create('/alumnos', 'GET');
$res = $kernel->handle($req);
$b = $res->getContent();
if (str_contains($b, 'Hoy no hay clase')) {
    echo "Sin clase activa hoy (esperado si no hay clase activa)\n";
} elseif (str_contains($b, 'Quién eres')) {
    echo "Lista de estudiantes visible\n";
} else {
    echo "Respuesta inesperada\n";
}
$kernel->terminate($req, $res);

echo "\n=== BD: clases activas hoy ===\n";
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
$hoy = date('Y-m-d');
$activas = App\Models\Clase::query()
    ->where('estado', 'activa')
    ->whereDate('fecha', $hoy)
    ->with(['cargaDocente.grado', 'cargaDocente.grupo', 'ambiente'])
    ->get();
echo "Total activas hoy: {$activas->count()}\n";
foreach ($activas as $c) {
    $g = $c->cargaDocente?->grado?->nombre ?? '?';
    $gr = $c->cargaDocente?->grupo?->nombre ?? '?';
    echo "  id={$c->id} ambiente={$c->ambiente?->nombre} {$g} {$gr} exp={$c->experiencia_id}\n";
}

echo "\n=== ClaseKioscoService ===\n";
try {
    $ambiente = app(App\Services\SesionNinoService::class)->obtenerAmbiente();
    echo "Ambiente nodo: {$ambiente->nombre} (slug={$ambiente->slug})\n";
    $clase = app(App\Services\ClaseKioscoService::class)->claseActivaHoy($ambiente);
    if ($clase) {
        $n = app(App\Services\ClaseKioscoService::class)->estudiantesDeClase($clase)->count();
        echo "Clase activa id={$clase->id} estudiantes={$n}\n";
    } else {
        echo "No hay exactamente 1 clase activa hoy para este ambiente\n";
    }
} catch (Throwable $e) {
    echo "ERROR: ".$e->getMessage()."\n";
}
