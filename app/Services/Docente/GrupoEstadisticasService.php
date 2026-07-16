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
            return ! $this->esCondicionEstandar($matricula->estudiante)
                && empty($matricula->estudiante->piar);
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
            $condicionEstandar = $this->esCondicionEstandar($estudiante);
            $tienePiar = ! empty($estudiante->piar);
            $tienePin = ! empty($estudiante->configuracionPin);
            $estado = strtoupper($matricula->estado ?? 'activo') === 'ACTIVO' ? 'Activo' : 'Inactivo';
            $estadoPiar = $condicionEstandar || $tienePiar ? 'No aplica' : 'Pendiente';
            $requiereAtencionPiar = ! $condicionEstandar && ! $tienePiar;
            [$condicionId, $condicionNombre] = $this->resolverCondicionDatos($estudiante);

            return [
                'id' => $estudiante->id,
                'nombre' => $estudiante->nombre,
                'iniciales' => $estudiante->iniciales ?? strtoupper(substr($estudiante->nombre ?? 'E', 0, 2)),
                'condicion' => $this->resolverClaveCondicion($estudiante),
                'condicion_id' => $condicionId,
                'condicion_nombre' => $condicionNombre,
                'estado' => $estado,
                'tiene_pin' => $tienePin,
                'estado_piar' => $estadoPiar,
                'requiere_atencion_piar' => $requiereAtencionPiar,
                'color_avatar' => $estudiante->color_avatar ?? '#2563EB',
                'activo' => $estado === 'Activo',
            ];
        })->values()->all();
    }

    /**
     * La alerta de PIAR solo aplica a matriculados con condición distinta de estándar.
     */
    public function esCondicionEstandar($estudiante): bool
    {
        return $this->resolverClaveCondicion($estudiante) === 'estandar';
    }

    /**
     * Normaliza la condición del estudiante a una clave estable del panel
     * (estandar, tea, tdah, etc.), ya sea string legado o relación Condicion.
     */
    public function resolverClaveCondicion($estudiante): string
    {
        [$condicionId, $condicionNombre] = $this->resolverCondicionDatos($estudiante);

        return $this->normalizarNombreCondicion($condicionNombre, $condicionId);
    }

    /**
     * @return array{0: ?int, 1: string}
     */
    public function resolverCondicionDatos($estudiante): array
    {
        $condicion = $estudiante->condicion ?? null;

        if (is_object($condicion) && isset($condicion->nombre)) {
            return [
                isset($condicion->id) ? (int) $condicion->id : ($estudiante->condicion_id ?? null),
                (string) $condicion->nombre,
            ];
        }

        if (is_string($condicion) && $condicion !== '') {
            return [
                isset($estudiante->condicion_id) ? (int) $estudiante->condicion_id : null,
                $condicion,
            ];
        }

        $condicionId = isset($estudiante->condicion_id) ? (int) $estudiante->condicion_id : null;

        return [$condicionId, $condicionId === 1 || $condicionId === null ? 'Estandar' : ''];
    }

    private function normalizarNombreCondicion(?string $nombre, ?int $condicionId = null): string
    {
        if ($condicionId === 1) {
            return 'estandar';
        }

        $valor = strtolower(trim((string) $nombre));
        $valor = strtr($valor, [
            'á' => 'a',
            'é' => 'e',
            'í' => 'i',
            'ó' => 'o',
            'ú' => 'u',
        ]);

        if ($valor === '' || $valor === 'estandar') {
            return 'estandar';
        }

        $mapa = [
            'tea' => 'tea',
            'tdah' => 'tdah',
            'discapacidad visual' => 'disc_visual',
            'disc_visual' => 'disc_visual',
            'discapacidad auditiva' => 'disc_auditiva',
            'disc_auditiva' => 'disc_auditiva',
            'discapacidad motriz' => 'disc_motriz',
            'disc_motriz' => 'disc_motriz',
            'sindrome de down' => 'down',
            'down' => 'down',
        ];

        return $mapa[$valor] ?? $valor;
    }
}
