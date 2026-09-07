{{--
    Grid de instituciones (Super Admin).
    Patrón visual alineado con admin/ambientes.
--}}
@php
    $logoService = app(\App\Services\InstitucionLogoService::class);
@endphp

<div class="instituciones-grid" id="instituciones-container">
    @forelse ($instituciones as $inst)
        @php
            $logoUrl = $logoService->urlPublica($inst->logo);
            $iniciales = $logoService->iniciales($inst);
            $ambientesActivos = (int) ($inst->ambientes_activos_count ?? 0);
            $ambientesTotal = (int) ($inst->ambientes_count ?? 0);
            $modulosActivos = (int) ($inst->modulos_activos_count ?? 0);
            $modulosTotal = (int) ($inst->modulos_count ?? 0);
            $perfilesActivos = (int) ($inst->perfiles_activos_count ?? 0);
            $perfilesPersonalizados = (int) ($inst->perfiles_personalizados_activos_count ?? 0);
            $lugar = trim(
                collect([$inst->municipio, $inst->departamento])
                    ->filter(fn($v) => filled($v))
                    ->implode(', '),
            );
            $correo = filled($inst->correo_contacto) ? $inst->correo_contacto : null;
            $dane = filled($inst->codigo_dane) ? $inst->codigo_dane : null;
            $metaParts = array_values(array_filter([
                $correo,
                $dane ? 'DANE ' . $dane : null,
            ]));
            $metaTexto = $metaParts !== [] ? implode(' · ', $metaParts) : 'Sin correo ni DANE';
        @endphp
        <div class="institucion-card {{ $inst->activo ? '' : 'institucion-card--suspendida' }}"
            id="tarjeta-amb-{{ $inst->id }}" data-id="{{ $inst->id }}" data-nombre="{{ $inst->nombre }}"
            role="button" tabindex="0"
            onclick="abrirModalEditarInstitucion({{ $inst->id }})"
            onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">

            <div class="card-head">
                <div class="card-logo" aria-hidden="true">
                    @if ($logoUrl)
                        <img src="{{ $logoUrl }}" alt="">
                    @else
                        {{ $iniciales }}
                    @endif
                </div>
                <div class="card-info">
                    <div class="card-nombre" title="{{ $inst->nombre }}">{{ $inst->nombre }}</div>
                    <div class="card-sub">
                        <span id="badge-estado-{{ $inst->id }}"
                            class="badge-estado {{ $inst->activo ? 'badge-estado--activa' : 'badge-estado--suspendida' }}">
                            {{ $inst->activo ? 'Activa' : 'Suspendida' }}
                        </span>
                        <span class="card-lugar" title="{{ $lugar !== '' ? $lugar : 'Sin ubicación' }}">
                            {{ $lugar !== '' ? $lugar : 'Sin ubicación' }}
                        </span>
                    </div>
                </div>
                <div class="form-check form-switch switch-activo-institucion" onclick="event.stopPropagation()">
                    <input class="form-check-input toggle-activo-institucion" type="checkbox"
                        id="institucion_activo_{{ $inst->id }}" data-id="{{ $inst->id }}"
                        data-nombre="{{ $inst->nombre }}" value="1"
                        title="{{ $inst->activo ? 'Suspender institución' : 'Activar institución' }}"
                        {{ $inst->activo ? 'checked' : '' }}>
                </div>
            </div>

            <div class="card-meta" title="{{ $metaTexto }}">
                <i class="fas fa-envelope" aria-hidden="true"></i>{{ $metaTexto }}
            </div>

            <div class="card-stats" aria-label="Resumen de la institución">
                <div class="stat-cell"
                    title="Ambientes activos / asociados ({{ $ambientesActivos }} de {{ $ambientesTotal }})">
                    <div class="stat-n">{{ $ambientesActivos }}</div>
                    <div class="stat-l">Ambientes</div>
                </div>
                <div class="stat-cell"
                    title="Módulos activos / asignados ({{ $modulosActivos }} de {{ $modulosTotal }})">
                    <div class="stat-n">{{ $modulosActivos }}</div>
                    <div class="stat-l">Módulos</div>
                </div>
                <div class="stat-cell" title="Perfiles de aprendizaje activos">
                    <div class="stat-n">{{ $perfilesActivos }}</div>
                    <div class="stat-l">Perfiles</div>
                </div>
                <div class="stat-cell" title="Perfiles personalizados activos">
                    <div class="stat-n">{{ $perfilesPersonalizados }}</div>
                    <div class="stat-l">Pers.</div>
                </div>
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
