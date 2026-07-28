<?php

namespace App\Services\Docente;

class DocenteAsignacionService
{
    public function prepararAsignacion($estudiante, $carga, array $datos = []): array
    {
        return [
            'estudiante_id' => $estudiante->id,
            'ambiente_id' => $carga->ambiente_id,
            'grado_id' => $carga->grado_id,
            'grupo_id' => $carga->grupo_id,
            'anio_lectivo' => $datos['anio_lectivo'] ?? date('Y'),
            'estado' => 'activo',
            'fecha_ingreso' => $datos['fecha_ingreso'] ?? date('Y-m-d'),
            'sync_payload' => [
                'entidad' => 'Matricula',
                'accion' => 'create',
            ],
        ];
    }
}
