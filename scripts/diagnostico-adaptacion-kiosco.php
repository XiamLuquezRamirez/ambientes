<?php

/**
 * Barrido de adaptación por perfil en la vista del niño.
 * Uso: php scripts/diagnostico-adaptacion-kiosco.php
 */

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Estudiante;
use App\Models\FigurasModel;
use App\Services\AdaptacionKioscoService;
use App\Services\ClaseKioscoService;
use App\Services\ParametrosPerfilAprendizajeService;
use App\Services\SesionNinoService;
use Illuminate\Http\Request;

$ok = 0;
$fail = 0;
$warn = 0;

function assertTrue(bool $cond, string $label): void
{
    global $ok, $fail;
    if ($cond) {
        echo "  OK  {$label}\n";
        $ok++;
    } else {
        echo " FAIL {$label}\n";
        $fail++;
    }
}

function assertWarn(bool $cond, string $label): void
{
    global $ok, $warn;
    if ($cond) {
        echo "  OK  {$label}\n";
        $ok++;
    } else {
        echo " WARN {$label}\n";
        $warn++;
    }
}

$sesion = app(SesionNinoService::class);
$claseKiosco = app(ClaseKioscoService::class);
$adaptacion = app(AdaptacionKioscoService::class);
$parametros = app(ParametrosPerfilAprendizajeService::class);
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

echo "=== 1. Portada pública (/inicio) sin perfil ===\n";
$reqInicio = Request::create('/inicio', 'GET');
$resInicio = $kernel->handle($reqInicio);
$htmlInicio = $resInicio->getContent();
assertTrue($resInicio->getStatusCode() === 200, 'GET /inicio → 200');
assertTrue(str_contains($htmlInicio, 'id="kiosco-perfil-params"'), 'JSON #kiosco-perfil-params presente');
assertTrue(str_contains($htmlInicio, 'kiosco-perfil.js'), 'script kiosco-perfil.js');
assertTrue(str_contains($htmlInicio, 'kiosco-perfil.css'), 'CSS kiosco-perfil.css');
assertTrue(str_contains($htmlInicio, 'data-kiosco-perfil="0"'), 'data-kiosco-perfil=0 en portada');
assertTrue(! str_contains($htmlInicio, 'kiosco-perfil--activo'), 'sin clase kiosco-perfil--activo en portada');
assertTrue(str_contains($htmlInicio, '--fondo: #060C0A') || str_contains($htmlInicio, '--fondo:#060C0A'), 'chrome oscuro intacto');
$kernel->terminate($reqInicio, $resInicio);

echo "\n=== 2. Resolver estudiante + clase ===\n";
$ambiente = $sesion->obtenerAmbiente();
$clase = $claseKiosco->claseActivaHoy($ambiente);
assertTrue($clase !== null, 'hay clase activa hoy');

if (! $clase) {
    echo "\nSKIP resto: no hay clase activa.\n";
    echo "Resumen: OK={$ok} FAIL={$fail} WARN={$warn}\n";
    exit($fail > 0 ? 1 : 0);
}

$estudiantes = $claseKiosco->estudiantesDeClase($clase);
$candidato = null;
$candidatoTea = null;
$mapa = config('parametros_perfil.mapa_perfiles', []);
$teaId = array_search('tea', $mapa, true);

foreach ($estudiantes as $e) {
    $pin = $e->configuracionPin;
    if (! $pin || ! FigurasModel::esIconoValido($pin->figura_1)) {
        continue;
    }
    if ($candidato === null) {
        $candidato = $e;
    }
    if ($teaId !== false && (int) $e->perfil_aprendizaje_id === (int) $teaId && $candidatoTea === null) {
        $candidatoTea = $e;
    }
}

assertWarn($candidato !== null, 'hay estudiante con PIN válido en la clase');
if (! $candidato) {
    echo "\nSKIP HTTP autenticado: sin PIN.\n";
    echo "Resumen: OK={$ok} FAIL={$fail} WARN={$warn}\n";
    exit($fail > 0 ? 1 : 0);
}

echo "  → Candidato estándar/cualquier: [{$candidato->id}] {$candidato->nombre} perfil_id={$candidato->perfil_aprendizaje_id}\n";
if ($candidatoTea) {
    echo "  → Candidato TEA: [{$candidatoTea->id}] {$candidatoTea->nombre}\n";
} else {
    echo "  → No hay TEA en la clase; se forzará preset TEA en payload de servicio.\n";
}

echo "\n=== 3. iniciarSesion cachea perfil ===\n";
$session = $app['session']->driver();
$session->start();
$reqLogin = Request::create('/alumnos/'.$candidato->id.'/verificar', 'POST');
$reqLogin->setLaravelSession($session);
$sesion->iniciarSesion($reqLogin, $candidato, (int) $clase->id);
$cache = $adaptacion->obtenerDeSesion($reqLogin);
assertTrue(is_array($cache) && ($cache['activo'] ?? false), 'sesión kiosco_perfil activa');
assertTrue((int) ($cache['estudiante_id'] ?? 0) === (int) $candidato->id, 'estudiante_id en cache');
assertTrue(count($cache['valores'] ?? []) === 50, '50 parámetros en cache');
assertTrue(isset($cache['css_vars']['--kiosco-btn-size']), 'css_vars btn_size');
assertTrue(in_array('login_tipo', $cache['noop'] ?? [], true), 'noop incluye login_tipo');
assertTrue(in_array('ra_inicio', $cache['noop'] ?? [], true), 'noop incluye ra_*');

