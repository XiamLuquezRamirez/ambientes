{{--
    Modal: Cambiar contraseña (desde el botón del encabezado de perfil).

    Reutiliza los mismos campos y lógica JS que el formulario de la pestaña Seguridad.
    La sesión permanece activa tras un cambio exitoso.
--}}
<div class="modal fade modal-app" id="modalCambiarContrasena" tabindex="-1" data-bs-backdrop="static"
    aria-labelledby="modalCambiarContrasenaLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i class="fa-solid fa-lock text-white"></i></div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalCambiarContrasenaLabel">Cambiar contraseña</h5>
                    <p class="modal-subtitle mb-0">Actualiza tu contraseña de acceso</p>
                </div>
                <button type="button" class="btn-close" onclick="cerrarModalCambiarContrasena()"
                    data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>

            <div class="modal-body p-4">
                <form id="formCambiarContrasenaModal" method="POST" novalidate>
                    @csrf
                    <input type="hidden" name="_method" value="PUT">
                    @include('perfil.partials._campos_cambiar_contrasena', [
                        'formId' => 'formCambiarContrasenaModal',
                        'prefix' => 'modal',
                        'columnClass' => 'col-12',
                    ])
                </form>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    onclick="cerrarModalCambiarContrasena()">
                    <i class="fa-solid fa-xmark"></i> Cancelar
                </button>
                <button type="submit" form="formCambiarContrasenaModal" id="btnCambiarContrasenaModal"
                    class="btn btn-primary">
                    <i class="fa-solid fa-key"></i> Actualizar contraseña
                </button>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        const modalCambiarContrasenaEl = document.getElementById('modalCambiarContrasena');
        const modalCambiarContrasena = modalCambiarContrasenaEl ?
            new bootstrap.Modal(modalCambiarContrasenaEl) :
            null;

        const FORMULARIOS_CONTRASENA = [{
                formId: 'formCambiarContrasenaSeguridad',
                prefix: 'seguridad',
                btnId: 'btnCambiarContrasenaSeguridad'
            },
            {
                formId: 'formCambiarContrasenaModal',
                prefix: 'modal',
                btnId: 'btnCambiarContrasenaModal'
            },
        ];

        /** Abre el modal de cambio de contraseña y limpia el formulario. */
        function abrirModalCambiarContrasena() {
            if (!modalCambiarContrasena) return;
            resetFormularioContrasena('modal');
            limpiarErroresModal('formCambiarContrasenaModal');
            modalCambiarContrasena.show();
        }

        function cerrarModalCambiarContrasena() {
            limpiarErroresModal('formCambiarContrasenaModal');
            resetFormularioContrasena('modal');
            modalCambiarContrasena?.hide();
        }

        function resetFormularioContrasena(prefix) {
            const config = FORMULARIOS_CONTRASENA.find(f => f.prefix === prefix);
            if (!config) return;

            const form = document.getElementById(config.formId);
            form?.reset();
            actualizarIndicadorLongitud(prefix, '');
            toggleCoincidenciaContrasena(prefix, false);
            setBtnCambiarContrasena(config.btnId, 'editar');
        }

        function setBtnCambiarContrasena(btnId, modo) {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            btn.disabled = modo === 'guardando';
            btn.innerHTML = modo === 'guardando' ?
                '<i class="fa-solid fa-spinner fa-spin"></i> Actualizando…' :
                '<i class="fa-solid fa-key"></i> Actualizar contraseña';
        }

        /** Indica en tiempo real si la nueva contraseña cumple el mínimo de 8 caracteres. */
        function actualizarIndicadorLongitud(prefix, valor) {
            const indicador = document.getElementById(`${prefix}_password_requisitos`);
            const texto = document.getElementById(`${prefix}_password_longitud`);
            if (!indicador || !texto) return;

            const longitud = valor.length;
            indicador.classList.remove('valido', 'invalido');

            if (longitud === 0) {
                texto.textContent = 'Mínimo 8 caracteres';
                return;
            }

            if (longitud >= 8) {
                indicador.classList.add('valido');
                texto.textContent = 'Longitud válida (8+ caracteres)';
            } else {
                indicador.classList.add('invalido');
                texto.textContent = `Mínimo 8 caracteres (${longitud}/8)`;
            }
        }

        function toggleCoincidenciaContrasena(prefix, mostrar) {
            const aviso = document.getElementById(`${prefix}_password_coincidencia`);
            const confirmacion = document.getElementById(`${prefix}_password_confirmation`);
            if (!aviso) return;

            aviso.classList.toggle('d-none', !mostrar);
            confirmacion?.classList.toggle('is-invalid', mostrar);
        }

        function contrasenasCoinciden(prefix) {
            const nueva = document.getElementById(`${prefix}_password`)?.value ?? '';
            const confirmacion = document.getElementById(`${prefix}_password_confirmation`)?.value ?? '';
            return nueva === confirmacion;
        }

        function validarCoincidenciaEnTiempo(prefix) {
            const confirmacion = document.getElementById(`${prefix}_password_confirmation`)?.value ?? '';
            if (!confirmacion.length) {
                toggleCoincidenciaContrasena(prefix, false);
                return true;
            }
            const coinciden = contrasenasCoinciden(prefix);
            toggleCoincidenciaContrasena(prefix, !coinciden);
            return coinciden;
        }

        /** Actualiza la fecha del último cambio de contraseña en la pestaña Seguridad. */
        function actualizarUltimoCambioContrasenaUI(datos) {
            document.getElementById('perfilUltimoCambioContrasena')
                ?.replaceChildren(document.createTextNode(datos.fecha));
            const relativo = document.getElementById('perfilUltimoCambioContrasenaRelativo');
            if (relativo) {
                relativo.textContent = datos.fecha_relativa ?? '';
                relativo.classList.toggle('d-none', !datos.fecha_relativa);
            }
        }

        function enviarCambioContrasena(form, config) {
            const prefix = config.prefix;

            if (!validarCoincidenciaEnTiempo(prefix) || !contrasenasCoinciden(prefix)) {
                mostrarErroresModal({
                    password_confirmation: ['Las contraseñas no coinciden'],
                }, config.formId);
                return;
            }

            const nueva = document.getElementById(`${prefix}_password`)?.value ?? '';
            if (nueva.length < 8) {
                mostrarErroresModal({
                    password: ['La contraseña debe tener al menos 8 caracteres.'],
                }, config.formId);
                return;
            }

            setBtnCambiarContrasena(config.btnId, 'guardando');

            $.ajax({
                url: URL_PERFIL_CONTRASENA,
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
                    actualizarUltimoCambioContrasenaUI(res.ultimo_cambio_contrasena);
                    resetFormularioContrasena(prefix);
                    limpiarErroresModal(config.formId);
                    if (prefix === 'modal') {
                        cerrarModalCambiarContrasena();
                    }
                    mostrarToast('success', res.message);
                },
                error: function(xhr) {
                    if (xhr.status === 422) {
                        const errores = xhr.responseJSON?.errors ?? {};
                        if (Object.keys(errores).length) {
                            mostrarErroresModal(errores, config.formId);
                        }
                    }
                    mostrarToast('error', xhr.responseJSON?.message ?? 'Error al cambiar la contraseña');
                },
                complete: function() {
                    setBtnCambiarContrasena(config.btnId, 'editar');
                },
            });
        }

        $(document).ready(function() {
            FORMULARIOS_CONTRASENA.forEach(function(config) {
                const prefix = config.prefix;

                $(`#${prefix}_password`).on('input', function() {
                    actualizarIndicadorLongitud(prefix, $(this).val());
                    validarCoincidenciaEnTiempo(prefix);
                });

                $(`#${prefix}_password_confirmation`).on('input', function() {
                    validarCoincidenciaEnTiempo(prefix);
                });

                $(`#${config.formId}`).on('submit', function(e) {
                    e.preventDefault();
                    enviarCambioContrasena(this, config);
                });
            });
        });
    </script>
@endpush
