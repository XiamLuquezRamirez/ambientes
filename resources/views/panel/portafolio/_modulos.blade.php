@php
    $theadModulos = '
        <tr>
            <th>Módulo</th>
            <th>Slug</th>
            <th>Estado</th>
            <th>Ejes del colegio</th>
            <th style="text-align:center">Acciones</th>
        </tr>
    ';
@endphp

<div class="config-sistema config-panel-modulos">
    <p class="text-muted small mb-3">
        Solo lectura: los módulos los administra la institución.
        Use <b>Ejes</b> para gestionar ejes del colegio en módulos activos.
    </p>

    @forelse ($ambientesModulos as $ambiente)
        @php
            $color = $ambiente->color_hex ?: '#64748B';
            $oficiales = $ambiente->modulosInstitucion->where('es_propio', false)->values();
            $propios = $ambiente->modulosInstitucion->where('es_propio', true)->values();
        @endphp

        <div class="amb-group is-collapsed" data-ambiente-id="{{ $ambiente->id }}"
            data-ambiente-activo="{{ $ambiente->ambiente_activo ? '1' : '0' }}">
            <button type="button" class="amb-head" data-amb-toggle style="background:{{ $color }}18"
                aria-expanded="false" aria-controls="amb-body-panel-mod-{{ $ambiente->id }}">
                <div class="amb-ic">{{ $ambiente->icono ?: '📦' }}</div>
                <div class="amb-title">{{ $ambiente->nombre }}</div>
                <div class="amb-count">
                    {{ $ambiente->modulos_total_count }}
                    {{ $ambiente->modulos_total_count === 1 ? 'módulo' : 'módulos' }}
                    · {{ $ambiente->modulos_activos_count }} activos
                </div>
                <span class="chev" aria-hidden="true">▾</span>
            </button>

            <div class="amb-body" id="amb-body-panel-mod-{{ $ambiente->id }}">
                <div class="modulos-seccion modulos-seccion-oficiales" data-seccion="oficiales">
                    <div class="modulos-seccion-head">
                        <span class="modulos-seccion-title">
                            <span class="star">⭐ Oficial</span>
                            Módulos oficiales
                        </span>
                        <span class="modulos-seccion-hint">Catálogo PedNia · solo lectura</span>
                    </div>
                    @if ($oficiales->isEmpty())
                        <div class="cfg-empty">No hay módulos oficiales activos asignados a este ambiente.</div>
                    @else
                        <div class="table-container">
                            <table>
                                <thead>{!! $theadModulos !!}</thead>
                                <tbody data-tbody-oficiales>
                                    @foreach ($oficiales as $item)
                                        @include('panel.portafolio._filaModulo', ['item' => $item])
                                    @endforeach
                                </tbody>
                            </table>
                        </div>
                    @endif
                </div>

                <div class="modulos-seccion modulos-seccion-colegio" data-seccion="colegio">
                    <div class="modulos-seccion-head">
                        <span class="modulos-seccion-title">
                            <span class="badge-colegio">Del colegio</span>
                            Módulos del colegio
                        </span>
                        <span class="modulos-seccion-hint">Creados por su institución · solo lectura</span>
                    </div>
                    <div class="table-container" @if ($propios->isEmpty()) hidden @endif>
                        <table>
                            <thead>{!! $theadModulos !!}</thead>
                            <tbody data-tbody-colegio>
                                @foreach ($propios as $item)
                                    @include('panel.portafolio._filaModulo', ['item' => $item])
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                    <div class="cfg-empty" @if ($propios->isNotEmpty()) hidden @endif>
                        Aún no hay módulos adicionales del colegio en este ambiente.
                    </div>
                </div>
            </div>
        </div>
    @empty
        <div class="cfg-empty-global">
            No tiene ambientes asignados en el año lectivo actual.
        </div>
    @endforelse
</div>
