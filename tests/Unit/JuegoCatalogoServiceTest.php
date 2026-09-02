<?php

namespace Tests\Unit;

use App\Models\Ambiente;
use App\Models\Eje;
use App\Models\Juego;
use App\Models\Modulo;
use App\Models\Tematica;
use App\Services\JuegoCatalogoService;
use Tests\TestCase;

class JuegoCatalogoServiceTest extends TestCase
{
    public function test_serializar_tarjeta_incluye_cadena_curricular(): void
    {
        $ambiente = new Ambiente(['id' => 1, 'nombre' => 'Multisensorial']);
        $modulo = new Modulo(['id' => 2, 'nombre' => 'Módulo A', 'ambiente_id' => 1]);
        $modulo->setRelation('ambiente', $ambiente);

        $juego = new Juego([
            'tipo' => Juego::TIPO_MEMORIA,
            'nombre' => 'Memoria de animales',
            'descripcion' => 'Parejas',
            'icono' => 'fa-clone',
            'color' => '#0284c7',
            'orden' => 1,
            'activo' => true,
            'modulo_id' => 2,
        ]);
        $juego->id = 10;
        $juego->setRelation('modulo', $modulo);

        $tarjeta = (new JuegoCatalogoService)->serializarTarjeta($juego);

        $this->assertSame(10, $tarjeta['id']);
        $this->assertSame('memoria', $tarjeta['tipo']);
        $this->assertSame('Memoria de animales', $tarjeta['nombre']);
        $this->assertSame('Multisensorial', $tarjeta['cadena']['ambiente_nombre']);
        $this->assertSame('Módulo A', $tarjeta['cadena']['modulo_nombre']);
    }

    public function test_cadena_curricular_resuelve_desde_tematica(): void
    {
        $ambiente = new Ambiente(['id' => 1, 'nombre' => 'Tecnología']);
        $modulo = new Modulo(['id' => 2, 'nombre' => 'Robótica', 'ambiente_id' => 1]);
        $modulo->setRelation('ambiente', $ambiente);
        $eje = new Eje(['id' => 3, 'nombre' => 'Programación', 'modulo_id' => 2]);
        $eje->setRelation('modulo', $modulo);
        $tematica = new Tematica(['id' => 4, 'nombre' => 'Secuencias', 'eje_id' => 3]);
        $tematica->setRelation('eje', $eje);

        $juego = new Juego([
            'tematica_id' => 4,
        ]);
        $juego->setRelation('tematica', $tematica);

        $cadena = $juego->cadenaCurricularResuelta();

        $this->assertSame('Tecnología', $cadena['ambiente_nombre']);
        $this->assertSame('Robótica', $cadena['modulo_nombre']);
        $this->assertSame('Programación', $cadena['eje_nombre']);
        $this->assertSame('Secuencias', $cadena['tematica_nombre']);
    }
}