$valoresResueltos = $parametros->valoresParaEstudiante($candidato);
assertTrue($valoresResueltos === ($cache['valores'] ?? null), 'cache == valoresParaEstudiante');

$session->save();
$cookieName = config('session.cookie');
$cookieValue = $session->getId();

echo "\n=== 4. /listo con sesión ===\n";
$reqListo = Request::create('/listo', 'GET', [], [$cookieName => $cookieValue]);
$reqListo->setLaravelSession($session);
$resListo = $kernel->handle($reqListo);
$htmlListo = $resListo->getContent();
assertTrue($resListo->getStatusCode() === 200, 'GET /listo → 200');
assertTrue(str_contains($htmlListo, 'id="kiosco-perfil-params"'), '/listo tiene JSON perfil');
assertTrue(preg_match('/"activo"\s*:\s*true/', $htmlListo) === 1, '/listo JSON activo=true');
assertTrue(str_contains($htmlListo, 'kiosco-perfil--activo') || str_contains($htmlListo, 'data-kiosco-perfil="1"'), '/listo marca perfil activo');
$kernel->terminate($reqListo, $resListo);

echo "\n=== 5. /recorrido con sesión ===\n";
$reqRec = Request::create('/recorrido', 'GET', [], [$cookieName => $cookieValue]);
$reqRec->setLaravelSession($session);
$resRec = $kernel->handle($reqRec);
$htmlRec = $resRec->getContent();
$statusRec = $resRec->getStatusCode();
assertTrue(in_array($statusRec, [200, 302], true), "GET /recorrido → {$statusRec}");

if ($statusRec === 200) {
    assertTrue(str_contains($htmlRec, 'id="kiosco-perfil-params"'), '/recorrido JSON perfil');
    assertTrue(preg_match('/"activo"\s*:\s*true/', $htmlRec) === 1, '/recorrido activo=true');
    assertTrue(str_contains($htmlRec, 'id="vnDispositivo"') || str_contains($htmlRec, 'rn-player'), 'player #vnDispositivo presente');
    assertTrue(str_contains($htmlRec, 'kiosco-perfil.js'), '/recorrido carga kiosco-perfil.js');
    assertTrue(str_contains($htmlRec, 'constructor-vista-nino.js'), '/recorrido carga constructor');
    assertTrue(str_contains($htmlRec, '--fondo: #060C0A') || str_contains($htmlRec, '--fondo:#060C0A'), 'chrome sigue oscuro en sesión');

    // CSS vars del player solo si el perfil no es puro base-sin-overrides visuales
    $tieneVars = str_contains($htmlRec, 'id="kioscoPerfilVars"') || str_contains($htmlRec, '--kiosco-btn-size');
    assertWarn($tieneVars, 'vars CSS del player inyectadas (#kioscoPerfilVars)');

    // Extraer JSON
    if (preg_match('/id="kiosco-perfil-params"[^>]*>(.*?)<\/script>/s', $htmlRec, $m)) {
        $payload = json_decode(html_entity_decode($m[1]), true);
        assertTrue(is_array($payload), 'JSON perfil parseable');
        if (is_array($payload)) {
            assertTrue(($payload['activo'] ?? false) === true, 'payload.activo');
            assertTrue(count($payload['valores'] ?? []) === 50, 'payload 50 valores');
            assertTrue(isset($payload['css_vars']['--kiosco-font-size']), 'payload css_vars font');
            assertTrue(is_array($payload['noop']) && count($payload['noop']) >= 8, 'payload.noop listado');
            echo '  → tipo='.($payload['tipo'] ?? '?').' perfil_id='.($payload['perfil_id'] ?? '?')."\n";
            echo '  → btn_size='.($payload['valores']['btn_size'] ?? '?');
            echo ' font_size='.($payload['valores']['font_size'] ?? '?');
            echo ' contraste='.($payload['valores']['contraste'] ?? '?');
            echo ' fondo='.($payload['valores']['fondo_pantalla'] ?? '?')."\n";
            echo '  → clases: '.implode(', ', $payload['clases'] ?? [])."\n";
        }
    } else {
        assertTrue(false, 'extraer JSON de /recorrido');
    }
} else {
    echo "  (redirect a {$resRec->headers->get('Location')})\n";
}
$kernel->terminate($reqRec, $resRec);

