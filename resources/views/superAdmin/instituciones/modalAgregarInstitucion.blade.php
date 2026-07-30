{{--
    Modal: Agregar Institución (Super Admin)
    - Tab 1: datos básicos + logo
    - Tab 2: IP/puerto/activo por ambiente (name ambientes[id][...]; el backend espera "activo")
    - Tab 3: módulos (pendiente de implementar)
    Envío vía AJAX (FormData) → superadmin.instituciones.guardar
--}}
<div class="modal fade" id="modalAgregarInstitucion" tabindex="-1" data-bs-keyboard="false"
    aria-labelledby="modalAgregarInstitucionTitle" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fas fa-university text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" style="font-size: 1.4rem;" id="modalAgregarInstitucionTitle">
                        Agregar Institución</h5>
                    <p class="modal-subtitle mb-0">Ingrese los datos de la nueva institución.</p>
                </div>
                <button type="button" class="btn-close" id="btnCloseModalAgregarInstitucion"
                    data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-4">
                <ul class="nav nav-tabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <a class="nav-link active" id="tab-datos-institucion" data-bs-toggle="tab"
                            href="#datosInstitucion" role="tab" aria-controls="datosInstitucion"
                            aria-selected="true">
                            <i class="fas fa-university"></i> Datos de la Institución
                        </a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="tab-servidores" data-bs-toggle="tab" href="#servidores"
                            role="tab" aria-controls="servidores" aria-selected="false">
                            <i class="fas fa-server"></i> Servidores
                        </a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="tab-modulos" data-bs-toggle="tab" href="#modulos"
                            role="tab" aria-controls="modulos" aria-selected="false">
                            <i class="fas fa-cube"></i> Módulos
                        </a>
                    </li>
                </ul>
                <form id="formAgregarInstitucion" enctype="multipart/form-data" method="POST">
                    @csrf
                    <div class="tab-content" style="padding: 20px;">
                        {{-- Tab: datos de la institución --}}
                        <div class="tab-pane container active" id="datosInstitucion" role="tabpanel"
                            aria-labelledby="tab-datos-institucion">
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
                                        <label class="form-label fw-bold" for="codigo_dane">Código DANE</label>
                                        <input type="text" id="codigo_dane" name="codigo_dane" class="form-control"
                                            placeholder="Código DANE de la institución" required>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        <label class="form-label fw-bold" for="municipio">Municipio</label>
                                        <input type="text" id="municipio" name="municipio" class="form-control"
                                            placeholder="Municipio de la institución" required>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        <label class="form-label fw-bold" for="departamento">Departamento</label>
                                        <input type="text" id="departamento" name="departamento" class="form-control"
                                            placeholder="Departamento de la institución" required>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        <label class="form-label fw-bold" for="correo_contacto">Correo de
                                            contacto</label>
                                        <input type="email" id="correo_contacto" name="correo_contacto"
                                            class="form-control" placeholder="Correo de contacto de la institución"
                                            required>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        {{-- name logo_url: el controller guarda en storage y persiste en columna logo --}}
                                        <label class="form-label fw-bold" for="logo_url">Logo</label>
                                        <input type="file" id="logo_url" name="logo_url" class="form-control"
                                            accept="image/*"
                                            onchange="previewImage(event, '#imgPreviewLogo')">
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        <span class="form-label fw-bold d-block" id="lblVistaPreviaLogo">Vista previa
                                            del logo</span>
                                        <img id="imgPreviewLogo" class="w-50 mt-1 d-none" src=""
                                            alt="Vista previa del logo de la institución">
                                    </div>
                                </div>
                            </div>
                        </div>

                        {{--
                            Tab: servidores
                            name debe coincidir con InstitucionSuperAdminController::guardar():
                            - ambientes[id][ip]
                            - ambientes[id][puerto]
                            - ambientes[id][activo]  ← checkbox; sin este name no se sincroniza el ambiente
                        --}}
                        <div class="tab-pane container" id="servidores" role="tabpanel"
                            aria-labelledby="tab-servidores">
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Servidor</th>
                                            <th>IP</th>
                                            <th class="text-center">Puerto</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @forelse($ambientes as $a)
                                            <tr>
                                                <td style="font-weight:bold;color:#1E293B;font-size:1.2rem;">
                                                    {{ $a->nombre }}
                                                </td>
                                                <td>
                                                    <input type="text" class="form-control"
                                                        id="ambiente_ip_{{ $a->id }}"
                                                        name="ambientes[{{ $a->id }}][ip]"
                                                        placeholder="192.168.1.100">
                                                </td>
                                                <td class="text-center">
                                                    <input type="number" class="form-control"
                                                        style="width:90px;margin:auto"
                                                        id="ambiente_puerto_{{ $a->id }}"
                                                        name="ambientes[{{ $a->id }}][puerto]" min="1"
                                                        max="65535" placeholder="8080">
                                                </td>
                                                <td class="text-center">
                                                    <div class="form-check form-switch">
                                                        <input class="form-check-input" type="checkbox"
                                                            id="ambiente_activo_{{ $a->id }}"
                                                            name="ambientes[{{ $a->id }}][activo]"
                                                            value="1" style="cursor: pointer;"
                                                            title="Activar integración con este ambiente">
                                                    </div>
                                                </td>
                                            </tr>
                                        @empty
                                            <tr>
                                                <td colspan="4" class="text-center text-muted py-4">
                                                    Sin ambientes registrados
                                                </td>
                                            </tr>
                                        @endforelse
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {{-- Tab: módulos — UI pendiente --}}
                        <div class="tab-pane container" id="modulos" role="tabpanel"
                            aria-labelledby="tab-modulos">
                            <p class="text-muted mb-0">La asignación de módulos estará disponible próximamente.</p>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times"></i> Cerrar
                </button>
                <button type="button" class="btn btn-primary" onclick="guardarInstitucion()">
                    <i class="fas fa-save"></i> Guardar
                </button>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        /**
         * Modal Agregar Institución — scripts
         * Depende de: Bootstrap 5 Modal, jQuery, mostrarToast(), modalBSPasswordGenerada (ver_contra_gen).
         */
        window.URL_INSTITUCIONES = "{{ route('superadmin.instituciones.guardar') }}";
        const URL_INSTITUCIONES = window.URL_INSTITUCIONES;

        const LOGO_PREVIEW_DEFAULT = '';
        const modalElAgregarInstitucion = document.getElementById('modalAgregarInstitucion');
        const modalBSPasswordGenerada = new bootstrap.Modal(document.getElementById('modalBSPasswordGenerada'));

        /**
         * Obtiene la instancia Bootstrap existente del modal (no crea una nueva).
         * Crear con `new bootstrap.Modal()` al cerrar no garantiza ocultar el modal ya abierto.
         */
        function getModalAgregarInstitucion() {
            return bootstrap.Modal.getOrCreateInstance(modalElAgregarInstitucion);
        }

        /** Abre el modal y deja el formulario limpio para un alta nueva. */
        function abrirModalInstituciones() {
            resetFormAgregarInstitucion();
            getModalAgregarInstitucion().show();
        }

        /** Cierra el modal usando la instancia activa de Bootstrap. */
        function cerrarModalAgregarInstitucion() {
            bootstrap.Modal.getInstance(modalElAgregarInstitucion)?.hide();
        }

        /** Alias por compatibilidad con botones/handlers existentes. */
        function cerrarModalInstituciones() {
            cerrarModalAgregarInstitucion();
        }

        /**
         * Limpia campos, errores, preview de logo y vuelve a la primera pestaña.
         * Se llama al abrir para evitar datos residuales de un intento anterior.
         */
        function resetFormAgregarInstitucion() {
            const form = document.getElementById('formAgregarInstitucion');
            if (!form) return;

            form.reset();
            limpiarErroresModal('formAgregarInstitucion');

            const preview = document.getElementById('imgPreviewLogo');
            if (preview) {
                preview.src = LOGO_PREVIEW_DEFAULT;
                preview.classList.add('d-none');
            }

            const tabDatos = document.querySelector('#tab-datos-institucion');
            if (tabDatos) {
                bootstrap.Tab.getOrCreateInstance(tabDatos).show();
            }
        }

        /**
         * Tras crear la institución, muestra el modal de credenciales del admin generado.
         * Reutiliza #modalBSPasswordGenerada (include de admin.usuarios.ver_contra_gen).
         */
        function abrirModalBSPasswordGenerada() {
            $("#modalBSPasswordGeneradaLabel").text('Información de la Institución');
            $("#modalBSPasswordGeneradaSubtitle").text(
                'La institución se ha creado correctamente. Por favor, anotar la contraseña antes de cerrar.');
            $("#modalBSPasswordGeneradaIcon").html('<i class="fas fa-info-circle text-white"></i>');
            modalBSPasswordGenerada.show();
        }

        function cerrarModalBSPasswordGenerada() {
            modalBSPasswordGenerada.hide();
        }

        /** Quita marcas .is-invalid y mensajes .campo-error del formulario indicado. */
        function limpiarErroresModal(form) {
            document.querySelectorAll(`#${form} .campo-error`).forEach(el => el.remove());
            document.querySelectorAll(`#${form} .is-invalid`).forEach(el => el.classList.remove('is-invalid'));
        }

        /**
         * Convierte claves de error de Laravel (dot notation) al name HTML del input.
         * Ej: ambientes.3.ip → ambientes[3][ip]
         */
        function laravelKeyToInputName(campo) {
            if (!campo.includes('.')) {
                return campo;
            }

            const partes = campo.split('.');
            return partes[0] + partes.slice(1).map(p => `[${p}]`).join('');
        }

        /** Mensajes amigables según regla Laravel / campo de institución. */
        function mensajeValidacionInstitucion(campo, codigo) {
            switch (codigo) {
                case 'validation.unique':
                    if (campo === 'codigo_dane') {
                        return 'Ya existe una institución con este código DANE.';
                    }
                    if (campo === 'correo_contacto') {
                        return 'Ya existe una institución con este correo de contacto.';
                    }
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
                    // Si Laravel ya envió texto legible (locale es), úsalo; si no, genérico.
                    return (codigo && !codigo.startsWith('validation.')) ?
                        codigo :
                        'Revise este campo.';
            }
        }

        /**
         * Pinta errores 422 bajo cada input y enfoca el primero.
         * Si el campo está en otra pestaña (p. ej. IP de servidores), activa esa tab.
         */
        function mostrarErroresModal(errors, form) {
            limpiarErroresModal(form);

            let primerInput = null;

            $.each(errors, function(campo, mensajes) {
                const nameAttr = laravelKeyToInputName(campo);
                // Escapa caracteres especiales de name (corchetes) para el selector jQuery.
                const $input = $(document.getElementById(form)).find(`[name="${nameAttr}"]`);
                if (!$input.length) return;

                $input.addClass('is-invalid');

                const codigo = mensajes[0];
                const mensaje = mensajeValidacionInstitucion(campo, codigo);

                $('<div>', {
                    class: 'campo-error invalid-feedback d-block',
                    text: mensaje
                }).insertAfter($input);

                if (!primerInput) {
                    primerInput = $input.get(0);
                }
            });

            if (!primerInput) return;

            // Activa la pestaña que contiene el primer campo con error.
            const tabPane = primerInput.closest('.tab-pane');
            if (tabPane && !tabPane.classList.contains('active')) {
                const tabTrigger = document.querySelector(`[href="#${tabPane.id}"]`);
                if (tabTrigger) {
                    bootstrap.Tab.getOrCreateInstance(tabTrigger).show();
                }
            }

            primerInput.focus();
        }

        /**
         * Vista previa del logo seleccionado.
         * Local a este partial: en superAdmin no existe previewImage de admin/usuarios.
         */
        function previewImage(event, previewSelector) {
            const input = event.target;
            const preview = document.querySelector(previewSelector);

            if (!preview || !input.files || !input.files.length) {
                return;
            }

            const file = input.files[0];

            if (!file.type.startsWith('image/')) {
                mostrarToast('error', 'Seleccione un archivo de imagen.');
                input.value = '';
                preview.src = LOGO_PREVIEW_DEFAULT;
                preview.classList.add('d-none');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.classList.remove('d-none');
            };
            reader.readAsDataURL(file);
        }

        /**
         * POST FormData al endpoint de guardar.
         * Éxito: cierra este modal y abre el de credenciales del admin generado.
         * 422: errores inline + toast.
         */
        function guardarInstitucion() {
            const form = document.getElementById('formAgregarInstitucion');
            const formData = new FormData(form);

            $.ajax({
                url: URL_INSTITUCIONES,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'json',

                success: function(res) {
                    if (!res.success) {
                        mostrarToast('error', res.message);
                        return;
                    }

                    const credenciales = res.credenciales;

                    document.getElementById('passwordGenerada').value = credenciales.password;
                    document.getElementById('asignar_email').value = credenciales.correo;

                    cerrarModalAgregarInstitucion();
                    abrirModalBSPasswordGenerada();
                },

                error: function(xhr) {
                    if (xhr.status === 422) {
                        mostrarToast('error', 'Verifique los datos ingresados');
                        mostrarErroresModal(xhr.responseJSON.errors ?? {}, 'formAgregarInstitucion');
                        return;
                    }

                    mostrarToast(
                        'error',
                        xhr.responseJSON?.message ?? 'Error al crear la institución.'
                    );
                }
            });
        }
    </script>
@endpush
