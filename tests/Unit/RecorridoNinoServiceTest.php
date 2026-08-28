<?php

namespace Tests\Unit;

use App\Models\Ambiente;
use App\Models\Clase;
use App\Models\ClaseExperiencia;
use App\Services\BloqueExperienciaService;
use App\Services\CurriculoMediaService;
use App\Services\RecorridoNinoService;
use Tests\TestCase;

class RecorridoNinoServiceTest extends TestCase
{
    private function crearServicio(): RecorridoNinoService
    {
        return new RecorridoNinoService(
            $this->createMock(BloqueExperienciaService::class),
            $this->createMock(CurriculoMediaService::class),
        );
    }

    public function test_arbol_es_camino_unico_con_clase_coherente(): void
    {
        $service = $this->crearServicio();

        $clase = new Clase;
        $item = new ClaseExperiencia;
        $item->modulo_id = 10;
        $item->eje_id = 20;
        $item->tematica_id = 30;
        $item->experiencia_id = 40;
        $clase->setRelation('experienciasClase', collect([$item]));

        $arbol = [
            'modulos' => [[
                'id' => 10,
                'ejes' => [[
                    'id' => 20,
                    'tematicas' => [[
                        'id' => 30,
                        'experiencia_id' => 40,
                    ]],
                ]],
            ]],
        ];

        $this->assertTrue($service->arbolEsCaminoUnico($arbol, $clase));
        $this->assertNull($service->motivoArbolNoLineal($arbol, $clase));
    }

    public function test_arbol_rechaza_multiples_modulos(): void
    {
        $service = $this->crearServicio();

        $clase = new Clase;
        $arbol = ['modulos' => [[], []]];

        $this->assertFalse($service->arbolEsCaminoUnico($arbol, $clase));
        $this->assertSame(
            'Se esperaba un solo módulo en el recorrido de la clase.',
            $service->motivoArbolNoLineal($arbol, $clase)
        );
    }

    public function test_arbol_cubre_varias_experiencias_misma_tematica(): void
    {
        $service = $this->crearServicio();

        $clase = new Clase;
        $item1 = new ClaseExperiencia;
        $item1->modulo_id = 10;
        $item1->eje_id = 20;
        $item1->tematica_id = 30;
        $item1->experiencia_id = 40;
        $item1->orden = 0;

        $item2 = new ClaseExperiencia;
        $item2->modulo_id = 10;
        $item2->eje_id = 20;
        $item2->tematica_id = 30;
        $item2->experiencia_id = 41;
        $item2->orden = 1;

        $clase->setRelation('experienciasClase', collect([$item1, $item2]));

        $arbol = [
            'modulos' => [[
                'id' => 10,
                'nombre' => 'Módulo test',
                'descripcion' => 'Desc módulo',
                'icono' => '📚',
                'ejes' => [[
                    'id' => 20,
                    'nombre' => 'Eje test',
                    'descripcion' => 'Desc eje',
                    'tematicas' => [[
                        'id' => 30,
                        'nombre' => 'Temática test',
                        'competencia' => 'Competencia',
                        'experiencia_id' => 40,
                        'experiencia_nombre' => 'Exp A',
                        'experiencias' => [
                            ['id' => 40, 'nombre' => 'Exp A', 'objetivo' => 'Obj A', 'orden' => 0],
                            ['id' => 41, 'nombre' => 'Exp B', 'objetivo' => 'Obj B', 'orden' => 1],
                        ],
                    ]],
                ]],
            ]],
            'ambiente' => ['nombre' => 'Test', 'icono' => '🎨'],
        ];

        $this->assertTrue($service->arbolEsCaminoUnico($arbol, $clase));
        $this->assertNull($service->motivoArbolNoCubreClase($arbol, $clase));

        $camino = $service->armarCaminoLineal($arbol, $clase);
        $this->assertNotNull($camino);
        $ids = collect($camino['paradas'])->pluck('id')->all();
        $this->assertSame(
            ['inicio', 'modulo', 'eje', 'tematica', 'experiencia-40', 'experiencia-41', 'fin'],
            $ids
        );
    }

    public function test_armar_arbol_incluye_ambiente(): void
    {
        $service = $this->crearServicio();

        $ambiente = new Ambiente;
        $ambiente->id = 1;
        $ambiente->nombre = 'Expresión Artística';
        $ambiente->slug = 'expresion-artistica';
        $ambiente->color_hex = '#0EA5E9';
        $ambiente->icono = '🎨';

        $ambiente = $this->getMockBuilder(Ambiente::class)
            ->onlyMethods(['modulos'])
            ->getMock();
        $ambiente->id = 1;
        $ambiente->nombre = 'Expresión Artística';
        $ambiente->slug = 'expresion-artistica';
        $ambiente->color_hex = '#0EA5E9';
        $ambiente->icono = '🎨';

        $modulosQuery = new class
        {
            public function where($col, $val) { return $this; }

            public function orderBy($col, $dir = 'asc') { return $this; }

            public function with($relations) { return $this; }

            public function get() { return collect(); }
        };

        $ambiente->method('modulos')->willReturn($modulosQuery);

        $arbol = $service->armarArbol($ambiente);

        $this->assertSame('expresion-artistica', $arbol['ambiente']['slug']);
        $this->assertSame([], $arbol['modulos']);
    }
}
