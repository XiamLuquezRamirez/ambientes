<?php

namespace App\Services\Docente;

class GrupoEstadisticasService
{
    public function calcular($matriculas, bool $listaTomada = false): array
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
            'lista_tomada' => $listaTomada,
            'conectados' => 0,
            'observaciones' => 0,
            'requiere_piar_sin_diligenciar' => $requierePiarSinDiligenciar,
            'tiene_alerta_pin' => $sinPin > 0,
            'tiene_alerta_piar' => $requierePiarSinDiligenciar > 0,
        ];
    }

    /**
     * La alerta de PIAR solo aplica a matriculados con perfil de aprendizaje distinta de estándar.
     */
    public function esCondicionEstandar($estudiante): bool
    {
        return $this->resolverClaveCondicion($estudiante) === 'estandar';
    }

    /**
     * Normaliza el perfil de aprendizaje del estudiante a una clave estable del panel
     * (estandar, tea, tdah, etc.), ya sea string legado o relación PerfilAprendizaje.
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
                isset($condicion->id) ? (int) $condicion->id : ($estudiante->id_condicion ?? null),
                (string) $condicion->nombre,
            ];
        }

        if (is_string($condicion) && $condicion !== '') {
            return [
                isset($estudiante->id_condicion) ? (int) $estudiante->id_condicion : null,
                $condicion,
            ];
        }

        $condicionId = isset($estudiante->id_condicion) ? (int) $estudiante->id_condicion : null;

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
