<?php

namespace Tests\Unit;

use App\Services\AccesoAmbienteService;
use PHPUnit\Framework\TestCase;

class AccesoAmbienteServiceTest extends TestCase
{
    public function test_estados_permitidos_excluyen_restringido(): void
    {
        $this->assertContains(AccesoAmbienteService::ESTADO_ACTIVO, AccesoAmbienteService::ESTADOS_PERMITIDOS);
        $this->assertContains(AccesoAmbienteService::ESTADO_ADAPTADO, AccesoAmbienteService::ESTADOS_PERMITIDOS);
        $this->assertNotContains(AccesoAmbienteService::ESTADO_RESTRINGIDO, AccesoAmbienteService::ESTADOS_PERMITIDOS);
    }

    public function test_anio_lectivo_actual(): void
    {
        $servicio = new AccesoAmbienteService;

        $this->assertSame((int) date('Y'), $servicio->anioLectivo());
    }
}
