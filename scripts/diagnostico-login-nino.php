<?php

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Ambiente;
use App\Models\ConfiguracionPin;
use App\Models\FigurasModel;
use GuzzleHttp\Cookie\CookieJar;
use Illuminate\Support\Facades\Http;

$slugNodo = config('ambiente.slug');
$slug = config("ambiente.slugs_bd.{$slugNodo}", $slugNodo);
$iconosValidos = FigurasModel::iconosValidos();

echo "=== Diagnóstico login niño ===\n";
echo "AMBIENTE_SLUG (nodo): {$slugNodo}\n";
echo "AMBIENTE_SLUG (BD): {$slug}\n";
echo "Iconos válidos: ".implode(', ', $iconosValidos)."\n\n";

$ambiente = Ambiente::where('slug', $slug)->where('activo', true)->first();
if (! $ambiente) {
    echo "ERROR: Ambiente no encontrado para slug '{$slug}'\n";
    exit(1);
}

echo "Ambiente: {$ambiente->nombre} (id={$ambiente->id})\n\n";

$estudiantes = $ambiente->estudiantes()
    ->wherePivot('anio_lectivo', date('Y'))
    ->where('estudiantes.activo', true)
    ->with('configuracionPin')
    ->orderBy('nombre')
    ->get();

echo "Estudiantes asignados (".date('Y')."): {$estudiantes->count()}\n";

$candidato = null;
foreach ($estudiantes as $estudiante) {
    $pin = $estudiante->configuracionPin;
    if (! $pin) {
        echo "- [{$estudiante->id}] {$estudiante->nombre}: SIN PIN\n";
        continue;
    }

    $valido = FigurasModel::esIconoValido($pin->figura_1)
        && FigurasModel::esIconoValido($pin->figura_2)
        && FigurasModel::esIconoValido($pin->figura_3);

    $estado = $valido ? 'OK (FA)' : 'LEGACY/INVÁLIDO';
    echo "- [{$estudiante->id}] {$estudiante->nombre}: {$pin->figura_1}, {$pin->figura_2}, {$pin->figura_3} → {$estado}\n";

    if ($valido && $candidato === null) {
        $candidato = ['estudiante' => $estudiante, 'pin' => $pin];
    }
}

$pinsInvalidos = ConfiguracionPin::query()
    ->where(function ($q) use ($iconosValidos) {
        $q->whereNotIn('figura_1', $iconosValidos)
            ->orWhereNotIn('figura_2', $iconosValidos)
            ->orWhereNotIn('figura_3', $iconosValidos);
    })
    ->count();

echo "\nPINs con formato no-FA en BD: {$pinsInvalidos}\n";

if (! $candidato) {
    echo "\nNo hay estudiante con PIN válido FA para probar HTTP.\n";
    exit(0);
}

$estudiante = $candidato['estudiante'];
$pin = $candidato['pin'];
$baseUrls = array_values(array_unique(array_filter([
    rtrim(env('APP_URL', ''), '/'),
    'http://127.0.0.1:8000',
    'http://localhost:8000',
])));

echo "\n=== Prueba HTTP con estudiante [{$estudiante->id}] {$estudiante->nombre} ===\n";

$ultimoError = null;
foreach ($baseUrls as $baseUrl) {
    echo "\n--- Intentando {$baseUrl} ---\n";

    try {
        $jar = new CookieJar;
        $http = fn () => Http::withOptions(['cookies' => $jar]);

        $session = $http()->get("{$baseUrl}/alumnos/{$estudiante->id}/pin");
        echo "GET /pin: HTTP {$session->status()}\n";

        if (! $session->successful()) {
            echo "ERROR: No se pudo cargar pantalla PIN\n";
            continue;
        }

        $html = $session->body();
        $tieneFa = str_contains($html, 'fas fa-heart') || str_contains($html, 'fas fa-star');
        $tieneLegacy = str_contains($html, "seleccionarFigura('circulo')");
        echo 'Vista PIN usa FontAwesome: '.($tieneFa ? 'SÍ' : 'NO')."\n";
        echo 'Vista PIN usa claves legacy: '.($tieneLegacy ? 'SÍ (problema)' : 'NO')."\n";

        preg_match('/data-csrf="([^"]+)"/', $html, $mToken);
        if (! $mToken) {
            preg_match('/const CSRF = "([^"]+)"/', $html, $mToken);
        }
        $csrf = $mToken[1] ?? null;

        if (! $csrf) {
            echo "ERROR: No se extrajo CSRF de la vista PIN\n";
            continue;
        }

        $client = $http()->withHeaders([
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
            'X-CSRF-TOKEN' => $csrf,
            'X-Requested-With' => 'XMLHttpRequest',
        ]);

        $mal = $client->post("{$baseUrl}/alumnos/{$estudiante->id}/verificar", [
            'figura_1' => 'fas fa-circle',
            'figura_2' => 'fas fa-circle',
            'figura_3' => 'fas fa-circle',
            '_token' => $csrf,
        ]);
        echo "POST PIN incorrecto: HTTP {$mal->status()} → ".($mal->json('mensaje') ?? 'sin mensaje')."\n";

        $bien = $client->post("{$baseUrl}/alumnos/{$estudiante->id}/verificar", [
            'figura_1' => $pin->figura_1,
            'figura_2' => $pin->figura_2,
            'figura_3' => $pin->figura_3,
            '_token' => $csrf,
        ]);
        $json = $bien->json();
        echo "POST PIN correcto: HTTP {$bien->status()} → ok=".json_encode($json['ok'] ?? null).' redirect='.($json['redirect'] ?? '—')."\n";

        if (($json['ok'] ?? false) === true) {
            $listo = $http()->get($json['redirect']);
            echo 'GET /listo tras login: HTTP '.$listo->status()."\n";
            echo "\n✅ Login PIN funciona correctamente en {$baseUrl}\n";
            exit(0);
        }

        echo "❌ PIN correcto rechazado en {$baseUrl}\n";
    } catch (Throwable $e) {
        $ultimoError = $e->getMessage();
        echo "ERROR HTTP: {$ultimoError}\n";
    }
}

echo "\n❌ No se pudo verificar login HTTP.";
if ($ultimoError) {
    echo " Último error: {$ultimoError}";
}
echo "\n¿Está corriendo php artisan serve?\n";
exit(1);
