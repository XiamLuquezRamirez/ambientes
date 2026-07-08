<div class="card profile-card mb-4">

    <div class="card-body">

        <h5 class="section-title">

            Información rápida

        </h5>
        <div class="row g-4">
            @foreach ($estadisticas as $item)
                <div class="col-6">
                    <div class="stat-card {{ $item['color'] }}">
                        <div class="stat-icon">
                            <i class="fa-solid {{ $item['icono'] }}"></i>
                        </div>

                        <div>
                            <h3>{{ $item['valor'] }}</h3>
                            <small>{{ $item['titulo'] }}</small>
                        </div>
                    </div>
                </div>
            @endforeach
        </div>
    </div>
</div>
