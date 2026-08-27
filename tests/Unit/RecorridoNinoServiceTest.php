<?php

namespace Tests\Unit;

use App\Models\Ambiente;
use App\Services\BloqueExperienciaService;
use App\Services\RecorridoNinoService;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class RecorridoNinoServiceTest extends TestCase
{
    public function test_crea_y_obtiene_sesion_expresion_artistica(): void
    {
        Cache::flush();
        $bloques = $this->createMock(BloqueExperienciaService::class);
        $service = new RecorridoNinoService($bloques);

        $ambiente = new Ambiente;
        $ambiente->id = 1;
        $ambiente->slug = RecorridoNinoService::SLUG_DEMO;

        $this->assertSame('expresion-artistica', RecorridoNinoService::SLUG_DEMO);

        $sesion = $service->crear($ambiente, 4, 99);

        $this->assertSame(40, strlen($sesion['token']));
        $payload = $service->obtener($sesion['token']);
        $this->assertSame(1, $payload['ambiente_id']);
        $this->assertSame(4, $payload['user_id']);
        $this->assertSame(99, $payload['experiencia_origen_id']);
    }

    public function test_rechaza_ambiente_que_no_es_demo(): void
    {
        $bloques = $this->createMock(BloqueExperienciaService::class);
        $service = new RecorridoNinoService($bloques);

        $ambiente = new Ambiente;
        $ambiente->id = 2;
        $ambiente->slug = 'multisaberes';

        $this->expectException(\InvalidArgumentException::class);
        $service->crear($ambiente, 1);
    }

    public function test_armar_url_tablet(): void
    {
        $bloques = $this->createMock(BloqueExperienciaService::class);
        $service = new RecorridoNinoService($bloques);
        $token = str_repeat('b', 40);
        $request = \Illuminate\Http\Request::create('http://127.0.0.1:8000/panel', 'GET');

        $enlace = $service->armarUrlTablet($request, $token);

        $this->assertStringContainsString('/recorrido-nino/'.$token, $enlace['url']);
        $this->assertTrue($enlace['host_local']);
    }
}
