@php
    $cadena = $juego->cadenaCurricularResuelta();
    $imagenUrl = $juego->urlImagen();
    $color = $juego->color ?: '#64748b';
    $tipoLabel = $juego->tipoLabel();
    $urlPaquete = $juego->urlPaquete();
@endphp

<div class="student-card" data-juego-id="{{ $juego->slug }}">
    <div class="student-top">
        @if ($imagenUrl)
            <div class="student-avatar cj-card-imagen" style="--cj-card-color: {{ $color }};">
                <img src="{{ $imagenUrl }}" alt="" loading="lazy" decoding="async">
            </div>
        @else
            <div class="student-avatar cj-card-imagen cj-card-imagen--vacia" title="Este juego no tiene imagen">
                <i class="fa-regular fa-image" aria-hidden="true"></i>
            </div>
        @endif

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
                data-url-paquete="{{ $urlPaquete }}?color={{ urlencode($color) }}" data-juego-nombre="{{ $juego->nombre }}" title="Vista previa"
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
