@php
    $theadEjesOficiales = '
        <tr>
            <th style="width:34px"></th>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Temáticas</th>
            <th>Orden</th>
            <th>Estado</th>
        </tr>
    ';
    $theadEjesColegio = '
        <tr>
            <th style="width:34px"></th>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Temáticas</th>
            <th>Orden</th>
            <th>Estado</th>
            <th style="text-align:center">Acciones</th>
        </tr>
    ';
@endphp

<div class="config-sistema config-panel-ejes">
    <p class="text-muted small mb-3">
        Los <span class="star">⭐ Oficiales</span> son del sistema (solo lectura).
        En <span class="badge-colegio">Del colegio</span> puede ver todos los ejes;
        solo gestiona los que usted creó.
    </p>

    @forelse ($ambientesModulos as $ambiente)
        @php
            $color = $ambiente->color_hex ?: '#64748B';
        @endphp

        <div class="amb-group is-collapsed" data-ambiente-id="{{ $ambiente->id }}"
            data-ambiente-activo="{{ $ambiente->ambiente_activo ? '1' : '0' }}">
            <button type="button" class="amb-head" data-amb-toggle style="background:{{ $color }}18"
                aria-expanded="false" aria-controls="amb-body-panel-ejes-{{ $ambiente->id }}">
                <div class="amb-ic">{{ $ambiente->icono ?: '📦' }}</div>
                <div class="amb-title">{{ $ambiente->nombre }}</div>
                <div class="amb-count">
                    {{ $ambiente->ejes_total_count ?? 0 }}
                    {{ ($ambiente->ejes_total_count ?? 0) === 1 ? 'eje' : 'ejes' }}
                    · {{ $ambiente->ejes_activos_count ?? 0 }} activos
                </div>
                <span class="chev" aria-hidden="true">▾</span>
            </button>

            <div class="amb-body" id="amb-body-panel-ejes-{{ $ambiente->id }}">
                <div class="amb-body-inner">
                    @forelse ($ambiente->modulosInstitucion as $item)
                        @php
                            $modulo = $item['modelo'];
                            $oficiales = $item['ejes_oficiales'] ?? collect();
                            $propios = $item['ejes_propios'] ?? collect();
                            $puedeGestionar = (bool) ($item['puede_gestionar_ejes'] ?? false);
                            $modBodyId = 'mod-ejes-body-panel-' . $ambiente->id . '-' . $modulo->id;
                        @endphp

                        <div class="mod-ejes-group is-collapsed" data-modulo-id="{{ $modulo->id }}"
                            data-modulo-nombre="{{ $modulo->nombre }}"
                            data-es-oficial="{{ $modulo->esOficial() ? '1' : '0' }}"
                            data-puede-gestionar-ejes="{{ $puedeGestionar ? '1' : '0' }}">
                            <button type="button" class="mod-ejes-head" data-mod-toggle
                                aria-expanded="false" aria-controls="{{ $modBodyId }}">
                                <div class="mod-ejes-title">
                                    <span class="mod-ejes-nombre">{{ $modulo->nombre }}</span>
                                    @if ($modulo->esOficial())
                                        <span class="star">⭐ Oficial</span>
                                    @else
                                        <span class="badge-colegio">Del colegio</span>
                                    @endif
                                </div>
                                <span class="mod-ejes-hint">
                                    {{ $item['ejes_total_count'] ?? 0 }}
                                    {{ ($item['ejes_total_count'] ?? 0) === 1 ? 'eje' : 'ejes' }}
                                    · {{ $item['ejes_activos_count'] ?? 0 }} activos
                                </span>
                                <span class="chev" aria-hidden="true">▾</span>
                            </button>

                            <div class="mod-ejes-body" id="{{ $modBodyId }}">
                                <div class="mod-ejes-body-inner">
                                    @if ($modulo->esOficial())
                                        <div class="modulos-seccion modulos-seccion-oficiales" data-seccion="oficiales">
                                            <div class="modulos-seccion-head">
                                                <span class="modulos-seccion-title">
                                                    <span class="star">⭐ Oficial</span>
                                                    Ejes oficiales
                                                </span>
                                                <span class="modulos-seccion-hint">Catálogo PedNia · solo lectura</span>
                                            </div>
                                            @if ($oficiales->isEmpty())
                                                <div class="cfg-empty">Este módulo no tiene ejes oficiales registrados.</div>
                                            @else
                                                <div class="table-container" data-ejes-pager data-page-size="10">
                                                    <table>
                                                        <thead>{!! $theadEjesOficiales !!}</thead>
                                                        <tbody data-tbody-ejes-oficiales>
                                                            @foreach ($oficiales as $eje)
                                                                @include('admin.configuracion.institucion._filaEje', [
                                                                    'eje' => $eje,
                                                                    'esPropio' => false,
                                                                    'puedeGestionar' => false,
                                                                ])
                                                            @endforeach
                                                        </tbody>
                                                    </table>
                                                </div>
                                            @endif
                                        </div>
                                    @endif

                                    <div class="modulos-seccion modulos-seccion-colegio" data-seccion="colegio">
                                        <div class="modulos-seccion-head">
                                            <span class="modulos-seccion-title">
                                                <span class="badge-colegio">Del colegio</span>
                                                Ejes del colegio
                                            </span>
                                            <span class="modulos-seccion-hint">Visibles para todos · solo edita los que
                                                usted
                                                creó</span>
                                        </div>
                                        <div class="table-container" data-wrap-ejes-colegio data-ejes-pager
                                            data-page-size="10" @if ($propios->isEmpty()) hidden @endif>
                                            <table>
                                                <thead>{!! $theadEjesColegio !!}</thead>
                                                <tbody data-tbody-ejes-colegio>
                                                    @foreach ($propios as $eje)
                                                        @include('admin.configuracion.institucion._filaEje', [
                                                            'eje' => $eje,
                                                            'esPropio' => true,
                                                            'puedeGestionar' =>
                                                                $puedeGestionar && $eje->fueCreadoPor($docenteId),
                                                        ])
                                                    @endforeach
                                                </tbody>
                                            </table>
                                        </div>
                                        <div class="cfg-empty cfg-empty-colegio" data-empty-ejes-colegio
                                            @if ($propios->isNotEmpty()) hidden @endif>
                                            Aún no hay ejes del colegio en este módulo.
                                        </div>
                                    </div>

                                    <div class="mod-ejes-foot">
                                        @if ($puedeGestionar)
                                            <button type="button" class="btn btn-primary" data-crear-eje-modulo
                                                data-modulo-id="{{ $modulo->id }}"
                                                data-modulo-nombre="{{ $modulo->nombre }}">
                                                <i class="fa-solid fa-plus"></i> Crear eje del colegio
                                            </button>
                                        @else
                                            <span class="text-muted small">
                                                El módulo está inactivo. Solicite al administrador que lo active para
                                                gestionar
                                                ejes.
                                            </span>
                                        @endif
                                    </div>
                                </div>
                            </div>
                        </div>
                    @empty
                        <div class="cfg-empty">No hay módulos asignados a este ambiente.</div>
                    @endforelse
                </div>
            </div>
        </div>
    @empty
        <div class="cfg-empty-global">
            No tiene ambientes asignados en el año lectivo actual.
        </div>
    @endforelse
</div>
