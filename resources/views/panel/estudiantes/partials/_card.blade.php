@php
    $condicionNombre = $e->condicion?->nombre ?? 'Estándar';
    $requiereApoyo = in_array(strtolower((string) $e->requiere_apoyo), ['si', 'sí', '1', 'true'], true);
    $docLabel = trim(($e->tipo_identificacion ? $e->tipo_identificacion . ' ' : 'Doc. ') . ($e->identificacion ?? '—'));
    $tieneTransitoriaActiva = $e->condicionTransitoriaActiva !== null;
@endphp

<div class="student-card{{ $tieneTransitoriaActiva ? ' student-card--transitoria' : '' }}" data-estudiante-id="{{ $e->id }}">

    <div class="student-top">
        @if ($e->avatar_url)
            <img src="{{ $e->avatar_url }}" class="student-avatar" alt="{{ $e->nombre_completo }}">
        @else
            <div class="student-avatar initials" style="background: {{ $e->color_avatar }}">
                {{ $e->iniciales }}
            </div>
        @endif

        <div class="student-identity">
            <h5>{{ $e->nombre_completo }}</h5>
            <small>{{ $docLabel }}</small>
        </div>
    </div>

    <div class="student-middle">
        <span class="stu-badge stu-badge--condicion">{{ $condicionNombre }}</span>

        <span class="stu-badge {{ $e->activo ? 'stu-badge--activo' : 'stu-badge--inactivo' }}">
            {{ $e->estado_texto }}
        </span>

        @if ($tieneTransitoriaActiva)
            <span class="stu-badge stu-badge--transitoria">
                {{ $e->condicionTransitoriaActiva->condicionTransitoria?->etiqueta ?? 'Transitoria' }}
            </span>
        @endif

        @if ($e->piar !== null && $e->piar->paso == '8')
            <span class="stu-badge stu-badge--piar">PIAR Activo</span>
        @elseif ($e->piar !== null && $e->piar->paso < '8')
            <span class="stu-badge stu-badge--piar-incompleto">PIAR Incompleto</span>
        @elseif ($e->piar == null && $requiereApoyo)
            <span class="stu-badge stu-badge--piar-sin">Sin PIAR</span>
        @endif

        @if ($requiereApoyo)
            <span class="stu-badge stu-badge--apoyo">Apoyo pedagógico</span>
        @endif
    </div>

    <div class="student-info {{ $e->tiene_pin ? '' : 'student-info--alert' }}">
        @if ($e->tiene_pin)
            <div class="pin-status pin-status--active" role="button" tabindex="0"
                onclick="abrirModalVerPinEstudiante('{{ $e->configuracionPin->figura_1 }}', '{{ $e->configuracionPin->figura_2 }}', '{{ $e->configuracionPin->figura_3 }}', '{{ $e->configuracionPin->color_figura_1 }}', '{{ $e->configuracionPin->color_figura_2 }}', '{{ $e->configuracionPin->color_figura_3 }}' , '{{ $e->nombre }} {{ $e->apellido }}')"
                onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
                <i class="fa-solid fa-lock"></i>
                <span>PIN configurado</span>
            </div>
        @else
            <div class="pin-status pin-status--alert">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Sin PIN</span>
            </div>
            <button type="button" class="pin-requerido"
                onclick="abrirModalConfigurarPin('{{ $e->id }}', '{{ $e->nombre }} {{ $e->apellido }}')">
                Requiere configuración
            </button>
        @endif
    </div>

    <div class="student-options">
        <div class="dropdown tabla-opciones-dropdown">
            <button type="button" class="student-options-btn" data-bs-toggle="dropdown" aria-expanded="false"
                aria-label="Opciones">
                <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>

            <ul class="dropdown-menu dropdown-menu-end dropdown-menu-acciones">
                <li>
                    <a href="{{ route('panel.estudiantes.show', $e->id) }}" class="btn-accion btn-ver-resumen">
                        <i class="fa-solid fa-eye"></i>
                        Ver ficha completa
                    </a>
                </li>
                <li>
                    <button type="button" class="btn-accion btn-editar"
                        onclick="abrirModalEditarEstudiante('{{ $e->id }}')">
                        <i class="fa-solid fa-pen"></i>
                        Editar
                    </button>
                </li>
            </ul>
        </div>
    </div>

</div>
