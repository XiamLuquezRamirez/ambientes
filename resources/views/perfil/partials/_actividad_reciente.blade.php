@php
    $esAdmin = ($rol ?? ($usuario->rol ?? null)) === 'admin';
@endphp
<div class="card profile-card mb-4">
    <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="{{ $tituloClase ?? 'profile-card-title' }} section-title mb-0">
                Actividad reciente
            </h5>
            <button type="button" class="btn btn-link btn-sm p-0" onclick="abrirHistorialAccesosPerfil()">
                Ver historial completo
            </button>
        </div>

        <div class="ultimo-acceso-resumen mb-4">
            <div class="profile-item">
                <i class="fa-solid fa-network-wired"></i>
                <span>Último acceso</span>
            </div>
            @if ($ultimoAcceso)
                <div class="ms-4 mt-2">
                    <strong>{{ $ultimoAcceso['fecha'] }}</strong>
                    <span class="text-muted">({{ $ultimoAcceso['fecha_relativa'] }})</span>
                    <div class="text-muted small mt-1">
                        IP: {{ $ultimoAcceso['ip'] }}
                    </div>
                </div>
            @else
                <p class="text-muted small ms-4 mt-2 mb-0">Sin registros de acceso.</p>
            @endif
        </div>

        @if (empty($actividad))
            <p class="text-muted mb-0">
                {{ $esAdmin ? 'No hay cambios registrados recientemente.' : 'No hay actividad registrada en tu cuenta.' }}
            </p>
        @else
            <div class="timeline">
                @foreach ($actividad as $item)
                    <div class="timeline-item">
                        <div class="timeline-icon bg-{{ $item['color'] }}">
                            <i class="fa-solid {{ $item['icono'] }}"></i>
                        </div>
                        <div class="timeline-content">
                            <h6>{{ $item['accion'] }}</h6>
                            <p class="mb-1">
                                <strong>{{ $item['registro'] }}</strong>
                            </p>
                            <small title="{{ $item['fecha'] }}">
                                {{ $item['fecha'] }}
                                <span class="text-muted">· {{ $item['fecha_relativa'] }}</span>
                            </small>
                        </div>
                    </div>
                @endforeach
            </div>
        @endif
    </div>
</div>
