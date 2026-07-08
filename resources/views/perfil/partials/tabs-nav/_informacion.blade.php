@if ($rol !== 'admin')
{{--
    Pestaña Información personal (solo docente).

    Los campos editables (teléfono, dirección, especialidad, descripción) tienen IDs
    con prefijo perfil* para que actualizarInformacionPersonalUI() actualice el DOM
    sin recargar tras guardar el modal modalEditarInformacionPersonal.
--}}
    <div class="card profile-card mb-4">
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
                <h5 class="section-title">Información personal</h5>
                <button type="button" class="btn btn-primary" onclick="abrirModalEditarInformacionPersonal()">
                    <i class="fa-solid fa-pen me-2"></i>
                    Editar
                </button>
            </div>

            <div class="row g-4 mt-1">
                <div class="col-md-6">
                    <div class="profile-item mb-3">
                        <i class="fa-solid fa-user"></i>
                        <span><strong>Nombre:</strong> {{ $informacionPersonal['nombre'] }}
                            {{ $informacionPersonal['apellido'] }}</span>
                    </div>
                    <div class="profile-item mb-3">
                        <i class="fa-solid fa-envelope"></i>
                        <span><strong>Correo:</strong> {{ $informacionPersonal['email'] }}</span>
                    </div>
                    <div class="profile-item mb-3">
                        <i class="fa-solid fa-id-card"></i>
                        <span><strong>Identificación:</strong> {{ $informacionPersonal['identificacion'] }}</span>
                    </div>
                    <div class="profile-item mb-3">
                        <i class="fa-solid fa-phone"></i>
                        <span><strong>Teléfono:</strong>
                            <span id="perfilTelefono">{{ $informacionPersonal['telefono'] ?? '—' }}</span>
                        </span>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="profile-item mb-3">
                        <i class="fa-solid fa-location-dot"></i>
                        <span><strong>Dirección:</strong>
                            <span id="perfilDireccion">{{ $informacionPersonal['direccion'] ?? '—' }}</span>
                        </span>
                    </div>
                    <div class="profile-item mb-3">
                        <i class="fa-solid fa-graduation-cap"></i>
                        <span><strong>Especialidad:</strong>
                            <span id="perfilEspecialidad">{{ $informacionPersonal['especialidad'] ?? '—' }}</span>
                        </span>
                    </div>
                    <div class="profile-item mb-3">
                        <i class="fa-regular fa-calendar"></i>
                        <span><strong>Fecha de ingreso:</strong>
                            {{ $informacionPersonal['fecha_ingreso']
                                ? \Carbon\Carbon::parse($informacionPersonal['fecha_ingreso'])->format('d/m/Y')
                                : '—' }}
                        </span>
                    </div>
                    @if ($informacionPersonal['firma_url'] ?? null)
                        <div class="profile-item mb-3">
                            <i class="fa-solid fa-signature"></i>
                            <span><strong>Firma:</strong></span>
                            <img src="{{ asset('storage/' . $informacionPersonal['firma_url']) }}" alt="Firma"
                                class="mt-2 d-block"
                                style="max-height:60px;border:1px solid #e2e8f0;border-radius:6px;padding:4px;">
                        </div>
                    @endif
                </div>

                <div class="col-12">
                    <div class="profile-item">
                        <i class="fa-solid fa-align-left"></i>
                        <span><strong>Descripción:</strong></span>
                    </div>
                    <p id="perfilDescripcion" class="text-muted mb-0 ms-4">
                        {{ $informacionPersonal['descripcion'] ?? 'Sin descripción registrada.' }}
                    </p>
                </div>
            </div>

            @if (!empty($cargas))
                <h5 class="section-title mt-4 mb-3">Cargas activas</h5>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Ambiente</th>
                                <th>Grado</th>
                                <th>Grupo</th>
                                <th>Horas</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($cargas as $carga)
                                <tr>
                                    <td>{{ $carga['ambiente'] }}</td>
                                    <td>{{ $carga['grado'] }}</td>
                                    <td>{{ $carga['grupo'] }}</td>
                                    <td>{{ $carga['horas'] }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @else
                <p class="text-muted mt-4 mb-0">No tienes cargas docentes asignadas actualmente.</p>
            @endif
        </div>
    </div>
@endif
