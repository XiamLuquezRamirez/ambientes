@php
    $esAdmin = $rol === 'admin';
@endphp

<div class="c-card profile-header-card">
    <div class="row align-items-center g-4 profile-header-row">

        {{-- Avatar --}}
        <div class="col-lg-2 col-md-12 text-center text-lg-start">
            <div class="avatar-wrapper mx-auto mx-lg-0">
                <div class="profile-avatar" id="avatarPerfilPrincipal"
                    @if ($puedeCambiarFoto) onclick="cambiarFotoPerfil()" @endif>
                    <img src="{{ $fotoUrlPublica ?? '' }}" id="avatarPerfilImagen"
                        class="profile-avatar-img {{ $fotoUrlPublica ? '' : 'd-none' }}" alt="Foto de perfil">
                    <span id="avatarPerfilIniciales"
                        class="profile-avatar-iniciales {{ $fotoUrlPublica ? 'd-none' : '' }}">
                        {{ $iniciales }}
                    </span>
                    <span class="profile-status {{ $usuario->estado == 'activo' ? 'online' : 'offline' }}"></span>
                    @if ($puedeCambiarFoto)
                        <div class="avatar-overlay">
                            <i class="fa-solid fa-camera"></i>
                            <span>Cambiar foto</span>
                        </div>
                    @endif
                </div>
            </div>
        </div>

        {{-- Datos principales --}}
        <div class="col-lg-7 col-md-12">
            <div class="profile-identity">
                <h1 class="perfil-nombre mb-0" id="perfilNombreCompleto">
                    {{ $informacionPersonal['nombre'] }} {{ $informacionPersonal['apellido'] }}
                </h1>
                <span class="badge-stat bs-rol">
                    {{ $esAdmin ? 'Administrador' : 'Docente' }}
                </span>
            </div>

            <div class="row profile-meta-grid g-3">
                <div class="col-sm-6">
                    <div class="profile-item">
                        <i class="fa-solid fa-envelope"></i>
                        <div>
                            <small>Correo electrónico</small>
                            <span id="perfilEmail">{{ $informacionPersonal['email'] }}</span>
                        </div>
                    </div>
                </div>
                <div class="col-sm-6">
                    <div class="profile-item">
                        <i class="fa-solid fa-id-card"></i>
                        <div>
                            <small>Identificación</small>
                            <span>{{ $informacionPersonal['identificacion'] ?? '—' }}</span>
                        </div>
                    </div>
                </div>
                @unless ($esAdmin)
                    <div class="col-sm-6">
                        <div class="profile-item">
                            <i class="fa-solid fa-phone"></i>
                            <div>
                                <small>Teléfono</small>
                                <span id="perfilTelefonoHeader">{{ $informacionPersonal['telefono'] ?? '—' }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-sm-6">
                        <div class="profile-item">
                            <i class="fa-solid fa-graduation-cap"></i>
                            <div>
                                <small>Especialidad</small>
                                <span
                                    id="perfilEspecialidadHeader">{{ $informacionPersonal['especialidad'] ?? '—' }}</span>
                            </div>
                        </div>
                    </div>
                @endunless
            </div>
        </div>

        {{-- Resumen lateral --}}
        <div class="col-lg-3 col-md-12 ms-auto">
            <div class="profile-side">
                <div class="profile-side-meta">
                    <small>Estado</small>
                    <span class="badge rounded-pill {{ $usuario->estado == 'activo' ? 'bg-success' : 'bg-danger' }}">
                        {{ $usuario->estado == 'activo' ? 'Activo' : 'Inactivo' }}
                    </span>
                </div>
                <div class="profile-side-meta">
                    <small>{{ $esAdmin ? 'Fecha de creación' : 'Fecha de ingreso' }}</small>
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
                <div class="profile-side-meta">
                    <small>Último acceso</small>
                    <strong>
                        @if ($ultimoAcceso ?? null)
                            {{ $ultimoAcceso['fecha'] }}
                        @else
                            Sin registros
                        @endif
                    </strong>
                    @if ($ultimoAcceso ?? null)
                        <span class="profile-side-detail">IP: {{ $ultimoAcceso['ip'] }}</span>
                    @endif
                </div>
            </div>
        </div>

    </div>
</div>
