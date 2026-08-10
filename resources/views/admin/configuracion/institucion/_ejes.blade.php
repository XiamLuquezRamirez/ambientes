@php
    $theadEjes = '
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

<div class="config-sistema config-admin-ejes"
    data-url-ejes-template="{{ url('admin/configuracion/modulos/__MODULO__/ejes') }}"
    data-url-ejes-show-template="{{ url('admin/configuracion/ejes/__EJE__') }}"
    data-url-ejes-update-template="{{ url('admin/configuracion/ejes/__EJE__') }}"
    data-url-ejes-mover-template="{{ url('admin/configuracion/ejes/__EJE__/mover') }}"
    data-url-ejes-estado-template="{{ url('admin/configuracion/ejes/__EJE__/estado') }}"
    data-url-ejes-destroy-template="{{ url('admin/configuracion/ejes/__EJE__') }}">
    <p class="text-muted small mb-3">
        Los <span class="star">⭐ Oficiales</span> son del sistema (solo lectura).
        En <span class="badge-colegio">Del colegio</span> gestiona ejes propios del módulo.
    </p>

    <div class="cfg-filters" data-filtros-ejes>
        <div class="cfg-filters-row">
            <div class="cfg-filter">
                <label class="cfg-filter-label" for="filtro_ejes_tipo">Tipo</label>
                <select id="filtro_ejes_tipo" class="form-select form-select-sm" data-filtro-ejes="tipo">
                    <option value="">Todos</option>
                    <option value="oficial">Oficial</option>
                    <option value="colegio">Del colegio</option>
                </select>
            </div>
            <div class="cfg-filter">
                <label class="cfg-filter-label" for="filtro_ejes_estado">Estado</label>
                <select id="filtro_ejes_estado" class="form-select form-select-sm" data-filtro-ejes="estado">
                    <option value="">Todos</option>
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                </select>
            </div>
            <div class="cfg-filter cfg-filter-actions">
                <button type="button" class="btn btn-sm btn-secondary" data-limpiar-filtros-ejes title="Limpiar filtros">
                    <i class="fa-solid fa-filter-circle-xmark"></i> Limpiar
                </button>
            </div>
        </div>
    </div>

    <div class="cfg-empty cfg-empty-filtros" data-empty-filtros-ejes hidden>
        No hay ejes que coincidan con los filtros seleccionados.
    </div>

    @forelse ($ambientesModulos as $ambiente)
        @php
            $color = $ambiente->color_hex ?: '#64748B';
        @endphp

        <div class="amb-group is-collapsed" data-ambiente-id="{{ $ambiente->id }}"
            data-ambiente-activo="{{ $ambiente->ambiente_activo ? '1' : '0' }}">
            <button type="button" class="amb-head" data-amb-toggle style="background:{{ $color }}18"
                aria-expanded="false" aria-controls="amb-body-ejes-{{ $ambiente->id }}">
                <div class="amb-ic">{{ $ambiente->icono ?: '📦' }}</div>
                <div class="amb-title">{{ $ambiente->nombre }}</div>
                <div class="amb-count">
                    {{ $ambiente->ejes_total_count ?? 0 }}
                    {{ ($ambiente->ejes_total_count ?? 0) === 1 ? 'eje' : 'ejes' }}
                    · {{ $ambiente->ejes_activos_count ?? 0 }} activos
                </div>
                <span class="chev" aria-hidden="true">▾</span>
            </button>

            <div class="amb-body" id="amb-body-ejes-{{ $ambiente->id }}">
                @forelse ($ambiente->modulosInstitucion as $item)
                    @php
                        $modulo = $item['modelo'];
                        $oficiales = $item['ejes_oficiales'] ?? collect();
                        $propios = $item['ejes_propios'] ?? collect();
                        $puedeGestionar = (bool) ($item['puede_gestionar_ejes'] ?? false);
                    @endphp

                    <div class="mod-ejes-group" data-modulo-id="{{ $modulo->id }}"
                        data-modulo-nombre="{{ $modulo->nombre }}"
                        data-puede-gestionar-ejes="{{ $puedeGestionar ? '1' : '0' }}">
                        <div class="mod-ejes-head">
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
                        </div>

                        {{-- Ejes oficiales --}}
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
                                <div class="table-container">
                                    <table>
                                        <thead>{!! $theadEjes !!}</thead>
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

                        {{-- Ejes del colegio --}}
                        <div class="modulos-seccion modulos-seccion-colegio" data-seccion="colegio">
                            <div class="modulos-seccion-head">
                                <span class="modulos-seccion-title">
                                    <span class="badge-colegio">Del colegio</span>
                                    Ejes del colegio
                                </span>
                                <span class="modulos-seccion-hint">Creados por su institución · editables</span>
                            </div>
                            <div class="table-container" data-wrap-ejes-colegio
                                @if ($propios->isEmpty()) hidden @endif>
                                <table>
                                    <thead>{!! $theadEjes !!}</thead>
                                    <tbody data-tbody-ejes-colegio>
                                        @foreach ($propios as $eje)
                                            @include('admin.configuracion.institucion._filaEje', [
                                                'eje' => $eje,
                                                'esPropio' => true,
                                                'puedeGestionar' => $puedeGestionar,
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
                                    data-modulo-id="{{ $modulo->id }}" data-modulo-nombre="{{ $modulo->nombre }}">
                                    <i class="fa-solid fa-plus"></i> Crear eje del colegio
                                </button>
                            @else
                                <span class="text-muted small">
                                    Active el módulo para crear y gestionar ejes del colegio.
                                </span>
                            @endif
                        </div>
                    </div>
                @empty
                    <div class="cfg-empty">No hay módulos asignados a este ambiente.</div>
                @endforelse
            </div>
        </div>
    @empty
        <div class="cfg-empty-global">
            No hay ambientes activos contratados para su institución.
        </div>
    @endforelse
</div>
