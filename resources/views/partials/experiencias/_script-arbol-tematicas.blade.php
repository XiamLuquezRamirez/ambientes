@php
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
                    'modulos_count' => $modulos->count(),
                    'ejes_count' => $modulos->sum(fn ($modulo) => count($modulo['ejes'])),
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
                    'modulos_count' => $modulos->count(),
                    'ejes_count' => $modulos->sum(fn ($modulo) => count($modulo['ejes'])),
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
                    'modulos_count' => $modulos->count(),
                    'ejes_count' => $modulos->sum(fn ($modulo) => count($modulo['ejes'])),
                    'modulos' => $modulos,
                ];
            })
            ->values();
    }
@endphp
<script>
    window.TEMATICAS_ARBOL = @json($arbolTematicas);
</script>
