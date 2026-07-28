@php
    /** Ruta inyectada por el layout (panel o admin). */
    $rutaContrasena = $rutaContrasena ?? route('panel.perfil.contrasena');
@endphp

{{--
    Modal global de cambio de contraseña.

    Incluir una sola vez desde el layout (panel / admin), no desde perfil.index,
    para que funcione desde el dropdown del header en cualquier vista.
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
        (function() {
            const URL_PERFIL_CONTRASENA = @json($rutaContrasena);
            const CSRF_TOKEN = document.querySelector('meta[name="csrf-token"]')?.content ?? '';

            const modalEl = document.getElementById('modalCambiarContrasena');
            if (!modalEl || window.__modalContrasenaInicializado) return;
            window.__modalContrasenaInicializado = true;

            const modalCambiarContrasena = bootstrap.Modal.getOrCreateInstance(modalEl);

            const FORMULARIOS_CONTRASENA = [{
                    formId: 'formCambiarContrasenaSeguridad',
                    prefix: 'seguridad',
                    btnId: 'btnCambiarContrasenaSeguridad',
                },
                {
                    formId: 'formCambiarContrasenaModal',
                    prefix: 'modal',
                    btnId: 'btnCambiarContrasenaModal',
                },
            ];

            function limpiarErroresContrasena(formId) {
                document.querySelectorAll(`#${formId} .campo-error`).forEach(el => el.remove());
                document.querySelectorAll(`#${formId} .is-invalid`).forEach(el => el.classList.remove('is-invalid'));
            }

            function mostrarErroresContrasena(errors, formId) {
                limpiarErroresContrasena(formId);
                Object.entries(errors).forEach(([campo, mensajes]) => {
                    const input = document.querySelector(`#${formId} [name="${campo}"]`);
                    if (!input) return;
                    input.classList.add('is-invalid');
                    const mensaje = Array.isArray(mensajes) ? mensajes[0] : mensajes;
                    const div = document.createElement('div');
                    div.className = 'campo-error';
                    div.textContent = mensaje;
                    input.insertAdjacentElement('afterend', div);
                });
                document.querySelector(`#${formId} .is-invalid`)?.focus();
            }

            window.abrirModalCambiarContrasena = function() {
                document.getElementById('headerPerfil')?.classList.remove('open');
                resetFormularioContrasena('modal');
                limpiarErroresContrasena('formCambiarContrasenaModal');
                modalCambiarContrasena.show();
            };

            window.cerrarModalCambiarContrasena = function() {
                limpiarErroresContrasena('formCambiarContrasenaModal');
                resetFormularioContrasena('modal');
                modalCambiarContrasena.hide();
            };

            function resetFormularioContrasena(prefix) {
                const config = FORMULARIOS_CONTRASENA.find(f => f.prefix === prefix);
                if (!config) return;

                document.getElementById(config.formId)?.reset();
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

            function actualizarIndicadorLongitud(prefix, valor) {
                const indicador = document.getElementById(`${prefix}_password_requisitos`);
                const texto = document.getElementById(`${prefix}_password_longitud`);
                if (!indicador || !texto) return;

                indicador.classList.remove('valido', 'invalido');
                if (valor.length === 0) {
                    texto.textContent = 'Mínimo 8 caracteres';
                    return;
                }
                if (valor.length >= 8) {
                    indicador.classList.add('valido');
                    texto.textContent = 'Longitud válida (8+ caracteres)';
                } else {
                    indicador.classList.add('invalido');
                    texto.textContent = `Mínimo 8 caracteres (${valor.length}/8)`;
                }
            }

            function toggleCoincidenciaContrasena(prefix, mostrar) {
                const aviso = document.getElementById(`${prefix}_password_coincidencia`);
                const confirmacion = document.getElementById(`${prefix}_password_confirmation`);
                aviso?.classList.toggle('d-none', !mostrar);
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

            function actualizarUltimoCambioContrasenaUI(datos) {
                if (!datos) return;
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
                    mostrarErroresContrasena({
                        password_confirmation: ['Las contraseñas no coinciden'],
                    }, config.formId);
                    return;
                }

                const nueva = document.getElementById(`${prefix}_password`)?.value ?? '';
                if (nueva.length < 8) {
                    mostrarErroresContrasena({
                        password: ['La contraseña debe tener al menos 8 caracteres.'],
                    }, config.formId);
                    return;
                }

                setBtnCambiarContrasena(config.btnId, 'guardando');

                fetch(URL_PERFIL_CONTRASENA, {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': CSRF_TOKEN,
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json',
                    },
                    body: new FormData(form),
                })
                .then(res => res.json().then(data => ({ ok: res.ok, status: res.status, data })))
                .then(({ ok, status, data }) => {
                    if (!ok || !data.success) {
                        if (status === 422 && data.errors) {
                            mostrarErroresContrasena(data.errors, config.formId);
                        }
                        throw new Error(data.message || 'Error al cambiar la contraseña');
                    }
                    actualizarUltimoCambioContrasenaUI(data.ultimo_cambio_contrasena);
                    resetFormularioContrasena(prefix);
                    limpiarErroresContrasena(config.formId);
                    if (prefix === 'modal') {
                        cerrarModalCambiarContrasena();
                    }
                    mostrarToast('success', data.message);
                })
                .catch(err => {
                    mostrarToast('error', err.message || 'Error al cambiar la contraseña');
                })
                .finally(() => setBtnCambiarContrasena(config.btnId, 'editar'));
            }

            FORMULARIOS_CONTRASENA.forEach(config => {
                const form = document.getElementById(config.formId);
                if (!form) return;

                const prefix = config.prefix;
                document.getElementById(`${prefix}_password`)
                    ?.addEventListener('input', e => {
                        actualizarIndicadorLongitud(prefix, e.target.value);
                        validarCoincidenciaEnTiempo(prefix);
                    });
                document.getElementById(`${prefix}_password_confirmation`)
                    ?.addEventListener('input', () => validarCoincidenciaEnTiempo(prefix));

                form.addEventListener('submit', e => {
                    e.preventDefault();
                    enviarCambioContrasena(form, config);
                });
            });

            modalEl.addEventListener('show.bs.modal', () => {
                resetFormularioContrasena('modal');
                limpiarErroresContrasena('formCambiarContrasenaModal');
            });
        })();
    </script>
@endpush
