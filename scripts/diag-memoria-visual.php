<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Juego;

$juegos = Juego::query()
    ->with(['ambiente:id,nombre'])
    ->where('nombre', 'like', '%emoria%')
    ->get();

foreach ($juegos as $j) {
    echo json_encode([
        'id' => $j->id,
        'nombre' => $j->nombre,
        'slug' => $j->slug,
        'ruta' => $j->ruta,
        'ambiente' => $j->ambiente?->nombre,
        'activo' => $j->activo,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES).PHP_EOL;
}
