<?php

namespace Tests\Unit;

use App\Models\Clase;
use App\Models\ClaseExperiencia;
use App\Models\Experiencia;
use App\Services\AccesoAmbienteService;
use App\Services\BloqueExperienciaService;
use App\Services\ClaseKioscoService;
use App\Services\RecorridoNinoService;
use App\Services\SesionNinoService;
use Illuminate\Http\Request;
use Tests\TestCase;

class ClaseKioscoServiceTest extends TestCase
{
    public function test_anio_lectivo_coincide_con_acceso(): void
    {
        $acceso = new AccesoAmbienteService;
        $servicio = new ClaseKioscoService($acceso);

        $this->assertSame($acceso->anioLectivo(), $servicio->anioLectivo());
    }

    public function test_estados_de_clase_incluyen_activa(): void
    {
        $this->assertContains(Clase::ESTADO_ACTIVA, Clase::ESTADOS);
        $this->assertContains(Clase::ESTADO_BORRADOR, Clase::ESTADOS);
        $this->assertContains(Clase::ESTADO_FINALIZADA, Clase::ESTADOS);
    }

    public function test_experiencia_permitida_exige_id_de_clase_cuando_viene_en_sesion(): void
    {
        $bloques = $this->createMock(BloqueExperienciaService::class);
        $service = new RecorridoNinoService($bloques);

        $experiencia = new Experiencia;
        $experiencia->id = 55;

        $this->assertTrue($service->experienciaPermitidaEnSesion([
            'ambiente_id' => 1,
            'experiencia_id' => 55,
        ], $experiencia));

        $this->assertFalse($service->experienciaPermitidaEnSesion([
            'ambiente_id' => 1,
            'experiencia_id' => 99,
        ], $experiencia));
    }

    public function test_sesion_limpia_incluye_clase_id(): void
    {
        $this->assertSame('clase_id', SesionNinoService::SESSION_CLASE_ID);

        $acceso = new AccesoAmbienteService;
        $servicio = new SesionNinoService($acceso);
        $request = Request::create('/', 'GET');
        $request->setLaravelSession($this->app['session']->driver());

        $request->session()->put(SesionNinoService::SESSION_ESTUDIANTE_ID, 1);
        $request->session()->put(SesionNinoService::SESSION_ESTADO_AMBIENTE, 'activo');
        $request->session()->put(SesionNinoService::SESSION_CLASE_ID, 10);

        $servicio->limpiar($request);

        $this->assertNull($request->session()->get(SesionNinoService::SESSION_ESTUDIANTE_ID));
        $this->assertNull($request->session()->get(SesionNinoService::SESSION_CLASE_ID));
    }

    public function test_ip_servidor_incluye_lan_cuando_server_addr_es_cero(): void
    {
        $acceso = new AccesoAmbienteService;
        $servicio = new SesionNinoService($acceso);
        $request = Request::create('/', 'GET', [], [], [], ['SERVER_ADDR' => '0.0.0.0']);

        $ips = $servicio->ipsCandidatasNodo($request);
        $this->assertContains('0.0.0.0', $ips);
        $this->assertNotEmpty($servicio->ipServidor($request));
    }

    public function test_ip_host_de_la_url_tiene_prioridad_sobre_lan(): void
    {
        $acceso = new AccesoAmbienteService;
        $servicio = new SesionNinoService($acceso);
        $request = Request::create('http://192.168.1.14:8000/inicio', 'GET', [], [], [], [
            'SERVER_ADDR' => '192.168.1.12',
        ]);

        $ips = $servicio->ipsCandidatasNodo($request);

        $this->assertSame('192.168.1.14', $ips[0]);
    }

    public function test_resolucion_ambiente_solo_usa_ip_de_la_url(): void
    {
        $acceso = new AccesoAmbienteService;
        $servicio = new SesionNinoService($acceso);
        $request = Request::create('http://192.168.1.14:8000/inicio', 'GET', [], [], [], [
            'SERVER_ADDR' => '192.168.1.12',
        ]);

        $this->assertSame(['192.168.1.14'], $servicio->ipsParaResolucionAmbiente($request));
    }

    public function test_diagnostico_resolucion_expone_fuente(): void
    {
        $acceso = new AccesoAmbienteService;
        $servicio = new SesionNinoService($acceso);
        $request = Request::create('/', 'GET', [], [], [], ['SERVER_ADDR' => '127.0.0.1']);

        $diag = $servicio->diagnosticarResolucionAmbiente($request);
        $this->assertArrayHasKey('fuente', $diag);
        $this->assertContains($diag['fuente'], ['ambiente_institucion', 'ambiente_slug', 'error']);
    }

    public function test_arbol_lineal_exige_una_sola_ruta(): void
    {
        $bloques = $this->createMock(BloqueExperienciaService::class);
        $service = new RecorridoNinoService($bloques);

        $clase = new Clase;
        $item = new ClaseExperiencia;
        $item->modulo_id = 1;
        $item->eje_id = 2;
        $item->tematica_id = 3;
        $item->experiencia_id = 9;
        $clase->setRelation('experienciasClase', collect([$item]));

        $arbolValido = [
            'modulos' => [[
                'id' => 1,
                'nombre' => 'Módulo test',
                'descripcion' => 'Desc',
                'icono' => '📚',
                'ejes' => [[
                    'id' => 2,
                    'nombre' => 'Eje test',
                    'descripcion' => 'Desc eje',
                    'tematicas' => [[
                        'id' => 3,
                        'experiencia_id' => 9,
                        'nombre' => 'Tema',
                        'competencia' => 'Competencia',
                    ]],
                ]],
            ]],
            'ambiente' => ['nombre' => 'Test', 'icono' => '🎨'],
        ];

        $this->assertNull($service->motivoArbolNoLineal($arbolValido, $clase));
        $this->assertNotNull($service->armarCaminoLineal($arbolValido, $clase));

        $arbolInvalido = $arbolValido;
        $arbolInvalido['modulos'][0]['ejes'][0]['tematicas'][] = [
            'id' => 99,
            'experiencia_id' => 88,
            'nombre' => 'Otra',
        ];

        $this->assertNotNull($service->motivoArbolNoLineal($arbolInvalido, $clase));
    }

    public function test_clase_incompleta_no_es_valida_para_recorrido(): void
    {
        $acceso = new AccesoAmbienteService;
        $servicio = new ClaseKioscoService($acceso);

        $clase = new Clase;
        $clase->estado = Clase::ESTADO_ACTIVA;
        $clase->fecha = now();

        $item = new ClaseExperiencia;
        $item->modulo_id = 1;
        $item->eje_id = null;
        $item->tematica_id = 3;
        $item->experiencia_id = 9;
        $clase->setRelation('experienciasClase', collect([$item]));

        $this->assertFalse($servicio->claseValidaParaRecorrido($clase));
        $this->assertNotNull($servicio->motivoClaseInvalida($clase));
    }
}
