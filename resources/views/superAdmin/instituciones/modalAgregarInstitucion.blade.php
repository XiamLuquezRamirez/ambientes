{{--
    Modal: Agregar / Editar Institución (Super Admin)
    - Tab 1: datos básicos + avatar de logo (abre modalLogoInstitucion)
    - Tab 2: IP/puerto/activo por ambiente (name ambientes[id][...]; backend espera "activo")
    - Tab 3: perfiles de aprendizaje + perfiles de aprendizaje personalizados (perfil_aprendizaje_orden / perfil_aprendizaje_personalizado_orden)
    - Tab 4: módulos oficiales por ambiente activo (modulos[id][activo]; depende de Servidores)

    Crear  → POST  superadmin/instituciones
    Editar → POST  superadmin/instituciones/{id} + _method=PUT  (FormData + multipart)
    Logo   → gestionado en modalLogoInstitucion (independiente al guardar datos)
--}}
@php
    $perfilesAprendizaje = $perfilesAprendizaje ?? collect();
    $perfilesAprendizajePersonalizado = $perfilesAprendizajePersonalizado ?? collect();
    $departamentos = $departamentos ?? collect();
@endphp
@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/instituciones/index.css') }}">
@endpush
<div class="modal fade modal-app" id="modalAgregarInstitucion" tabindex="-1" data-bs-keyboard="false"
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
                        <a class="nav-link" id="tab-perfiles-aprendizaje" data-bs-toggle="tab"
                            href="#perfilesAprendizajeInstitucion" role="tab"
                            aria-controls="perfilesAprendizajeInstitucion" aria-selected="false">
                            <i class="fas fa-layer-group"></i> Perfiles de Aprendizaje
                        </a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="tab-servidores" data-bs-toggle="tab" href="#servidores" role="tab"
                            aria-controls="servidores" aria-selected="false">
                            <i class="fas fa-server"></i> Servidores
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
                                        <input type="text" id="codigo_dane" name="codigo_dane"
                                            class="form-control" placeholder="Código DANE de la institución" required>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        <label class="form-label fw-bold" for="departamento_id">Departamento</label>
                                        <select id="departamento_id" name="departamento_id" class="form-control"
                                            required onchange="cargarMunicipiosInstitucion()">
                                            <option value="">Seleccione</option>
                                            @foreach ($departamentos as $d)
                                                <option value="{{ $d->codigo }}">{{ $d->descripcion }}</option>
                                            @endforeach
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        <label class="form-label fw-bold" for="municipio_id">Municipio</label>
                                        <select id="municipio_id" name="municipio_id" class="form-control" required>
                                            <option value="">Seleccione</option>
                                        </select>
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

                        {{-- Tab: perfiles de aprendizaje globales y personalizados --}}
                        <div class="tab-pane container" id="perfilesAprendizajeInstitucion" role="tabpanel"
                            aria-labelledby="tab-perfiles-aprendizaje">
                            <p class="text-muted mb-3" style="font-size:.9rem">
                                Seleccione los perfiles de aprendizaje disponibles para la institución.
                                Por defecto todos quedan activos.
                            </p>

                            <div class="card card-perfiles-aprendizaje-orden">
                                <div class="card-header" data-bs-toggle="collapse"
                                    data-bs-target="#collapsePerfilesAprendizajeOrden" aria-expanded="true"
                                    aria-controls="collapsePerfilesAprendizajeOrden">
                                    <h6>
                                        <i class="fa-solid fa-layer-group me-2"></i>
                                        Perfiles de Aprendizaje
                                        <span class="badge badge-blue ms-1">{{ $perfilesAprendizaje->count() }}</span>
                                    </h6>
                                    <i class="fa-solid fa-chevron-down chevron"></i>
                                </div>
                                <div id="collapsePerfilesAprendizajeOrden" class="collapse show">
                                    <div class="lista-perfiles-aprendizaje-orden">
                                        @forelse ($perfilesAprendizaje as $perfilAprendizaje)
                                            @php $color = $perfilAprendizaje->color_hex ?: '#64748B'; @endphp
                                            <div class="item-perfil-aprendizaje-orden">
                                                <input type="hidden"
                                                    name="perfil_aprendizaje_orden[{{ $perfilAprendizaje->id }}][orden]"
                                                    value="{{ $loop->index }}">
                                                <input class="form-check-input chk-perfil-aprendizaje-orden"
                                                    type="checkbox"
                                                    id="perfil_aprendizaje_orden_{{ $perfilAprendizaje->id }}"
                                                    name="perfil_aprendizaje_orden[{{ $perfilAprendizaje->id }}][activa]"
                                                    value="1" checked data-id="{{ $perfilAprendizaje->id }}">
                                                <label for="perfil_aprendizaje_orden_{{ $perfilAprendizaje->id }}">
                                                    <span class="badge"
                                                        style="background:{{ $color }}22;color:{{ $color }};border:1px solid {{ $color }}55">
                                                        {{ $perfilAprendizaje->codigo }}
                                                    </span>
                                                    {{ $perfilAprendizaje->nombre }}
                                                </label>
                                            </div>
                                        @empty
                                            <p class="text-muted text-center py-3 mb-0">Sin perfiles de aprendizaje
                                                registrados</p>
                                        @endforelse
                                    </div>
                                </div>
                            </div>

                            <div class="card card-perfiles-aprendizaje-orden">
                                <div class="card-header" data-bs-toggle="collapse"
                                    data-bs-target="#collapsePerfilesAprendizajePersonalizadoOrden"
                                    aria-expanded="true"
                                    aria-controls="collapsePerfilesAprendizajePersonalizadoOrden">
                                    <h6>
                                        <i class="fa-solid fa-list-check me-2"></i>
                                        Perfiles de Aprendizaje Personalizados
                                        <span class="badge badge-blue ms-1"
                                            id="badgeCountPersonalizadoOrden">{{ $perfilesAprendizajePersonalizado->count() }}</span>
                                    </h6>
                                    <i class="fa-solid fa-chevron-down chevron"></i>
                                </div>
                                <div id="collapsePerfilesAprendizajePersonalizadoOrden" class="collapse show">
                                    <div class="lista-perfiles-aprendizaje-orden"
                                        id="listaPerfilesAprendizajePersonalizadoOrden">
                                        @forelse ($perfilesAprendizajePersonalizado as $transitoria)
                                            @php
                                                $colorT = $transitoria->perfilAprendizaje?->color_hex ?: '#64748B';
                                            @endphp
                                            <div class="item-perfil-aprendizaje-orden" data-origen="global">
                                                <input type="hidden"
                                                    name="perfil_aprendizaje_personalizado_orden[{{ $transitoria->id }}][orden]"
                                                    value="{{ $loop->index }}">
                                                <input
                                                    class="form-check-input chk-perfil-aprendizaje-personalizado-orden"
                                                    type="checkbox"
                                                    id="perfil_aprendizaje_personalizado_orden_{{ $transitoria->id }}"
                                                    name="perfil_aprendizaje_personalizado_orden[{{ $transitoria->id }}][activa]"
                                                    value="1" checked data-id="{{ $transitoria->id }}">
                                                <label
                                                    for="perfil_aprendizaje_personalizado_orden_{{ $transitoria->id }}">
                                                    <span class="badge"
                                                        style="background:{{ $colorT }}22;color:{{ $colorT }};border:1px solid {{ $colorT }}55">
                                                        {{ $transitoria->codigo }}
                                                    </span>
                                                    {{ $transitoria->etiqueta }}
                                                </label>
                                            </div>
                                        @empty
                                            <p class="text-muted text-center py-3 mb-0" id="msgSinPersonalizadoOrden">
                                                Sin perfiles de aprendizaje personalizados
                                            </p>
                                        @endforelse
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

                        <div class="tab-pane container" id="modulos" role="tabpanel"
                            aria-labelledby="tab-modulos">
                            <p class="text-muted mb-3" style="font-size:.9rem">
                                Active o desactive los módulos oficiales disponibles para esta institución.
                                Solo aparecen los de los ambientes marcados en la pestaña
                                <strong>Servidores</strong>.
                            </p>

                            <div id="modulosEmptyHint" class="text-muted text-center py-4"
                                style="border:1px dashed #E2E8F0;border-radius:12px;background:#FAFBFC">
                                Active al menos un ambiente en <strong>Servidores</strong> para asignar módulos.
                            </div>

                            <div id="listaGruposModulos">
                                @forelse ($ambientes as $ambiente)
                                    @php $color = $ambiente->color_hex ?: '#64748B'; @endphp
                                    <div class="card card-perfiles-aprendizaje-orden grupo-modulos-ambiente"
                                        data-ambiente-id="{{ $ambiente->id }}" hidden>
                                        <div class="card-header" data-bs-toggle="collapse"
                                            data-bs-target="#collapseModulosAmbiente{{ $ambiente->id }}"
                                            aria-expanded="true"
                                            aria-controls="collapseModulosAmbiente{{ $ambiente->id }}">
                                            <h6>
                                                <span class="me-2">{{ $ambiente->icono ?: '📦' }}</span>
                                                {{ $ambiente->nombre }}
                                                <span class="badge badge-blue ms-1 badge-count-modulos">
                                                    {{ $ambiente->modulosOficiales->count() }}
                                                </span>
                                            </h6>
                                            <i class="fa-solid fa-chevron-down chevron"></i>
                                        </div>
                                        <div id="collapseModulosAmbiente{{ $ambiente->id }}" class="collapse show">
                                            <div class="lista-perfiles-aprendizaje-orden">
                                                @forelse ($ambiente->modulosOficiales as $modulo)
                                                    <div class="item-perfil-aprendizaje-orden">

                                                        <label for="modulo_institucion_{{ $modulo->id }}">
                                                            {{ $modulo->nombre }}
                                                        </label>
                                                        <div
                                                            class="form-check form-switch d-inline-flex justify-content-center">
                                                            <input
                                                                class="form-check-input chk-modulo-institucion"type="checkbox"
                                                                id="modulo_institucion_{{ $modulo->id }}"
                                                                name="modulos[{{ $modulo->id }}][activo]"
                                                                value="1" data-modulo-id="{{ $modulo->id }}"
                                                                data-ambiente-id="{{ $ambiente->id }}"
                                                                style="cursor: pointer;" title="Activar módulo"
                                                                {{ $modulo->activo ? 'checked' : '' }}>
                                                        </div>
                                                    </div>
                                                @empty
                                                    <p class="text-muted text-center py-3 mb-0">
                                                        Este ambiente no tiene módulos oficiales activos.
                                                    </p>
                                                @endforelse
                                            </div>
                                        </div>
                                    </div>
                                @empty
                                    <p class="text-muted text-center py-3 mb-0">Sin ambientes registrados</p>
                                @endforelse
                            </div>
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
        const URL_CARGAR_MUNICIPIOS = @json(url('superadmin/instituciones/cargar-municipios'));

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
            $("#modalAgregarInstitucionSubtitle").text('Actualiza información de la institución');
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

            // Municipios dependen del departamento: dejar solo placeholder.
            const selMunicipio = document.getElementById('municipio_id');
            if (selMunicipio) {
                selMunicipio.innerHTML = '<option value="">Seleccione</option>';
            }

            // Desmarca ambientes (reset no siempre limpia bien en algunos browsers con switches).
            form.querySelectorAll('#servidores input[type="checkbox"][name*="[activo]"]').forEach(cb => {
                cb.checked = false;
            });

            resetModulosInstitucion();

            // Al crear: solo globales.
            restaurarListaTransitoriasGlobales();

            // Por defecto todos los perfiles de aprendizaje quedan chequeados.
            document.querySelectorAll('.chk-perfil-aprendizaje-orden, .chk-perfil-aprendizaje-personalizado-orden')
                .forEach(chk => {
                    chk.checked = true;
                });

            const tabDatos = document.querySelector('#tab-datos-institucion');
            if (tabDatos) {
                bootstrap.Tab.getOrCreateInstance(tabDatos).show();
            }
        }

        async function cargarMunicipiosInstitucion(municipioSeleccionado = null) {
            const departamento = document.getElementById('departamento_id')?.value;
            const selMunicipio = document.getElementById('municipio_id');
            if (!selMunicipio) return;

            selMunicipio.innerHTML = '<option value="">Seleccione</option>';

            if (!departamento) return;

            try {
                const res = await fetch(`${URL_CARGAR_MUNICIPIOS}/${departamento}`, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                if (!res.ok) throw new Error('Error al cargar municipios');
                const municipios = await res.json();

                (municipios || []).forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.id;
                    opt.textContent = m.descripcion;
                    if (municipioSeleccionado != null && String(m.id) === String(municipioSeleccionado)) {
                        opt.selected = true;
                    }
                    selMunicipio.appendChild(opt);
                });
            } catch (e) {
                mostrarToast('error', 'Error al cargar los municipios');
            }
        }

        const listaTransitoriasEl = document.getElementById('listaPerfilesAprendizajePersonalizadoOrden');
        const htmlTransitoriasGlobales = listaTransitoriasEl ? listaTransitoriasEl.innerHTML : '';

        function restaurarListaTransitoriasGlobales() {
            if (!listaTransitoriasEl) return;
            listaTransitoriasEl.innerHTML = htmlTransitoriasGlobales;
            const count = listaTransitoriasEl.querySelectorAll('.chk-perfil-aprendizaje-personalizado-orden').length;
            const badge = document.getElementById('badgeCountPersonalizadoOrden');
            if (badge) badge.textContent = String(count);
        }

        function renderListaTransitoriasDisponibles(disponibles = [], ordenGuardado = []) {
            if (!listaTransitoriasEl) return;

            const mapaActiva = {};
            (ordenGuardado || []).forEach(item => {
                mapaActiva[item.perfil_aprendizaje_personalizado_id] = !!item.activa;
            });
            const hayOrden = Object.keys(mapaActiva).length > 0;

            if (!disponibles.length) {
                listaTransitoriasEl.innerHTML =
                    '<p class="text-muted text-center py-3 mb-0">Sin perfiles de aprendizaje personalizados</p>';
                const badge = document.getElementById('badgeCountPersonalizadoOrden');
                if (badge) badge.textContent = '0';
                return;
            }

            listaTransitoriasEl.innerHTML = disponibles.map((t, index) => {
                const color = t.color || '#64748B';
                const checked = hayOrden ? (mapaActiva[t.id] ?? false) : true;
                const esLocal = t.institucion_id != null;
                const badgeLocal = esLocal ?
                    '<span class="badge badge-gray" style="margin-left:6px">Institución</span>' :
                    '';
                const baseTxt = t.perfil_aprendizaje ?
                    `<small class="text-muted" style="margin-left:6px">(${t.perfil_aprendizaje.codigo})</small>` :
                    '';

                return `
                    <div class="item-perfil-aprendizaje-orden" data-origen="${esLocal ? 'institucion' : 'global'}">
                        <input type="hidden"
                            name="perfil_aprendizaje_personalizado_orden[${t.id}][orden]"
                            value="${index}">
                        <input class="form-check-input chk-perfil-aprendizaje-personalizado-orden"
                            type="checkbox"
                            id="perfil_aprendizaje_personalizado_orden_${t.id}"
                            name="perfil_aprendizaje_personalizado_orden[${t.id}][activa]"
                            value="1"
                            data-id="${t.id}"
                            ${checked ? 'checked' : ''}>
                        <label for="perfil_aprendizaje_personalizado_orden_${t.id}">
                            <span class="badge"
                                style="background:${color}22;color:${color};border:1px solid ${color}55">
                                ${t.codigo || '—'}
                            </span>
                            ${t.etiqueta || ''}
                            ${baseTxt}
                            ${badgeLocal}
                        </label>
                    </div>
                `;
            }).join('');

            const badge = document.getElementById('badgeCountPersonalizadoOrden');
            if (badge) badge.textContent = String(disponibles.length);
        }

        function aplicarSeleccionPerfilesAprendizajeOrden(perfilesAprendizajeOrden = [],
            perfilesAprendizajePersonalizadoOrden = []) {
            const mapaCond = {};
            (perfilesAprendizajeOrden || []).forEach(item => {
                mapaCond[item.perfil_aprendizaje_id] = !!item.activa;
            });

            document.querySelectorAll('.chk-perfil-aprendizaje-orden').forEach(chk => {
                const id = parseInt(chk.dataset.id, 10);
                chk.checked = Object.keys(mapaCond).length ?
                    (mapaCond[id] ?? false) :
                    true;
            });

            const mapaTrans = {};
            (perfilesAprendizajePersonalizadoOrden || []).forEach(item => {
                mapaTrans[item.perfil_aprendizaje_personalizado_id] = !!item.activa;
            });

            document.querySelectorAll('.chk-perfil-aprendizaje-personalizado-orden').forEach(chk => {
                const id = parseInt(chk.dataset.id, 10);
                chk.checked = Object.keys(mapaTrans).length ?
                    (mapaTrans[id] ?? false) :
                    true;
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

        // Copiar contraseña al portapapeles.
        $(document).on('click', '.btn-copiar', function() {
            const inputId = $(this).data('target');
            const texto = $('#' + inputId).val();
            navigator.clipboard.writeText(texto)
                .then(() => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Copiado al portapapeles',
                        timer: 1200,
                        showConfirmButton: false
                    });
                })
                .catch(() => {
                    Swal.fire(
                        'Error',
                        'No fue posible copiar el texto.',
                        'error'
                    );
                });

        });

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
                        resp.perfil_aprendizaje_orden || [],
                        resp.perfil_aprendizaje_personalizado_orden || [],
                        resp.perfil_aprendizaje_personalizado_disponibles || [],
                        resp.modulos || []
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
        function mapearDatosInstitucion(
            data,
            perfilesAprendizajeOrden = [],
            perfilesAprendizajePersonalizadoOrden = [],
            perfilesAprendizajePersonalizadoDisponibles = [],
            modulosInstitucion = []
        ) {
            id_editar = String(data.id);
            $('#nombre').val(data.nombre ?? '');
            $('#codigo_dane').val(data.codigo_dane ?? '');
            $('#correo_contacto').val(data.correo_contacto ?? '');

            const departamentoId = data.departamento_id ?? '';
            $('#departamento_id').val(departamentoId);
            if (departamentoId) {
                cargarMunicipiosInstitucion(data.municipio_id ?? null);
            } else {
                const selMunicipio = document.getElementById('municipio_id');
                if (selMunicipio) {
                    selMunicipio.innerHTML = '<option value="">Seleccione</option>';
                }
            }

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

            // En edición: globales + creadas por esa institución.
            renderListaTransitoriasDisponibles(
                perfilesAprendizajePersonalizadoDisponibles,
                perfilesAprendizajePersonalizadoOrden
            );
            aplicarSeleccionPerfilesAprendizajeOrden(perfilesAprendizajeOrden, perfilesAprendizajePersonalizadoOrden);
            aplicarModulosInstitucion(modulosInstitucion);

            if (typeof window.setEstadoLogoInstitucion === 'function') {
                window.setEstadoLogoInstitucion({
                    id: data.id,
                    logoUrl: data.logo_url_publica,
                    iniciales: data.iniciales || 'IE',
                });
            }
        }

        /* ── Módulos oficiales por ambiente activo ───────────── */
        function resetModulosInstitucion() {
            document.querySelectorAll('.grupo-modulos-ambiente').forEach(grupo => {
                delete grupo.dataset.initialized;
                grupo.hidden = true;
                grupo.querySelectorAll('.chk-modulo-institucion').forEach(chk => {
                    chk.checked = true;
                    chk.disabled = true;
                });
            });
            actualizarHintModulos();
        }

        function actualizarHintModulos() {
            const hint = document.getElementById('modulosEmptyHint');
            if (!hint) return;
            const algunoVisible = [...document.querySelectorAll('.grupo-modulos-ambiente')]
                .some(g => !g.hidden);
            hint.hidden = algunoVisible;
        }

        function sincronizarVisibilidadModulosDesdeServidores(opciones = {}) {
            const forzarDefaultActivo = opciones.forzarDefaultActivo !== false;
            const mapaGuardado = opciones.mapaGuardado || null;

            document.querySelectorAll('.grupo-modulos-ambiente').forEach(grupo => {
                const ambienteId = grupo.dataset.ambienteId;
                const chkAmbiente = document.getElementById(`ambiente_activo_${ambienteId}`);
                const ambienteActivo = !!chkAmbiente?.checked;

                grupo.hidden = !ambienteActivo;

                grupo.querySelectorAll('.chk-modulo-institucion').forEach(chk => {
                    chk.disabled = !ambienteActivo;

                    if (!ambienteActivo) {
                        return;
                    }

                    const moduloId = String(chk.dataset.moduloId);
                    if (mapaGuardado && Object.prototype.hasOwnProperty.call(mapaGuardado, moduloId)) {
                        chk.checked = !!mapaGuardado[moduloId];
                    } else if (forzarDefaultActivo && grupo.dataset.initialized !== '1') {
                        chk.checked = true;
                    }
                });

                if (ambienteActivo) {
                    grupo.dataset.initialized = '1';
                } else {
                    delete grupo.dataset.initialized;
                }
            });

            actualizarHintModulos();
        }

        function aplicarModulosInstitucion(modulos = []) {
            // Checkbox = asignado a la institución (existe fila). El activo lo gestiona el admin.
            const mapa = {};
            (modulos || []).forEach(m => {
                mapa[String(m.id)] = true;
            });

            document.querySelectorAll('.grupo-modulos-ambiente').forEach(grupo => {
                delete grupo.dataset.initialized;
            });

            sincronizarVisibilidadModulosDesdeServidores({
                forzarDefaultActivo: true,
                mapaGuardado: mapa,
            });
        }

        document.querySelectorAll('#servidores input[type="checkbox"][name*="[activo]"]').forEach(chk => {
            chk.addEventListener('change', function() {
                sincronizarVisibilidadModulosDesdeServidores({
                    forzarDefaultActivo: true,
                });
            });
        });
    </script>
@endpush
