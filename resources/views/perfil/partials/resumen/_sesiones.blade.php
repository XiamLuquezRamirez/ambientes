<div class="card profile-card mb-4">
    <div class="card-body">
        <h5 class="section-title">
            Sesiones activas
        </h5>
        <div class="row g-4">
            @foreach ($sesiones as $sesion)
                <div class="col-12">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fa-solid {{ $sesion['icono'] }}"></i>
                        </div>
                        <div class="stat-content">
                            <strong>Ambiente:</strong>
                            <small>{{ ucfirst($sesion['ambiente']) }}</small>
                            <span class="bs-rol badge-stat" style="margin-left: 10px;">
                                {{ $sesion['titulo'] }}
                            </span>
                            <div class="text-muted">
                                <small>{{ $sesion['ip'] }}</small>
                                <small>{{ $sesion['fecha'] }}</small>
                            </div>
                        </div>
                    </div>
                </div>
            @endforeach
        </div>
    </div>
</div>
