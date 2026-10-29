<?php

namespace Tests\Unit;

use App\Models\Ambiente;
use App\Models\Eje;
use App\Models\Juego;
use App\Models\Modulo;
use App\Models\Tematica;
use App\Services\JuegoCatalogoService;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class JuegoCatalogoServiceTest extends TestCase
{
    public function test_serializar_tarjeta_incluye_cadena_curricular(): void
    {
        $ambiente = new Ambiente(['id' => 1, 'nombre' => 'Polimotor']);
        $juego = new Juego([
            'slug' => 'rompecabezas-del-cuerpo',
            'ruta' => 'catalogo_juegos/Polimotor/Rompecabezas',
            'nombre' => 'Rompecabezas del cuerpo',
            'descripcion' => 'Armar piezas',
            'color' => '#ffd54f',
            'orden' => 1,
            'activo' => true,
            'ambiente_id' => 1,
        ]);
        $juego->setRelation('ambiente', $ambiente);

        $tarjeta = (new JuegoCatalogoService)->serializarTarjeta($juego);

        $this->assertSame('rompecabezas-del-cuerpo', $tarjeta['slug']);
        $this->assertArrayNotHasKey('tipo', $tarjeta);
        $this->assertArrayNotHasKey('tipo_label', $tarjeta);
        $this->assertSame('Rompecabezas del cuerpo', $tarjeta['nombre']);
        $this->assertSame('catalogo_juegos/Polimotor/Rompecabezas', $tarjeta['ruta']);
        $this->assertSame('Polimotor', $tarjeta['cadena']['ambiente_nombre']);
        $this->assertNull($tarjeta['imagen_url']);
        $this->assertArrayNotHasKey('icono', $tarjeta);
    }

    public function test_url_imagen_dentro_del_paquete(): void
    {
        $juego = new Juego(['ruta' => 'catalogo_juegos/Polimotor/Rompecabezas/']);
        $this->assertNull($juego->urlImagen());

        $juego->imagen = '../../otro/rompecabeza.png';
        $this->assertStringEndsWith('catalogo_juegos/Polimotor/Rompecabezas/rompecabeza.png', $juego->urlImagen());

        $juego->updated_at = now()->setTimestamp(1700000000);
        $this->assertStringEndsWith('/rompecabeza.png?v=1700000000', $juego->urlImagen());
    }

    public function test_imagen_conserva_nombre_del_archivo_sin_pisar_recursos(): void
    {
        [$svc, $relativa, $dir, $guardar] = $this->paqueteTemporalConImagen();

        try {
            file_put_contents($dir.DIRECTORY_SEPARATOR.'fondo.png', 'recurso del juego');

            $nombre = $guardar->invoke($svc, $relativa, UploadedFile::fake()->create('Mi Laberíntó_2.PNG', 5, 'image/png'));
            $this->assertSame('mi-laberinto_2.png', $nombre);

            $nombre = $guardar->invoke($svc, $relativa, UploadedFile::fake()->create('fondo.png', 5, 'image/png'));
            $this->assertSame('fondo-2.png', $nombre);
            $this->assertSame('recurso del juego', file_get_contents($dir.DIRECTORY_SEPARATOR.'fondo.png'));

            $nombre = $guardar->invoke($svc, $relativa, UploadedFile::fake()->create('otra.png', 5, 'image/png'), 'laberinto.png');
            $this->assertSame('laberinto.png', $nombre, 'Reemplazo con misma extensión conserva el nombre actual.');

            $nombre = $guardar->invoke($svc, $relativa, UploadedFile::fake()->create('otra.webp', 5, 'image/webp'), 'laberinto.png');
            $this->assertSame('otra.webp', $nombre);

            $this->expectException(ValidationException::class);
            $guardar->invoke($svc, $relativa, UploadedFile::fake()->create('script.svg', 1, 'image/svg+xml'));
        } finally {
            $this->borrarPaqueteTemporal($dir);
        }
    }

    public function test_no_elimina_imagen_referenciada_por_el_paquete(): void
    {
        [$svc, $relativa, $dir] = $this->paqueteTemporalConImagen();
        $eliminar = new \ReflectionMethod($svc, 'eliminarImagenDePaquete');
        $eliminar->setAccessible(true);

        try {
            file_put_contents($dir.DIRECTORY_SEPARATOR.'index.html', '<img class="inicio-icono" src="laberinto.png">');
            file_put_contents($dir.DIRECTORY_SEPARATOR.'laberinto.png', 'x');
            file_put_contents($dir.DIRECTORY_SEPARATOR.'suelta.png', 'x');

            $eliminar->invoke($svc, $relativa, 'laberinto.png');
            $eliminar->invoke($svc, $relativa, 'suelta.png');

            $this->assertFileExists($dir.DIRECTORY_SEPARATOR.'laberinto.png');
            $this->assertFileDoesNotExist($dir.DIRECTORY_SEPARATOR.'suelta.png');
        } finally {
            $this->borrarPaqueteTemporal($dir);
        }
    }

    /**
     * @return array{0: JuegoCatalogoService, 1: string, 2: string, 3: \ReflectionMethod}
     */
    private function paqueteTemporalConImagen(): array
    {
        $svc = new JuegoCatalogoService;
        $relativa = 'catalogo_juegos/_TmpTestImagen'.uniqid();
        $dir = public_path($relativa);
        mkdir($dir, 0777, true);

        $guardar = new \ReflectionMethod($svc, 'guardarImagenEnPaquete');
        $guardar->setAccessible(true);

        return [$svc, $relativa, $dir, $guardar];
    }

    private function borrarPaqueteTemporal(string $dir): void
    {
        foreach (glob($dir.DIRECTORY_SEPARATOR.'*') ?: [] as $f) {
            @unlink($f);
        }
        @rmdir($dir);
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

    public function test_normalizar_ruta_rechaza_path_traversal(): void
    {
        $this->expectException(ValidationException::class);

        (new JuegoCatalogoService)->normalizarRuta('../etc/passwd');
    }

    public function test_normalizar_ruta_limpia_slashes(): void
    {
        $ruta = (new JuegoCatalogoService)->normalizarRuta('catalogo_juegos/Polimotor/Rompecabezas/');

        $this->assertSame('catalogo_juegos/Polimotor/Rompecabezas', $ruta);
    }

    public function test_assert_paquete_exige_index_html(): void
    {
        $relativa = 'catalogo_juegos/_tmp_test_paquete_'.uniqid();
        $dir = public_path($relativa);
        if (! is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        file_put_contents($dir.DIRECTORY_SEPARATOR.'index.html', '<html></html>');

        $svc = new JuegoCatalogoService;

        try {
            $svc->assertPaqueteIndexExiste($relativa);
            $this->addToAssertionCount(1);
        } finally {
            @unlink($dir.DIRECTORY_SEPARATOR.'index.html');
            @rmdir($dir);
        }

        $this->expectException(ValidationException::class);
        $svc->assertPaqueteIndexExiste($relativa);
    }

    public function test_segmento_carpeta_studly_sin_acentos(): void
    {
        $svc = new JuegoCatalogoService;

        $this->assertSame('Polimotor', $svc->segmentoCarpeta('polimotor'));
        $this->assertSame('RompecabezasDelCuerpo', $svc->segmentoCarpeta('Rompecabezas del cuerpo'));
        $this->assertSame('ExpresionArtistica', $svc->segmentoCarpeta('expresion-artistica'));
    }

    public function test_construir_ruta_paquete(): void
    {
        $ambiente = new Ambiente(['slug' => 'polimotor', 'nombre' => 'Polimotor']);
        $ruta = (new JuegoCatalogoService)->construirRutaPaquete($ambiente, 'Reconocimiento de partes');

        $this->assertSame('catalogo_juegos/Polimotor/ReconocimientoDePartes', $ruta);
    }

    public function test_crear_stub_y_falla_si_carpeta_existe(): void
    {
        $svc = new JuegoCatalogoService;
        $relativa = 'catalogo_juegos/_TmpTestStub'.uniqid();
        $dir = public_path($relativa);

        try {
            $svc->crearStubPaquete($relativa, 'Juego de prueba');
            $this->assertFileExists($dir.DIRECTORY_SEPARATOR.'index.html');
            $this->assertFileExists($dir.DIRECTORY_SEPARATOR.'script.js');
            $this->assertFileExists($dir.DIRECTORY_SEPARATOR.'style.css');
            $this->assertFileExists($dir.DIRECTORY_SEPARATOR.'config.json');

            $this->expectException(ValidationException::class);
            $svc->assertCarpetaPaqueteLibre($relativa);
        } finally {
            if (is_dir($dir)) {
                foreach (['index.html', 'script.js', 'style.css', 'config.json'] as $f) {
                    @unlink($dir.DIRECTORY_SEPARATOR.$f);
                }
                @rmdir($dir);
            }
        }
    }

    public function test_slug_es_valido_kebab_case(): void
    {
        $this->assertTrue(Juego::slugEsValido('rompecabezas-del-cuerpo'));
        $this->assertTrue(Juego::slugEsValido('lateralidad'));
        $this->assertFalse(Juego::slugEsValido(''));
        $this->assertFalse(Juego::slugEsValido('Rompecabezas'));
        $this->assertFalse(Juego::slugEsValido('con_guion_bajo'));
    }

    public function test_color_es_valido_hex(): void
    {
        $this->assertTrue(Juego::colorEsValido('#2563eb'));
        $this->assertTrue(Juego::colorEsValido('#fff'));
        $this->assertFalse(Juego::colorEsValido(''));
        $this->assertFalse(Juego::colorEsValido('2563eb'));
        $this->assertFalse(Juego::colorEsValido('azul'));
    }

    public function test_extrae_rangos_edad_desde_nombre_y_carpeta(): void
    {
        $svc = new JuegoCatalogoService;

        $this->assertSame(
            [['min' => 3, 'max' => 4]],
            $svc->extraerRangosEdadDeTexto('Encuentra El Rojo (3-4 Años)')
        );
        $this->assertSame(
            [['min' => 5, 'max' => 6]],
            $svc->extraerRangosEdadDeTexto('Encuentra El Rojo (5-6 Años)')
        );
        $this->assertSame(
            [['min' => 3, 'max' => 4]],
            $svc->extraerRangosEdadDeTexto('catalogo_juegos/Multisensorial/EncuentraElColor/EncuentraElRojo34Anos')
        );
        $this->assertSame(
            [['min' => 3, 'max' => 3]],
            $svc->extraerRangosEdadDeTexto('3 años')
        );
        $this->assertSame('Encuentra El Rojo', $svc->nombreSinSufijoEdad('Encuentra El Rojo (3-4 Años)'));
    }

    public function test_juego_apto_para_edad_por_nombre(): void
    {
        $svc = new JuegoCatalogoService;
        $j34 = new Juego([
            'slug' => 'encuentra-el-rojo-3-4-anos',
            'nombre' => 'Encuentra El Rojo (3-4 Años)',
            'ruta' => 'catalogo_juegos/Multisensorial/EncuentraElColor/EncuentraElRojo34Anos',
        ]);
        $j56 = new Juego([
            'slug' => 'encuentra-el-rojo-5-6-anos',
            'nombre' => 'Encuentra El Rojo (5-6 Años)',
            'ruta' => 'catalogo_juegos/Multisensorial/EncuentraElColor/EncuentraElRojo56Anos',
        ]);
        $sinEdad = new Juego([
            'slug' => 'juego-libre',
            'nombre' => 'Juego libre',
            'ruta' => '',
        ]);

        $this->assertTrue($svc->juegoAptoParaEdad($j34, 3));
        $this->assertTrue($svc->juegoAptoParaEdad($j34, 4));
        $this->assertFalse($svc->juegoAptoParaEdad($j34, 5));
        $this->assertTrue($svc->juegoAptoParaEdad($j56, 5));
        $this->assertFalse($svc->juegoAptoParaEdad($j56, 4));
        $this->assertTrue($svc->juegoAptoParaEdad($sinEdad, 4));
    }
}
