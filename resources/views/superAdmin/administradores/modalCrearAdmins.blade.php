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
                <form id="formCrearAdministrador" method="POST" enctype="multipart/form-data">
                    @csrf
                    <div class="row">
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="nombre">Nombre</label>
                                <input type="text" id="nombre" name="nombre" class="form-control"
                                    placeholder="Nombre de la institución" required>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="nombre">Email</label>
                                <input type="email" id="email" name="email" class="form-control"
                                    placeholder="Email del administrador" required>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="nombre">Institución</label>
                                <select id="institucion" name="institucion" class="form-select" required
                                    style="cursor:pointer;">
                                    <option>Selecciona una institución</option>
                                    @foreach ($instituciones as $institucion)
                                        <option value="{{ $institucion->id }}">{{ $institucion->nombre }}</option>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    onclick="cerrarModalCrearAdministrador()">
                    <i class="fa-solid fa-xmark"></i> Cancelar</button>
                <button type="submit" form="formCrearAdministrador" id="btnCrearAdministrador" class="btn btn-primary">
                    <i class="fa-solid fa-floppy-disk"></i> Crear Administrador</button>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        const URL_ADMINISTRADORES_BASE = @json(url('superadmin/administradores'));
        const URL_ADMINISTRADORES_GUARDAR = @json(route('superadmin.administradores.guardar'));

        /** 1 = crear, 2 = editar */
        var tipoPost = 1;
        var id_editar = '';

        const modalCrearAdministrador = document.getElementById('modalCrearAdministrador');
        const modalBSPasswordGeneradaEl = document.getElementById('modalBSPasswordGenerada');
        const modalBSPasswordGenerada = modalBSPasswordGeneradaEl ?
            new bootstrap.Modal(modalBSPasswordGeneradaEl) :
            null;

        function getModalCrearAdministrador() {
            return bootstrap.Modal.getOrCreateInstance(modalCrearAdministrador);
        }

        function cerrarModalCrearAdministrador() {
            bootstrap.Modal.getInstance(modalCrearAdministrador)?.hide();
        }


        function setBtnCrearAdministrador(modo) {
            const btn = document.getElementById('btnCrearAdministrador');
            if (!btn) return;
            btn.disabled = false;
            if (modo === 'creando') {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando…';
            } else if (modo === 'guardando') {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';
            } else if (modo === 'crear') {
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Crear Administrador';
            } else {
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';
            }
        }

        function abrirModalCrearAdministrador() {
            tipoPost = 1;
            id_editar = '';
            $('#modalCrearAdministradorLabel').text('Crear Administrador');
            $('#modalCrearAdministradorSubtitle').text('Completa los datos para crear el administrador');
            $('#modalCrearAdministradorIcon').html('<i class="fas fa-user-plus text-white"></i>');
            setBtnCrearAdministrador('crear');
            resetFormCrearAdministrador();
            getModalCrearAdministrador().show();
        }

        function resetFormCrearAdministrador() {
            const form = document.getElementById('formCrearAdministrador');
            if (!form) return;

            form.reset();
            limpiarErroresModal('formCrearAdministrador');
        }

        function abrirModalBSPasswordGenerada() {
            if (!modalBSPasswordGenerada) return;
            $("#modalBSPasswordGeneradaLabel").text('Información de la Institución');
            $("#modalBSPasswordGeneradaSubtitle").text(
                'La institución se ha creado correctamente. Por favor, anotar la contraseña antes de cerrar.');
            modalBSPasswordGenerada.show();
        }

        function cerrarModalBSPasswordGenerada() {
            modalBSPasswordGenerada?.hide();
            window.location.reload();
        }

        function limpiarErroresModal(form) {
            document.querySelectorAll(`#${form} .campo-error`).forEach(el => el.remove());
            document.querySelectorAll(`#${form} .is-invalid`).forEach(el => el.classList.remove('is-invalid'));
        }

        function laravelKeyToInputName(campo) {
            if (!campo.includes('.')) return campo;
            const partes = campo.split('.');
            return partes[0] + partes.slice(1).map(p => `[${p}]`).join('');
        }

        function mensajeValidacionInstitucion(campo, codigo) {
            switch (codigo) {
                case 'validation.unique':
                    if (campo === 'codigo_dane') return 'Ya existe una institución con este código DANE.';
                    if (campo === 'correo_contacto') return 'Ya existe una institución con este correo de contacto.';
                    return 'Este valor ya está registrado.';
                case 'validation.email':
                    return 'El correo electrónico no es válido.';
                case 'validation.integer':
                case 'validation.numeric':
                    return 'El valor debe ser un número.';
                case 'validation.string':
                    return 'El valor debe ser una cadena de texto.';
                case 'validation.required':
                    return 'Este campo es requerido.';
                default:
                    return (codigo && !String(codigo).startsWith('validation.')) ?
                        codigo :
                        'Revise este campo.';
            }
        }

        function mostrarErroresModal(errors, form) {
            limpiarErroresModal(form);
            if (!errors) return;

            let primerInput = null;

            $.each(errors, function(campo, mensajes) {
                const nameAttr = laravelKeyToInputName(campo);
                const $input = $(document.getElementById(form)).find(`[name="${nameAttr}"]`);
                if (!$input.length) return;

                $input.addClass('is-invalid');
                $('<div>', {
                    class: 'campo-error invalid-feedback d-block',
                    text: mensajeValidacionInstitucion(campo, mensajes[0])
                }).insertAfter($input);

                if (!primerInput) primerInput = $input.get(0);
            });

            if (!primerInput) return;

            const tabPane = primerInput.closest('.tab-pane');
            if (tabPane && !tabPane.classList.contains('active')) {
                const tabTrigger = document.querySelector(`[href="#${tabPane.id}"]`);
                if (tabTrigger) bootstrap.Tab.getOrCreateInstance(tabTrigger).show();
            }
            primerInput.focus();
        }
    </script>
@endpush
