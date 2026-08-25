<?php

namespace Tests\Unit;

use App\Models\BloqueExperiencia;
use App\Services\BloqueDatos\BloqueDatosRegistry;
use PHPUnit\Framework\TestCase;

class BloqueDatosCompletitudTest extends TestCase
{
    private BloqueDatosRegistry $registry;

    protected function setUp(): void
    {
        parent::setUp();
        $this->registry = new BloqueDatosRegistry;
    }

    /**
     * @return array<string, array{0: string, 1: array<string, mixed>}>
     */
    public static function bloquesCompletosProvider(): array
    {
        return [
            'bienvenida' => [BloqueExperiencia::TIPO_BIENVENIDA, ['instruccion' => 'Hola']],
            'bienvenida_imagen' => [BloqueExperiencia::TIPO_BIENVENIDA, [
                'instruccion' => 'Hola',
                'tipo_media' => 'imagen',
                'imagen' => 'bienvenida.png',
            ]],
            'audio' => [BloqueExperiencia::TIPO_AUDIO, ['instruccion' => 'Escucha', 'archivo' => 'a.mp3']],
            'video' => [BloqueExperiencia::TIPO_VIDEO, ['instruccion' => 'Mira', 'archivo' => 'v.mp4']],
            'imagen' => [BloqueExperiencia::TIPO_IMAGEN, ['instruccion' => 'Observa', 'archivo' => 'i.png']],
            'historia' => [BloqueExperiencia::TIPO_HISTORIA, [
                'instruccion' => 'Cuento',
                'paginas' => '2',
                'paginas_data' => [
                    ['imagen' => 'p1.png', 'audio' => 'p1.mp3'],
                    ['imagen' => 'p2.png', 'audio' => 'p2.mp3'],
                ],
            ]],
            'ra' => [BloqueExperiencia::TIPO_RA, ['instruccion' => 'Apunta', 'marcador' => '42']],
            'evidencia' => [BloqueExperiencia::TIPO_EVIDENCIA, ['instruccion' => 'Toma foto']],
            'juego_rompecabezas' => [BloqueExperiencia::TIPO_JUEGO, [
                'instruccion' => 'Arma',
                'juego_id' => 'rompecabezas',
                'juego_imagen' => 'puzzle.png',
                'juego_piezas' => '4 piezas (fácil)',
            ]],
            'juego_memoria' => [BloqueExperiencia::TIPO_JUEGO, [
                'instruccion' => 'Memoria',
                'juego_id' => 'memoria',
                'imagen_1' => 'a.png',
                'imagen_2' => 'b.png',
            ]],
            'juego_secuencia' => [BloqueExperiencia::TIPO_JUEGO, [
                'instruccion' => 'Ordena',
                'juego_id' => 'secuencia',
                'seq_1' => '1.png',
                'seq_2' => '2.png',
                'seq_3' => '3.png',
            ]],
            'dibujo' => [BloqueExperiencia::TIPO_DIBUJO, ['instruccion' => 'Dibuja']],
            'pregunta' => [BloqueExperiencia::TIPO_PREGUNTA, [
                'instruccion' => 'Elige',
                'texto' => '¿Cuál?',
                'tipo_opts' => 'solo_texto',
                'opciones' => [
                    ['texto' => 'A', 'emoji' => '', 'imagen' => '', 'correcta' => true],
                    ['texto' => 'B', 'emoji' => '', 'imagen' => '', 'correcta' => false],
                ],
            ]],
            'emparejar' => [BloqueExperiencia::TIPO_EMPAREJAR, [
                'instruccion' => 'Une',
                'modo' => 'texto',
                'pares' => [
                    ['izq' => 'A', 'izqImg' => '', 'der' => '1', 'derImg' => ''],
                    ['izq' => 'B', 'izqImg' => '', 'der' => '2', 'derImg' => ''],
                ],
            ]],
            'clasificacion' => [BloqueExperiencia::TIPO_CLASIFICACION, [
                'instruccion' => 'Clasifica',
                'categorias' => ['Frutas', 'Verduras'],
                'items' => [
                    ['texto' => 'Manzana', 'imagen' => '', 'categoria' => 'Frutas'],
                    ['texto' => 'Zanahoria', 'imagen' => '', 'categoria' => 'Verduras'],
                ],
            ]],
            'arrastrar' => [BloqueExperiencia::TIPO_ARRASTRAR, [
                'instruccion' => 'Arrastra',
                'zonas' => [
                    ['nombre' => 'Zona A', 'color' => '#0F6E56'],
                    ['nombre' => 'Zona B', 'color' => '#534AB7'],
                ],
                'items' => [
                    ['texto' => 'Item 1', 'imagen' => '', 'zona' => 'Zona A'],
                    ['texto' => 'Item 2', 'imagen' => '', 'zona' => 'Zona B'],
                ],
            ]],
            'reto' => [BloqueExperiencia::TIPO_RETO, [
                'instruccion' => 'Reto',
                'descripcion' => 'Mi reto',
                'pasos' => [
                    [
                        'pregunta' => '¿2+2?',
                        'opciones' => [
                            ['emoji' => '4', 'label' => '', 'imagen' => '', 'correcta' => true],
                            ['emoji' => '3', 'label' => '', 'imagen' => '', 'correcta' => false],
                            ['emoji' => '5', 'label' => '', 'imagen' => '', 'correcta' => false],
                            ['emoji' => '1', 'label' => '', 'imagen' => '', 'correcta' => false],
                        ],
                    ],
                    [
                        'pregunta' => '¿Color del cielo?',
                        'opciones' => [
                            ['emoji' => '', 'label' => 'Azul', 'imagen' => '', 'correcta' => true],
                            ['emoji' => '', 'label' => 'Rojo', 'imagen' => '', 'correcta' => false],
                            ['emoji' => '', 'label' => 'Verde', 'imagen' => '', 'correcta' => false],
                            ['emoji' => '', 'label' => 'Negro', 'imagen' => '', 'correcta' => false],
                        ],
                    ],
                ],
            ]],
            'emocion' => [BloqueExperiencia::TIPO_EMOCION, ['instruccion' => '¿Cómo te sientes?']],
            'recompensa' => [BloqueExperiencia::TIPO_RECOMPENSA, ['instruccion' => '¡Lo lograste!']],
            'recompensa_insignia' => [BloqueExperiencia::TIPO_RECOMPENSA, [
                'instruccion' => 'Insignia',
                'tipo' => 'Insignia especial',
                'insignia' => 'badge.png',
            ]],
        ];
    }

