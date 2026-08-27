<?php

namespace Tests\Unit;

use App\Models\BloqueExperiencia;
use App\Services\BloqueDatos\BloqueDatosRegistry;
use PHPUnit\Framework\TestCase;

class BloqueDatosHistoriaTest extends TestCase
{
    private BloqueDatosRegistry $registry;

    protected function setUp(): void
    {
        parent::setUp();
        $this->registry = new BloqueDatosRegistry;
    }

    public function test_normaliza_cantidad_de_paginas_y_rellena_faltantes(): void
    {
        $datos = $this->registry->normalizar(BloqueExperiencia::TIPO_HISTORIA, [
            'instruccion' => 'Escucha el cuento',
            'paginas' => '4',
            'paginas_data' => [
                ['imagen' => 'p1.png', 'audio' => 'p1.mp3'],
                ['imagen' => 'p2.png', 'audio' => 'p2.mp3'],
            ],
        ]);

        $this->assertSame('4', $datos['paginas']);
        $this->assertCount(4, $datos['paginas_data']);
        $this->assertSame('p1.png', $datos['paginas_data'][0]['imagen']);
        $this->assertSame('', $datos['paginas_data'][3]['imagen']);
        $this->assertSame('', $datos['paginas_data'][3]['audio']);
    }

    public function test_recorta_paginas_extra_y_reporta_pendientes(): void
    {
        $datos = $this->registry->normalizar(BloqueExperiencia::TIPO_HISTORIA, [
            'instruccion' => 'Cuento',
            'paginas' => '2',
            'paginas_data' => [
                ['imagen' => 'a.png', 'audio' => 'a.mp3'],
                ['imagen' => 'b.png', 'audio' => 'b.mp3'],
                ['imagen' => 'c.png', 'audio' => 'c.mp3'],
            ],
        ]);

        $this->assertCount(2, $datos['paginas_data']);

        $pendientes = $this->registry->pendientes(BloqueExperiencia::TIPO_HISTORIA, $datos);
        $this->assertSame([], $pendientes);

        $incompleto = $this->registry->pendientes(BloqueExperiencia::TIPO_HISTORIA, [
            'instruccion' => '',
            'paginas' => '2',
            'paginas_data' => [
                ['imagen' => '', 'audio' => ''],
                ['imagen' => 'ok.png', 'audio' => ''],
            ],
        ]);

        $this->assertContains('Instrucción de audio', $incompleto);
        $this->assertContains('Página 1: imagen', $incompleto);
        $this->assertContains('Página 1: audio', $incompleto);
        $this->assertContains('Página 2: audio', $incompleto);
    }
}
