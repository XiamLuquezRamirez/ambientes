<?php

namespace Tests\Unit;

use App\Models\PerfilAprendizajePersonalizado;
use App\Services\ParametrosPerfilAprendizajeService;
use InvalidArgumentException;
use Tests\TestCase;

class ParametrosPerfilAprendizajeServiceTest extends TestCase
{
    private ParametrosPerfilAprendizajeService $servicio;

    protected function setUp(): void
    {
        parent::setUp();
        $this->servicio = app(ParametrosPerfilAprendizajeService::class);
    }

    public function test_valores_sistema_inclusion_aplica_preset_tea(): void
    {
        $mapa = config('parametros_perfil.mapa_perfiles', []);
        $teaId = array_search('tea', $mapa, true);

        if ($teaId === false) {
            $this->markTestSkipped('No hay perfil TEA en mapa_perfiles.');
        }

        $valores = $this->servicio->valoresSistemaInclusion((int) $teaId);

        $this->assertSame(80, $valores['btn_size']);
        $this->assertSame('manual', $valores['audio_instruc']);
        $this->assertSame(72, config('parametros_perfil.base.btn_size'));
        $this->assertCount(50, $valores);
    }

    public function test_guardar_institucion_persiste_los_cincuenta_parametros(): void
    {
        $mapa = config('parametros_perfil.mapa_perfiles', []);
        $estandarId = array_search('estandar', $mapa, true) ?: 1;
        $institucionId = 99999;

        $referencia = $this->servicio->valoresReferenciaInstitucion($institucionId, 'inclusion', (int) $estandarId);
        $valores = array_merge($referencia, ['btn_size' => 96]);

        $this->servicio->guardarInstitucion($institucionId, 'inclusion', (int) $estandarId, $valores);

        $archivo = $this->servicio->leerArchivoInstitucion($institucionId, 'inclusion', (int) $estandarId);
        $this->assertCount(50, $archivo['valores']);
        $this->assertSame(96, $archivo['valores']['btn_size']);
        $this->assertSame(['btn_size' => 96], $archivo['overrides']);

        $resueltos = $this->servicio->valoresResueltosInstitucion($institucionId, 'inclusion', (int) $estandarId);
        $this->assertSame(96, $resueltos['btn_size']);
        $this->assertCount(50, $resueltos);

        $this->servicio->restablecerInstitucion($institucionId, 'inclusion', (int) $estandarId);
    }

    public function test_inicializar_personalizado_usa_valores_de_base(): void
    {
        $mapa = config('parametros_perfil.mapa_perfiles', []);
        $teaId = array_search('tea', $mapa, true);

        if ($teaId === false) {
            $this->markTestSkipped('No hay perfil TEA en mapa_perfiles.');
        }

        $institucionId = 99998;
        $perfil = new PerfilAprendizajePersonalizado([
            'id' => 88881,
            'perfil_aprendizaje_id' => (int) $teaId,
        ]);

        $this->servicio->inicializarInstitucionPersonalizado($institucionId, 88881, $perfil);

        $valores = $this->servicio->valoresResueltosInstitucion($institucionId, 'personalizado', 88881, $perfil);
        $this->assertCount(50, $valores);
        $this->assertSame(80, $valores['btn_size']);

        $ruta = storage_path('parametros-perfil/'.$institucionId.'/personalizado/88881.json');
        if (file_exists($ruta)) {
            unlink($ruta);
        }
    }

    public function test_inicializar_personalizado_sin_base_usa_estandar(): void
    {
        $institucionId = 99997;
        $perfil = new PerfilAprendizajePersonalizado([
            'id' => 88882,
            'perfil_aprendizaje_id' => null,
        ]);

        $this->servicio->inicializarInstitucionPersonalizado($institucionId, 88882, $perfil);

        $valores = $this->servicio->valoresResueltosInstitucion($institucionId, 'personalizado', 88882, $perfil);
        $estandar = $this->servicio->valoresEstandar();

        $this->assertSame($estandar, $valores);

        $ruta = storage_path('parametros-perfil/'.$institucionId.'/personalizado/88882.json');
        if (file_exists($ruta)) {
            unlink($ruta);
        }
    }

    public function test_validacion_rechaza_parametro_desconocido(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->servicio->guardarInstitucion(1, 'inclusion', 1, [
            'parametro_inexistente' => true,
        ]);
    }

    public function test_catalogo_expone_cincuenta_parametros(): void
    {
        $this->assertCount(50, $this->servicio->listarParametrosDef());
    }
}
