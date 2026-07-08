{{--
    Modal: Editar perfil del usuario autenticado.

    Flujo:
    1. abrirModalEditarPerfil() carga los datos actuales en el formulario.
    2. Si el email difiere del original, se muestra el campo de contraseña actual.
    3. Al guardar (AJAX POST + _method PUT):
       - Toast de éxito (SweetAlert2 vía mostrarToast).
       - actualizarDatosPerfil() refresca nombre, email e iniciales sin recargar la página.
    4. Errores de validación se muestran inline bajo cada campo.

    Nota técnica: se usa POST con method spoofing (_method=PUT) porque PHP/Laravel
    no parsean correctamente multipart/form-data en peticiones PUT.
--}}
<div class="modal fade modal-app" id="modalBSEditarPerfil" tabindex="-1" data-bs-backdrop="static"
    aria-labelledby="modalBSEditarPerfilLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i class="fa-solid fa-pen text-white"></i></div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalBSEditarPerfilLabel">Editar Perfil</h5>
                    <p class="modal-subtitle mb-0" id="modalBSEditarPerfilSubtitle">Edita la información de tu perfil
                    </p>
                </div>
                <button type="button" class="btn-close" onclick="cerrarModalBSEditarPerfil()" data-bs-dismiss="modal"
                    aria-label="Cerrar"></button>
            </div>

            <div class="modal-body p-4">
                <form id="formBSEditarPerfil" method="POST" novalidate>
                    @csrf
                    <input type="hidden" name="_method" value="PUT">
                    {{-- Referencia del email actual; se usa en JS para detectar cambio de correo --}}
                    <input type="hidden" id="emailOriginalPerfil" value="{{ $usuario->email }}">
                    <div class="tab-content" style="padding: 20px;">
                        <div class="row">
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <strong class="form-label">Correo electrónico</strong>
                                    <input type="email" id="email" name="email" class="form-control"
                                        placeholder="Correo electrónico" value="{{ $usuario->email }}"
                                        autocomplete="off" required>
                                    <div id="mensajeEmail" class="invalid-feedback" style="display:none;"></div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <strong class="form-label">Nombre(s)</strong>
                                    <input type="text" id="nombre" name="nombre" class="form-control"
                                        placeholder="Nombre" value="{{ $usuario->nombre }}" autocomplete="off" required>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <strong class="form-label">Apellido(s)</strong>
                                    <input type="text" id="apellido" name="apellido" class="form-control"
                                        placeholder="Apellidos" value="{{ $usuario->apellido }}" autocomplete="off"
                                        required>
                                </div>
                            </div>
                        </div>

                        {{-- Visible solo cuando el email difiere del registrado --}}
                        <div id="seccionPasswordActual" class="row d-none">
                            <div class="col-md-6">
                                <div class="alert alert-info py-2 mb-3">
                                    <i class="fa-solid fa-circle-info me-1"></i>
                                    Para cambiar tu correo debes confirmar tu contraseña actual.
                                </div>
                                <div class="mb-3">
                                    <strong class="form-label">Contraseña actual</strong>
                                    <input type="password" id="password_actual" name="password_actual"
                                        class="form-control" placeholder="Ingresa tu contraseña actual"
                                        autocomplete="current-password">
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    onclick="cerrarModalBSEditarPerfil()">
                    <i class="fa-solid fa-xmark"></i> Cancelar
                </button>
                <button type="submit" form="formBSEditarPerfil" id="btnBSEditarPerfil" class="btn btn-primary">
                    <i class="fa-solid fa-floppy-disk"></i> Guardar cambios
                </button>
            </div>
        </div>
    </div>
</div>

