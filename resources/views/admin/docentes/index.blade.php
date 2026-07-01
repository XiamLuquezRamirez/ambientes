@extends('layouts.admin')
@section('title', 'Docentes')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/estilosModals.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/docente/index.css') }}">
@endpush

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
        <div>
            <h1>Docentes</h1>
            <p>Gestión de cuentas de docentes y administradores</p>
        </div>
        <div style="display:flex;gap:10px">
            <button class="btn btn-info" onclick="abrirModalDocentesAsignados()"><i class="fas fa-eye"></i> Docentes
                Asignados</button>
            <button class="btn btn-primary" onclick="abrirModal()"><i class="fas fa-plus"></i> Nuevo Docente</button>
        </div>
    </div>

    {{-- ── Filtros ──────────────────────────────────────────────────── --}}
    <form id="formBuscar" style="display:flex;gap:12px;margin-bottom:24px;align-items:center;flex-wrap:wrap">
        <div class="input-buscar">
            <span class="icono-buscar"><i class="fas fa-search"></i></span>
            <input type="text" name="buscar" placeholder="Buscar por nombre o correo..." value="{{ request('buscar') }}"
                autocomplete="off">
        </div>
        {{-- <select name="ambiente_id" class="form-control" style="width:auto">
            <option value="">Todos los ambientes</option>
            @foreach ($ambientes as $a)
                <option value="{{ $a->id }}" {{ request('ambiente_id') == $a->id ? 'selected' : '' }}>
                    {{ $a->nombre }}</option>
            @endforeach
        </select> --}}

        {{-- Este bloque genera las opciones del filtro "estado" para la búsqueda de docentes.
                Se utiliza un array asociativo: clave => etiqueta a mostrar.
                'true' => 'Activo', 'false' => 'Inactivo'.
                Por cada opción,
                  - value="{{ $val }}" es el valor enviado por el formulario.
                  - Se marca como selected si el estado actual en la URL coincide exactamente (comparación estricta) con el $val.
                  - La etiqueta visible será "Activo" o "Inactivo". --}}
        <select name="estado" class="form-control" style="width:auto">
            <option value="">Todos los estados</option>
            @foreach (['true' => 'Activo', 'false' => 'Inactivo'] as $val => $label)
                <option value="{{ $val }}" {{ request('estado') === $val ? 'selected' : '' }}>{{ $label }}
                </option>
            @endforeach
        </select>

        {{-- <select name="rol" class="form-control" style="width:auto">
            <option value="">Todos los roles</option>
            @foreach (['admin' => 'Administrador', 'docente' => 'Docente'] as $val => $label)
                <option value="{{ $val }}" {{ request('rol') === $val ? 'selected' : '' }}>{{ $label }}
                </option>
            @endforeach
        </select> --}}
        <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-filter"></i> Filtrar</button>
        <a id="btnLimpiar" href="{{ route('admin.docentes') }}" class="btn btn-sm"
            style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;
              display:{{ request()->hasAny(['buscar', 'ambiente_id', 'rol']) ? 'inline-flex' : 'none' }}">
            <i class="fas fa-broom"></i> Limpiar
        </a>
    </form>

    {{-- ── Contenedor de tabla ──────────────────────────────────────── --}}
    <div id="contenedorTabla">
        @include('admin.docentes._tabla')
    </div>
    <div id="cargando-tabla"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>

    {{-- ── Modal Bootstrap 5 – Nuevo Docente ──────────────────────── --}}
    <div class="modal fade" id="modalDocente" tabindex="-1" data-bs-backdrop="static" aria-labelledby="modalDocenteLabel"
        aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-header-icon"><i id="modalDocenteIcon"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h5 class="modal-title mb-0" id="modalDocenteLabel"></h5>
                        <p class="modal-subtitle mb-0" id="modalDocenteSubtitle"></p>
                    </div>
                    <button type="button" class="btn-close" onclick="cerrarModalDocente()" data-bs-dismiss="modal"
                        aria-label="Cerrar">
                    </button>
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
                    {{-- Un solo formulario para ambas pestañas: evita IDs duplicados y envía todos los campos. --}}
                    <form id="formDocente" enctype="multipart/form-data" method="POST">
                        @csrf
                        <div class="tab-content" style="padding: 20px;">
                            <div class="tab-pane container active" id="datosPersonales">
                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <strong class="form-label">Identificación</strong>
                                            <input type="number" id="identificacion" name="identificacion"
                                                class="form-control" placeholder="Identificación del docente"
                                                value="{{ old('identificacion') }}">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <strong class="form-label">Nombre(s)</strong>
                                            <input type="text" id="nombre" name="nombre" class="form-control"
                                                placeholder="Nombre del docente" value="{{ old('nombre') }}">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <strong class="form-label">Apellido(s)</strong>
                                            <input type="text" id="apellido" name="apellido" class="form-control"
                                                placeholder="Apellidos del docente" value="{{ old('apellido') }}">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <strong class="form-label">Telefono</strong>
                                            <input type="number" id="telefono" name="telefono" class="form-control"
                                                placeholder="Telefono del docente" value="{{ old('telefono') }}">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <strong class="form-label">Dirección</strong>
                                            <input type="text" id="direccion" name="direccion" class="form-control"
                                                placeholder="Dirección del docente" value="{{ old('direccion') }}">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <strong class="form-label">Especialidad</strong>
                                            <input type="text" id="especialidad" name="especialidad"
                                                class="form-control" placeholder="Especialidad del docente"
                                                value="{{ old('especialidad') }}">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <strong class="form-label">Fecha de ingreso</strong>
                                            <input type="date" id="fecha_ingreso" name="fecha_ingreso"
                                                class="form-control" placeholder="Fecha de ingreso del docente"
                                                value="{{ old('fecha_ingreso') }}">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <strong class="form-label">Firma</strong>
                                            <input type="file" id="firma_url" name="firma_url" class="form-control"
                                                accept="image/*" onchange="previewImage(event, '#imgPreviewFirma')">
                                        </div>
                                    </div>

                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <strong class="form-label" id="lblVistaPreviaFirma">Vista previa de la
                                                firma</strong>
                                            <img id="imgPreviewFirma" class="w-50"
                                                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMmyTPv4M5fFPvYLrMzMQcPD_VO34ByNjouQ&s"
                                                alt="Firma del docente">
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
                                                <i id="togglePassword"
                                                    onclick="verPassword('#password', '#togglePassword')"
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
                        style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0" onclick="cerrarModalDocente()">
                        <i class="fa-solid fa-xmark"></i> Cancelar</button>
                    <button type="submit" form="formDocente" id="btnDocente" class="btn btn-primary">
                        <i class="fa-solid fa-floppy-disk"></i> Guardar</button>
                </div>
            </div>
        </div>
    </div>

    {{-- ── Modal Bootstrap 5 – Información de la Contraseña ──────────────────────── --}}
    <div class="modal fade" id="modalBSPasswordGenerada" tabindex="-1" data-bs-keyboard="false"
        data-bs-backdrop="static" aria-labelledby="modalBSPasswordGeneradaLabel" aria-hidden="false">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="modalBSPasswordGeneradaLabel"></h5>
                </div>
                <div class="modal-body">
                    <p id="modalBSPasswordGeneradaSubtitle"></p>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <strong>Correo electrónico</strong>
                                <div class="input-group">
                                    <input type="text" id="asignar_email" class="form-control"
                                        value="{{ old('email') ?? '-' }}" readonly>
                                    <button type="button" class="btn btn-outline-secondary btn-copiar"
                                        data-target="asignar_email" title="Copiar correo">
                                        <i class="fa-solid fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <strong>Contraseña</strong>
                                <div class="input-group">
                                    <input type="text" id="passwordGenerada" class="form-control"
                                        value="{{ $passwordGenerada ?? '' }}" readonly>
                                    <button type="button" class="btn btn-outline-secondary btn-copiar"
                                        data-target="passwordGenerada" title="Copiar contraseña">
                                        <i class="fa-solid fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" id="btnDescargarPdf" class="btn btn-danger">
                        <i class="fa-solid fa-file-pdf"></i>
                        Descargar PDF
                    </button>
                    <button type="button" onclick="cerrarModalBSPasswordGenerada()" class="btn btn-primary"
                        data-bs-dismiss="modal"> <i class="fa-solid fa-check"></i> Terminar</button>
                </div>
            </div>
        </div>
    </div>

    @include('admin.docentes.partials.modal-asignar-grupo')
    @include('admin.docentes.ver-accesos')
    @include('admin.docentes.ver_grupos')
