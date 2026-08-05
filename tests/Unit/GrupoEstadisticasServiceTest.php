<?php

namespace Tests\Unit;

use App\Services\Docente\GrupoEstadisticasService;
use PHPUnit\Framework\TestCase;

class GrupoEstadisticasServiceTest extends TestCase
{
    public function test_calcula_estadisticas_con_alertas_de_piar_y_pin(): void
    {
        $service = new GrupoEstadisticasService;

        $matriculas = collect([
            (object) [
                'estudiante' => (object) [
                    'perfilAprendizaje' => 'estandar',
                    'piar' => (object) ['id' => 1],
                    'configuracionPin' => (object) ['id' => 1],
                ],
            ],
            (object) [
                'estudiante' => (object) [
                    'perfilAprendizaje' => 'tea',
                    'piar' => null,
                    'configuracionPin' => null,
                ],
            ],
            (object) [
                'estudiante' => (object) [
                    'perfilAprendizaje' => 'tdah',
                    'piar' => null,
                    'configuracionPin' => (object) ['id' => 2],
                ],
            ],
        ]);

        $resultado = $service->calcular($matriculas);

        $this->assertSame(3, $resultado['activos']);
        $this->assertSame(1, $resultado['piar']);
        $this->assertSame(1, $resultado['sin_pin']);
        $this->assertSame(2, $resultado['requiere_piar_sin_diligenciar']);
        $this->assertTrue($resultado['tiene_alerta_pin']);
        $this->assertTrue($resultado['tiene_alerta_piar']);
    }

    public function test_no_alerta_piar_si_todos_tienen_perfil_aprendizaje_estandar(): void
    {
        $service = new GrupoEstadisticasService;

        $perfilEstandar = (object) ['id' => 1, 'nombre' => 'Estandar'];

        $matriculas = collect([
            (object) [
                'estudiante' => (object) [
                    'perfilAprendizaje' => $perfilEstandar,
                    'perfil_aprendizaje_id' => 1,
                    'piar' => null,
                    'configuracionPin' => null,
                ],
            ],
            (object) [
                'estudiante' => (object) [
                    'perfilAprendizaje' => $perfilEstandar,
                    'perfil_aprendizaje_id' => 1,
                    'piar' => null,
                    'configuracionPin' => (object) ['id' => 1],
                ],
            ],
        ]);

        $resultado = $service->calcular($matriculas);

        $this->assertSame(0, $resultado['requiere_piar_sin_diligenciar']);
        $this->assertFalse($resultado['tiene_alerta_piar']);
    }

    public function test_alerta_piar_con_relacion_perfil_aprendizaje_diferente_de_estandar(): void
    {
        $service = new GrupoEstadisticasService;

        $perfilTea = (object) ['id' => 3, 'nombre' => 'TEA'];

        $matriculas = collect([
            (object) [
                'estudiante' => (object) [
                    'perfilAprendizaje' => $perfilTea,
                    'perfil_aprendizaje_id' => 3,
                    'piar' => null,
                    'configuracionPin' => (object) ['id' => 1],
                ],
            ],
        ]);

        $resultado = $service->calcular($matriculas);

        $this->assertSame(1, $resultado['requiere_piar_sin_diligenciar']);
        $this->assertTrue($resultado['tiene_alerta_piar']);
    }

    public function test_resolver_clave_perfil_aprendizaje_desde_relacion(): void
    {
        $service = new GrupoEstadisticasService;
        $perfilTea = (object) ['id' => 3, 'nombre' => 'TEA'];

        $estudiante = (object) [
            'perfilAprendizaje' => $perfilTea,
            'perfil_aprendizaje_id' => 3,
        ];

        $this->assertSame('tea', $service->resolverClavePerfilAprendizaje($estudiante));
    }
}
