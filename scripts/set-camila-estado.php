<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$accion = $argv[1] ?? 'adaptado';
$estado = $accion === 'activo' ? 'activo' : 'adaptado';

DB::table('estudiante_ambiente')
    ->where(['ambiente_id' => 6, 'estudiante_id' => 5, 'anio_lectivo' => 2026])
    ->update(['estado' => $estado]);

echo "camila_estado={$estado}\n";
