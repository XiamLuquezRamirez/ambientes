@extends('layouts.superAdmin')
@section('title', 'Módulos')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
@endpush

@section('content')
    <div class="page-header">
        <h1>Módulos </h1>
        <p>Catálogo de ambientes y módulos oficiales de PedNia</p>
    </div>

    <div class="config-sistema" data-total-instituciones="{{ $totalInstituciones }}"
        data-url-store-template="{{ url('superadmin/configuracion/ambientes/__AMBIENTE__/modulos') }}"
        data-url-show-template="{{ url('superadmin/configuracion/modulos/__MODULO__') }}"
        data-url-update-template="{{ url('superadmin/configuracion/modulos/__MODULO__') }}"
        data-url-estado-template="{{ url('superadmin/configuracion/modulos/__MODULO__/estado') }}"
        data-url-mover-template="{{ url('superadmin/configuracion/modulos/__MODULO__/mover') }}"
        data-url-ejes-template="{{ url('superadmin/configuracion/modulos/__MODULO__/ejes') }}"
        data-url-ejes-show-template="{{ url('superadmin/configuracion/ejes/__EJE__') }}"
        data-url-ejes-update-template="{{ url('superadmin/configuracion/ejes/__EJE__') }}"
        data-url-ejes-mover-template="{{ url('superadmin/configuracion/ejes/__EJE__/mover') }}"
        data-url-ejes-estado-template="{{ url('superadmin/configuracion/ejes/__EJE__/estado') }}">
        @forelse ($ambientes as $ambiente)
            @php
                $color = $ambiente->color_hex ?: '#64748B';
            @endphp

            <div class="amb-group is-collapsed" data-ambiente-id="{{ $ambiente->id }}">
                <button type="button" class="amb-head" data-amb-toggle style="background:{{ $color }}18"
                    aria-expanded="false" aria-controls="amb-body-{{ $ambiente->id }}">
                    <div class="amb-ic">{{ $ambiente->icono ?: '📦' }}</div>
                    <div class="amb-title">{{ $ambiente->nombre }}</div>
                    <div class="amb-count">
                        {{ $ambiente->modulos_oficiales_count }}
                        {{ $ambiente->modulos_oficiales_count === 1 ? 'módulo oficial' : 'módulos oficiales' }}
                        · {{ $ambiente->modulos_oficiales_activos_count }} activos
                    </div>
                    <span class="chev" aria-hidden="true">▾</span>
                </button>

                <div class="amb-body" id="amb-body-{{ $ambiente->id }}">
                    <div class="amb-body-inner">
                    @if ($ambiente->modulosOficiales->isEmpty())
                        <div class="cfg-empty">Este ambiente aún no tiene módulos oficiales registrados.</div>
                    @else
                        <div class="table-container ">
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width:34px"></th>
                                        <th>Módulo</th>
                                        <th>Slug</th>
                                        <th>Estado</th>
                                        <th>Instituciones activas</th>
                                        <th>Creado</th>
                                        <th style="text-align:center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach ($ambiente->modulosOficiales as $modulo)
                                        @php
                                            $activo = (bool) $modulo->activo;
                                        @endphp
                                        <tr data-modulo-id="{{ $modulo->id }}" data-nombre="{{ $modulo->nombre }}"
                                            data-orden="{{ $modulo->orden }}" data-activo="{{ $activo ? '1' : '0' }}"
                                            data-inst-activas="{{ $modulo->instituciones_activas_count }}"
                                            data-temas-activos="{{ $modulo->temas_activos_count }}">
                                            <td>
                                                <div class="reorder">
                                                    <button type="button" class="btn-reorder" data-dir="arriba"
                                                        title="Subir" @disabled($loop->first)>▲</button>
                                                    <button type="button" class="btn-reorder" data-dir="abajo"
                                                        title="Bajar" @disabled($loop->last)>▼</button>
                                                </div>
                                            </td>
                                            <td>
                                                <div class="mod-name">
                                                    <span class="mod-nombre-texto">{{ $modulo->nombre }}</span>
                                                    @if ($modulo->esOficial())
                                                        <span class="star">⭐ Oficial</span>
                                                    @endif
                                                </div>
                                            </td>
                                            <td class="slug">{{ $modulo->slug }}</td>
                                            <td>
                                                <div class="state-row">
                                                    <button type="button" class="switch {{ $activo ? 'on' : '' }}"
                                                        data-toggle-estado aria-label="Cambiar estado"
                                                        title="{{ $activo ? 'Desactivar' : 'Activar' }}"></button>
                                                </div>
                                            </td>
                                            <td class="col-inst-activas">
                                                {{ $modulo->instituciones_activas_count }} /
                                                {{ $totalInstituciones }}
                                            </td>
                                            <td class="col-creado">
                                                {{ $modulo->created_at?->translatedFormat('d M Y') ?? '—' }}
                                            </td>
                                            <td class="col-actions">
                                                <div class="row-actions d-flex justify-content-center">
                                                    <button type="button" class="btn-accion btn-asignar-grado"
                                                        data-ejes-modulo title="Ver ejes del módulo">
                                                        <i class="fa-solid fa-diagram-project"></i> Ejes
                                                    </button>
                                                    <button type="button" class="btn-accion btn-editar" data-editar-modulo
                                                        title="Editar módulo">
                                                        <i class="fa-solid fa-pen"></i> Editar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </div>
                    @endif

                    <div class="amb-foot">
                        <button type="button" class="btn btn-primary" data-crear-modulo
                            data-ambiente-id="{{ $ambiente->id }}" data-ambiente-nombre="{{ $ambiente->nombre }}">
                            <i class="fa-solid fa-plus"></i> Crear módulo
                        </button>
                    </div>
                    </div>
                </div>
            </div>
        @empty
            <div class="cfg-empty-global">
                No hay ambientes registrados en el sistema.
            </div>
        @endforelse
    </div>

    @include('superAdmin.configuracion.modulos.modalCrearModulos')
    @include('superAdmin.configuracion.modulos.modalVerEjesModulo')
@endsection

    @push('scripts')
    <script src="{{ asset('assets/js/configuracion-ejes-ui.js') }}"></script>
    <script src="{{ asset('assets/js/superAdmin/configuracion.js') }}"></script>
@endpush
