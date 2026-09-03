<?php

namespace Tests\Unit;

use App\Services\InstruccionAudioService;
use PHPUnit\Framework\TestCase;

class InstruccionAudioServiceTest extends TestCase
{
    private InstruccionAudioService $servicio;

    protected function setUp(): void
    {
        parent::setUp();
        $this->servicio = new InstruccionAudioService;
    }

    public function test_normaliza_secuencia_y_ordena_turnos(): void
    {
        $filas = $this->servicio->normalizarLista([
            ['texto' => 'Hola, soy Zeus', 'personaje' => 'zeus'],
            ['instruccion' => 'Ahora habla Zoe', 'personaje' => 'ZOE'],
            ['texto' => 'Otra vez Zeus', 'personaje' => 'otro'],
        ]);

        $this->assertCount(3, $filas);
        $this->assertSame(1, $filas[0]['orden']);
        $this->assertSame('zeus', $filas[0]['personaje']);
        $this->assertSame('zoe', $filas[1]['personaje']);
        $this->assertSame('zoe', $filas[2]['personaje']);
        $this->assertSame('Otra vez Zeus', $filas[2]['texto']);
    }

    public function test_texto_legacy_concatena_turnos(): void
    {
        $texto = $this->servicio->textoLegacy([
            ['texto' => 'Uno', 'personaje' => 'zeus', 'orden' => 1],
            ['texto' => 'Dos', 'personaje' => 'zoe', 'orden' => 2],
        ]);

        $this->assertSame('Uno Dos', $texto);
    }

    public function test_respeta_maximo_de_turnos(): void
    {
        $entrada = [];
        for ($i = 0; $i < 12; $i++) {
            $entrada[] = ['texto' => 'T'.$i, 'personaje' => 'zoe'];
        }

        $this->assertCount(8, $this->servicio->normalizarLista($entrada));
    }
}
