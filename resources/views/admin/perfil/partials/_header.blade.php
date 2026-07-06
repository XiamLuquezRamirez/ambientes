<div class="c-card">
    <div class="card-body p-4">
        <div class="row align-items-center">
            @if ($rol == 'admin')
                {{-- Avatar --}}
                <div class="col-lg-2 text-center mb-4 mb-lg-0">
                    <div class="profile-avatar">
                        <img src="https://st4.depositphotos.com/5934840/23454/v/450/depositphotos_234542254-stock-illustration-man-profile-smiling-cartoon-vector.jpg"
                            alt="Avatar">
                        {{-- @if (optional($usuario->docente)->foto)
                        <img src="{{ asset('storage/' . $usuario->docente->foto) }}" alt="Avatar">
                    @else
                        <img src="{{ asset('img/avatar-default.png') }}" alt="Avatar">
                    @endif --}}
                        <span class="profile-status {{ $usuario->estado == 'activo' ? 'online' : 'offline' }}"></span>
                    </div>
                </div>
                {{-- Información principal --}}
                <div class="col-lg-6 ">
                    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
                        <div>
                            <h1>
                                {{ $informacionPersonal['nombre'] }}
                                {{ $informacionPersonal['apellido'] }}
                            </h1>
                            <span class="bs-rol badge-stat">
                                {{ $informacionPersonal['rol'] == 'admin' ? 'Administrador' : 'Docente' }}
                            </span>
                        </div>

                    </div>

                    <div class="row mt-4 g-3">
                        <div class="col-md-6">
                            <div class="profile-item">
                                <i class="fa-solid fa-envelope"></i>
                                <span>{{ $informacionPersonal['email'] }}</span>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="profile-item">
                                <i class="fa-solid fa-id-card"></i>
                                <span>{{ $informacionPersonal['identificacion'] }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {{-- Datos laterales --}}
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
                                Fecha de creación
                            </div>
                            <strong>
                                {{ $usuario->created_at->format('d M Y') }}
                            </strong>
                        </div>
                        <div class="profile-side-item">
                            <div>
                                <i class="fa-regular fa-clock"></i>
                                Último acceso
                            </div>
                            <strong>
                                {{ optional($usuario->ultimoLogin)->fecha?->diffForHumans() ?? 'Sin registros' }}
                            </strong>
                        </div>
                    </div>
                </div>
            @else
                <div class="col-lg-12">
                    <div class="page-header">
                        <h1>Perfil</h1>
                    </div>
                </div>
            @endif
        </div>
    </div>
</div>
