<div class="modal fade" id="modalCrearAdministrador" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i id="modalCrearAdministradorIcon"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalCrearAdministradorLabel"></h5>
                    <p class="modal-subtitle mb-0" id="modalCrearAdministradorSubtitle"></p>
                </div>
                <button type="button" class="btn-close" id="btnCloseModalCrearAdministrador" data-bs-dismiss="modal"
                    aria-label="Cerrar"></button>
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
                <form id="formCrearAdministrador" method="POST">
                    @csrf
                    <div class="tab-content" style="padding: 20px;">
                        <div class="tab-pane container active" id="datosPersonales">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label fw-bold" for="nombre">Nombre</label>
                                        <input type="text" id="nombre" name="nombre" class="form-control"
                                            placeholder="Nombre del administrador" required maxlength="100">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label fw-bold" for="institucion">Institución</label>
                                        <select id="institucion" name="institucion" class="form-control" required
                                            style="cursor:pointer;">
                                            <option value="">Selecciona una institución</option>
                                            @foreach ($instituciones as $institucion)
                                                <option value="{{ $institucion->id }}">
                                                    {{ $institucion->nombre }}
                                                </option>
                                            @endforeach
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
                                        <div id="mensajeEmail" class="invalid-feedback" style="display:none;"></div>
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
                                            <i id="togglePassword" onclick="verPassword('#password', '#togglePassword')"
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
                    style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    onclick="cerrarModalCrearAdministrador()">
                    <i class="fa-solid fa-xmark"></i> Cancelar</button>
                <button type="submit" form="formCrearAdministrador" id="btnCrearAdministrador"
                    class="btn btn-primary">
                    <i class="fa-solid fa-floppy-disk"></i> Crear Administrador</button>
            </div>
        </div>
    </div>
</div>
