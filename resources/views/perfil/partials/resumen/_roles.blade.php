<div class="card profile-card mb-4">
    <div class="card-body">
        <h5 class="section-title">
            Roles asignados
        </h5>
        <div class="row g-6">
            @foreach ($roles as $rol)
                <div class="col-12 ms-auto">
                    <div class="stat-card {{ $rol['color'] }}">
                        <div class="stat-icon">
                            <i class="fa-solid {{ $rol['icono'] }}"></i>
                        </div>
                        <div>
                            <span class="badge-stat bs-{{ $rol['color'] }}">
                                {{ $rol['titulo'] }}
                            </span>
                            <p class="text-muted">
                                {{ $rol['descripcion'] }}
                            </p>
                        </div>
                    </div>
                </div>
            @endforeach
        </div>
        <div class="mt-4">
            @if ($rol === 'admin')
                <span class="text-muted small">Rol asignado por el sistema</span>
            @endif
        </div>
    </div>
</div>