    /**
     * @dataProvider bloquesCompletosProvider
     *
     * @param  array<string, mixed>  $datos
     */
    public function test_bloques_completos_sin_pendientes(string $tipo, array $datos): void
    {
        $this->assertTrue($this->registry->estaCompleto($tipo, $datos));
        $this->assertSame([], $this->registry->pendientes($tipo, $datos));
    }

    public function test_bienvenida_con_tipo_media_sin_archivo_queda_incompleta(): void
    {
        $pendientes = $this->registry->pendientes(BloqueExperiencia::TIPO_BIENVENIDA, [
            'instruccion' => 'Hola',
            'tipo_media' => 'imagen',
            'imagen' => '',
        ]);

        $this->assertContains('Imagen de bienvenida', $pendientes);
    }

    public function test_reto_sin_nombre_queda_incompleto(): void
    {
        $pendientes = $this->registry->pendientes(BloqueExperiencia::TIPO_RETO, [
            'instruccion' => 'Reto',
            'descripcion' => '',
            'pasos' => [
                [
                    'pregunta' => 'P1',
                    'opciones' => [
                        ['emoji' => 'a', 'label' => '', 'imagen' => '', 'correcta' => true],
                        ['emoji' => 'b', 'label' => '', 'imagen' => '', 'correcta' => false],
                        ['emoji' => 'c', 'label' => '', 'imagen' => '', 'correcta' => false],
                        ['emoji' => 'd', 'label' => '', 'imagen' => '', 'correcta' => false],
                    ],
                ],
                [
                    'pregunta' => 'P2',
                    'opciones' => [
                        ['emoji' => 'a', 'label' => '', 'imagen' => '', 'correcta' => true],
                        ['emoji' => 'b', 'label' => '', 'imagen' => '', 'correcta' => false],
                        ['emoji' => 'c', 'label' => '', 'imagen' => '', 'correcta' => false],
                        ['emoji' => 'd', 'label' => '', 'imagen' => '', 'correcta' => false],
                    ],
                ],
            ],
        ]);

        $this->assertContains('Nombre del reto', $pendientes);
    }

    public function test_clasificacion_categoria_vacia_queda_incompleta(): void
    {
        $pendientes = $this->registry->pendientes(BloqueExperiencia::TIPO_CLASIFICACION, [
            'instruccion' => 'Clasifica',
            'categorias' => ['Frutas', ''],
            'items' => [
                ['texto' => 'Manzana', 'imagen' => '', 'categoria' => 'Frutas'],
                ['texto' => 'Pera', 'imagen' => '', 'categoria' => 'Frutas'],
            ],
        ]);

        $this->assertContains('Categoría 2: nombre', $pendientes);
    }

    public function test_defaults_de_cada_tipo_tienen_pendientes(): void
    {
        foreach (BloqueExperiencia::TIPOS as $tipo) {
            $pendientes = $this->registry->pendientes($tipo, $this->registry->defaults($tipo));
            $this->assertNotEmpty(
                $pendientes,
                "El bloque {$tipo} debería reportar pendientes con datos por defecto."
            );
        }
    }
}
