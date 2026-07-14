<?php

namespace App\Services\Docente;

class GrupoEstadisticasService
{
    public function calcular($matriculas): array
    {
        $activos = $matriculas->count();

        $conPiar = $matriculas->filter(function ($matricula) {
            return ! empty($matricula->estudiante->piar);
        })->count();

        $sinPin = $matriculas->filter(function ($matricula) {
            return empty($matricula->estudiante->configuracionPin);
        })->count();

        $requierePiarSinDiligenciar = $matriculas->filter(function ($matricula) {
            $condicion = $matricula->estudiante->condicion ?? 'estandar';
            $condicionEstandar = strtolower($condicion) === 'estandar';

            return ! $condicionEstandar && empty($matricula->estudiante->piar);
        })->count();

        return [
            'activos' => $activos,
            'piar' => $conPiar,
            'sin_pin' => $sinPin,
            'asistencia_pendiente' => $activos > 0 && $sinPin >= 0 ? 1 : 0,
            'conectados' => 0,
            'observaciones' => 0,
            'requiere_piar_sin_diligenciar' => $requierePiarSinDiligenciar,
            'tiene_alerta_pin' => $sinPin > 0,
            'tiene_alerta_piar' => $requierePiarSinDiligenciar > 0,
        ];
    }

    public function listarEstudiantes($matriculas): array
    {
        return $matriculas->map(function ($matricula) {
            $estudiante = $matricula->estudiante;
            $condicion = strtolower($estudiante->condicion ?? 'estandar');
            $condicionEstandar = $condicion === 'estandar';
            $tienePiar = ! empty($estudiante->piar);
            $tienePin = ! empty($estudiante->configuracionPin);
            $estado = strtoupper($matricula->estado ?? 'activo') === 'ACTIVO' ? 'Activo' : 'Inactivo';
            $estadoPiar = $condicionEstandar || $tienePiar ? 'No aplica' : 'Pendiente';
            $requiereAtencionPiar = ! $condicionEstandar && ! $tienePiar;

            return [
                'id' => $estudiante->id,
                'nombre' => $estudiante->nombre,
                'iniciales' => $estudiante->iniciales ?? strtoupper(substr($estudiante->nombre ?? 'E', 0, 2)),
                'condicion' => $estudiante->condicion ?? 'estandar',
                'estado' => $estado,
                'tiene_pin' => $tienePin,
                'estado_piar' => $estadoPiar,
                'requiere_atencion_piar' => $requiereAtencionPiar,
                'color_avatar' => $estudiante->color_avatar ?? '#2563EB',
                'activo' => $estado === 'Activo',
            ];
        })->values()->all();
    }
}
