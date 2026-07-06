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
                <div class="modal-header-icon"><i class="fa-solid fa-pen"></i></div>
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
                    <input type="hidden" id="emailOriginal" value="{{ $usuario->email }}">
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
                                        placeholder="Nombre" value="{{ $usuario->nombre }}" required>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <strong class="form-label">Apellido(s)</strong>
                                    <input type="text" id="apellido" name="apellido" class="form-control"
                                        placeholder="Apellidos" value="{{ $usuario->apellido }}" required>
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

@push('scripts')
    <script>
        /* ── Configuración ─────────────────────────────────────────── */
        const URL_USUARIOS = @json(route('admin.usuarios'));
        const URL_PERFIL_UPDATE = @json(route('admin.usuarios.perfil.update', $usuario->id));
        const CSRF_TOKEN = document.querySelector('meta[name="csrf-token"]')?.content ?? '';
        const PERFIL_INICIAL = {
            id: {{ $usuario->id }},
            nombre: @json($usuario->nombre),
            apellido: @json($usuario->apellido),
            email: @json($usuario->email),
        };

        const modalBSEditarPerfil = new bootstrap.Modal(document.getElementById('modalBSEditarPerfil'));

        /** Abre el modal y restaura los valores guardados en memoria (PERFIL_INICIAL). */
        function abrirModalEditarPerfil() {
            $('#email').val(PERFIL_INICIAL.email);
            $('#nombre').val(PERFIL_INICIAL.nombre);
            $('#apellido').val(PERFIL_INICIAL.apellido);
            $('#emailOriginal').val(PERFIL_INICIAL.email);
            $('#password_actual').val('');
            toggleSeccionPasswordActual();
            limpiarErroresModal('formBSEditarPerfil');
            resetValidacionEmail();
            modalBSEditarPerfil.show();
        }

        /** Cierra el modal y limpia estados de error/validación. */
        function cerrarModalBSEditarPerfil() {
            limpiarErroresModal('formBSEditarPerfil');
            resetValidacionEmail();
            modalBSEditarPerfil.hide();
        }

        /** Alterna el texto y estado del botón Guardar / Guardando. */
        function setBtnBSEditarPerfil(modo) {
            const btn = document.getElementById('btnBSEditarPerfil');
            btn.disabled = modo === 'guardando';
            btn.innerHTML = modo === 'guardando' ?
                '<i class="fa-solid fa-spinner fa-spin"></i> Guardando cambios…' :
                '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';
        }

        /** Elimina mensajes de error inline y clases is-invalid del formulario. */
        function limpiarErroresModal(form) {
            document.querySelectorAll(`#${form} .campo-error`).forEach(el => el.remove());
            document.querySelectorAll(`#${form} .is-invalid`).forEach(el => el.classList.remove('is-invalid'));
        }

        /** Pinta errores de validación (422) debajo de cada campo. */
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

        /** Indica si el email del formulario difiere del email original del usuario. */
        function emailCambioPendiente() {
            return $('#email').val().trim().toLowerCase() !== $('#emailOriginal').val().trim().toLowerCase();
        }

        /** Muestra u oculta la sección de contraseña según cambio de email. */
        function toggleSeccionPasswordActual() {
            const cambio = emailCambioPendiente();
            $('#seccionPasswordActual').toggleClass('d-none', !cambio);
            if (!cambio) $('#password_actual').val('');
        }

        /** Restablece el estado visual de validación del campo email. */
        function resetValidacionEmail() {
            $('#email').removeClass('is-invalid is-valid');
            $('#mensajeEmail').text('').hide();
        }

        /** Marca un campo como válido/inválido según la respuesta de validar-datos. */
        function validarCampo(input, mensaje, existe, texto) {
            $(input)
                .toggleClass('is-invalid', existe)
                .toggleClass('is-valid', !existe && $(input).val().trim().length > 0);
            $(mensaje).text(existe ? texto : '').toggle(existe);
        }

        /**
         * Actualiza la UI del perfil y el header sin recargar la página.
         * Elementos objetivo: #perfilNombreCompleto, #perfilEmail, #perfilAvatarIniciales y header global.
         */
        function actualizarDatosPerfil(usuario) {
            const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`.trim();
            const iniciales = usuario.iniciales ?? '';

            document.getElementById('perfilNombreCompleto')?.replaceChildren(
                document.createTextNode(nombreCompleto)
            );
            document.getElementById('perfilEmail')?.replaceChildren(
                document.createTextNode(usuario.email)
            );
            const avatar = document.getElementById('perfilAvatarIniciales');
            if (avatar) {
                const status = avatar.querySelector('.profile-status');
                avatar.textContent = iniciales;
                if (status) avatar.appendChild(status);
            }

            document.querySelector('.header-user-nombre')?.replaceChildren(
                document.createTextNode(usuario.nombre)
            );
            document.querySelector('.dropdown-nombre')?.replaceChildren(
                document.createTextNode(usuario.nombre)
            );
            document.querySelector('.dropdown-email')?.replaceChildren(
                document.createTextNode(usuario.email)
            );
            document.querySelectorAll('.avatar, .dropdown-avatar').forEach(el => {
                el.textContent = iniciales;
            });

            PERFIL_INICIAL.nombre = usuario.nombre;
            PERFIL_INICIAL.apellido = usuario.apellido;
            PERFIL_INICIAL.email = usuario.email;
            $('#emailOriginal').val(usuario.email);
        }

        /**
         * Envía el formulario vía AJAX.
         * Usa POST + campo oculto _method=PUT para compatibilidad con FormData.
         */
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
                    actualizarDatosPerfil(res.usuario);
                    cerrarModalBSEditarPerfil();
                    mostrarToast('success', res.message);
                },
                error: function(xhr) {
                    if (xhr.status === 422) {
                        const errores = xhr.responseJSON?.errors ?? {};
                        if (Object.keys(errores).length) {
                            mostrarErroresModal(errores, 'formBSEditarPerfil');
                        }
                        mostrarToast('error', xhr.responseJSON?.message ?? 'Verifique los datos ingresados');
                        return;
                    }
                    mostrarToast('error', xhr.responseJSON?.message ?? 'Error al guardar los cambios');
                },
                complete: function() {
                    setBtnBSEditarPerfil('editar');
                }
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
                        url: `${URL_USUARIOS}/validar-datos`,
                        type: 'GET',
                        data: {
                            email,
                            usuario_id: PERFIL_INICIAL.id
                        },
                        success: function(response) {
                            validarCampo('#email', '#mensajeEmail', response
                                .email_existe,
                                'El correo electrónico ya está registrado.');
                        }
                    });
                }, 500);
            });

            $('#formBSEditarPerfil').on('submit', function(e) {
                e.preventDefault();
                enviarFormularioPerfil(this);
            });
        });
    </script>
@endpush
