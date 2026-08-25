<?php

namespace App\Services;

use App\Models\CatalogoDBA;
use App\Models\Eje;
use App\Models\Experiencia;
use App\Models\IndicadorLogro;
use App\Models\Tematica;
use App\Models\VersionTematica;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TematicaCurriculoService
{
    public function consultaTematicasDeEje(Eje $eje, ?int $institucionId = null): Builder
    {
        return $this->consultaTematicas($institucionId, ['eje_id' => $eje->id]);
    }

    /**
     * Listado filtrable de temáticas (oficiales y/o del colegio).
     *
     * Filtros admitidos: ambiente_id, ambiente_ids, modulo_id, eje_id,
     * estado, grado_id, sin_dba.
     */
    public function consultaTematicas(?int $institucionId = null, array $filtros = []): Builder
    {
        $consulta = Tematica::query()
            ->with([
                'eje:id,nombre,modulo_id',
                'eje.modulo:id,nombre,ambiente_id',
                'eje.modulo.ambiente:id,nombre',
                'institucion:id,nombre',
                'experiencias:id,tematica_id,grado_id',
                'experiencias.grado:id,nombre',
            ])
            ->withCount([
                'experiencias',
                'experiencias as experiencias_activas_count' => fn ($q) => $q
                    ->where('activo', true)
                    ->where('estado', Experiencia::ESTADO_ACTIVA),
            ])
            ->orderBy('nombre');

        $alcance = $filtros['alcance'] ?? null;

        if ($alcance === 'todas') {
            // SuperAdmin: oficiales y de colegio, sin filtrar por origen.
        } elseif ($institucionId === null) {
            $consulta->oficiales();
        } else {
            $consulta->where(function ($q) use ($institucionId) {
                $q->where(fn ($oficial) => $oficial->oficiales())
                    ->orWhere(fn ($propia) => $propia->deInstitucion($institucionId));
            });
        }

        if (! empty($filtros['ambiente_ids']) && is_array($filtros['ambiente_ids'])) {
            $ids = array_values(array_filter(array_map('intval', $filtros['ambiente_ids'])));
            if ($ids !== []) {
                $consulta->whereHas('eje.modulo', fn ($q) => $q->whereIn('ambiente_id', $ids));
            } else {
                $consulta->whereRaw('1 = 0');
            }
        }

        if (! empty($filtros['ambiente_id'])) {
            $ambienteId = (int) $filtros['ambiente_id'];
            $consulta->whereHas('eje.modulo', fn ($q) => $q->where('ambiente_id', $ambienteId));
        }

        if (! empty($filtros['modulo_id'])) {
            $moduloId = (int) $filtros['modulo_id'];
            $consulta->whereHas('eje', fn ($q) => $q->where('modulo_id', $moduloId));
        }

        if (! empty($filtros['eje_id'])) {
            $consulta->where('eje_id', (int) $filtros['eje_id']);
        }

        if (! empty($filtros['estado']) && in_array($filtros['estado'], Tematica::ESTADOS, true)) {
            $consulta->where('estado', $filtros['estado']);
        }

        if (! empty($filtros['grado_id'])) {
            $gradoId = (int) $filtros['grado_id'];
            $consulta->whereHas('experiencias', fn ($q) => $q->where('grado_id', $gradoId));
        }

        if (! empty($filtros['sin_dba'])) {
            $consulta->whereDoesntHave('catalogosDba');
        }

        return $consulta;
    }

    /**
     * Extrae filtros de listado desde el request HTTP.
     *
     * @return array<string, mixed>
     */
    public function filtrosDesdeRequest(Request $request): array
    {
        return [
            'ambiente_id' => $request->filled('ambiente_id') ? (int) $request->ambiente_id : null,
            'modulo_id' => $request->filled('modulo_id') ? (int) $request->modulo_id : null,
            'eje_id' => $request->filled('eje_id') ? (int) $request->eje_id : null,
            'estado' => $request->filled('estado') ? (string) $request->estado : null,
            'grado_id' => $request->filled('grado_id') ? (int) $request->grado_id : null,
            'sin_dba' => $request->boolean('sin_dba'),
        ];
    }

    /**
     * @return Collection<int, CatalogoDBA>
     */
    public function buscarDbasCatalogo(?int $institucionId, ?int $gradoId = null, ?int $areaId = null, ?string $q = null): Collection
    {
        $consulta = CatalogoDBA::query()
            ->with(['area:id,nombre', 'grado:id,nombre'])
            ->where('estado', true)
            ->orderBy('codigo');

        if ($institucionId === null) {
            $consulta->whereNull('institucion_id');
        } else {
            $consulta->where(function ($builder) use ($institucionId) {
                $builder->whereNull('institucion_id')
                    ->orWhere('institucion_id', $institucionId);
            });
        }

        if ($gradoId) {
            $consulta->where('grado_id', $gradoId);
        }
        if ($areaId) {
            $consulta->where('area_id', $areaId);
        }
        if (filled($q)) {
            $term = '%'.trim($q).'%';
            $consulta->where(function ($builder) use ($term) {
                $builder->where('codigo', 'like', $term)
                    ->orWhere('descripcion', 'like', $term);
            });
        }

        return $consulta->limit(50)->get();
    }

    public function crearTematica(Eje $eje, array $datos, int $userId, bool $esOficial, ?int $institucionId = null): Tematica
    {
        return DB::transaction(function () use ($eje, $datos, $userId, $esOficial, $institucionId) {
            $tematica = Tematica::create([
                'eje_id' => $eje->id,
                'nombre' => $datos['nombre'],
                'competencia' => $datos['competencia'] ?? null,
                'referente_alternativo' => $datos['referente_alternativo'] ?? null,
                'requiere_ra' => (bool) ($datos['requiere_ra'] ?? false),
                'requiere_acompanamiento' => (bool) ($datos['requiere_acompanamiento'] ?? false),
                'es_oficial' => $esOficial,
                'institucion_id' => $esOficial ? null : $institucionId,
                'estado' => $datos['estado'] ?? Tematica::ESTADO_BORRADOR,
                'activo' => true,
                'creado_por' => $userId,
            ]);

            $this->sincronizarIndicadores($tematica, $datos['indicadores'] ?? []);
            $this->sincronizarDbas($tematica, $datos['dbas'] ?? [], $institucionId);

            return $this->cargarTematica($tematica);
        });
    }

    public function actualizarTematica(Tematica $tematica, array $datos, ?int $institucionId = null, ?int $userId = null): Tematica
    {
        return DB::transaction(function () use ($tematica, $datos, $institucionId, $userId) {
            $this->registrarVersionTematica($tematica, $userId);

            $tematica->update([
                'nombre' => $datos['nombre'],
                'competencia' => $datos['competencia'] ?? null,
                'referente_alternativo' => array_key_exists('referente_alternativo', $datos)
                    ? ($datos['referente_alternativo'] ?: null)
                    : $tematica->referente_alternativo,
                'requiere_ra' => array_key_exists('requiere_ra', $datos)
                    ? (bool) $datos['requiere_ra']
                    : $tematica->requiere_ra,
                'requiere_acompanamiento' => array_key_exists('requiere_acompanamiento', $datos)
                    ? (bool) $datos['requiere_acompanamiento']
                    : $tematica->requiere_acompanamiento,
            ]);

            if (array_key_exists('indicadores', $datos)) {
                $this->sincronizarIndicadores($tematica, $datos['indicadores'] ?? []);
            }

            if (array_key_exists('dbas', $datos)) {
                $this->sincronizarDbas($tematica, $datos['dbas'] ?? [], $institucionId);
            }

            return $this->cargarTematica($tematica);
        });
    }

    /**
     * Guarda un snapshot JSON del estado anterior antes de persistir cambios.
     */
    public function registrarVersionTematica(Tematica $tematica, ?int $userId = null): VersionTematica
    {
        $cargada = $this->cargarTematica($tematica);

        return VersionTematica::create([
            'tematica_id' => $cargada->id,
            'snapshot' => $this->construirSnapshotTematica($cargada),
            'creado_por' => $userId ?: (int) $cargada->creado_por,
            'created_at' => now(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function construirSnapshotTematica(Tematica $tematica): array
    {
        return [
            'id' => $tematica->id,
            'eje_id' => $tematica->eje_id,
            'nombre' => $tematica->nombre,
            'competencia' => $tematica->competencia,
            'referente_alternativo' => $tematica->referente_alternativo,
            'requiere_ra' => (bool) $tematica->requiere_ra,
            'requiere_acompanamiento' => (bool) $tematica->requiere_acompanamiento,
            'es_oficial' => (bool) $tematica->es_oficial,
            'institucion_id' => $tematica->institucion_id,
            'estado' => $tematica->estado,
            'activo' => (bool) $tematica->activo,
            'creado_por' => (int) $tematica->creado_por,
            'indicadores' => $tematica->indicadoresLogro->map(fn (IndicadorLogro $i) => [
                'id' => $i->id,
                'descripcion' => $i->descripcion,
                'orden' => (int) $i->orden,
            ])->values()->all(),
            'dbas' => $tematica->catalogosDba->map(fn (CatalogoDBA $dba) => [
                'catalogo_dba_id' => $dba->id,
                'codigo' => $dba->codigo,
                'descripcion' => $dba->descripcion,
                'relacion' => $dba->pivot->relacion,
                'observacion' => $dba->pivot->observacion,
            ])->values()->all(),
        ];
    }

    public function toggleActivoTematica(Tematica $tematica): Tematica
    {
        $tematica->activo = ! $tematica->activo;
        $tematica->save();

        return $this->cargarTematica($tematica);
    }

    public function consultaExperienciasDeTematica(Tematica $tematica): Builder
    {
        return Experiencia::query()
            ->where('tematica_id', $tematica->id)
            ->with([
                'grado:id,nombre',
                'materiales',
                'tematica:id,institucion_id,es_oficial,creado_por',
            ])
            ->withCount('materiales')
            ->orderBy('nombre');
    }

    public function crearExperiencia(Tematica $tematica, array $datos, int $userId): Experiencia
    {
        return DB::transaction(function () use ($tematica, $datos, $userId) {
            $experiencia = Experiencia::create([
                'tematica_id' => $tematica->id,
                'grado_id' => $datos['grado_id'],
                'nombre' => $datos['nombre'],
                'objetivo' => $datos['objetivo'],
                'proposito' => $datos['proposito'] ?? null,
                'habilidades' => $datos['habilidades'] ?? null,
                'duracion_minutos' => $datos['duracion_minutos'] ?? Experiencia::DURACION_DEFAULT,
                'referente_aprendizaje' => $datos['referente_aprendizaje'] ?? null,
                'estado' => $datos['estado'] ?? Experiencia::ESTADO_BORRADOR,
                'activo' => true,
                'creado_por' => $userId,
            ]);
            $this->sincronizarMateriales($experiencia, $datos['materiales'] ?? []);
            $this->sincronizarEstadoPublicacionTematica($tematica);

            return $this->cargarExperiencia($experiencia);
        });
    }

    public function actualizarExperiencia(Experiencia $experiencia, array $datos): Experiencia
    {
        unset($datos['tematica_id']);

        return DB::transaction(function () use ($experiencia, $datos) {
            $experiencia->update([
                'grado_id' => $datos['grado_id'],
                'nombre' => $datos['nombre'],
                'objetivo' => $datos['objetivo'],
                'proposito' => $datos['proposito'] ?? null,
                'habilidades' => $datos['habilidades'] ?? null,
                'duracion_minutos' => $datos['duracion_minutos'] ?? $experiencia->duracion_minutos,
                'referente_aprendizaje' => $datos['referente_aprendizaje'] ?? null,
                'estado' => $datos['estado'] ?? $experiencia->estado,
            ]);

            if (array_key_exists('materiales', $datos)) {
                $this->sincronizarMateriales($experiencia, $datos['materiales'] ?? []);
            }

            $this->sincronizarEstadoPublicacionTematica($experiencia->tematica ?? $experiencia->tematica()->first());

            return $this->cargarExperiencia($experiencia);
        });
    }

    public function toggleActivoExperiencia(Experiencia $experiencia): Experiencia
    {
        return DB::transaction(function () use ($experiencia) {
            $experiencia->activo = ! $experiencia->activo;
            $experiencia->save();
            $this->sincronizarEstadoPublicacionTematica($experiencia->tematica()->first());

            return $this->cargarExperiencia($experiencia);
        });
    }

    public function cambiarEstadoExperiencia(Experiencia $experiencia, string $estado): Experiencia
    {
        return DB::transaction(function () use ($experiencia, $estado) {
            $experiencia->update(['estado' => $estado]);
            $this->sincronizarEstadoPublicacionTematica($experiencia->tematica()->first());

            return $this->cargarExperiencia($experiencia);
        });
    }

    public function eliminarExperiencia(Experiencia $experiencia): array
    {
        return DB::transaction(function () use ($experiencia) {
            $tematica = $experiencia->tematica()->first();
            $tematicaId = $experiencia->tematica_id;
            $experienciaId = $experiencia->id;
            $experiencia->delete();

            if ($tematica) {
                $this->sincronizarEstadoPublicacionTematica($tematica);
            }

            return [
                'id' => $experienciaId,
                'tematica_id' => $tematicaId,
            ];
        });
    }

    /**
     * Si hay ≥1 experiencia activa → temática.estado = activa.
     * Si no y no está archivada → borrador.
     */
    public function sincronizarEstadoPublicacionTematica(?Tematica $tematica): void
    {
        if (! $tematica || $tematica->estado === Tematica::ESTADO_ARCHIVADA) {
            return;
        }

        $tieneActiva = $tematica->experiencias()
            ->where('activo', true)
            ->where('estado', Experiencia::ESTADO_ACTIVA)
            ->exists();

        $nuevo = $tieneActiva ? Tematica::ESTADO_ACTIVA : Tematica::ESTADO_BORRADOR;

        if ($tematica->estado !== $nuevo) {
            $tematica->update(['estado' => $nuevo]);
        }
    }

    public function serializarTematica(Tematica $tematica, ?int $institucionId = null, array $opciones = []): array
    {
        $esOficial = $tematica->esOficial();
        $esPropia = $institucionId !== null && $tematica->esDeInstitucion($institucionId);
        $soloCreadorId = $opciones['solo_creador_id'] ?? null;

        if ($institucionId === null) {
            $puedeEditar = $esOficial && (
                $soloCreadorId === null
                || (int) $tematica->creado_por === (int) $soloCreadorId
            );
        } elseif ($esPropia) {
            $puedeEditar = $soloCreadorId === null
                || (int) $tematica->creado_por === (int) $soloCreadorId;
        } else {
            $puedeEditar = false;
        }

        $experienciasActivas = (int) ($tematica->experiencias_activas_count
            ?? $tematica->experiencias()
                ->where('activo', true)
                ->where('estado', Experiencia::ESTADO_ACTIVA)
                ->count());

        $activo = (bool) $tematica->activo;
        $estado = $tematica->estado ?? Tematica::ESTADO_BORRADOR;

        $ambienteNombre = $tematica->eje?->modulo?->ambiente?->nombre;
        $moduloNombre = $tematica->eje?->modulo?->nombre;
        $ejeNombre = $tematica->eje?->nombre;
        $experienciasPorGrado = $this->resumenExperienciasPorGrado($tematica);

        return [
            'id' => $tematica->id,
            'eje_id' => $tematica->eje_id,
            'nombre' => $tematica->nombre,
            'competencia' => $tematica->competencia,
            'referente_alternativo' => $tematica->referente_alternativo,
            'requiere_ra' => (bool) $tematica->requiere_ra,
            'requiere_acompanamiento' => (bool) $tematica->requiere_acompanamiento,
            'es_oficial' => $esOficial,
            'es_propia' => $esPropia,
            'institucion_id' => $tematica->institucion_id ? (int) $tematica->institucion_id : null,
            'institucion' => $tematica->institucion?->nombre,
            'creado_por' => (int) $tematica->creado_por,
            'puede_editar' => $puedeEditar,
            'estado' => $estado,
            'activo' => $activo,
            'ambiente' => $ambienteNombre,
            'modulo' => $moduloNombre,
            'eje' => $ejeNombre,
            'experiencias_count' => (int) ($tematica->experiencias_count ?? $tematica->experiencias()->count()),
            'experiencias_activas_count' => $experienciasActivas,
            'experiencias_por_grado' => $experienciasPorGrado['items'],
            'experiencias_por_grado_texto' => $experienciasPorGrado['texto'],
            'visible_estudiantes' => $activo
                && $estado !== Tematica::ESTADO_ARCHIVADA
                && $experienciasActivas > 0,
            // Experiencias solo si puede editar la temática y está activa (mismo criterio del API panel/admin)
            'puede_crear_experiencia' => $puedeEditar && $activo,
            'indicadores' => $tematica->relationLoaded('indicadoresLogro')
                ? $tematica->indicadoresLogro->map(fn (IndicadorLogro $i) => [
                    'id' => $i->id,
                    'descripcion' => $i->descripcion,
                    'orden' => (int) $i->orden,
                ])->values()->all()
                : null,
            'dbas' => $tematica->relationLoaded('catalogosDba')
                ? $tematica->catalogosDba->map(fn (CatalogoDBA $dba) => [
                    'id' => $dba->id,
                    'codigo' => $dba->codigo,
                    'descripcion' => $dba->descripcion,
                    'relacion' => $dba->pivot->relacion,
                    'observacion' => $dba->pivot->observacion,
                ])->values()->all()
                : null,
        ];
    }

    /**
     * @return array{items: array<int, array{grado: string, count: int}>, texto: string}
     */
    public function resumenExperienciasPorGrado(Tematica $tematica): array
    {
        $experiencias = $tematica->relationLoaded('experiencias')
            ? $tematica->experiencias
            : $tematica->experiencias()->with('grado:id,nombre')->get(['id', 'tematica_id', 'grado_id']);

        $agrupado = $experiencias
            ->groupBy(fn ($exp) => $exp->grado?->nombre ?: 'Sin grado')
            ->map(fn (Collection $grupo, string $grado) => [
                'grado' => $grado,
                'count' => $grupo->count(),
            ])
            ->sortBy('grado')
            ->values();

        $texto = $agrupado
            ->map(function (array $item) {
                $n = (int) $item['count'];
                $label = $n === 1 ? 'exp.' : 'exp.';

                return "{$n} {$label} {$item['grado']}";
            })
            ->implode(' · ');

        return [
            'items' => $agrupado->all(),
            'texto' => $texto !== '' ? $texto : 'Sin experiencias',
        ];
    }

    public function serializarExperiencia(Experiencia $experiencia, array $opciones = []): array
    {
        $puedeEditar = $opciones['puede_editar'] ?? null;
        if ($puedeEditar === null && isset($opciones['resolver_puede_editar']) && is_callable($opciones['resolver_puede_editar'])) {
            $puedeEditar = (bool) $opciones['resolver_puede_editar']($experiencia);
        }

        $puedeCambiarEstado = $opciones['puede_cambiar_estado'] ?? null;
        if ($puedeCambiarEstado === null && isset($opciones['resolver_puede_cambiar_estado']) && is_callable($opciones['resolver_puede_cambiar_estado'])) {
            $puedeCambiarEstado = (bool) $opciones['resolver_puede_cambiar_estado']($experiencia);
        }
        if ($puedeCambiarEstado === null) {
            $puedeCambiarEstado = (bool) $puedeEditar;
        }

        return [
            'id' => $experiencia->id,
            'tematica_id' => $experiencia->tematica_id,
            'grado_id' => $experiencia->grado_id,
            'grado' => $experiencia->grado?->nombre,
            'nombre' => $experiencia->nombre,
            'objetivo' => $experiencia->objetivo,
            'proposito' => $experiencia->proposito,
            'habilidades' => $experiencia->habilidades,
            'duracion_minutos' => (int) $experiencia->duracion_minutos,
            'referente_aprendizaje' => $experiencia->referente_aprendizaje,
            'estado' => $experiencia->estado,
            'activo' => (bool) $experiencia->activo,
            'creado_por' => (int) $experiencia->creado_por,
            'puede_editar' => (bool) $puedeEditar,
            'puede_cambiar_estado' => (bool) $puedeCambiarEstado,
            'materiales_count' => (int) ($experiencia->materiales_count ?? $experiencia->materiales()->count()),
            'materiales' => $experiencia->relationLoaded('materiales')
                ? $experiencia->materiales->map(fn ($m) => [
                    'id' => $m->id,
                    'nombre' => $m->nombre,
                    'cantidad' => $m->cantidad,
                    'es_obligatorio' => (bool) $m->es_obligatorio,
                    'orden' => (int) $m->orden,
                ])->values()->all()
                : null,
        ];
    }

    public function cargarTematica(Tematica $tematica): Tematica
    {
        return $tematica->fresh()
            ->load([
                'indicadoresLogro',
                'catalogosDba:id,codigo,descripcion',
                'eje:id,nombre,modulo_id',
                'eje.modulo:id,nombre,ambiente_id',
                'eje.modulo.ambiente:id,nombre',
                'institucion:id,nombre',
                'experiencias:id,tematica_id,grado_id',
                'experiencias.grado:id,nombre',
            ])
            ->loadCount([
                'experiencias',
                'experiencias as experiencias_activas_count' => fn ($q) => $q
                    ->where('activo', true)
                    ->where('estado', Experiencia::ESTADO_ACTIVA),
            ]);
    }

    public function cargarExperiencia(Experiencia $experiencia): Experiencia
    {
        return $experiencia->fresh()->load([
            'grado:id,nombre',
            'materiales',
            'tematica:id,institucion_id,es_oficial,creado_por',
        ])->loadCount('materiales');
    }

    /**
     * @param  array<int, array{id?: int, descripcion: string, orden?: int}>  $indicadores
     */
    public function sincronizarIndicadores(Tematica $tematica, array $indicadores): void
    {
        $idsConservados = [];

        foreach (array_values($indicadores) as $indice => $item) {
            $orden = $item['orden'] ?? ($indice + 1);
            $existenteId = $item['id'] ?? null;

            if ($existenteId) {
                $indicador = $tematica->indicadoresLogro()->whereKey($existenteId)->first();
                if ($indicador) {
                    $indicador->update([
                        'descripcion' => $item['descripcion'],
                        'orden' => $orden,
                    ]);
                    $idsConservados[] = $indicador->id;

                    continue;
                }
            }

            $nuevo = $tematica->indicadoresLogro()->create([
                'descripcion' => $item['descripcion'],
                'orden' => $orden,
            ]);
            $idsConservados[] = $nuevo->id;
        }

        $tematica->indicadoresLogro()
            ->when($idsConservados, fn ($q) => $q->whereNotIn('id', $idsConservados), fn ($q) => $q)
            ->delete();
    }

    /**
     * @param  array<int, array{catalogo_dba_id: int, relacion?: string, observacion?: ?string}>  $dbas
     */
    public function sincronizarDbas(Tematica $tematica, array $dbas, ?int $institucionId = null): void
    {
        $sync = [];

        foreach ($dbas as $item) {
            $catalogoId = (int) $item['catalogo_dba_id'];
            $this->asegurarCatalogoDbaVisible($catalogoId, $institucionId);

            $sync[$catalogoId] = [
                'relacion' => $item['relacion'] ?? 'principal',
                'observacion' => $item['observacion'] ?? null,
            ];
        }

        $tematica->catalogosDba()->sync($sync);
    }

    /**
     * @param  array<int, array{id?: int, nombre: string, cantidad: string, es_obligatorio?: bool, orden?: int}>  $materiales
     */
    public function sincronizarMateriales(Experiencia $experiencia, array $materiales): void
    {
        $idsConservados = [];

        foreach (array_values($materiales) as $indice => $item) {
            $orden = $item['orden'] ?? ($indice + 1);
            $payload = [
                'nombre' => $item['nombre'],
                'cantidad' => $item['cantidad'],
                'es_obligatorio' => array_key_exists('es_obligatorio', $item)
                    ? (bool) $item['es_obligatorio']
                    : true,
                'orden' => $orden,
            ];
            $existenteId = $item['id'] ?? null;

            if ($existenteId) {
                $material = $experiencia->materiales()->whereKey($existenteId)->first();
                if ($material) {
                    $material->update($payload);
                    $idsConservados[] = $material->id;

                    continue;
                }
            }

            $nuevo = $experiencia->materiales()->create($payload);
            $idsConservados[] = $nuevo->id;
        }

        $experiencia->materiales()
            ->when($idsConservados, fn ($q) => $q->whereNotIn('id', $idsConservados), fn ($q) => $q)
            ->delete();
    }

    public function serializarColeccionTematicas(Collection $tematicas, ?int $institucionId = null, array $opciones = []): array
    {
        return $tematicas
            ->map(fn (Tematica $t) => $this->serializarTematica($t, $institucionId, $opciones))
            ->values()
            ->all();
    }

    public function serializarColeccionExperiencias(Collection $experiencias, array $opciones = []): array
    {
        return $experiencias
            ->map(fn (Experiencia $e) => $this->serializarExperiencia($e, $opciones))
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    public function serializarTematicaParaExperiencias(Tematica $tematica, array $extra = []): array
    {
        $tematica->loadMissing([
            'eje:id,nombre,modulo_id',
            'eje.modulo:id,nombre,ambiente_id',
            'eje.modulo.ambiente:id,nombre',
            'institucion:id,nombre',
        ]);

        return array_merge([
            'id' => $tematica->id,
            'nombre' => $tematica->nombre,
            'eje_id' => $tematica->eje_id,
            'es_oficial' => $tematica->esOficial(),
            'activo' => (bool) $tematica->activo,
            'ambiente' => $tematica->eje?->modulo?->ambiente?->nombre,
            'modulo' => $tematica->eje?->modulo?->nombre,
            'eje' => $tematica->eje?->nombre,
            'institucion' => $tematica->institucion?->nombre,
        ], $extra);
    }

    private function asegurarCatalogoDbaVisible(int $catalogoId, ?int $institucionId): void
    {
        $consulta = CatalogoDBA::query()->whereKey($catalogoId)->where('estado', true);

        if ($institucionId === null) {
            $consulta->whereNull('institucion_id');
        } else {
            $consulta->where(function ($q) use ($institucionId) {
                $q->whereNull('institucion_id')
                    ->orWhere('institucion_id', $institucionId);
            });
        }

        abort_unless($consulta->exists(), 422, 'El DBA seleccionado no está disponible.');
    }
}
