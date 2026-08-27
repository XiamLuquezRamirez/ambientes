<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Services\AccesoAmbienteService;
use App\Services\SesionNinoService;
use Illuminate\Support\Facades\DB;

$ambiente = app(SesionNinoService::class)->obtenerAmbiente();
$acceso = app(AccesoAmbienteService::class);

DB::table('estudiante_ambiente')
    ->where(['ambiente_id' => $ambiente->id, 'estudiante_id' => 9, 'anio_lectivo' => 2026])
    ->update(['estado' => 'restringido']);

DB::table('estudiante_ambiente')
    ->where(['ambiente_id' => $ambiente->id, 'estudiante_id' => 5, 'anio_lectivo' => 2026])
    ->update(['estado' => 'adaptado']);

$ids = $acceso->listarParaSelector($ambiente)->pluck('id')->all();

echo "ambiente_id={$ambiente->id}\n";
echo 'selector_count='.count($ids)."\n";
echo 'selector_ids='.json_encode($ids)."\n";
echo 'incluye_restringido_9='.(in_array(9, $ids, true) ? 'SI' : 'NO')."\n";
echo 'incluye_adaptado_5='.(in_array(5, $ids, true) ? 'SI' : 'NO')."\n";

$camila = $acceso->obtenerParaKiosco($ambiente, 5);
echo 'camila_estado='.($camila?->pivot?->estado ?? 'null')."\n";
echo 'camila_adaptado='.($camila && $acceso->esAdaptado($camila) ? 'SI' : 'NO')."\n";
echo 'fabian9_kiosco='.($acceso->obtenerParaKiosco($ambiente, 9) ? 'SI' : 'NO')."\n";

// Restaurar
DB::table('estudiante_ambiente')
    ->where(['ambiente_id' => $ambiente->id, 'estudiante_id' => 9, 'anio_lectivo' => 2026])
    ->update(['estado' => 'activo']);

DB::table('estudiante_ambiente')
    ->where(['ambiente_id' => $ambiente->id, 'estudiante_id' => 5, 'anio_lectivo' => 2026])
    ->update(['estado' => 'activo']);

echo "estados_restaurados=OK\n";
