@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/estilosModals.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/docente/index.css') }}">
@endpush

{{-- ── Modal Bootstrap 5 – Nuevo Usuario ──────────────────────── --}}
<div class="modal fade" id="modalUsuario" tabindex="-1" data-bs-backdrop="static" aria-labelledby="modalUsuarioLabel"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i id="modalUsuarioIcon"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalUsuarioLabel"></h5>
                    <p class="modal-subtitle mb-0" id="modalUsuarioSubtitle"></p>
                </div>
                <button type="button" class="btn-close" onclick="cerrarModalUsuario()" data-bs-dismiss="modal"
                    aria-label="Cerrar">
                </button>
            </div>

            <div class="modal-body p-4">
                <ul class="nav nav-tabs">
                    <li class="nav-item">
                        <a class="nav-link active" data-bs-toggle="tab" href="#datosPersonales"><i
                                class="fas fa-user"></i> Datos Personales</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" data-bs-toggle="tab" href="#gestionCuenta"><i class="fas fa-cog"></i>
                            Gestion de Cuenta</a>
                    </li>
                </ul>
                {{-- Un solo formulario para ambas pestañas: evita IDs duplicados y envía todos los campos. --}}
                <form id="formUsuario" method="POST">
                    @csrf
                    <div class="tab-content" style="padding: 20px;">
                        <div class="tab-pane container active" id="datosPersonales">
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        <strong class="form-label">Identificación</strong>
                                        <input type="number" id="identificacion" name="identificacion"
                                            class="form-control" placeholder="Identificación del usuario"
                                            value="{{ old('identificacion') }}">
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        <strong class="form-label">Nombre(s)</strong>
                                        <input type="text" id="nombre" name="nombre" class="form-control"
                                            placeholder="Nombre del usuario" value="{{ old('nombre') }}">
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        <strong class="form-label">Apellido(s)</strong>
                                        <input type="text" id="apellido" name="apellido" class="form-control"
                                            placeholder="Apellidos del usuario" value="{{ old('apellido') }}">
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        <strong class="form-label">Rol</strong>
                                        <select name="rol" id="rol" class="form-control">
                                            <option value="">-- Seleccione el rol --</option>
                                            <option value="admin">Administrador</option>
                                            <option value="docente">Docente</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="tab-pane container" id="gestionCuenta">
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="mb-3">
                                        <strong class="form-label">Correo electrónico</strong>
                                        <input type="email" id="email" name="email" class="form-control"
                                            placeholder="Correo electrónico" value="{{ old('email') }}"
                                            autocomplete="off">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <strong class="form-label">Contraseña
                                            <span style="color:#94A3B8;font-size:0.78rem">(mínimo 8
                                                caracteres)</span>
                                        </strong>
                                        <div class="position-relative">
                                            <input type="password" id="password" name="password"
                                                class="form-control pe-5" placeholder="Contraseña"
                                                autocomplete="new-password">
                                            <i id="togglePassword"
                                                onclick="verPassword('#password', '#togglePassword')"
                                                class="fa-solid fa-eye position-absolute top-50 end-0 translate-middle-y me-3"
                                                style="cursor:pointer;"></i>
                                        </div>
                                    </div>
                                    <button type="button" id="btnGenerarPassword" class="btn btn-primary">
                                        Generar
                                        Contraseña Aleatoria <i class="fa-solid fa-shuffle"></i></button>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <strong class="form-label">Confirmar contraseña
                                        </strong>
                                        <div class="position-relative">
                                            <input type="password" id="password_confirmation"
                                                name="password_confirmation" class="form-control pe-5"
                                                placeholder="Contraseña" autocomplete="new-password">
                                            <i id="togglePasswordConfirmation"
                                                onclick="verPassword('#password_confirmation', '#togglePasswordConfirmation')"
                                                class="fa-solid fa-eye position-absolute top-50 end-0 translate-middle-y me-3"
                                                style="cursor:pointer;"></i>
                                        </div>
                                        <small id="mensajePassword"></small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn"
                    style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0" onclick="cerrarModalUsuario()">
                    <i class="fa-solid fa-xmark"></i> Cancelar</button>
                <button type="submit" form="formUsuario" id="btnUsuario" class="btn btn-primary">
                    <i class="fa-solid fa-floppy-disk"></i> Guardar</button>
            </div>
        </div>
    </div>
</div>
