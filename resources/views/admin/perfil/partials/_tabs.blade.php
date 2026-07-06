<div class="c-card shadow-sm mt-2">
    <div class="c-head bg-white">
        <ul class="nav nav-tabs" id="perfilTabs">
            <li class="nav-item">
                <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tabResumen">
                    <i class="fa-solid fa-table-cells-large me-2"></i>
                    Resumen
                </button>
            </li>
            @if ($rol !== 'admin')
                <li class="nav-item">
                    <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabInformacion">
                        <i class="fa-solid fa-user me-2"></i>
                        Información personal
                    </button>
                </li>
            @endif
            <li class="nav-item">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabActividad">
                    <i class="fa-solid fa-clock-rotate-left me-2"></i>
                    Actividad reciente
                </button>
            </li>
            <li class="nav-item">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabSeguridad">
                    <i class="fa-solid fa-lock me-2"></i>
                    Seguridad
                </button>
            </li>
        </ul>
    </div>

    <div class="card-body">
        <div class="tab-content">
            <div class="tab-pane fade show active" id="tabResumen">
                @include('admin.perfil.partials.resumen._resumen')
            </div>
            <div class="tab-pane fade" id="tabInformacion">
                @include('admin.perfil.partials.tabs-nav._informacion')
            </div>
            <div class="tab-pane fade" id="tabSeguridad">
                @include('admin.perfil.partials.tabs-nav._seguridad')
            </div>
            <div class="tab-pane fade" id="tabActividad">
                @include('admin.perfil.partials.tabs-nav._actividad')
            </div>
        </div>
    </div>
</div>
