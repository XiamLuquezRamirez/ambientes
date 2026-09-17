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
        $this->assertSame('+30Hz', $params['pitch']);
        $this->assertSame('+5%', $params['rate']);
    }

    public function test_zeus_usa_jorge_mx_agudo(): void
    {
        $params = (new TextoAVozService)->parametrosDePersonaje('zeus');

        $this->assertSame('es-MX-JorgeNeural', $params['voz']);
        $this->assertSame('+45Hz', $params['pitch']);
        $this->assertSame('+5%', $params['rate']);
    }

    public function test_rate_unico_no_depende_del_personaje(): void
    {
        $servicio = new TextoAVozService;

        $this->assertSame('+20%', $servicio->parametrosDePersonaje('zoe', 20)['rate']);
        $this->assertSame('+20%', $servicio->parametrosDePersonaje('zeus', 20)['rate']);
        $this->assertSame('+5%', $servicio->formatearRate(null));
        $this->assertSame('+5%', $servicio->formatearRate('5%'));
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
