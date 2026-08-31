@php
    use App\Models\Tematica;
    use Illuminate\Support\Facades\Auth;

    $tipoArbol = $tipoArbol ?? 'admin';

    if ($tipoArbol === 'panel') {
        $arbolTematicas = collect($ambientesModulos ?? [])
            ->map(function ($ambiente) {
                $modulos = collect($ambiente->modulosInstitucion ?? [])
                    ->map(function ($item) {
                        $modulo = $item['modelo'];
                        $oficiales = collect($item['ejes_oficiales'] ?? [])->filter(fn ($e) => (bool) $e->activo);
                        $propios = collect($item['ejes_propios'] ?? [])->filter(fn ($e) => (bool) $e->activo);
                        $ejes = $oficiales
                            ->concat($propios)
                            ->map(fn ($eje) => [
                                'id' => $eje->id,
                                'nombre' => $eje->nombre,
                                'es_oficial' => $eje->esOficial(),
                            ])
                            ->values();

                        return [
                            'id' => $modulo->id,
                            'nombre' => $modulo->nombre,
                            'es_oficial' => ! ($item['es_propio'] ?? false),
                            'ejes' => $ejes,
                        ];
                    })
                    ->values();

                return [
                    'id' => $ambiente->id,
                    'nombre' => $ambiente->nombre,
                    'color_hex' => $ambiente->color_hex ?: '#64748B',
                    'icono' => $ambiente->icono ?: '📦',
                    'modulos' => $modulos,
                ];
            })
            ->values();
    } elseif ($tipoArbol === 'superadmin') {
        $arbolTematicas = collect($ambientes ?? [])
            ->map(function ($ambiente) {
                $modulos = collect($ambiente->modulosOficiales ?? [])
                    ->map(function ($modulo) {
                        $ejes = collect($modulo->ejesOficiales ?? [])
                            ->map(fn ($eje) => [
                                'id' => $eje->id,
                                'nombre' => $eje->nombre,
                                'es_oficial' => true,
                            ])
                            ->values();

                        return [
                            'id' => $modulo->id,
                            'nombre' => $modulo->nombre,
                            'es_oficial' => true,
                            'ejes' => $ejes,
                        ];
                    })
                    ->values();

                return [
                    'id' => $ambiente->id,
                    'nombre' => $ambiente->nombre,
                    'color_hex' => $ambiente->color_hex ?: '#64748B',
                    'icono' => $ambiente->icono ?: '📦',
                    'modulos' => $modulos,
                ];
            })
            ->values();
    } else {
        $arbolTematicas = collect($ambientes ?? [])
            ->map(function ($ambiente) {
                $modulos = collect($ambiente->modulos ?? [])
                    ->map(function ($modulo) {
                        $ejes = collect($modulo->ejes ?? [])
                            ->map(fn ($eje) => [
                                'id' => $eje->id,
                                'nombre' => $eje->nombre,
                                'es_oficial' => $eje->esOficial(),
                            ])
                            ->values();

                        return [
                            'id' => $modulo->id,
                            'nombre' => $modulo->nombre,
                            'es_oficial' => $modulo->esOficial(),
                            'ejes' => $ejes,
                        ];
                    })
                    ->values();

                return [
                    'id' => $ambiente->id,
                    'nombre' => $ambiente->nombre,
                    'color_hex' => $ambiente->color_hex ?: '#64748B',
                    'icono' => $ambiente->icono ?: '📦',
                    'modulos' => $modulos,
                ];
            })
            ->values();
    }

    $ejeIds = $arbolTematicas
        ->flatMap(fn ($ambiente) => collect($ambiente['modulos'])->flatMap(fn ($modulo) => collect($modulo['ejes'])->pluck('id')))
        ->unique()
        ->values()
        ->all();

    $institucionId = (int) (session('institucion_id') ?: Auth::guard('docente')->user()?->institucion_id ?: 0);
    $conteosTematicas = collect();

    if ($ejeIds !== []) {
        $consultaTematicas = Tematica::query()->whereIn('eje_id', $ejeIds);

        if ($tipoArbol === 'superadmin') {
            $consultaTematicas->oficiales();
        } elseif ($institucionId > 0) {
            $consultaTematicas->where(function ($q) use ($institucionId) {
                $q->where(fn ($oficial) => $oficial->oficiales())
                    ->orWhere(fn ($propia) => $propia->deInstitucion($institucionId));
            });
        } else {
            $consultaTematicas->oficiales();
        }

        $conteosTematicas = $consultaTematicas
            ->selectRaw('eje_id, COUNT(*) as total')
            ->groupBy('eje_id')
            ->pluck('total', 'eje_id');
    }

    $arbolTematicas = $arbolTematicas
        ->map(function ($ambiente) use ($conteosTematicas) {
            $modulos = collect($ambiente['modulos'])
                ->map(function ($modulo) use ($conteosTematicas) {
                    $ejes = collect($modulo['ejes'])
                        ->map(function ($eje) use ($conteosTematicas) {
                            $eje['tematicas_count'] = (int) ($conteosTematicas[$eje['id']] ?? 0);

                            return $eje;
                        })
                        ->values();

                    $modulo['ejes'] = $ejes;
                    $modulo['ejes_count'] = $ejes->count();
                    $modulo['tematicas_count'] = (int) $ejes->sum('tematicas_count');

                    return $modulo;
                })
                ->values();

            $ambiente['modulos'] = $modulos;
            $ambiente['modulos_count'] = $modulos->count();
            $ambiente['ejes_count'] = (int) $modulos->sum('ejes_count');
            $ambiente['tematicas_count'] = (int) $modulos->sum('tematicas_count');

            return $ambiente;
        })
        ->values();
@endphp
<script>
    window.TEMATICAS_ARBOL = @json($arbolTematicas);
</script>
