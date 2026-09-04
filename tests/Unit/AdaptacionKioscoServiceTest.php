<?php

namespace Tests\Unit;

use App\Models\Estudiante;
use App\Services\AdaptacionKioscoService;
use App\Services\ParametrosPerfilAprendizajeService;
use Illuminate\Http\Request;
use Tests\TestCase;

class AdaptacionKioscoServiceTest extends TestCase
{
    private AdaptacionKioscoService $servicio;

    protected function setUp(): void
    {
        parent::setUp();
        $this->servicio = app(AdaptacionKioscoService::class);
    }

    public function test_estudiante_sin_perfil_usa_estandar_sin_romper(): void
    {
        $estudiante = new Estudiante([
            'institucion_id' => 1,
            'perfil_aprendizaje_id' => 0,
        ]);
        $estudiante->id = 51;
        $estudiante->setRelation('perfilAprendizajePersonalizadoActiva', null);

        $payload = $this->servicio->payloadParaEstudiante($estudiante);

        $this->assertTrue($payload['activo']);
        $this->assertSame('estandar', $payload['tipo']);
        $this->assertSame(0, $payload['perfil_id']);
        $this->assertSame(app(ParametrosPerfilAprendizajeService::class)->valoresEstandar(), $payload['valores']);
        $this->assertArrayHasKey('--kiosco-btn-size', $payload['css_vars']);
        $this->assertContains('kiosco-perfil--activo', $payload['clases']);
        $this->assertNotContains('kiosco-perfil--fondo-crema', $payload['clases']);
        $this->assertContains('audio_fondo', $payload['noop']);
        $this->assertContains('login_tipo', $payload['noop']);
    }

    public function test_css_vars_mapean_tamanos(): void
    {
        $vars = $this->servicio->cssVars([
            'btn_size' => 88,
            'btn_spacing' => 20,
            'font_size' => 22,
            'trans_ms' => 150,
            'anim_speed' => 50,
            'grosor_pincel' => 14,
            'fondo_pantalla' => 'crema',
        ]);

        $this->assertSame('88px', $vars['--kiosco-btn-size']);
        $this->assertSame('20px', $vars['--kiosco-btn-spacing']);
        $this->assertSame('22pt', $vars['--kiosco-font-size']);
        $this->assertSame('150ms', $vars['--kiosco-trans-ms']);
        $this->assertSame('0.5', $vars['--kiosco-anim-factor']);
        $this->assertSame('#FBF3E4', $vars['--kiosco-player-bg']);
        $this->assertSame('14px', $vars['--kiosco-grosor-pincel']);
    }

    public function test_cache_de_sesion_y_olvido(): void
    {
        $estudiante = new Estudiante([
            'institucion_id' => 1,
            'perfil_aprendizaje_id' => 0,
        ]);
        $estudiante->id = 52;
        $estudiante->setRelation('perfilAprendizajePersonalizadoActiva', null);

        $request = Request::create('/recorrido', 'GET');
        $request->setLaravelSession($this->app['session']->driver());

        $guardado = $this->servicio->guardarEnSesion($request, $estudiante);
        $leido = $this->servicio->obtenerDeSesion($request);

        $this->assertSame(52, $guardado['estudiante_id']);
        $this->assertSame(52, $leido['estudiante_id']);
        $this->assertTrue($leido['activo']);

        $this->servicio->olvidar($request);
        $this->assertNull($this->servicio->obtenerDeSesion($request));
    }

    public function test_inclusion_tea_marca_clases_de_player(): void
    {
        $mapa = config('parametros_perfil.mapa_perfiles', []);
        $teaId = array_search('tea', $mapa, true);

        if ($teaId === false) {
            $this->markTestSkipped('No hay perfil TEA en mapa_perfiles.');
        }

        $estudiante = new Estudiante([
            'institucion_id' => 1,
            'perfil_aprendizaje_id' => (int) $teaId,
        ]);
        $estudiante->id = 53;
        $estudiante->setRelation('perfilAprendizajePersonalizadoActiva', null);

        $payload = $this->servicio->payloadParaEstudiante($estudiante);
        $this->assertSame('inclusion', $payload['tipo']);
        $this->assertSame((int) $teaId, $payload['perfil_id']);
        $this->assertContains('kiosco-perfil--fondo-crema', $payload['clases']);
        $this->assertContains('kiosco-perfil--sin-flotantes', $payload['clases']);
        $this->assertContains('kiosco-perfil--sin-anim-decorativas', $payload['clases']);
        $this->assertContains('kiosco-perfil--solo-toque', $payload['clases']);
    }
}