@if ($rol !== 'admin')
    {{--
    Modal: Información personal del docente (teléfono, dirección, especialidad, descripción).
    Endpoint: PUT panel/perfil/informacion-personal (solo docente autenticado).
--}}
    <div class="modal fade modal-app" id="modalEditarInformacionPersonal" tabindex="-1" data-bs-backdrop="static"
        aria-labelledby="modalEditarInformacionPersonalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-header-icon"><i class="fa-solid fa-id-card text-white"></i></div>
                    <div class="flex-grow-1">
                        <h5 class="modal-title mb-0" id="modalEditarInformacionPersonalLabel">Editar información
                            personal</h5>
                        <p class="modal-subtitle mb-0">Actualiza tus datos de contacto y perfil profesional</p>
                    </div>
                    <button type="button" class="btn-close" onclick="cerrarModalEditarInformacionPersonal()"
                        data-bs-dismiss="modal" aria-label="Cerrar"></button>
                </div>

                <div class="modal-body p-4">
                    <form id="formEditarInformacionPersonal" method="POST" novalidate>
                        @csrf
                        <input type="hidden" name="_method" value="PUT">
                        <div class="row g-3">
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <strong class="form-label">Teléfono</strong>
                                    <input type="text" id="telefono" name="telefono" class="form-control"
                                        placeholder="Teléfono" value="{{ $informacionPersonal['telefono'] ?? '' }}"
                                        required maxlength="30">
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <strong class="form-label">Dirección</strong>
                                    <input type="text" id="direccion" name="direccion" class="form-control"
                                        placeholder="Dirección" value="{{ $informacionPersonal['direccion'] ?? '' }}"
                                        required maxlength="150">
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <strong class="form-label">Especialidad</strong>
                                    <input type="text" id="especialidad" name="especialidad" class="form-control"
                                        placeholder="Especialidad"
                                        value="{{ $informacionPersonal['especialidad'] ?? '' }}" required
                                        maxlength="150">
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="mb-3">
                                    <strong class="form-label">Descripción</strong>
                                    <textarea id="descripcion" name="descripcion" class="form-control" rows="3"
                                        placeholder="Breve descripción profesional" maxlength="1000">{{ $informacionPersonal['descripcion'] ?? '' }}</textarea>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn"
                        style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        onclick="cerrarModalEditarInformacionPersonal()">
                        <i class="fa-solid fa-xmark"></i> Cancelar
                    </button>
                    <button type="submit" form="formEditarInformacionPersonal" id="btnEditarInformacionPersonal"
                        class="btn btn-primary">
                        <i class="fa-solid fa-floppy-disk"></i> Guardar cambios
                    </button>
                </div>
            </div>
        </div>
    </div>
@endif

