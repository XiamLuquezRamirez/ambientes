@php
    $cadena = $juego->cadenaCurricularResuelta();
    $icono = $juego->icono ?: 'fa-gamepad';
    $iconClass = str_starts_with($icono, 'fa-') ? $icono : 'fa-' . $icono;
    $color = $juego->color ?: '#2563eb';
    $tipoLabel = $juego->tipoLabel();
    $urlPaquete = $juego->urlPaquete();
@endphp

<div class="student-card" data-juego-id="{{ $juego->slug }}">
    <div class="student-top">
        <div class="student-avatar initials d-flex align-items-center justify-content-center"
            style="background: {{ $color }}; color: #fff; font-size: 1.25rem;">
            <i class="fa-solid {{ $iconClass }}" aria-hidden="true"></i>
        </div>

        <div class="student-identity">
            <h5>{{ $juego->nombre }}</h5>
            <small>{{ $tipoLabel }}</small>
        </div>
    </div>

    <div class="student-middle">
        @if ($cadena['ambiente_nombre'])
            <span class="stu-badge">{{ $cadena['ambiente_nombre'] }}</span>
        @endif
        @if ($cadena['modulo_nombre'])
            <span class="stu-badge stu-badge--perfil-aprendizaje">{{ $cadena['modulo_nombre'] }}</span>
        @endif
        @if ($cadena['eje_nombre'])
            <span class="stu-badge">{{ $cadena['eje_nombre'] }}</span>
        @endif
        @if ($cadena['tematica_nombre'])
            <span class="stu-badge">{{ $cadena['tematica_nombre'] }}</span>
        @endif
        <span class="stu-badge {{ $juego->activo ? 'stu-badge--activo' : 'stu-badge--inactivo' }}" data-cj-badge-estado>
            {{ $juego->activo ? 'Activo' : 'Inactivo' }}
        </span>
    </div>

    <div class="student-info">
        @if (filled($juego->descripcion))
            <small class="text-muted cj-card-desc">{{ $juego->descripcion }}</small>
        @else
            <small class="text-muted cj-card-desc">Sin descripción</small>
        @endif
        @if (filled($juego->ruta))
            <code class="cj-card-ruta" title="{{ $juego->ruta }}">{{ $juego->ruta }}</code>
        @endif

        <div class="form-check form-switch cj-switch-activo mb-0" onclick="event.stopPropagation()">
            <input class="form-check-input toggle-activo-juego" style="cursor: pointer;" type="checkbox"
                id="juego_activo_{{ $juego->slug }}" data-juego-id="{{ $juego->slug }}"
                data-nombre="{{ $juego->nombre }}" title="{{ $juego->activo ? 'Desactivar juego' : 'Activar juego' }}"
                @checked($juego->activo)>
        </div>
    </div>

    <div class="student-options">
        @if ($urlPaquete)
            <button type="button" class="btn btn-sm btn-outline-primary cj-preview-btn" data-cj-preview
                data-url-paquete="{{ $urlPaquete }}" data-juego-nombre="{{ $juego->nombre }}" title="Vista previa"
                aria-label="Vista previa de {{ $juego->nombre }}">
                <i class="fa-solid fa-play" aria-hidden="true"></i>
            </button>
        @endif

        <div class="dropdown tabla-opciones-dropdown">
            <button type="button" class="student-options-btn" data-bs-toggle="dropdown" aria-expanded="false"
                aria-label="Opciones">
                <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end dropdown-menu-acciones">
                <li>
                    <button type="button" class="btn-accion btn-editar" data-cj-editar
                        data-juego-id="{{ $juego->slug }}">
                        <i class="fa-solid fa-pen"></i>
                        Editar
                    </button>
                </li>
            </ul>
        </div>
    </div>
</div>
