<?php

namespace Tests\Unit;

use App\Services\TextoAVozService;
use PHPUnit\Framework\TestCase;

class TextoAVozServiceTest extends TestCase
{
    public function test_zoe_usa_lorena_sv(): void
    {
        $params = (new TextoAVozService)->parametrosDePersonaje('zoe');

        $this->assertSame('es-SV-LorenaNeural', $params['voz']);
        $this->assertSame('+5%', $params['rate']);
        $this->assertSame('+30Hz', $params['pitch']);
    }

    public function test_zeus_usa_jorge_mx_agudo(): void
    {
        $params = (new TextoAVozService)->parametrosDePersonaje('zeus');

        $this->assertSame('es-MX-JorgeNeural', $params['voz']);
        $this->assertSame('+5%', $params['rate']);
        $this->assertSame('+45Hz', $params['pitch']);
    }

    public function test_personaje_desconocido_cae_en_zoe(): void
    {
        $servicio = new TextoAVozService;

        $this->assertSame(
            $servicio->parametrosDePersonaje('zoe'),
            $servicio->parametrosDePersonaje('desconocido')
        );
    }
}
