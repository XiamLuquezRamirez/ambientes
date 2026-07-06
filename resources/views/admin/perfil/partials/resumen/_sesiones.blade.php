<div class="card profile-card mb-4">
    <div class="card-body">
        <h5 class="section-title">
            Sesiones activas
        </h5>
        <div class="row g-4">
            @foreach ($sessiones as $session)
                <div class="col-12">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fa-solid {{ $session['icono'] }}"></i>
                        </div>
                        <div class="stat-content">
                            <strong>Ambiente:</strong>
                            <small>{{ ucfirst($session['ambiente']) }}</small>
                            <span class="bs-rol badge-stat" style="margin-left: 10px;">
                                {{ $session['titulo'] }}
                            </span>
                            <div class="text-muted">
                                <small>{{ $session['ip'] }}</small>
                                <small>{{ $session['fecha'] }}</small>
                            </div>
                        </div>
                    </div>
                </div>
            @endforeach
        </div>
    </div>
</div>
