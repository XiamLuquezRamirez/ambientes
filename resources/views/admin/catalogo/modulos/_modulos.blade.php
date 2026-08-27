@php
    $theadModulos = '
        <tr>
            <th style="width:34px"></th>
            <th>Módulo</th>
            <th>Slug</th>
            <th>Estado</th>
            <th>Ejes del colegio</th>
            <th style="text-align:center">Acciones</th>
        </tr>
    ';
@endphp

<div class="config-sistema config-admin-modulos"
    data-url-store-template="{{ url('admin/catalogo/ambientes/__AMBIENTE__/modulos') }}"
    data-url-show-template="{{ url('admin/catalogo/modulos/__MODULO__') }}"
    data-url-update-template="{{ url('admin/catalogo/modulos/__MODULO__') }}"
    data-url-estado-template="{{ url('admin/catalogo/modulos/__MODULO__/estado') }}"
    data-url-mover-template="{{ url('admin/catalogo/modulos/__MODULO__/mover') }}"
    data-url-destroy-template="{{ url('admin/catalogo/modulos/__MODULO__') }}"
    data-url-ejes-template="{{ url('admin/catalogo/modulos/__MODULO__/ejes') }}"
    data-url-ejes-show-template="{{ url('admin/catalogo/ejes/__EJE__') }}"
    data-url-ejes-update-template="{{ url('admin/catalogo/ejes/__EJE__') }}"
    data-url-ejes-mover-template="{{ url('admin/catalogo/ejes/__EJE__/mover') }}"
    data-url-ejes-estado-template="{{ url('admin/catalogo/ejes/__EJE__/estado') }}"
    data-url-ejes-destroy-template="{{ url('admin/catalogo/ejes/__EJE__') }}">
    <p class="text-muted small mb-3">
        Los <span class="star">⭐ Oficiales</span> son del sistema (solo lectura).
        En <span class="badge-colegio">Del colegio</span> gestiona módulos adicionales y ejes propios.
    </p>

    <div data-filtros-modulos
        style="display:flex;gap:12px;margin-bottom:24px;align-items:center;flex-wrap:wrap">
        <select id="filtro_modulos_ambiente" class="form-control" style="width:auto" data-filtro="ambiente">
            <option value="">Todos los ambientes</option>
            @foreach ($ambientesModulos as $ambienteFiltro)
                <option value="{{ $ambienteFiltro->id }}">{{ $ambienteFiltro->nombre }}</option>
            @endforeach
        </select>
        <select id="filtro_modulos_tipo" class="form-control" style="width:auto" data-filtro="tipo">
            <option value="">Todos los tipos</option>
            <option value="oficial">Oficial</option>
            <option value="adicional">Adicional</option>
        </select>
        <select id="filtro_modulos_estado" class="form-control" style="width:auto" data-filtro="estado">
            <option value="">Todos los estados</option>
            <option value="1">Activo</option>
            <option value="0">Inactivo</option>
        </select>
        <button type="button" class="btn btn-sm" data-limpiar-filtros-modulos
            style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;display:none">
            <i class="fas fa-broom"></i> Limpiar
        </button>
    </div>

    <div class="cfg-empty cfg-empty-filtros" data-empty-filtros-modulos hidden>
        No hay módulos que coincidan con los filtros seleccionados.
    </div>

    @forelse ($ambientesModulos as $ambiente)
        @php
            $color = $ambiente->color_hex ?: '#64748B';
            $oficiales = $ambiente->modulosInstitucion->where('es_propio', false)->values();
            $propios = $ambiente->modulosInstitucion->where('es_propio', true)->values();
        @endphp

        <div class="amb-group is-collapsed" data-ambiente-id="{{ $ambiente->id }}"
            data-ambiente-activo="{{ $ambiente->ambiente_activo ? '1' : '0' }}">
            <button type="button" class="amb-head" data-amb-toggle style="background:{{ $color }}18"
                aria-expanded="false" aria-controls="amb-body-admin-{{ $ambiente->id }}">
                <div class="amb-ic">{{ $ambiente->icono ?: '📦' }}</div>
                <div class="amb-title">{{ $ambiente->nombre }}</div>
                <div class="amb-count">
                    {{ $ambiente->modulos_total_count }}
                    {{ $ambiente->modulos_total_count === 1 ? 'módulo' : 'módulos' }}
                    · {{ $ambiente->modulos_activos_count }} activos
                </div>
                <span class="chev" aria-hidden="true">▾</span>
            </button>

            <div class="amb-body" id="amb-body-admin-{{ $ambiente->id }}">
                <div class="amb-body-inner">
                {{-- Módulos oficiales --}}
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
                                        @include('admin.catalogo.modulos._filaModulo', [
                                            'item' => $item,
                                        ])
                                    @endforeach
                                </tbody>
                            </table>
                        </div>
                    @endif
                </div>

                {{-- Módulos del colegio --}}
                <div class="modulos-seccion modulos-seccion-colegio" data-seccion="colegio">
                    <div class="modulos-seccion-head">
                        <span class="modulos-seccion-title">
                            <span class="badge-colegio">Del colegio</span>
                            Módulos del colegio
                        </span>
                        <span class="modulos-seccion-hint">Creados por su institución · editables</span>
                    </div>
                    <div class="table-container" data-wrap-colegio @if ($propios->isEmpty()) hidden @endif>
                        <table>
                            <thead>{!! $theadModulos !!}</thead>
                            <tbody data-tbody-colegio>
                                @foreach ($propios as $item)
                                    @include('admin.catalogo.modulos._filaModulo', [
                                        'item' => $item,
                                    ])
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                    <div class="cfg-empty cfg-empty-colegio" data-empty-colegio
                        @if ($propios->isNotEmpty()) hidden @endif>
                        Aún no hay módulos adicionales del colegio en este ambiente.
                    </div>
                </div>

                <div class="amb-foot">
                    <button type="button" class="btn btn-primary" data-crear-modulo
                        data-ambiente-id="{{ $ambiente->id }}" data-ambiente-nombre="{{ $ambiente->nombre }}">
                        <i class="fa-solid fa-plus"></i> Crear módulo adicional
                    </button>
                </div>
                </div>
            </div>
        </div>
    @empty
        <div class="cfg-empty-global">
            No hay ambientes activos contratados para su institución.
        </div>
    @endforelse
</div>
