@php
    $condicionNombre = $e->condicion?->nombre ?? 'Estándar';
    $requiereApoyo = in_array(strtolower((string) $e->requiere_apoyo), ['si', 'sí', '1', 'true'], true);
    $docLabel = trim(($e->tipo_identificacion ? $e->tipo_identificacion . ' ' : 'Doc. ') . ($e->identificacion ?? '—'));
@endphp

<div class="student-card" data-estudiante-id="{{ $e->id }}">

    <div class="student-top">
        <span class="status-dot {{ $e->activo ? 'status-dot--active' : 'status-dot--inactive' }}"
            title="{{ $e->activo ? 'Activo' : 'Inactivo' }}"></span>

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
            <div class="pin-status"
                onclick="abrirModalVerPinEstudiante('{{ $e->figura1 }}', '{{ $e->figura2 }}', '{{ $e->figura3 }}', '{{ $e->colorfigura1 }}', '{{ $e->colorfigura2 }}', '{{ $e->colorfigura3 }}')">
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

    {{-- Acciones de la card: el ojo abre la ficha completa (verFicha / show.blade.php) --}}
    <div class="student-footer d-flex justify-content-end">
        <div class="student-footer">
            <div class="dropdown tabla-opciones-dropdown">
                <button class="btn-action btn-ver-resumen " type="button" data-bs-toggle="dropdown"
                    aria-expanded="false">
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                    Opciones
                </button>

                <ul class="dropdown-menu dropdown-menu-acciones">

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

                    {{--
                     para futuras acciones:
        
                    <li>
                        <button type="button"
                            class="btn-accion btn-eliminar"
                            data-id="{{ $e->id }}">
                            <i class="fa-solid fa-trash-can"></i>
                            Eliminar
                        </button>
                    </li>
                    --}}
                </ul>
            </div>
        </div>
    </div>
</div>
