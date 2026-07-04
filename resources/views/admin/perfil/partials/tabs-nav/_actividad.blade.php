<div class="card profile-card mb-4">

    <div class="card-body">

        <div class="d-flex justify-content-between align-items-center mb-4">

            <h5 class="profile-card-title mb-0">

                Actividad reciente

            </h5>

            <button class="btn btn-link btn-sm">

                Ver todo

            </button>

        </div>

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
