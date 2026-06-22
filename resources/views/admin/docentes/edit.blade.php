<div class="modal fade" id="modalEditarDocente" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false"
    aria-labelledby="modalEditarDocenteLabel" aria-hidden="false">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i class="fas fa-pencil text-white"></i></div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalEditarDocenteLabel">Editar Docente</h5>
                    <p class="modal-subtitle mb-0">Edita la información del docente</p>
                </div>

                <button type="button" class="btn btn-lg" data-bs-toggle="modal"
                    data-bs-target="#modalReestablecerContrasena" onclick="abrirModalReestablecerContrasena()"><i
                        class="fa-solid fa-rotate-right"></i>
                    Reestablecer Contraseña</button>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar">
                </button>
            </div>

            <div class="modal-body">
                {{-- ── Modal Bootstrap 5 – Reestablecer Contraseña ──────────────────────── --}}
                <div class="modal fade" id="modalReestablecerContrasena" tabindex="-1"
                    aria-labelledby="modalReestablecerContrasenaLabel" aria-hidden="false">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="modalReestablecerContrasenaLabel">Reestablecer Contraseña
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"
                                    aria-label="Close"></button>
                            </div>
                            <form id="formReestablecerContrasena" method="POST">
                                @csrf
                                <input type="hidden" name="id" id="reestablecer_contrasena_id" value="">
                                <input type="text" name="nombre" value="" autocomplete="name" hidden>
                                <input type="text" name="email" value="" autocomplete="email" hidden>
                                <div class="modal-body">
                                    <div class="row">
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
                                                        class="fa-solid fa-eye position-absolute top-50 end-0 translate-middle-y me-3"
                                                        style="cursor:pointer;"></i>
                                                </div>
                                            </div>
                                            <button type="button" id="btnGenerarPassword" name="btnGenerarPassword"
                                                class="btn btn-primary">
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
                                                        class="fa-solid fa-eye position-absolute top-50 end-0 translate-middle-y me-3"
                                                        style="cursor:pointer;"></i>
                                                </div>
                                                <small id="mensajePassword"></small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary"
                                    onclick="cerrarModalReestablecerContrasena()">
                                    Cancelar
                                </button>
                                <button type="submit" form="formReestablecerContrasena" id="btnReestablecerContrasena"
                                    class="btn btn-primary">Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <form id="formEditarDocente" method="POST">
                    @csrf
                    @method('PUT')
                    <!-- Identificador del docente para enviar la actualización al endpoint PUT -->
                    <input type="hidden" name="id" id="editar_docente_id" value="">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <strong>Nombre</strong>
                                <input type="text" name="nombre" id="editar_nombre" class="form-control">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <strong>Email</strong>
                                <input type="email" name="email" id="editar_email" class="form-control">
                            </div>
                        </div>
                        <div class="mb-3">
                            <strong class="form-label">Descripción</strong>
                            <textarea name="descripcion" id="editar_descripcion" class="form-control" rows="3"></textarea>
                        </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn"
                    style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    onclick="cerrarModalEditarDocente()">Cancelar</button>
                <button type="submit" form="formEditarDocente" id="btnEditarDocente"
                    class="btn btn-primary">Guardar</button>
            </div>
        </div>
    </div>
</div>