@push('scripts')
    <script>
        /* ── Configuración de rutas (inyectadas por PerfilService) ─── */
        const URL_PERFIL_UPDATE = @json($rutas['actualizar']);
        const URL_PERFIL_VALIDAR_DATOS = @json($rutas['validar_datos']);
        const URL_PERFIL_INFORMACION_PERSONAL = @json($rutas['informacion_personal'] ?? null);
        const URL_PERFIL_CONTRASENA = @json($rutas['contrasena']);
        const CSRF_TOKEN = document.querySelector('meta[name="csrf-token"]')?.content ?? '';

        /** Estado en memoria de los datos del perfil (se actualiza tras cada guardado exitoso). */
        const PERFIL_INICIAL = {
            id: {{ $usuario->id }},
            nombre: @json($usuario->nombre),
            apellido: @json($usuario->apellido),
            email: @json($usuario->email),
            telefono: @json($informacionPersonal['telefono'] ?? ''),
            direccion: @json($informacionPersonal['direccion'] ?? ''),
            especialidad: @json($informacionPersonal['especialidad'] ?? ''),
            descripcion: @json($informacionPersonal['descripcion'] ?? ''),
        };

        const modalBSEditarPerfil = new bootstrap.Modal(document.getElementById('modalBSEditarPerfil'));
        const modalEditarInformacionPersonal = document.getElementById('modalEditarInformacionPersonal') ?
            new bootstrap.Modal(document.getElementById('modalEditarInformacionPersonal')) :
            null;

        /** Abre el modal de cuenta y restaura los valores actuales. */
        function abrirModalEditarPerfil() {
            $('#email').val(PERFIL_INICIAL.email);
            $('#nombre').val(PERFIL_INICIAL.nombre);
            $('#apellido').val(PERFIL_INICIAL.apellido);
            $('#emailOriginalPerfil').val(PERFIL_INICIAL.email);
            $('#password_actual').val('');
            toggleSeccionPasswordActual();
            limpiarErroresModal('formBSEditarPerfil');
            resetValidacionEmail();
            modalBSEditarPerfil.show();
        }

        /** Abre el modal de información personal del docente. */
        function abrirModalEditarInformacionPersonal() {
            if (!modalEditarInformacionPersonal) return;
            $('#telefono').val(PERFIL_INICIAL.telefono);
            $('#direccion').val(PERFIL_INICIAL.direccion);
            $('#especialidad').val(PERFIL_INICIAL.especialidad);
            $('#descripcion').val(PERFIL_INICIAL.descripcion);
            limpiarErroresModal('formEditarInformacionPersonal');
            modalEditarInformacionPersonal.show();
        }

        function cerrarModalEditarInformacionPersonal() {
            limpiarErroresModal('formEditarInformacionPersonal');
            modalEditarInformacionPersonal?.hide();
        }

        function cerrarModalBSEditarPerfil() {
            limpiarErroresModal('formBSEditarPerfil');
            resetValidacionEmail();
            modalBSEditarPerfil.hide();
        }

        function setBtnEditarInformacionPersonal(modo) {
            const btn = document.getElementById('btnEditarInformacionPersonal');
            if (!btn) return;
            btn.disabled = modo === 'guardando';
            btn.innerHTML = modo === 'guardando' ?
                '<i class="fa-solid fa-spinner fa-spin"></i> Guardando cambios…' :
                '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';
        }

        function setBtnBSEditarPerfil(modo) {
            const btn = document.getElementById('btnBSEditarPerfil');
            btn.disabled = modo === 'guardando';
            btn.innerHTML = modo === 'guardando' ?
                '<i class="fa-solid fa-spinner fa-spin"></i> Guardando cambios…' :
                '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';
        }

        function limpiarErroresModal(form) {
            document.querySelectorAll(`#${form} .campo-error`).forEach(el => el.remove());
            document.querySelectorAll(`#${form} .is-invalid`).forEach(el => el.classList.remove('is-invalid'));
        }

        function mostrarErroresModal(errors, form) {
            limpiarErroresModal(form);
            $.each(errors, function(campo, mensajes) {
                const $input = $(`#${form} [name="${campo}"]`);
                if (!$input.length) return;
                $input.addClass('is-invalid');
                const mensaje = Array.isArray(mensajes) ? mensajes[0] : mensajes;
                $('<div>', {
                    class: 'campo-error',
                    text: mensaje
                }).insertAfter($input);
            });
            $(`#${form} .is-invalid`).first().focus();
        }

        function emailCambioPendiente() {
            return $('#email').val().trim().toLowerCase() !== $('#emailOriginalPerfil').val().trim().toLowerCase();
        }

        function toggleSeccionPasswordActual() {
            const cambio = emailCambioPendiente();
            $('#seccionPasswordActual').toggleClass('d-none', !cambio);
            if (!cambio) $('#password_actual').val('');
        }

        function resetValidacionEmail() {
            $('#email').removeClass('is-invalid is-valid');
            $('#mensajeEmail').text('').hide();
        }

        function validarCampo(input, mensaje, existe, texto) {
            $(input)
                .toggleClass('is-invalid', existe)
                .toggleClass('is-valid', !existe && $(input).val().trim().length > 0);
            $(mensaje).text(existe ? texto : '').toggle(existe);
        }

        /** Actualiza nombre, email e iniciales tras editar la cuenta. */
        function actualizarDatosCuenta(usuario) {
            const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`.trim();
            const iniciales = usuario.iniciales ?? '';

            document.getElementById('perfilNombreCompleto')?.replaceChildren(document.createTextNode(nombreCompleto));
            document.getElementById('perfilEmail')?.replaceChildren(document.createTextNode(usuario.email));

            const avatar = document.getElementById('perfilAvatarIniciales');
            if (avatar) {
                const status = avatar.querySelector('.profile-status');
                avatar.textContent = iniciales;
                if (status) avatar.appendChild(status);
            }

            document.querySelector('.header-user-nombre')?.replaceChildren(document.createTextNode(usuario.nombre));
            document.querySelector('.dropdown-nombre')?.replaceChildren(document.createTextNode(usuario.nombre));
            document.querySelector('.dropdown-email')?.replaceChildren(document.createTextNode(usuario.email));
            document.querySelectorAll('.avatar, .dropdown-avatar').forEach(el => {
                el.textContent = iniciales;
            });

            PERFIL_INICIAL.nombre = usuario.nombre;
            PERFIL_INICIAL.apellido = usuario.apellido;
            PERFIL_INICIAL.email = usuario.email;
            $('#emailOriginalPerfil').val(usuario.email);
        }

        /** Actualiza teléfono, dirección, especialidad y descripción en pantalla sin recargar. */
        function actualizarInformacionPersonalUI(informacion) {
            const campos = {
                perfilTelefono: informacion.telefono || '—',
                perfilDireccion: informacion.direccion || '—',
                perfilEspecialidad: informacion.especialidad || '—',
                perfilTelefonoHeader: informacion.telefono || '—',
                perfilEspecialidadHeader: informacion.especialidad || '—',
            };

            Object.entries(campos).forEach(([id, valor]) => {
                document.getElementById(id)?.replaceChildren(document.createTextNode(valor));
            });

            const descripcion = informacion.descripcion?.trim() || 'Sin descripción registrada.';
            document.getElementById('perfilDescripcion')?.replaceChildren(document.createTextNode(descripcion));

            PERFIL_INICIAL.telefono = informacion.telefono ?? '';
            PERFIL_INICIAL.direccion = informacion.direccion ?? '';
            PERFIL_INICIAL.especialidad = informacion.especialidad ?? '';
            PERFIL_INICIAL.descripcion = informacion.descripcion ?? '';
        }

        /** Envía información personal del docente a panel/perfil/informacion-personal. */
        function enviarFormularioEditarInformacionPersonal(form) {
            if (!URL_PERFIL_INFORMACION_PERSONAL) return;

            setBtnEditarInformacionPersonal('guardando');

            $.ajax({
                url: URL_PERFIL_INFORMACION_PERSONAL,
                type: 'POST',
                data: new FormData(form),
                processData: false,
                contentType: false,
                dataType: 'json',
                headers: {
                    'X-CSRF-TOKEN': CSRF_TOKEN,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                success: function(res) {
                    if (!res.success) {
                        mostrarToast('error', res.message);
                        return;
                    }
                    actualizarInformacionPersonalUI(res.informacion);
                    cerrarModalEditarInformacionPersonal();
                    mostrarToast('success', res.message);
                },
                error: function(xhr) {
                    if (xhr.status === 422) {
                        const errores = xhr.responseJSON?.errors ?? {};
                        if (Object.keys(errores).length) {
                            mostrarErroresModal(errores, 'formEditarInformacionPersonal');
                        }
                    }
                    mostrarToast('error', xhr.responseJSON?.message ?? 'Error al guardar los cambios');
                },
                complete: function() {
                    setBtnEditarInformacionPersonal('editar');
                },
            });
        }

        /** Envía datos de cuenta (nombre, apellido, email) al endpoint de perfil. */
        function enviarFormularioPerfil(form) {
            if ($('#email').hasClass('is-invalid')) {
                mostrarToast('error', 'El correo electrónico ya está registrado.');
                return;
            }

            if (emailCambioPendiente() && !$('#password_actual').val().trim()) {
                mostrarErroresModal({
                    password_actual: ['Debes confirmar tu contraseña actual para cambiar el correo.']
                }, 'formBSEditarPerfil');
                return;
            }

            setBtnBSEditarPerfil('guardando');

            const formData = new FormData(form);
            if (!emailCambioPendiente()) {
                formData.delete('password_actual');
            }

            $.ajax({
                url: URL_PERFIL_UPDATE,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'json',
                headers: {
                    'X-CSRF-TOKEN': CSRF_TOKEN,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                success: function(res) {
                    if (!res.success) {
                        mostrarToast('error', res.message);
                        return;
                    }
                    actualizarDatosCuenta(res.usuario);
                    cerrarModalBSEditarPerfil();
                    mostrarToast('success', res.message);
                },
                error: function(xhr) {
                    if (xhr.status === 422) {
                        const errores = xhr.responseJSON?.errors ?? {};
                        if (Object.keys(errores).length) {
                            mostrarErroresModal(errores, 'formBSEditarPerfil');
                        }
                    }
                    mostrarToast('error', xhr.responseJSON?.message ?? 'Error al guardar los cambios');
                },
                complete: function() {
                    setBtnBSEditarPerfil('editar');
                },
            });
        }

        $(document).ready(function() {
            let timerValidacion;

            $('#email').on('input', function() {
                toggleSeccionPasswordActual();
                clearTimeout(timerValidacion);

                const email = $(this).val().trim();
                if (email.toLowerCase() === PERFIL_INICIAL.email.toLowerCase()) {
                    resetValidacionEmail();
                    return;
                }

                timerValidacion = setTimeout(function() {
                    if (email.length < 5) return;
                    $.ajax({
                        url: URL_PERFIL_VALIDAR_DATOS,
                        type: 'GET',
                        data: {
                            email,
                            usuario_id: PERFIL_INICIAL.id
                        },
                        success: function(response) {
                            validarCampo('#email', '#mensajeEmail', response
                                .email_existe,
                                'El correo electrónico ya está registrado.');
                        },
                    });
                }, 500);
            });

            $('#formBSEditarPerfil').on('submit', function(e) {
                e.preventDefault();
                enviarFormularioPerfil(this);
            });

            $('#formEditarInformacionPersonal').on('submit', function(e) {
                e.preventDefault();
                enviarFormularioEditarInformacionPersonal(this);
            });
        });
    </script>
@endpush
