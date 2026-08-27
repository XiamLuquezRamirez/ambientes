<?php

namespace Tests\Unit;

use App\Models\Experiencia;
use App\Services\VistaPreviaNinoService;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class VistaPreviaNinoServiceTest extends TestCase
{
    public function test_crea_y_obtiene_sesion(): void
    {
        Cache::flush();
        $service = new VistaPreviaNinoService;
        $experiencia = new Experiencia;
        $experiencia->id = 7;

        $sesion = $service->crear($experiencia, 3);

        $this->assertSame(40, strlen($sesion['token']));
        $this->assertSame(VistaPreviaNinoService::TTL_SEGUNDOS, $sesion['expira_en']);

        $payload = $service->obtener($sesion['token']);
        $this->assertSame(7, $payload['experiencia_id']);
        $this->assertSame(3, $payload['user_id']);
        $this->assertSame(0, $payload['foco_seq']);
    }

    public function test_invalidar_enlace_anterior_al_crear_otro(): void
    {
        Cache::flush();
        $service = new VistaPreviaNinoService;
        $experiencia = new Experiencia;
        $experiencia->id = 9;

        $primero = $service->crear($experiencia, 1);
        $segundo = $service->crear($experiencia, 1);

        $this->assertNull($service->obtener($primero['token']));
        $this->assertNotNull($service->obtener($segundo['token']));
    }

    public function test_actualizar_foco_incrementa_secuencia(): void
    {
        Cache::flush();
        $service = new VistaPreviaNinoService;
        $experiencia = new Experiencia;
        $experiencia->id = 11;

        $sesion = $service->crear($experiencia, 2);
        $ok = $service->actualizarFoco($sesion['token'], 11, 55);

        $this->assertTrue($ok);
        $payload = $service->obtener($sesion['token']);
        $this->assertSame(55, $payload['foco_bloque_id']);
        $this->assertSame(1, $payload['foco_seq']);
    }

    public function test_armar_url_tablet_desde_localhost(): void
    {
        $service = new VistaPreviaNinoService;
        $token = str_repeat('a', 40);
        $request = \Illuminate\Http\Request::create('http://127.0.0.1:8000/panel/catalogo/experiencias/1/constructor', 'GET');

        $enlace = $service->armarUrlTablet($request, $token);

        $this->assertStringContainsString('/vista-previa-nino/'.$token, $enlace['url']);
        $this->assertTrue($enlace['host_local']);
        $this->assertNotNull($enlace['aviso_red']);
    }
}
