{{--
    Modal: Agregar / Editar Institución (Super Admin)
    - Tab 1: datos básicos + avatar de logo (abre modalLogoInstitucion)
    - Tab 2: IP/puerto/activo por ambiente (name ambientes[id][...]; backend espera "activo")
    - Tab 3: condiciones + condiciones transitorias (condiciones_orden / condiciones_transitorias_orden)
    - Tab 4: módulos (pendiente)

    Crear  → POST  superadmin/instituciones
    Editar → POST  superadmin/instituciones/{id} + _method=PUT  (FormData + multipart)
    Logo   → gestionado en modalLogoInstitucion (independiente al guardar datos)
--}}
@php
    $condiciones = $condiciones ?? collect();
    $condicionesTransitorias = $condicionesTransitorias ?? collect();
@endphp
@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/instituciones/index.css') }}">
@endpush
<div class="modal fade" id="modalAgregarInstitucion" tabindex="-1" data-bs-keyboard="false"
    aria-labelledby="modalAgregarInstitucionLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i id="modalAgregarInstitucionIcon" class="fas fa-university text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" style="font-size: 1.4rem;" id="modalAgregarInstitucionLabel">
                        Agregar Institución</h5>
                    <p class="modal-subtitle mb-0" id="modalAgregarInstitucionSubtitle">
                        Ingrese los datos de la nueva institución.</p>
                </div>
                <button type="button" class="btn-close" id="btnCloseModalAgregarInstitucion" data-bs-dismiss="modal"
                    aria-label="Cerrar"></button>
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
                        <a class="nav-link" id="tab-servidores" data-bs-toggle="tab" href="#servidores" role="tab"
                            aria-controls="servidores" aria-selected="false">
                            <i class="fas fa-server"></i> Servidores
                        </a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="tab-condiciones" data-bs-toggle="tab" href="#condicionesInstitucion"
                            role="tab" aria-controls="condicionesInstitucion" aria-selected="false">
                            <i class="fas fa-layer-group"></i> Condiciones
                        </a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="tab-modulos" data-bs-toggle="tab" href="#modulos" role="tab"
                            aria-controls="modulos" aria-selected="false">
                            <i class="fas fa-cube"></i> Módulos
                        </a>
                    </li>
                </ul>
                <form id="formAgregarInstitucion" enctype="multipart/form-data" method="POST">
                    @csrf
                    <div class="tab-content" style="padding: 20px;">
                        <div class="tab-pane container active" id="datosInstitucion" role="tabpanel"
                            aria-labelledby="tab-datos-institucion">
                            <div class="row">
                                {{-- Avatar: misma UX que foto de perfil (overlay → modal de logo) --}}
                                <div class="col-md-12 d-flex justify-content-center align-items-center">
                                    <div class="mb-3">
                                        <div class="avatar-wrapper mx-auto">
                                            <div class="profile-avatar" id="logoPerfilPrincipal"
                                                onclick="cambiarLogoPerfil()" title="Cambiar logo"
                                                style="cursor:pointer;">
                                                <img src="" id="logoPerfilImagen"
                                                    class="profile-avatar-img d-none" alt="Logo institución">
                                                <span id="logoPerfilIniciales" class="profile-avatar-iniciales">
                                                    IE
                                                </span>
                                                <div class="avatar-overlay">
                                                    <i class="fa-solid fa-camera"></i>
                                                    <span>Cambiar logo</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p class="text-muted text-center small mt-2 mb-0">
                                            JPG o PNG · máx. 2 MB · <span class="text-danger">obligatorio</span>
                                        </p>
                                    </div>
                                </div>
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
                                        <input type="text" id="departamento" name="departamento"
                                            class="form-control" placeholder="Departamento de la institución"
                                            required>
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
                            </div>
                        </div>

                        {{--
                            Tab servidores — names alineados con InstitucionSuperAdminController:
                            ambientes[id][ip|puerto|activo]
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
                                            <th class="text-center">Activo</th>
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
                                                        placeholder="192.168.1.100" autocomplete="off">
                                                </td>
                                                <td class="text-center">
                                                    <input type="number" class="form-control"
                                                        style="width:90px;margin:auto"
                                                        id="ambiente_puerto_{{ $a->id }}"
                                                        name="ambientes[{{ $a->id }}][puerto]" min="1"
                                                        max="65535" placeholder="8080">
                                                </td>
                                                <td class="text-center">
                                                    <div
                                                        class="form-check form-switch d-inline-flex justify-content-center">
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

                        {{-- Tab: condiciones globales y transitorias --}}
                        <div class="tab-pane container" id="condicionesInstitucion" role="tabpanel"
                            aria-labelledby="tab-condiciones">
                            <p class="text-muted mb-3" style="font-size:.9rem">
                                Seleccione las condiciones disponibles para la institución.
                                Por defecto todas quedan activas.
                            </p>

                            <div class="card card-condiciones-orden">
                                <div class="card-header" data-bs-toggle="collapse"
                                    data-bs-target="#collapseCondicionesOrden" aria-expanded="true"
                                    aria-controls="collapseCondicionesOrden">
                                    <h6>
                                        <i class="fa-solid fa-layer-group me-2"></i>
                                        Condiciones
                                        <span class="badge badge-blue ms-1">{{ $condiciones->count() }}</span>
                                    </h6>
                                    <i class="fa-solid fa-chevron-down chevron"></i>
                                </div>
                                <div id="collapseCondicionesOrden" class="collapse show">
                                    <div class="lista-condiciones-orden">
                                        @forelse ($condiciones as $condicion)
                                            @php $color = $condicion->color_hex ?: '#64748B'; @endphp
                                            <div class="item-condicion-orden">
                                                <input type="hidden"
                                                    name="condiciones_orden[{{ $condicion->id }}][orden]"
                                                    value="{{ $loop->index }}">
                                                <input class="form-check-input chk-condicion-orden" type="checkbox"
                                                    id="condicion_orden_{{ $condicion->id }}"
                                                    name="condiciones_orden[{{ $condicion->id }}][activa]"
                                                    value="1" checked
                                                    data-id="{{ $condicion->id }}">
                                                <label for="condicion_orden_{{ $condicion->id }}">
                                                    <span class="badge"
                                                        style="background:{{ $color }}22;color:{{ $color }};border:1px solid {{ $color }}55">
                                                        {{ $condicion->codigo }}
                                                    </span>
                                                    {{ $condicion->nombre }}
                                                </label>
                                            </div>
                                        @empty
                                            <p class="text-muted text-center py-3 mb-0">Sin condiciones registradas</p>
                                        @endforelse
                                    </div>
                                </div>
                            </div>

                            <div class="card card-condiciones-orden">
                                <div class="card-header" data-bs-toggle="collapse"
                                    data-bs-target="#collapseCondicionesTransitoriasOrden" aria-expanded="true"
                                    aria-controls="collapseCondicionesTransitoriasOrden">
                                    <h6>
                                        <i class="fa-solid fa-list-check me-2"></i>
                                        Condiciones transitorias
                                        <span class="badge badge-blue ms-1">{{ $condicionesTransitorias->count() }}</span>
                                    </h6>
                                    <i class="fa-solid fa-chevron-down chevron"></i>
                                </div>
                                <div id="collapseCondicionesTransitoriasOrden" class="collapse show">
                                    <div class="lista-condiciones-orden">
                                        @forelse ($condicionesTransitorias as $transitoria)
                                            @php
                                                $colorT = $transitoria->condicionBase?->color_hex ?: '#64748B';
                                            @endphp
                                            <div class="item-condicion-orden">
                                                <input type="hidden"
                                                    name="condiciones_transitorias_orden[{{ $transitoria->id }}][orden]"
                                                    value="{{ $loop->index }}">
                                                <input class="form-check-input chk-condicion-transitoria-orden"
                                                    type="checkbox"
                                                    id="condicion_transitoria_orden_{{ $transitoria->id }}"
                                                    name="condiciones_transitorias_orden[{{ $transitoria->id }}][activa]"
                                                    value="1" checked
                                                    data-id="{{ $transitoria->id }}">
                                                <label for="condicion_transitoria_orden_{{ $transitoria->id }}">
                                                    <span class="badge"
                                                        style="background:{{ $colorT }}22;color:{{ $colorT }};border:1px solid {{ $colorT }}55">
                                                        {{ $transitoria->codigo }}
                                                    </span>
                                                    {{ $transitoria->etiqueta }}
                                                </label>
                                            </div>
                                        @empty
                                            <p class="text-muted text-center py-3 mb-0">Sin condiciones transitorias</p>
                                        @endforelse
                                    </div>
                                </div>
                            </div>
                        </div>

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
                <button type="button" class="btn btn-primary" id="btnAgregarInstitucion"
                    onclick="guardarInstitucion()">
                    <i class="fas fa-save"></i> Guardar
                </button>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        /**
         * Modal Agregar/Editar Institución
         * Depende de: Bootstrap 5, jQuery, mostrarToast(), modalLogoInstitucion, ver_contra_gen.
         */
        const URL_INSTITUCIONES_BASE = @json(url('superadmin/instituciones'));
        const URL_INSTITUCIONES_GUARDAR = @json(route('superadmin.instituciones.guardar'));

        /** 1 = crear, 2 = editar */
        var tipoPost = 1;
        var id_editar = '';

        const modalElAgregarInstitucion = document.getElementById('modalAgregarInstitucion');
        const modalBSPasswordGeneradaEl = document.getElementById('modalBSPasswordGenerada');
        const modalBSPasswordGenerada = modalBSPasswordGeneradaEl ?
            new bootstrap.Modal(modalBSPasswordGeneradaEl) :
            null;

        function getModalAgregarInstitucion() {
            return bootstrap.Modal.getOrCreateInstance(modalElAgregarInstitucion);
        }

        function setBtnInstitucion(modo) {
            const btn = document.getElementById('btnAgregarInstitucion');
            if (!btn) return;
            btn.disabled = false;
            if (modo === 'creando') {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando…';
            } else if (modo === 'guardando') {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';
            } else if (modo === 'crear') {
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Crear Institución';
            } else {
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';
            }
        }

        /** Abre modal limpio para alta. */
        function abrirModalInstituciones() {
            tipoPost = 1;
            id_editar = '';
            $("#modalAgregarInstitucionLabel").text('Agregar Institución');
            $("#modalAgregarInstitucionSubtitle").text('Completa los datos para agregar la institución');
            $("#modalAgregarInstitucionIcon").attr('class', 'fas fa-university text-white');
            setBtnInstitucion('crear');
            resetFormAgregarInstitucion();
            if (typeof window.resetEstadoLogoInstitucion === 'function') {
                window.resetEstadoLogoInstitucion();
            }
            getModalAgregarInstitucion().show();
        }

        /** Abre modal en modo edición y carga datos + ambientes + logo. */
        function abrirModalEditarInstitucion(id) {
            tipoPost = 2;
            id_editar = String(id);
            $("#modalAgregarInstitucionLabel").text('Editar Institución');
            $("#modalAgregarInstitucionSubtitle").text('Actualiza datos, servidores o el logo en cualquier momento');
            $("#modalAgregarInstitucionIcon").attr('class', 'fas fa-pen text-white');
            setBtnInstitucion('editar');
            resetFormAgregarInstitucion();
            getModalAgregarInstitucion().show();
            cargarDatosInstitucion(id);
        }

        function cerrarModalAgregarInstitucion() {
            bootstrap.Modal.getInstance(modalElAgregarInstitucion)?.hide();
        }

        function cerrarModalInstituciones() {
            cerrarModalAgregarInstitucion();
        }

        function resetFormAgregarInstitucion() {
            const form = document.getElementById('formAgregarInstitucion');
            if (!form) return;

            form.reset();
            limpiarErroresModal('formAgregarInstitucion');

            // Desmarca ambientes (reset no siempre limpia bien en algunos browsers con switches).
            form.querySelectorAll('#servidores input[type="checkbox"][name*="[activo]"]').forEach(cb => {
                cb.checked = false;
            });

            // Por defecto todas las condiciones quedan chequeadas.
            document.querySelectorAll('.chk-condicion-orden, .chk-condicion-transitoria-orden')
                .forEach(chk => {
                    chk.checked = true;
                });

            const tabDatos = document.querySelector('#tab-datos-institucion');
            if (tabDatos) {
                bootstrap.Tab.getOrCreateInstance(tabDatos).show();
            }
        }

        function aplicarSeleccionCondicionesOrden(condicionesOrden = [], condicionesTransitoriasOrden = []) {
            const mapaCond = {};
            (condicionesOrden || []).forEach(item => {
                mapaCond[item.id_condicion] = !!item.activa;
            });

            document.querySelectorAll('.chk-condicion-orden').forEach(chk => {
                const id = parseInt(chk.dataset.id, 10);
                chk.checked = Object.keys(mapaCond).length
                    ? (mapaCond[id] ?? false)
                    : true;
            });

            const mapaTrans = {};
            (condicionesTransitoriasOrden || []).forEach(item => {
                mapaTrans[item.id_condicion_transitoria] = !!item.activa;
            });

            document.querySelectorAll('.chk-condicion-transitoria-orden').forEach(chk => {
                const id = parseInt(chk.dataset.id, 10);
                chk.checked = Object.keys(mapaTrans).length
                    ? (mapaTrans[id] ?? false)
                    : true;
            });
        }

        function abrirModalBSPasswordGenerada() {
            if (!modalBSPasswordGenerada) return;
            $("#modalBSPasswordGeneradaLabel").text('Información de la Institución');
            $("#modalBSPasswordGeneradaSubtitle").text(
                'La institución se ha creado correctamente. Por favor, anotar la contraseña antes de cerrar.');
            modalBSPasswordGenerada.show();
        }

        function cerrarModalBSPasswordGenerada() {
            limpiarErroresModal('formCrearAdministrador');
            document.activeElement?.blur();
            modalBSPasswordGenerada.hide();
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

        function mostrarExitoAlCerrarModalPassword(mensaje) {
            document.getElementById('modalBSPasswordGenerada').addEventListener('hidden.bs.modal', function() {
                Swal.fire({
                    icon: 'success',
                    title: mensaje,
                    timer: 1600,
                    showConfirmButton: false,
                }).then(() => window.location.reload());
            }, {
                once: true
            });
        }

        /**
         * Crear (POST) o actualizar (POST + _method PUT con FormData).
         * Logo obligatorio: en alta viaja en inputLogoPendiente; en edición debe existir ya.
         */
        async function guardarInstitucion() {
            const form = document.getElementById('formAgregarInstitucion');
            const formData = new FormData(form);

            if (tipoPost === 1) {
                const logoPendiente = document.getElementById('inputLogoPendiente');
                if (!logoPendiente?.files?.length) {
                    mostrarToast('error', 'El logo de la institución es obligatorio.');
                    if (typeof window.cambiarLogoPerfil === 'function') {
                        window.cambiarLogoPerfil();
                    }
                    return;
                }

                setBtnInstitucion('creando');

                $.ajax({
                    url: URL_INSTITUCIONES_GUARDAR,
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

                        const btnPdf = document.getElementById('btnDescargarPdf');
                        if (btnPdf && res.usuario) {
                            btnPdf.dataset.usuarioId = res.usuario.id;
                            btnPdf.dataset.nombre = res.usuario.nombre;
                        }

                        cerrarModalAgregarInstitucion();
                        abrirModalBSPasswordGenerada();
                        mostrarExitoAlCerrarModalPassword(res.message);
                    },
                    error: function(xhr) {
                        if (xhr.status === 422) {
                            const errors = xhr.responseJSON?.errors ?? {};
                            const msgLogo = errors.logo?.[0];
                            mostrarToast('error', msgLogo || 'Verifique los datos ingresados');
                            mostrarErroresModal(errors, 'formAgregarInstitucion');
                            return;
                        }
                        mostrarToast('error', xhr.responseJSON?.message || 'Error al crear la institución');
                    },
                    complete: function() {
                        setBtnInstitucion('crear');
                    }
                });
                return;
            }

            // Editar: PHP no parsea multipart en PUT → POST + _method
            if (tipoPost === 2) {
                if (!id_editar) {
                    mostrarToast('error', 'No se identificó la institución a editar.');
                    return;
                }

                if (huboCambioIp()) {
                    const result = await Swal.fire({
                        title: '¿Cambiar la IP?',
                        text: 'Cambiar la IP puede interrumpir la sincronización activa. ¿Continuar?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, continuar',
                        cancelButtonText: 'Cancelar',
                        reverseButtons: true,
                    });

                    if (!result.isConfirmed) {
                        return;
                    }
                }
                setBtnInstitucion('guardando');
                formData.append('_method', 'PUT');

                $.ajax({
                    url: `${URL_INSTITUCIONES_BASE}/${id_editar}`,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    dataType: 'json',
                    success: function(res) {
                        if (!res.success) {
                            mostrarToast('error', res.message || 'No se pudo actualizar');
                            return;
                        }
                        cerrarModalAgregarInstitucion();
                        Swal.fire({
                            icon: 'success',
                            title: res.message,
                            timer: 1600,
                            showConfirmButton: false,
                        }).then(() => window.location.reload());

                    },
                    error: function(xhr) {
                        if (xhr.status === 422) {
                            const errors = xhr.responseJSON?.errors ?? {};
                            const msgLogo = errors.logo?.[0];
                            mostrarToast('error', msgLogo || 'Verifique los datos ingresados');
                            mostrarErroresModal(errors, 'formAgregarInstitucion');
                            return;
                        }
                        mostrarToast('error', xhr.responseJSON?.message ||
                            'Error al actualizar la institución');
                    },
                    complete: function() {
                        setBtnInstitucion('editar');
                    }
                });
            }
        }

        document.getElementById('btnDescargarPdf')?.addEventListener('click', function() {
            const id = this.dataset.usuarioId;
            if (!id) return;
            window.open(`${URL_INSTITUCIONES_BASE}/${id}/generar-pdf`, '_blank');
        });

        function cargarDatosInstitucion(id) {
            fetch(`${URL_INSTITUCIONES_BASE}/datos/${id}`, {
                    headers: {
                        'Accept': 'application/json'
                    }
                })
                .then(r => r.json())
                .then(resp => {
                    if (!resp.success) throw new Error('No data');
                    mapearDatosInstitucion(
                        resp.data,
                        resp.condiciones_orden || [],
                        resp.condiciones_transitorias_orden || []
                    );
                })
                .catch(() => {
                    mostrarToast('error', 'No se pudo cargar la información de la institución');
                    cerrarModalAgregarInstitucion();
                });
        }

        function huboCambioIp() {
            return [...document.querySelectorAll('#servidores input[name*="[ip]"]')]
                .some(input => {
                    const original = (input.dataset.original ?? '').trim();
                    const actual = (input.value ?? '').trim();

                    // Solo confirmar si la IP ya existía y fue modificada
                    return original !== '' && original !== actual;
                });
        }

        /**
         * Rellena el formulario + switches de ambientes + estado del logo.
         * Ambientes no vinculados llegan desmarcados (sync al guardar los quita del pivot).
         */
        function mapearDatosInstitucion(data, condicionesOrden = [], condicionesTransitoriasOrden = []) {
            id_editar = String(data.id);
            $('#nombre').val(data.nombre ?? '');
            $('#codigo_dane').val(data.codigo_dane ?? '');
            $('#municipio').val(data.municipio ?? '');
            $('#departamento').val(data.departamento ?? '');
            $('#correo_contacto').val(data.correo_contacto ?? '');

            // Limpia ambientes antes de aplicar los de esta institución.
            document.querySelectorAll('#servidores input[type="checkbox"][name*="[activo]"]').forEach(cb => {
                cb.checked = false;
            });
            document.querySelectorAll('#servidores input[name*="[ip]"]').forEach(inp => {
                inp.value = '';
                inp.dataset.original = '';
            });
            document.querySelectorAll('#servidores input[name*="[puerto]"]').forEach(inp => {
                inp.value = '';
            });

            (data.ambientes || []).forEach(function(amb) {
                const ip = document.getElementById(`ambiente_ip_${amb.id}`);
                const puerto = document.getElementById(`ambiente_puerto_${amb.id}`);
                const activo = document.getElementById(`ambiente_activo_${amb.id}`);

                if (ip) {
                    const valorIp = amb.ip ?? '';
                    ip.value = valorIp;
                    ip.dataset.original = valorIp;
                }

                if (puerto) puerto.value = amb.puerto ?? '';
                if (activo) activo.checked = Boolean(amb.activo);
            });

            aplicarSeleccionCondicionesOrden(condicionesOrden, condicionesTransitoriasOrden);

            if (typeof window.setEstadoLogoInstitucion === 'function') {
                window.setEstadoLogoInstitucion({
                    id: data.id,
                    logoUrl: data.logo_url_publica,
                    iniciales: data.iniciales || 'IE',
                });
            }
        }
    </script>
@endpush
