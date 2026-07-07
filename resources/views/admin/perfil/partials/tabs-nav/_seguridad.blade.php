<div class="card profile-card">
    <div class="card-body">
        <h5 class="section-title">
            Seguridad
        </h5>
        <div class="security-item">
            <div class="security-label">
                <i class="fa-solid fa-clock-rotate-left text-success"></i>
                <span>Último acceso</span>
            </div>
            <div class="text-end">
                <strong>
                    @if ($ultimoAcceso ?? null)
                        {{ $ultimoAcceso['fecha'] }}
                    @else
                        {{ optional($usuario->ultimoLogin)->fecha?->format('d/m/Y H:i') ?? 'Sin registros' }}
                    @endif
                </strong>
                @if ($ultimoAcceso ?? null)
                    <div class="text-muted small">
                        IP: {{ $ultimoAcceso['ip'] }} · {{ $ultimoAcceso['fecha_relativa'] }}
                    </div>
                @elseif (optional($usuario->ultimoLogin)->fecha)
                    <div class="text-muted small">
                        {{ $usuario->ultimoLogin->fecha->diffForHumans() }}
                    </div>
                @endif
            </div>
        </div>
        <div class="security-item">
            <div class="security-label">
                <i class="fa-solid fa-key text-warning"></i>
                <span>Último cambio de contraseña</span>
            </div>
            <strong>
                {{ optional($usuario->ultimoCambioPassword)->created_at?->format('d/m/Y H:i') ?? 'Nunca' }}
            </strong>
            <div class="text-muted small">
                {{ optional($usuario->ultimoCambioPassword)->created_at?->diffForHumans() }}
            </div>
        </div>
    </div>
</div>
