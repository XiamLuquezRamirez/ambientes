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
                    'condicion' => 'estandar',
                    'piar' => (object) ['id' => 1],
                    'configuracionPin' => (object) ['id' => 1],
                ],
            ],
            (object) [
                'estudiante' => (object) [
                    'condicion' => 'tea',
                    'piar' => null,
                    'configuracionPin' => null,
                ],
            ],
            (object) [
                'estudiante' => (object) [
                    'condicion' => 'tdah',
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

    public function test_no_alerta_piar_si_todos_tienen_condicion_estandar(): void
    {
        $service = new GrupoEstadisticasService;

        $condicionEstandar = (object) ['id' => 1, 'nombre' => 'Estandar'];

        $matriculas = collect([
            (object) [
                'estudiante' => (object) [
                    'condicion' => $condicionEstandar,
                    'condicion_id' => 1,
                    'piar' => null,
                    'configuracionPin' => null,
                ],
            ],
            (object) [
                'estudiante' => (object) [
                    'condicion' => $condicionEstandar,
                    'condicion_id' => 1,
                    'piar' => null,
                    'configuracionPin' => (object) ['id' => 1],
                ],
            ],
        ]);

        $resultado = $service->calcular($matriculas);

        $this->assertSame(0, $resultado['requiere_piar_sin_diligenciar']);
        $this->assertFalse($resultado['tiene_alerta_piar']);
    }

    public function test_alerta_piar_con_relacion_condicion_diferente_de_estandar(): void
    {
        $service = new GrupoEstadisticasService;

        $condicionTea = (object) ['id' => 3, 'nombre' => 'TEA'];

        $matriculas = collect([
            (object) [
                'estudiante' => (object) [
                    'condicion' => $condicionTea,
                    'condicion_id' => 3,
                    'piar' => null,
                    'configuracionPin' => (object) ['id' => 1],
                ],
            ],
        ]);

        $resultado = $service->calcular($matriculas);

        $this->assertSame(1, $resultado['requiere_piar_sin_diligenciar']);
        $this->assertTrue($resultado['tiene_alerta_piar']);
    }

    public function test_listar_estudiantes_del_grupo_con_estado_pin_y_piar(): void
    {
        $service = new GrupoEstadisticasService;

        $matriculas = collect([
            (object) [
                'estado' => 'activo',
                'estudiante' => (object) [
                    'id' => 1,
                    'nombre' => 'Ana Torres',
                    'condicion' => 'estandar',
                    'activo' => true,
                    'configuracionPin' => (object) ['id' => 1],
                    'piar' => (object) ['id' => 10],
                ],
            ],
            (object) [
                'estado' => 'inactivo',
                'estudiante' => (object) [
                    'id' => 2,
                    'nombre' => 'Luis Pérez',
                    'condicion' => 'tea',
                    'activo' => true,
                    'configuracionPin' => null,
                    'piar' => null,
                ],
            ],
        ]);

        $resultado = $service->listarEstudiantes($matriculas);

        $this->assertCount(2, $resultado);
        $this->assertSame('Ana Torres', $resultado[0]['nombre']);
        $this->assertSame('Activo', $resultado[0]['estado']);
        $this->assertTrue($resultado[0]['tiene_pin']);
        $this->assertSame('No aplica', $resultado[0]['estado_piar']);
        $this->assertFalse($resultado[0]['requiere_atencion_piar']);
        $this->assertSame('estandar', $resultado[0]['condicion']);
        $this->assertSame('estandar', $resultado[0]['condicion_nombre']);
        $this->assertSame('Pendiente', $resultado[1]['estado_piar']);
        $this->assertTrue($resultado[1]['requiere_atencion_piar']);
        $this->assertSame('tea', $resultado[1]['condicion']);
        $this->assertSame('tea', $resultado[1]['condicion_nombre']);
    }

    public function test_listar_incluye_condicion_id_y_nombre_desde_relacion(): void
    {
        $service = new GrupoEstadisticasService;
        $condicionTea = (object) ['id' => 3, 'nombre' => 'TEA'];

        $matriculas = collect([
            (object) [
                'estado' => 'activo',
                'estudiante' => (object) [
                    'id' => 9,
                    'nombre' => 'Camila Díaz',
                    'condicion' => $condicionTea,
                    'condicion_id' => 3,
                    'configuracionPin' => null,
                    'piar' => null,
                ],
            ],
        ]);

        $resultado = $service->listarEstudiantes($matriculas);

        $this->assertSame(3, $resultado[0]['condicion_id']);
        $this->assertSame('TEA', $resultado[0]['condicion_nombre']);
        $this->assertSame('tea', $resultado[0]['condicion']);
    }
}
