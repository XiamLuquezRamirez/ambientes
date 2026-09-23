<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Estudiante;
use App\Services\AdaptacionKioscoService;

$con = Estudiante::query()->whereNotNull('fecha_nacimiento')->count();
$sin = Estudiante::query()->whereNull('fecha_nacimiento')->count();
echo "con_fn={$con} sin_fn={$sin}\n";

$muestras = Estudiante::query()
    ->whereNotNull('fecha_nacimiento')
    ->orderByDesc('id')
    ->limit(8)
    ->get(['id', 'nombre', 'apellido', 'fecha_nacimiento']);

$svc = app(AdaptacionKioscoService::class);
foreach ($muestras as $e) {
    $payload = $svc->payloadParaEstudiante($e);
    echo sprintf(
        "id=%d fn=%s edad_attr=%s payload=%s\n",
        $e->id,
        $e->fecha_nacimiento,
        var_export($e->edad, true),
        var_export($payload['edad'] ?? null, true)
    );
}
