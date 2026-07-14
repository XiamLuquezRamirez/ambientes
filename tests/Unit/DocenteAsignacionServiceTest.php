<?php

namespace Tests\Unit;

use App\Services\Docente\DocenteAsignacionService;
use PHPUnit\Framework\TestCase;

class DocenteAsignacionServiceTest extends TestCase
{
    public function test_prepara_datos_de_asignacion_con_contexto_activo(): void
    {
        $service = new DocenteAsignacionService;

        $estudiante = new \stdClass;
        $estudiante->id = 42;

        $carga = new \stdClass;
        $carga->ambiente_id = 7;
        $carga->grado_id = 3;
        $carga->grupo_id = 11;

        $resultado = $service->prepararAsignacion($estudiante, $carga, [
            'fecha_ingreso' => '2026-07-13',
        ]);

        $this->assertSame(42, $resultado['estudiante_id']);
        $this->assertSame(7, $resultado['ambiente_id']);
        $this->assertSame(3, $resultado['grado_id']);
        $this->assertSame(11, $resultado['grupo_id']);
        $this->assertSame(date('Y'), $resultado['anio_lectivo']);
        $this->assertSame('activo', $resultado['estado']);
        $this->assertSame('2026-07-13', $resultado['fecha_ingreso']);
        $this->assertSame('Matricula', $resultado['sync_payload']['entidad']);
    }
}
