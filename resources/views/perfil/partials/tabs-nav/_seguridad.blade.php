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
            <div class="text-end">
                <strong id="perfilUltimoCambioContrasena">
                    {{ optional($usuario->ultimoCambioContrasena)->fecha?->format('d/m/Y H:i') ?? 'Nunca' }}
                </strong>
                <div id="perfilUltimoCambioContrasenaRelativo" class="text-muted small">
                    {{ optional($usuario->ultimoCambioContrasena)->fecha?->diffForHumans() }}
                </div>
            </div>
        </div>

        <hr class="my-4">

        <h6 class="section-subtitle mb-3">
            <i class="fa-solid fa-lock me-2"></i>
            Cambiar contraseña
        </h6>

        <form id="formCambiarContrasenaSeguridad" method="POST" novalidate>
            @csrf
            <input type="hidden" name="_method" value="PUT">
            @include('perfil.partials._campos_cambiar_contrasena', [
                'formId' => 'formCambiarContrasenaSeguridad',
                'prefix' => 'seguridad',
            ])
            <div class="d-flex justify-content-end">
                <button type="submit" id="btnCambiarContrasenaSeguridad" class="btn btn-primary">
                    <i class="fa-solid fa-key me-2"></i>
                    Actualizar contraseña
                </button>
            </div>
        </form>
    </div>
</div>
