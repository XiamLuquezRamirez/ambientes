<?php

/**
 * Asigna la IP LAN actual al pivot ambiente_institucion de Expresión Artística (prueba tablet).
 *
 * Uso:
 *   php scripts/asignar-ip-ambiente-lan.php           # solo muestra
 *   php scripts/asignar-ip-ambiente-lan.php --aplicar # actualiza BD
 */

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Ambiente;
use App\Services\SesionNinoService;

$aplicar = in_array('--aplicar', $argv ?? [], true);
$sesion = app(SesionNinoService::class);
$request = Illuminate\Http\Request::create('/', 'GET', [], [], [], ['SERVER_ADDR' => '0.0.0.0']);
$ipsLan = array_values(array_filter(
    $sesion->ipsCandidatasNodo($request),
    fn ($ip) => ! str_starts_with($ip, '127.') && $ip !== '0.0.0.0' && $ip !== '::1'
));

echo "=== IP LAN del nodo ===\n";
if ($ipsLan === []) {
    echo "No se detectó IP LAN privada.\n";
    exit(1);
}
$ipLan = $ipsLan[0];
echo "IP principal: {$ipLan}\n";
echo "Todas: ".implode(', ', $ipsLan)."\n\n";

$slug = config('ambiente.slugs_bd.'.config('ambiente.slug'), config('ambiente.slug'));
$ambiente = Ambiente::query()->where('slug', $slug)->first();
if (! $ambiente) {
    echo "Ambiente no encontrado para slug {$slug}\n";
    exit(1);
}

$pivot = DB::table('ambiente_institucion')
    ->where('ambiente_id', $ambiente->id)
    ->where('activo', true)
    ->first();

if (! $pivot) {
    echo "No hay fila activa en ambiente_institucion para {$ambiente->nombre}\n";
    exit(1);
}

echo "Ambiente nodo (.env): {$ambiente->nombre}\n";
echo "IP actual en ambiente_institucion: ".($pivot->ip ?: 'NULL')."\n\n";

$diagAntes = $sesion->diagnosticarResolucionAmbiente($request);
echo "Resolución ANTES: fuente={$diagAntes['fuente']} ip=".($diagAntes['ip'] ?? 'null')." ambiente={$diagAntes['ambiente']?->nombre}\n";

if (! $aplicar) {
    echo "\nPara asignar {$ipLan} en ambiente_institucion:\n";
    echo "  php scripts/asignar-ip-ambiente-lan.php --aplicar\n";
    exit(0);
}

DB::table('ambiente_institucion')
    ->where('id', $pivot->id)
    ->update(['ip' => $ipLan, 'updated_at' => now()]);

echo "\nActualizado ambiente_institucion.id={$pivot->id} → ip={$ipLan}\n";

$diagDespues = $sesion->diagnosticarResolucionAmbiente($request);
echo "Resolución DESPUÉS: fuente={$diagDespues['fuente']} ip=".($diagDespues['ip'] ?? 'null')." ambiente={$diagDespues['ambiente']?->nombre}\n";

if ($diagDespues['fuente'] !== 'ambiente_institucion') {
    echo "ADVERTENCIA: aún no resuelve por pivot.\n";
    exit(1);
}

echo "\nOK. En tablet abre: http://{$ipLan}:8000/kiosco/diagnostico-ip\n";
