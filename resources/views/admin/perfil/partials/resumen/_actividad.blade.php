<div class="card profile-card mb-4">
    <div class="card-body">
        <h5 class="section-title">
            Actividad reciente
        </h5>

        <div class="timeline">

            @foreach ($actividad as $item)
                <div class="timeline-item">

                    <div class="timeline-icon bg-{{ $item['color'] }}">

                        <i class="fa-solid {{ $item['icono'] }}"></i>

                    </div>

                    <div class="timeline-content">

                        <h6>

                            {{ $item['titulo'] }}

                        </h6>

                        <p>

                            {{ $item['descripcion'] }}

                        </p>

                        <small>

                            {{ $item['fecha'] }}

                        </small>

                    </div>

                </div>
            @endforeach

        </div>

    </div>

</div>
