@php
    $cadena = $juego->cadenaCurricularResuelta();
    $icono = $juego->icono ?: 'fa-gamepad';
    $iconClass = str_starts_with($icono, 'fa-') ? $icono : 'fa-'.$icono;
    $color = $juego->color ?: '#2563eb';
    $tipoLabel = $juego->tipoLabel();
    $urlPaquete = $juego->urlPaquete();
@endphp

<div class="student-card" data-juego-id="{{ $juego->id }}">
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
        <span class="stu-badge {{ $juego->activo ? 'stu-badge--activo' : 'stu-badge--inactivo' }}">
            {{ $juego->activo ? 'Activo' : 'Inactivo' }}
        </span>
    </div>

    <div class="student-info">
        @if (filled($juego->descripcion))
            <small class="text-muted">{{ $juego->descripcion }}</small>
        @else
            <small class="text-muted">Sin descripción</small>
        @endif
    </div>

    @if ($urlPaquete)
        <div class="student-actions mt-2">
            <button type="button"
                class="btn btn-sm btn-outline-primary"
                data-cj-preview
                data-url-paquete="{{ $urlPaquete }}"
                data-juego-nombre="{{ $juego->nombre }}">
                <i class="fa-solid fa-play"></i> Vista previa
            </button>
        </div>
    @endif
</div>
