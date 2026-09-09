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
        $ambiente = new Ambiente(['id' => 1, 'nombre' => 'Polimotor']);
        $juego = new Juego([
            'tipo' => 'rompecabezas_cuerpo',
            'ruta' => 'catalogo_juegos/Polimotor/Rompecabezas',
            'nombre' => 'Rompecabezas del cuerpo',
            'descripcion' => 'Armar piezas',
            'icono' => 'fa-puzzle-piece',
            'color' => '#ffd54f',
            'orden' => 1,
            'activo' => true,
            'ambiente_id' => 1,
        ]);
        $juego->id = 10;
        $juego->setRelation('ambiente', $ambiente);

        $tarjeta = (new JuegoCatalogoService)->serializarTarjeta($juego);

        $this->assertSame(10, $tarjeta['id']);
        $this->assertSame('rompecabezas_cuerpo', $tarjeta['tipo']);
        $this->assertSame('Rompecabezas del cuerpo', $tarjeta['nombre']);
        $this->assertSame('catalogo_juegos/Polimotor/Rompecabezas', $tarjeta['ruta']);
        $this->assertSame('Polimotor', $tarjeta['cadena']['ambiente_nombre']);
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
