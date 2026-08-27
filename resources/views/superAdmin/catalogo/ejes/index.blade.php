@extends('layouts.superAdmin')
@section('title', 'Ejes')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
@endpush

@section('content')
    <div class="page-header">
        <h1>Ejes</h1>
        <p>Catálogo de ejes oficiales de PedNia</p>
    </div>

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

    <div class="config-sistema config-sa-ejes config-admin-ejes"
        data-url-ejes-template="{{ url('superadmin/catalogo/modulos/__MODULO__/ejes') }}"
        data-url-ejes-show-template="{{ url('superadmin/catalogo/ejes/__EJE__') }}"
        data-url-ejes-update-template="{{ url('superadmin/catalogo/ejes/__EJE__') }}"
        data-url-ejes-mover-template="{{ url('superadmin/catalogo/ejes/__EJE__/mover') }}"
        data-url-ejes-estado-template="{{ url('superadmin/catalogo/ejes/__EJE__/estado') }}">
        <p class="text-muted small mb-3">
            Gestiona los ejes <span class="star">⭐ Oficiales</span> del catálogo PedNia por ambiente y módulo.
            Puedes crear, editar, reordenar y activar/desactivar.
        </p>

        @forelse ($ambientes as $ambiente)
            @php
                $color = $ambiente->color_hex ?: '#64748B';
            @endphp

            <div class="amb-group is-collapsed" data-ambiente-id="{{ $ambiente->id }}">
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
                    <div class="amb-body-inner">
                        @forelse ($ambiente->modulosOficiales as $modulo)
                            @php
                                $ejes = $modulo->ejesOficiales;
                                $modBodyId = 'mod-ejes-body-sa-' . $ambiente->id . '-' . $modulo->id;
                            @endphp

                            <div class="mod-ejes-group is-collapsed" data-modulo-id="{{ $modulo->id }}"
                                data-modulo-nombre="{{ $modulo->nombre }}" data-puede-gestionar-ejes="1">
                                <button type="button" class="mod-ejes-head" data-mod-toggle
                                    aria-expanded="false" aria-controls="{{ $modBodyId }}">
                                    <div class="mod-ejes-title">
                                        <span class="mod-ejes-nombre">{{ $modulo->nombre }}</span>
                                        <span class="star">⭐ Oficial</span>
                                    </div>
                                    <span class="mod-ejes-hint">
                                        {{ $modulo->ejes_total_count ?? 0 }}
                                        {{ ($modulo->ejes_total_count ?? 0) === 1 ? 'eje' : 'ejes' }}
                                        · {{ $modulo->ejes_activos_count ?? 0 }} activos
                                    </span>
                                    <span class="chev" aria-hidden="true">▾</span>
                                </button>

                                <div class="mod-ejes-body" id="{{ $modBodyId }}">
                                    <div class="mod-ejes-body-inner">
                                        <div class="table-container" data-wrap-ejes data-ejes-pager data-page-size="10"
                                            @if ($ejes->isEmpty()) hidden @endif>
                                            <table>
                                                <thead>{!! $theadEjes !!}</thead>
                                                <tbody data-tbody-ejes>
                                                    @foreach ($ejes as $eje)
                                                        @include('superAdmin.catalogo.ejes._filaEje', [
                                                            'eje' => $eje,
                                                        ])
                                                    @endforeach
                                                </tbody>
                                            </table>
                                        </div>
                                        <div class="cfg-empty" data-empty-ejes @if ($ejes->isNotEmpty()) hidden @endif>
                                            Este módulo aún no tiene ejes oficiales registrados.
                                        </div>

                                        <div class="mod-ejes-foot">
                                            <button type="button" class="btn btn-primary" data-crear-eje-modulo
                                                data-modulo-id="{{ $modulo->id }}"
                                                data-modulo-nombre="{{ $modulo->nombre }}">
                                                <i class="fa-solid fa-plus"></i> Crear eje
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        @empty
                            <div class="cfg-empty">Este ambiente aún no tiene módulos oficiales registrados.</div>
                        @endforelse
                    </div>
                </div>
            </div>
        @empty
            <div class="cfg-empty-global">
                No hay ambientes registrados en el sistema.
            </div>
        @endforelse
    </div>

    @include('superAdmin.catalogo.ejes.modalCrearEjes')
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/configuracion-ejes-ui.js') }}"></script>
    <script src="{{ asset('assets/js/superAdmin/catalogo-modulos-ejes.js') }}"></script>
@endpush
