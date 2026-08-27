{{--
    Grid de instituciones (Super Admin).
    Se reutiliza en la carga inicial y en respuestas AJAX de filtros/paginación.
--}}
@php
    $logoService = app(\App\Services\InstitucionLogoService::class);
@endphp

<div class="instituciones-grid" id="instituciones-container">
    @forelse ($instituciones as $inst)
        @php
            $logoUrl = $logoService->urlPublica($inst->logo);
            $iniciales = $logoService->iniciales($inst);
            $ambientesActivos = $inst->ambientes->filter(fn($a) => (bool) $a->pivot->activo)->count();
        @endphp
        <div class="instituciones-card btn-seleccionar-instituciones {{ $inst->activo ? '' : 'instituciones-card--suspendida' }}"
            id="tarjeta-amb-{{ $inst->id }}" data-id="{{ $inst->id }}" data-nombre="{{ $inst->nombre }}"
            onclick="abrirModalEditarInstitucion({{ $inst->id }})">

            <div class="card-head">
                <div class="card-icono card-logo-wrap">
                    <img src="{{ $logoUrl ?? '' }}" alt=""
                        class="card-logo-img {{ $logoUrl ? '' : 'd-none' }}">
                    <span class="card-logo-fallback {{ $logoUrl ? 'd-none' : '' }}">{{ $iniciales }}</span>
                </div>
                <div class="card-info">
                    <div class="card-nombre card-nombre-row">
                        <span class="card-nombre-texto">{{ $inst->nombre }}</span>
                        <div class="form-check form-switch switch-activo-institucion" onclick="event.stopPropagation()">
                            <input class="form-check-input toggle-activo-institucion" type="checkbox"
                                id="institucion_activo_{{ $inst->id }}" data-id="{{ $inst->id }}"
                                data-nombre="{{ $inst->nombre }}" value="1" style="cursor: pointer;"
                                title="{{ $inst->activo ? 'Suspender institución' : 'Activar institución' }}"
                                {{ $inst->activo ? 'checked' : '' }}>
                        </div>
                    </div>
                    <div class="card-ip">
                        <i class="fas fa-envelope" style="font-size:.7rem"></i>
                        {{ $inst->correo_contacto }}
                    </div>
                    <div class="card-ip">
                        <i class="fas fa-code" style="font-size:.7rem"></i>
                        {{ $inst->codigo_dane }}
                    </div>
                    <div class="card-ip">
                        <i class="fas fa-map-marker-alt" style="font-size:.7rem"></i>
                        {{ $inst->municipio }}, {{ $inst->departamento }}
                    </div>
                    <span
                        class="badge-estado-institucion {{ $inst->activo ? 'badge-estado-institucion--activa' : 'badge-estado-institucion--suspendida' }}"
                        id="badge-estado-{{ $inst->id }}">
                        {{ $inst->activo ? 'Activa' : 'Suspendida' }}
                    </span>
                </div>
            </div>

            <div class="card-stats">
                <span class="badge-stat bs-azul">
                    <i class="fas fa-network-wired"></i> {{ $ambientesActivos }} ambiente(s)
                </span>
            </div>
        </div>
    @empty
        <div class="text-center text-muted py-5 w-100" style="grid-column:1/-1">
            <i class="fas fa-university fa-2x mb-2 d-block" style="opacity:.4"></i>
            No se encontraron instituciones con los filtros aplicados.
        </div>
    @endforelse
</div>

{{ $instituciones->links('vendor.pagination.proyecto') }}
