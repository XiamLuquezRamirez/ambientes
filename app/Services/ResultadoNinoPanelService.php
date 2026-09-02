<?php

namespace App\Services;

use App\Models\BloqueExperiencia;
use App\Models\CargaDocente;
use App\Models\Clase;
use App\Models\Estudiante;
use App\Models\ResultadoBloqueNino;
use App\Services\Docente\GrupoEstudiantesService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;

class ResultadoNinoPanelService
{
    public function __construct(
        private GrupoEstudiantesService $grupoEstudiantes,
    ) {}

    public function claseAccesible(Clase $clase, CargaDocente $carga): bool
    {
        return (int) $clase->carga_docente_id === (int) $carga->id;
    }

    /**
     * @return array{
     *     estudiantes: Collection,
     *     experiencias: Collection,
     *     resultados: Collection,
     *     resumenes: array<int, string>
     * }
     */
    public function datosClase(Clase $clase, ?int $experienciaId = null): array
    {
        $clase->loadMissing(['experienciasClase.experiencia', 'cargaDocente']);

        $carga = $clase->cargaDocente;
        abort_unless($carga, 404, 'La clase no tiene carga docente asociada.');

        $estudiantes = $this->grupoEstudiantes->listar($carga);
        $experiencias = $clase->experienciasClase
            ->map(fn ($pivot) => $pivot->experiencia)
            ->filter()
            ->unique('id')
            ->values();

        $query = ResultadoBloqueNino::query()
            ->where('clase_id', $clase->id)
            ->with([
                'estudiante:id,nombre,apellido,iniciales,color_avatar',
                'bloque:id,tipo,orden,datos',
                'experiencia:id,nombre',
            ])
            ->orderBy('estudiante_id')
            ->orderBy('experiencia_id')
            ->orderBy('bloque_experiencia_id');

        if ($experienciaId) {
            $query->where('experiencia_id', $experienciaId);
        }

        $resultados = $query->get();

        $resumenes = $resultados
            ->mapWithKeys(fn (ResultadoBloqueNino $r) => [$r->id => $this->resumenResultado($r)])
            ->all();

        return [
            ...compact('estudiantes', 'experiencias', 'resultados', 'resumenes'),
            'estadisticas' => $this->estadisticas($estudiantes, $resultados),
            'porEstudiante' => $this->agruparPorEstudiante($estudiantes, $resultados),
        ];
    }

    /**
     * @return array{
     *     estudiante: array<string, mixed>,
     *     resultados: Collection,
     *     resumenes: array<int, string>,
     *     estadisticas: array<string, int>
     * }
     */
    public function datosEstudianteEnClase(Clase $clase, Estudiante $estudiante, ?int $experienciaId = null): array
    {
        $datos = $this->datosClase($clase, $experienciaId);
        $resultados = $datos['resultados']->where('estudiante_id', $estudiante->id)->values();

        $estudianteLista = $datos['estudiantes']->firstWhere('id', $estudiante->id);
        abort_unless($estudianteLista, 404, 'El estudiante no pertenece al grupo de esta clase.');

        $resumenes = $resultados
            ->mapWithKeys(fn (ResultadoBloqueNino $r) => [$r->id => $this->resumenResultado($r)])
            ->all();

        return [
            'estudiante' => $estudianteLista,
            'resultados' => $resultados,
            'resumenes' => $resumenes,
            'experiencias' => $datos['experiencias'],
            'estadisticas' => [
                'registros_total' => $resultados->count(),
                'correctos' => $resultados->where('correcto', true)->count(),
                'incorrectos' => $resultados->where('correcto', false)->count(),
                'con_archivo' => $resultados->whereNotNull('archivo_path')->count(),
            ],
        ];
    }