@endsection

@push('scripts')
    <script>
        window.URL_DOCENTES = "{{ route('admin.docentes') }}";
        window.ANIO_LECTIVO_ACTUAL = "{{ date('Y') }}";
        const URL_DOCENTES = window.URL_DOCENTES;
        const ANIO_LECTIVO_ACTUAL = window.ANIO_LECTIVO_ACTUAL;
        var tipoPost = 1; // 1: Crear, 2: Editar
        var id_editar = '';
    </script>
    @include('admin.docentes.partials.asignar-grupo-scripts')
    <script>
        /* ── Bootstrap Modal ─────────────────────────────────────────── */
        const modalBS = new bootstrap.Modal(document.getElementById('modalDocente'));
        const modalBSPasswordGenerada = new bootstrap.Modal(document.getElementById('modalBSPasswordGenerada'));

        // Al cerrar cualquier modal, limpiar errores y resetear el formulario correspondiente.
        document.getElementById('modalDocente').addEventListener('hidden.bs.modal', function() {
            limpiarErroresModal();
            document.getElementById('formDocente').reset();
        });

        function abrirModal() {
            $("#modalDocenteLabel").text('Crear Docente');
            $("#modalDocenteSubtitle").text('Completa los datos para crear la cuenta');
            $("#modalDocenteIcon").html('<i class="fas fa-user-plus text-white"></i>');
            bootstrap.Tab.getOrCreateInstance(
                $('a[href="#datosPersonales"]')[0]
            ).show();
            tipoPost = 1;
            modalBS.show();
        }

        function abrirModalEditar(id) {
            $("#modalDocenteLabel").text('Editar Docente');
            $("#modalDocenteSubtitle").text('Completa los datos para editar el docente');
            $("#modalDocenteIcon").html('<i class="fas fa-user-edit text-white"></i>');
            bootstrap.Tab.getOrCreateInstance(
                $('a[href="#datosPersonales"]')[0]
            ).show();
            tipoPost = 2;
            cargarDatosDocente(id);
            modalBS.show();
        }

        /* ── Modal Bootstrap 5 – Información de la Cuenta ──────────────────────── */
        function abrirModalBSPasswordGenerada() {
            $("#modalBSPasswordGeneradaLabel").text('Información de la Cuenta');
            $("#modalBSPasswordGeneradaSubtitle").text(
                'La cuenta se ha creado correctamente. Por favor, anotar la contraseña antes de cerrar.');
            $("#modalBSPasswordGeneradaIcon").html('<i class="fas fa-info-circle text-white"></i>');
            modalBSPasswordGenerada.show();
        }

        /* ── Modal Bootstrap 5 – Información de la Cuenta Actualizada ────────── */
        function abrirModalBSPasswordGeneradaEditar() {
            $("#modalBSPasswordGeneradaLabel").text('Información de la Cuenta Actualizada');
            $("#modalBSPasswordGeneradaSubtitle").text(
                'La cuenta se ha actualizado correctamente. Por favor, anotar la contraseña antes de cerrar.');
            $("#modalBSPasswordGeneradaIcon").html('<i class="fas fa-info-circle text-white"></i>');
            modalBSPasswordGenerada.show();
        }

        function cerrarModalBSPasswordGenerada() {
            document.getElementById('imgPreviewFirma').src =
                'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMmyTPv4M5fFPvYLrMzMQcPD_VO34ByNjouQ&s';
            limpiarErroresModal();
            document.activeElement?.blur();
            modalBSPasswordGenerada.hide();
        }

        /* ── Cerrar modal Nuevo Docente ─────────────────────────── */
        function cerrarModalDocente() {
            document.getElementById('imgPreviewFirma').src =
                'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMmyTPv4M5fFPvYLrMzMQcPD_VO34ByNjouQ&s';
            limpiarErroresModal();
            document.activeElement?.blur();
            modalBS.hide();
        }

        /* ── Tabla AJAX ──────────────────────────────────────────────── */
        async function cargarTabla(url) {
            document.getElementById('contenedorTabla').style.opacity = '.4';
            document.getElementById('cargando-tabla').style.display = 'block';

            const res = await ajaxRequest(url);

            document.getElementById('contenedorTabla').style.opacity = '1';
            document.getElementById('cargando-tabla').style.display = 'none';

            if (res.success) {
                document.getElementById('contenedorTabla').innerHTML = res.html;
                history.pushState(null, '', url);
                const params = new URL(url).searchParams;
                const tieneFilros = params.has('buscar') || params.has('ambiente_id') || params.has('rol');
                document.getElementById('btnLimpiar').style.display = tieneFilros ? 'inline-flex' : 'none';
            } else {
                mostrarToast('error', 'Error al cargar los datos');
            }
        }

        document.addEventListener('click', function(e) {
            const pagBtn = e.target.closest('.pag-btn[href]');
            if (pagBtn) {
                e.preventDefault();
                cargarTabla(pagBtn.href);
            }
        });

        /* ── Filtros ─────────────────────────────────────────────────── */
        function aplicarFiltros() {
            const params = new URLSearchParams(new FormData(document.getElementById('formBuscar')));
            for (const [k, v] of [...params.entries()]) {
                if (!v) params.delete(k);
            }
            const url = params.toString() ? `${URL_DOCENTES}?${params.toString()}` : URL_DOCENTES;
            cargarTabla(url);
        }

        document.querySelectorAll('#formBuscar select').forEach(sel => {
            sel.addEventListener('change', aplicarFiltros);
        });

        let debounceTimer;
        document.querySelector('#formBuscar input[name="buscar"]').addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(aplicarFiltros, 400);
        });

        document.getElementById('formBuscar').addEventListener('submit', function(e) {
            e.preventDefault();
            clearTimeout(debounceTimer);
            aplicarFiltros();
        });

        document.getElementById('btnLimpiar').addEventListener('click', async function(e) {
            e.preventDefault();
            document.getElementById('formBuscar').reset();
            await cargarTabla(URL_DOCENTES);
        });

        /* ── Errores inline en modal ─────────────────────────────────── */
        // Elimina cualquier mensaje o estado de validación que haya quedado en los formularios.
        function limpiarErroresModal() {
            document.querySelectorAll('#formDocente .campo-error, #formAsignarInfo .campo-error').forEach(el => el
                .remove());
            document.querySelectorAll('#formDocente .is-invalid, #formAsignarInfo .is-invalid').forEach(el => el
                .classList.remove('is-invalid'));
        }

        function mostrarErroresModal(errors) {
            limpiarErroresModal();
            for (const [campo, mensajes] of Object.entries(errors)) {
                const input = document.querySelector(`#formDocente [name="${campo}"]`);
                if (!input) continue;
                input.classList.add('is-invalid');
                const div = document.createElement('div');
                div.className = 'campo-error';
                div.textContent = mensajes[0];
                input.insertAdjacentElement('afterend', div);
            }
            const primero = document.querySelector('#formDocente .is-invalid');
            if (primero) primero.focus();
        }

        /* ── Crear docente (AJAX) ────────────────────────────────────── */
        document.getElementById('formDocente').addEventListener('submit', async function(e) {
            e.preventDefault();
            if (tipoPost == 1) {
                const btn = document.getElementById('btnDocente');
                btn.disabled = true;
                btn.textContent = 'Guardando…';
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Guardando…';
                const formData = new FormData(this);
                const datos = Object.fromEntries(formData.entries());
                let titulo = '';
                btn.disabled = false;
                btn.textContent = 'Crear Docente';
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Guardar';
                // Archivo
                const firmaUrl = $('#firma_url')[0].files[0];
                if (firmaUrl) {
                    formData.append('firma_url', firmaUrl);
                }

                $.ajax({
                    url: URL_DOCENTES,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    dataType: 'json',
                    success: async function(res) {
                        Swal.close();
                        if (res.success) {
                            document.getElementById('passwordGenerada').value =
                                res.password_generada;
                            document.getElementById('asignar_email').value = datos.email ?? '';
                            modalBS.hide();
                            const btnPdf = document.getElementById('btnDescargarPdf');
                            btnPdf.dataset.docenteId = res.docente.id;
                            abrirModalBSPasswordGenerada();
                            await cargarTabla(location.href);
                            document.getElementById('modalBSPasswordGenerada')
                                .addEventListener('hidden.bs.modal', function() {
                                    Swal.fire({
                                        icon: 'success',
                                        title: res.message,
                                        timer: 1600,
                                        showConfirmButton: false,
                                    });
                                });
                        } else {
                            mostrarToast('error', res.message);
                        }
                    },
                    error: function(xhr) {
                        Swal.close();
                        if (xhr.responseJSON.message.includes('validation.')) {
                            mostrarToast('error', 'Verifique los datos ingresados');
                        } else {
                            mostrarToast('error', "Error al crear el docente");
                        }

                        mostrarErroresModal(xhr.responseJSON.errors);
                    },
                    complete: function() {
                        $('#btnCrearDocente').prop('disabled', false).text('Crear Docente');
                    }
                });

            } else {
                const btn = document.getElementById('btnDocente');
                btn.disabled = true;
                btn.textContent = 'Guardando…';
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Guardando…';
                const formData = new FormData(this);
                const datos = Object.fromEntries(formData.entries());
                const id = id_editar;
                btn.disabled = false;
                btn.textContent = 'Guardar';
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Guardar';
                let titulo = '';
                let texto = '';

                formData.append('_method', 'PUT');
                $.ajax({
                    url: `${URL_DOCENTES}/${id}`,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    dataType: 'json',
                    success: async function(res) {
                        Swal.close();
                        if (res.success && res.password_generada) {
                            document.getElementById('passwordGenerada').value =
                                res.password_generada;
                            document.getElementById('asignar_email').value = datos.email ?? '';
                            modalBS.hide();
                            const btnPdf = document.getElementById('btnDescargarPdf');
                            btnPdf.dataset.docenteId = res.docente.id;
                            btnPdf.dataset.nombre = res.docente.nombre;
                            abrirModalBSPasswordGeneradaEditar();
                            await cargarTabla(location.href);
                            document.getElementById('modalBSPasswordGenerada')
                                .addEventListener('hidden.bs.modal', function() {
                                    Swal.fire({
                                        icon: 'success',
                                        title: res.message,
                                        timer: 1600,
                                        showConfirmButton: false,
                                    });
                                });
                        } else if (res.success) {
                            modalBS.hide();
                            Swal.fire({
                                icon: 'success',
                                title: res.message,
                                timer: 1600,
                                showConfirmButton: false,
                            });
                            await cargarTabla(location.href);
                        }
                    },
                    error: function(xhr) {
                        Swal.close();
                        if (xhr.responseJSON.message.includes('validation.')) {
                            mostrarToast('error', 'Verifique los datos ingresados');
                        } else {
                            mostrarToast('error', "Error al crear el docente");
                        }

                        mostrarErroresModal(xhr.responseJSON.errors);
                    },
                    complete: function() {
                        $('#btnCrearDocente').prop('disabled', false).text('Crear Docente');
                    }
                });
            }
        });



        /* ── Eliminar docente (AJAX) ─────────────────────────────────── */
        document.addEventListener('click', async function(e) {
            const btn = e.target.closest('#btn-eliminar');
            if (!btn) return;

            const id = btn.dataset.id;
            const nombre = btn.dataset.nombre;
            const apellido = btn.dataset.apellido;

            const confirmacion = await Swal.fire({
                title: '¿Eliminar docente?',
                text: `"${nombre} ${apellido}" será eliminado.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#DC2626',
                cancelButtonColor: '#94A3B8',
                iconColor: '#F59E0B',
            });

            if (!confirmacion.isConfirmed) return;

            const res = await ajaxRequest(`${URL_DOCENTES}/${id}`, 'DELETE');

            if (res.success) {
                const fila = document.getElementById(`fila-${id}`);
                if (fila) {
                    fila.style.transition = 'opacity .25s';
                    fila.style.opacity = '0';
                    setTimeout(() => {
                        fila.remove();
                        if (!document.querySelector('#contenedorTabla tbody tr[id^="fila-"]')) {
                            cargarTabla(URL_DOCENTES);
                        }
                    }, 250);
                }
                mostrarToast('success', res.message);
            } else {
                mostrarToast('error', res.message || 'Error al eliminar');
            }
        });

        function verPassword(inputId, iconId) {
            const icon = $(iconId)[0];
            const input = $(inputId)[0];

            if (input.type == 'password') {
                input.type = 'text';
                $(icon).removeClass('fa-eye').addClass('fa-eye-slash');
            } else {
                input.type = 'password';
                $(icon).removeClass('fa-eye-slash').addClass('fa-eye');
            }
        }

        function validarPasswords(passwordId, passwordConfirmationId, mensajeId) {
            const password = document.getElementById(passwordId);
            const passwordConfirmation = document.getElementById(passwordConfirmationId);
            const mensaje = document.getElementById(mensajeId);


            if (!passwordConfirmation.value) {
                mensaje.textContent = '';
                return;
            }

            if (password.value === passwordConfirmation.value) {
                mensaje.textContent = 'Las contraseñas coinciden';
                mensaje.className = 'text-success';
            } else {
                mensaje.textContent = 'Las contraseñas no coinciden';
                mensaje.className = 'text-danger';
            }
        }
        // Generar contraseña aleatoria.
        // Esta función se utiliza para generar una contraseña aleatoria cuando se crea un nuevo docente.
        function generarPasswordAleatoria() {
            const length = 8;
            const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let password = '';
            for (let i = 0; i < length; i++) {
                password += charset.charAt(Math.floor(Math.random() * charset.length));
            }
            return password;
        }

        $("#btnGenerarPassword").click(function() {
            const password = generarPasswordAleatoria();
            $("#password").val(password);
            $("#password_confirmation").val(password);
            validarPasswords('password', 'password_confirmation', 'mensajePassword');
        });

        $("#password").on('input', function() {
            validarPasswords('password', 'password_confirmation', 'mensajePassword');
        });

        $("#password_confirmation").on('input', function() {
            validarPasswords('password', 'password_confirmation', 'mensajePassword');
        });

        function cargarDatosDocente(id) {
            fetch(`${URL_DOCENTES}/datos/${id}`)
                .then(response => response.json())
                .then(resp => {
                    if (!resp.success) throw new Error('No data');
                    mapearDatosDocente(resp.data);
                })
                .catch(error => {
                    mostrarToast('error', 'No se pudo cargar la información del docente');
                });
        }

        function mapearDatosDocente(data) {
            $('#nombre').val(data.user.nombre);
            $('#apellido').val(data.user.apellido);
            $('#email').val(data.user.email);
            $('#identificacion').val(data.user.identificacion);
            $('#telefono').val(data.telefono);
            $('#direccion').val(data.direccion);
            $('#especialidad').val(data.especialidad);
            $('#fecha_ingreso').val(data.fecha_ingreso_set);

            // El input file siempre vacío
            $('#firma_url').val('');

            // Mostrar la firma existente
            $('#imgPreviewFirma').attr(
                'src',
                data.firma_url ||
                'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMmyTPv4M5fFPvYLrMzMQcPD_VO34ByNjouQ&s'
            );
            id_editar = data.user.id;
        }

        $(document).on('change', '.toggle-activo', function() {

            let checkbox = $(this);
            let id = checkbox.data('id');
            let nombre = checkbox.data('nombre');
            let apellido = checkbox.data('apellido');

            // Si se está activando, ejecutar directamente
            if (checkbox.prop('checked')) {
                actualizarEstado(id, checkbox);
                return;
            }

            // Solo mostrar confirmación al desactivar
            Swal.fire({
                title: `¿Desactivar a ${nombre} ${apellido} ?`,
                html: `
        Se cerrará cualquier sesión activa de este docente.
        <br><br>
        Las asignaciones de grupos quedarán liberadas.
    `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Desactivar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    actualizarEstado(id, checkbox);
                } else {
                    // Revertir el switch
                    checkbox.prop('checked', true);
                }
            });

        });

        // Actualizar el estado del docente.
        function actualizarEstado(id, checkbox) {
            $.ajax({
                url: `${URL_DOCENTES}/${id}/toggle-activo`,
                type: 'PATCH',
                data: {
                    _token: $('meta[name="csrf-token"]').attr('content')
                },
                success: function(response) {
                    Swal.fire({
                        icon: 'success',
                        title: response.estado === 'activo' ?
                            'Docente activado' : 'Docente desactivado',
                        text: response.estado === 'inactivo' && response.asignaciones_liberadas > 0 ?
                            `Se liberaron ${response.asignaciones_liberadas} asignación(es) de grupo.` :
                            undefined,
                        timer: response.estado === 'inactivo' && response.asignaciones_liberadas > 0 ?
                            undefined : 1500,
                        showConfirmButton: response.estado === 'inactivo' && response
                            .asignaciones_liberadas > 0,
                    });

                    if (response.estado === 'inactivo') {
                        refrescarModalDocentesAsignadosSiAbierto();
                    }
                },
                error: function() {
                    // Revertir el estado si falla
                    checkbox.prop('checked', !checkbox.prop('checked'));
                    Swal.fire(
                        'Error',
                        'No fue posible actualizar el estado.',
                        'error'
                    );
                }
            });
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
        // Descargar PDF del docente seleccionado.
        document.getElementById('btnDescargarPdf')
            .addEventListener('click', function() {
                const id = this.dataset.docenteId;
                window.open(`${URL_DOCENTES}/${id}/generar-pdf`, '_blank');
            });

        //Previsualizar imagen de la firma.
        //esta funcion se usa en el modal de docentes para previsualizar la imagen de la firma.
        function previewImage(event, previewSelector) {
            const input = event.target;
            const preview = document.querySelector(previewSelector);

            if (!input.files || !input.files.length) {
                return;
            }

            const file = input.files[0];

            if (!file.type.startsWith('image/')) {
                alert('Seleccione un archivo de imagen.');
                input.value = '';
                return;
            }

            const reader = new FileReader();

            reader.onload = function(e) {
                preview.src = e.target.result;
            };

            reader.readAsDataURL(file);
        }
    </script>
@endpush
