@php
    $iniciales = mb_strtoupper(mb_substr($usuario->nombre ?? '', 0, 1) . mb_substr($usuario->apellido ?? '', 0, 1));
    $esAdmin = $rol === 'admin';
@endphp

<div class="c-card">
    <div class="card-body p-4">
        <div class="row align-items-center">
            <div class="col-lg-2 text-center mb-4 mb-lg-0">
                <div class="profile-avatar" id="perfilAvatarIniciales">
                    {{ $iniciales }}
                    <button class="btn btn-primary btn-sm"
                        style="position: absolute; bottom: 10px; right: 10px; z-index: 1000;"
                        onclick="cambiarFotoPerfil()">
                        <i class="fa-solid fa-camera"></i>
                        Cambiar foto
                    </button>
                </div>
            </div>

            <div class="col-lg-6">
                <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
                    <div>
                        <h1 id="perfilNombreCompleto">
                            {{ $informacionPersonal['nombre'] }}
                            {{ $informacionPersonal['apellido'] }}
                        </h1>
                        <span class="bs-rol badge-stat">
                            {{ $esAdmin ? 'Administrador' : 'Docente' }}
                        </span>
                    </div>
                </div>

                <div class="row mt-4 g-3">
                    <div class="col-md-6">
                        <div class="profile-item">
                            <i class="fa-solid fa-envelope"></i>
                            <span id="perfilEmail">{{ $informacionPersonal['email'] }}</span>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="profile-item">
                            <i class="fa-solid fa-id-card"></i>
                            <span>{{ $informacionPersonal['identificacion'] }}</span>
                        </div>
                    </div>
                    @unless ($esAdmin)
                        <div class="col-md-6">
                            <div class="profile-item">
                                <i class="fa-solid fa-phone"></i>
                                <span id="perfilTelefonoHeader">{{ $informacionPersonal['telefono'] ?? '—' }}</span>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="profile-item">
                                <i class="fa-solid fa-graduation-cap"></i>
                                <span id="perfilEspecialidadHeader">{{ $informacionPersonal['especialidad'] ?? '—' }}</span>
                            </div>
                        </div>
                    @endunless
                </div>
            </div>

            <div class="col-lg-4 ms-auto">
                <div class="profile-side">
                    <div class="profile-side-item">
                        <div class="profile-label">
                            <i class="fa-regular fa-circle-check"></i>
                            Estado
                        </div>
                        <span
                            class="badge rounded-pill {{ $usuario->estado == 'activo' ? 'bg-success' : 'bg-danger' }}">
                            {{ $usuario->estado == 'activo' ? 'Activo' : 'Inactivo' }}
                        </span>
                    </div>

                    <div class="profile-side-item">
                        <div>
                            <i class="fa-regular fa-calendar"></i>
                            {{ $esAdmin ? 'Fecha de creación' : 'Fecha de ingreso' }}
                        </div>
                        <strong>
                            @if ($esAdmin)
                                {{ $usuario->created_at->format('d M Y') }}
                            @else
                                {{ $informacionPersonal['fecha_ingreso']
                                    ? \Carbon\Carbon::parse($informacionPersonal['fecha_ingreso'])->format('d M Y')
                                    : '—' }}
                            @endif
                        </strong>
                    </div>

                    <div class="profile-side-item">
                        <div>
                            <i class="fa-regular fa-clock"></i>
                            Último acceso
                        </div>
                        <strong>
                            @if ($ultimoAcceso ?? null)
                                {{ $ultimoAcceso['fecha'] }}
                            @else
                                Sin registros
                            @endif
                        </strong>
                        @if ($ultimoAcceso ?? null)
                            <div class="text-muted small text-end">
                                IP: {{ $ultimoAcceso['ip'] }}
                            </div>
                        @endif
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