    /**
     * @return array<string, int|float>
     */
    public function estadisticas(Collection $estudiantes, Collection $resultados): array
    {
        $totalEst = $estudiantes->count();
        $conResultado = $resultados->pluck('estudiante_id')->unique()->count();

        return [
            'estudiantes_total' => $totalEst,
            'estudiantes_con_resultado' => $conResultado,
            'estudiantes_sin_resultado' => max(0, $totalEst - $conResultado),
            'participacion_pct' => $totalEst > 0 ? round(($conResultado / $totalEst) * 100) : 0,
            'registros_total' => $resultados->count(),
            'correctos' => $resultados->where('correcto', true)->count(),
            'incorrectos' => $resultados->where('correcto', false)->count(),
            'con_archivo' => $resultados->whereNotNull('archivo_path')->count(),
        ];
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function agruparPorEstudiante(Collection $estudiantes, Collection $resultados): Collection
    {
        $porEstudiante = $resultados->groupBy('estudiante_id');

        return $estudiantes
            ->map(function (array $est) use ($porEstudiante) {
                /** @var Collection<int, ResultadoBloqueNino> $items */
                $items = $porEstudiante->get($est['id'], collect());

                return [
                    'estudiante' => $est,
                    'resultados' => $items->values(),
                    'total' => $items->count(),
                    'correctos' => $items->where('correcto', true)->count(),
                    'incorrectos' => $items->where('correcto', false)->count(),
                    'con_archivo' => $items->whereNotNull('archivo_path')->count(),
                ];
            })
            ->sortBy(fn (array $fila) => mb_strtolower(trim(($fila['estudiante']['nombre'] ?? '').' '.($fila['estudiante']['apellido'] ?? ''))))
            ->values();
    }

    public function exportarPdfClase(Clase $clase, CargaDocente $carga, ?int $experienciaId = null)
    {
        $clase->loadMissing(['cargaDocente.grado', 'cargaDocente.grupo']);
        $datos = $this->datosClase($clase, $experienciaId);

        $experienciaNombre = null;
        if ($experienciaId) {
            $experienciaNombre = $datos['experiencias']->firstWhere('id', $experienciaId)?->nombre;
        }

        return Pdf::loadView('panel.clases.resultados-pdf', [
            'clase' => $clase,
            'carga' => $carga,
            'experienciaNombre' => $experienciaNombre,
            'estadisticas' => $datos['estadisticas'],
            'porEstudiante' => $datos['porEstudiante'],
            'resumenes' => $datos['resumenes'],
            'panelService' => $this,
        ])->setPaper('a4', 'portrait');
    }

    public function nombreEstudiante(?Estudiante $estudiante, ?array $fallback = null): string
    {
        if ($estudiante) {
            $nombre = trim(($estudiante->nombre ?? '').' '.($estudiante->apellido ?? ''));

            return $nombre !== '' ? $nombre : 'Estudiante #'.$estudiante->id;
        }

        if ($fallback) {
            $nombre = trim(($fallback['nombre'] ?? '').' '.($fallback['apellido'] ?? ''));

            return $nombre !== '' ? $nombre : 'Estudiante #'.($fallback['id'] ?? '?');
        }

        return 'Estudiante';
    }

    public function etiquetaEstado(?bool $correcto): string
    {
        if ($correcto === true) {
            return 'Correcto';
        }
        if ($correcto === false) {
            return 'Incorrecto';
        }

        return 'Registrado';
    }

    public function esArchivoImagen(ResultadoBloqueNino $resultado): bool
    {
        if (! $resultado->archivo_path) {
            return false;
        }

        $ext = strtolower(pathinfo($resultado->archivo_path, PATHINFO_EXTENSION));

        return in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true);
    }

    public function urlArchivo(ResultadoBloqueNino $resultado): ?string
    {
        return $resultado->archivo_path ? asset('storage/'.$resultado->archivo_path) : null;
    }

    public function resumenResultado(ResultadoBloqueNino $resultado): string
    {
        $payload = $resultado->payload ?? [];

        return match ($resultado->tipo_bloque) {
            BloqueExperiencia::TIPO_PREGUNTA => ($resultado->correcto ?? ($payload['correcta'] ?? false))
                ? 'Respuesta correcta'
                : 'Respuesta incorrecta',
            BloqueExperiencia::TIPO_RETO => ($resultado->correcto ?? ($payload['correcta'] ?? false))
                ? 'Reto superado'
                : 'Reto no superado',
            BloqueExperiencia::TIPO_EMOCION => 'Emoción: '.($payload['emocion_id'] ?? '—'),
            BloqueExperiencia::TIPO_EVIDENCIA => 'Evidencia '.($payload['tipo_media'] ?? 'archivo'),
            BloqueExperiencia::TIPO_DIBUJO => 'Dibujo entregado',
            BloqueExperiencia::TIPO_EMPAREJAR => sprintf(
                'Emparejó %d/%d pares',
                (int) ($payload['pares_correctos'] ?? 0),
                (int) ($payload['pares_total'] ?? 0)
            ),
            BloqueExperiencia::TIPO_CLASIFICACION, BloqueExperiencia::TIPO_ARRASTRAR => sprintf(
                'Colocó %d/%d ítems',
                (int) ($payload['items_colocados'] ?? 0),
                (int) ($payload['items_total'] ?? 0)
            ),
            BloqueExperiencia::TIPO_JUEGO => match ($payload['juego_id'] ?? '') {
                'memoria' => sprintf(
                    'Memoria: %d/%d parejas (%d intentos)',
                    (int) ($payload['pares_encontrados'] ?? 0),
                    (int) ($payload['pares_total'] ?? 0),
                    (int) ($payload['intentos_parejas'] ?? 0)
                ),
                'rompecabezas' => 'Rompecabezas completado',
                'secuencia' => 'Secuencia ordenada',
                'colorear' => 'Colorear entregado',
                default => 'Juego completado',
            },
            default => ucfirst(str_replace('_', ' ', $resultado->tipo_bloque)),
        };
    }

    public function etiquetaTipoBloque(string $tipo, ?array $datosBloque = null): string
    {
        if ($tipo === BloqueExperiencia::TIPO_JUEGO) {
            $juegoId = (string) ($datosBloque['juego_id'] ?? '');

            return match ($juegoId) {
                'memoria' => 'Juego · Memoria',
                'rompecabezas' => 'Juego · Rompecabezas',
                'secuencia' => 'Juego · Secuencia',
                'colorear' => 'Juego · Colorear',
                default => 'Juego',
            };
        }

        return match ($tipo) {
            BloqueExperiencia::TIPO_PREGUNTA => 'Pregunta',
            BloqueExperiencia::TIPO_RETO => 'Reto',
            BloqueExperiencia::TIPO_EMOCION => 'Emoción',
            BloqueExperiencia::TIPO_EVIDENCIA => 'Evidencia',
            BloqueExperiencia::TIPO_DIBUJO => 'Dibujo',
            BloqueExperiencia::TIPO_EMPAREJAR => 'Emparejar',
            BloqueExperiencia::TIPO_CLASIFICACION => 'Clasificación',
            BloqueExperiencia::TIPO_ARRASTRAR => 'Arrastrar',
            default => ucfirst($tipo),
        };
    }
}