echo "\n=== 6. Simulación payload TEA (servicio) ===\n";
if ($teaId !== false) {
    $tea = $candidatoTea;
    if (! $tea) {
        $tea = new Estudiante([
            'institucion_id' => (int) $candidato->institucion_id,
            'perfil_aprendizaje_id' => (int) $teaId,
        ]);
        $tea->id = (int) $candidato->id;
        $tea->setRelation('perfilAprendizajePersonalizadoActiva', null);
    } else {
        $tea->loadMissing('perfilAprendizajePersonalizadoActiva');
    }

    $payloadTea = $adaptacion->payloadParaEstudiante($tea);
    assertTrue($payloadTea['activo'] === true, 'TEA payload activo');
    assertTrue(($payloadTea['valores']['btn_size'] ?? 0) === 80, 'TEA btn_size=80');
    assertTrue(($payloadTea['valores']['audio_instruc'] ?? '') === 'manual', 'TEA audio_instruc=manual');
    assertTrue(($payloadTea['valores']['opciones_max'] ?? 0) === 2, 'TEA opciones_max=2');
    assertTrue(($payloadTea['valores']['fondo_pantalla'] ?? '') === 'crema', 'TEA fondo=crema');
    assertTrue(($payloadTea['valores']['anim_decorativas'] ?? true) === false, 'TEA sin anim decorativas');
    assertTrue(($payloadTea['valores']['elementos_flotantes'] ?? true) === false, 'TEA sin flotantes');
    assertTrue(in_array('kiosco-perfil--fondo-crema', $payloadTea['clases'], true), 'clase fondo-crema');
    assertTrue(in_array('kiosco-perfil--sin-flotantes', $payloadTea['clases'], true), 'clase sin-flotantes');
    assertTrue(in_array('kiosco-perfil--sin-anim-decorativas', $payloadTea['clases'], true), 'clase sin-anim');
    assertTrue(in_array('kiosco-perfil--solo-toque', $payloadTea['clases'], true), 'clase solo-toque');
    assertTrue(($payloadTea['css_vars']['--kiosco-player-bg'] ?? '') === '#FBF3E4', 'css var fondo crema');
    assertTrue(array_key_exists('login_tipo', $payloadTea['valores']), 'login_tipo sigue en valores (inyectado)');
    assertTrue(in_array('login_tipo', $payloadTea['noop'], true), 'login_tipo en noop (no honrado)');
} else {
    echo " WARN mapa_perfiles sin TEA\n";
    $warn++;
}

echo "\n=== 7. limpiar sesión olvida perfil ===\n";
$sesion->limpiar($reqLogin);
assertTrue($adaptacion->obtenerDeSesion($reqLogin) === null, 'cache olvidada tras limpiar');
assertTrue($reqLogin->session()->get(AdaptacionKioscoService::SESSION_KEY) === null, 'clave sesión ausente');

echo "\n=== 8. Assets y ganchos JS ===\n";
$jsPerfil = public_path('assets/js/kiosco-perfil.js');
$cssPerfil = public_path('assets/css/kiosco-perfil.css');
$jsCtor = public_path('assets/js/constructor-vista-nino.js');
$jsBanco = public_path('assets/js/banco-juegos.js');
$jsNav = public_path('assets/js/kiosco-navegacion.js');

assertTrue(is_file($jsPerfil), 'existe kiosco-perfil.js');
assertTrue(is_file($cssPerfil), 'existe kiosco-perfil.css');
$ctor = file_get_contents($jsCtor);
assertTrue(str_contains($ctor, 'PedniaPerfil') || str_contains($ctor, 'perfilHonra'), 'constructor lee perfil');
assertTrue(str_contains($ctor, 'recortarOpcionesPerfil'), 'constructor recorta opciones');
assertTrue(str_contains($ctor, 'ttsRatePerfil'), 'constructor TTS rate perfil');
assertTrue(str_contains($ctor, 'hablarSecuenciaPerfil'), 'constructor audio_instruc');
assertTrue(str_contains($ctor, 'mostrarPausaLuego'), 'constructor pausa entre bloques');
assertTrue(str_contains($ctor, 'iniciarTimerBloque'), 'constructor timer bloque');
$banco = file_get_contents($jsBanco);
assertTrue(str_contains($banco, 'parejasPerfil') || str_contains($banco, 'memoria_pares_max'), 'banco respeta memoria_pares_max');
$nav = file_get_contents($jsNav);
assertTrue(str_contains($nav, 'sincronizarPerfil') || str_contains($nav, 'PedniaPerfil'), 'navegación sincroniza perfil');

$css = file_get_contents($cssPerfil);
assertTrue(str_contains($css, '.rn-player'), 'CSS acotado a .rn-player');
assertTrue(str_contains($css, 'kiosco-perfil--fondo-crema'), 'CSS fondo crema');
assertTrue(str_contains($css, 'kiosco-perfil--contraste'), 'CSS contraste');
assertTrue(! str_contains($css, 'body {') || ! preg_match('/^body\s*\{[^}]*background:\s*#FBF3E4/m', $css), 'CSS no pinta body con crema');

echo "\n=== Resumen ===\n";
echo "OK={$ok} FAIL={$fail} WARN={$warn}\n";
exit($fail > 0 ? 1 : 0);
