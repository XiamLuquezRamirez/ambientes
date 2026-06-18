@extends('layouts.admin')
@section('title', 'Docentes')

@push('styles')
    <style>
        /* ── Buscador ────────────────────────────────────────────────── */
        .input-buscar {
            position: relative;
            flex: 1;
            min-width: 220px;
        }

        .input-buscar input {
            width: 100%;
            background: #FFFFFF;
            border: 1px solid #CBD5E1;
            border-radius: 8px;
            padding: 9px 14px 9px 38px;
            color: #1E293B;
            font-family: 'Nunito', sans-serif;
            font-size: 0.9rem;
            outline: none;
            transition: border-color .15s, box-shadow .15s;
        }

        .input-buscar input:focus {
            border-color: #2563EB;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, .12);
        }

        .input-buscar input::placeholder {
            color: #94A3B8;
        }

        .input-buscar .icono-buscar {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #94A3B8;
            font-size: 0.95rem;
            pointer-events: none;
        }

        /* ── Paginación ──────────────────────────────────────────────── */
        .paginacion-wrapper {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 20px;
            flex-wrap: wrap;
            gap: 12px;
        }

        .paginacion-info {
            font-size: 0.82rem;
            color: #64748B;
        }

        .paginacion-controles {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }

        .pag-btn {
            display: inline-flex;
            align-items: center;
            padding: 6px 12px;
            border-radius: 7px;
            font-size: 0.82rem;
            font-family: 'Nunito', sans-serif;
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            color: #64748B;
            text-decoration: none;
            transition: all .15s;
            cursor: pointer;
        }

        .pag-btn:hover {
            background: #EFF6FF;
            color: #1E40AF;
            border-color: #BFDBFE;
        }

        .pag-btn-activo {
            background: #2563EB;
            border-color: #2563EB;
            color: #FFFFFF;
            font-weight: 700;
        }

        .pag-btn-disabled {
            opacity: .4;
            cursor: not-allowed;
            pointer-events: none;
        }

        /* ── Acciones en tabla ───────────────────────────────────────── */
        .tabla-acciones {
            display: flex;
            gap: 6px;
        }

        .btn-accion {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.76rem;
            font-family: 'Nunito', sans-serif;
            cursor: pointer;
            border: 1px solid transparent;
            text-decoration: none;
            transition: all .15s;
        }

        .btn-asignar-grado {
            background: #e2ffed;
            border-color: #a0f5be;
            color: #19c051;
        }

        .btn-asignar-grado:hover {
            background: #19c051;
            border-color: #19c051;
            color: #fff;
        }

        .btn-editar {
            background: #EFF6FF;
            border-color: #BFDBFE;
            color: #1D4ED8;
        }

        .btn-editar:hover {
            background: #2563EB;
            border-color: #2563EB;
            color: #fff;
        }

        .btn-eliminar {
            background: #FEF2F2;
            border-color: #FECACA;
            color: #DC2626;
        }

        .btn-eliminar:hover {
            background: #DC2626;
            border-color: #DC2626;
            color: #fff;
        }

        /* ── Loading overlay ─────────────────────────────────────────── */
        #cargando-tabla {
            display: none;
            text-align: center;
            padding: 40px;
            color: #64748B;
            font-size: 0.9rem;
        }

        /* ── Errores de campo ────────────────────────────────────────── */
        .campo-error {
            color: #DC2626;
            font-size: 0.78rem;
            margin-top: 4px;
        }

        .form-control.is-invalid {
            border-color: #DC2626 !important;
        }

        /* ── Modal – estilos visuales sobre Bootstrap ────────────────── */
        #modalDocente .modal-content,
        #modalAsignarDocente .modal-content {
            border: none;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 32px 80px rgba(37, 99, 235, .22), 0 8px 24px rgba(0, 0, 0, .12);
        }

        #modalDocente .modal-header,
        #modalAsignarDocente .modal-header {
            background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
            border-bottom: none;
            padding: 20px 24px;
            gap: 14px;
            align-items: center;
        }

        .modal-header-icon {
            width: 44px;
            height: 44px;
            background: rgba(255, 255, 255, .15);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.35rem;
            flex-shrink: 0;
        }

        #modalDocente .modal-title,
        #modalAsignarDocente .modal-title {
            font-family: 'Fredoka One', cursive;
            font-size: 1.2rem;
            color: #FFFFFF;
            line-height: 1.2;
        }

        .modal-subtitle {
            font-size: 0.78rem;
            color: rgba(255, 255, 255, .65);
            margin: 2px 0 0;
        }

        #modalDocente .btn-close,
        #modalAsignarDocente .btn-close {
            filter: brightness(0) invert(1);
            opacity: .75;
            transition: opacity .15s, transform .2s;
            margin-left: auto;
        }

        #modalDocente .btn-close:hover,
        #modalAsignarDocente .btn-close:hover {
            opacity: 1;
            transform: rotate(90deg);
        }

        #modalDocente .modal-body,
        #modalAsignarDocente .modal-body {
            padding: 28px;
        }

        #modalDocente .modal-footer,
        #modalAsignarDocente .modal-footer {
            border-top: 1px solid #E2E8F0;
            padding: 16px 28px 24px;
            gap: 12px;
        }

        /* Animación de entrada personalizada (reemplaza la de Bootstrap) */
        #modalDocente.fade .modal-dialog,
        #modalAsignarDocente.fade .modal-dialog {
            transform: scale(0.85) translateY(-30px);
            opacity: 0;
            transition: transform .35s cubic-bezier(.34, 1.56, .64, 1), opacity .25s ease;
        }

        #modalDocente.show .modal-dialog,
        #modalAsignarDocente.show .modal-dialog {
            transform: scale(1) translateY(0);
            opacity: 1;
        }
    </style>
@endpush

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
        <div>
            <h1>Docentes</h1>
            <p>Gestión de cuentas de docentes y administradores</p>
        </div>
        <button class="btn btn-primary" onclick="abrirModal()"><i class="fas fa-plus"></i> Nuevo Docente</button>
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
            @foreach (['admin' => 'Administrador', 'docente_lider' => 'Docente Líder', 'docente_auxiliar' => 'Docente Auxiliar'] as $val => $label)
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

    <div class="modal fade" id="modalDocente" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false"
        aria-labelledby="modalDocenteLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">

                <div class="modal-header">
                    <div class="modal-header-icon"><i class="fas fa-user-graduate text-white"></i></div>
                    <div class="flex-grow-1">
                        <h5 class="modal-title mb-0" id="modalDocenteLabel">Nuevo Docente</h5>
                        <p class="modal-subtitle mb-0">Completa los datos para crear la cuenta</p>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar">
                    </button>
                </div>

                <div class="modal-body">
                    <form id="formCrearDocente">
                        @csrf
                        <div class="mb-3">
                            <label class="form-label">Nombre completo</label>
                            <input type="text" name="nombre" class="form-control" autocomplete="off">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Correo electrónico</label>
                            <input type="email" name="email" class="form-control" autocomplete="off">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Contraseña
                                <span style="color:#94A3B8;font-size:0.78rem">(mínimo 8 caracteres)</span>
                            </label>
                            <input type="password" name="password" class="form-control">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Rol</label>
                            <select name="rol" class="form-control">
                                @foreach (['admin' => 'Administrador', 'docente_lider' => 'Docente Líder', 'docente_auxiliar' => 'Docente Auxiliar'] as $val => $label)
                                    <option value="{{ $val }}">{{ $label }}</option>
                                @endforeach
                            </select>
                        </div>
                        <div class="mb-0">
                            <label class="form-label">Ambiente
                                <span style="color:#94A3B8;font-size:0.78rem">(no aplica si es Administrador)</span>
                            </label>
                            <select name="ambiente_id" class="form-control">
                                <option value="">— Sin ambiente —</option>
                                @foreach ($ambientes as $a)
                                    <option value="{{ $a->id }}">{{ $a->icono }} {{ $a->nombre }}</option>
                                @endforeach
                            </select>
                        </div>
                    </form>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" form="formCrearDocente" id="btnCrearDocente" class="btn btn-primary">Crear
                        Docente</button>
                </div>

            </div>
        </div>
    </div>
    {{-- ── Modal Bootstrap 5 – Asignar Grado ──────────────────────── --}}

    <div class="modal fade" id="modalAsignarDocente" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false"
        aria-labelledby="modalAsignarDocenteLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">

                <div class="modal-header">
                    <div class="modal-header-icon"><i class="fa-solid fa-list text-white"></i></div>
                    <div class="flex-grow-1">
                        <h5 class="modal-title mb-0" id="modalAsignarDocenteLabel"> Completar Datos</h5>
                        <p class="modal-subtitle mb-0">Completa los datos faltantes del docente seleccionado</p>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar">
                    </button>
                </div>

                <div class="modal-body">
                    <form id="formAsignarDocente">
                        @csrf
                        <!-- Identificador del docente para enviar la actualización al endpoint PUT -->
                        <input type="hidden" name="id" id="asignar_docente_id">

                        <div class="mb-3">
                            <label class="form-label">Nombre</label>
                            <input type="text" name="nombre" id="asignar_nombre" class="form-control" readonly>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Correo</label>
                            <input type="email" name="email" id="asignar_email" class="form-control" readonly>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Teléfono</label>
                            <input type="text" name="telefono" id="asignar_telefono" class="form-control">
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Especialidad</label>
                            <input type="text" name="especialidad" id="asignar_especialidad" class="form-control">
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Fecha de ingreso</label>
                            <input type="date" name="fecha_ingreso" id="asignar_fecha_ingreso" class="form-control">
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Grado</label>
                            <select name="grado_id" id="asignar_grado_id" class="form-control">
                                <option value="">— Sin grado —</option>
                                @foreach ($grados as $g)
                                    <option value="{{ $g->id }}">{{ $g->nombre }}</option>
                                @endforeach
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Descripción</label>
                            <textarea name="descripcion" id="asignar_descripcion" class="form-control" rows="3"></textarea>
                        </div>
                    </form>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn"
                        style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" form="formAsignarDocente" id="btnAsignarDocente"
                        class="btn btn-primary">Guardar
                        Datos</button>
                </div>

            </div>
        </div>
    </div>
@endsection

@push('scripts')
    <script>
        const URL_DOCENTES = "{{ route('admin.docentes') }}";

        /* ── Bootstrap Modal ─────────────────────────────────────────── */
        const modalBS = new bootstrap.Modal(document.getElementById('modalDocente'));
        const modalBSAsignarGrado = new bootstrap.Modal(document.getElementById('modalAsignarDocente'));

        // Al cerrar cualquier modal, limpiar errores y resetear el formulario correspondiente.
        document.getElementById('modalDocente').addEventListener('hidden.bs.modal', function() {
            limpiarErroresModal();
            document.getElementById('formCrearDocente').reset();
        });
        document.getElementById('modalAsignarDocente').addEventListener('hidden.bs.modal', function() {
            limpiarErroresModal();
            document.getElementById('formAsignarDocente').reset();
        });

        function abrirModal() {
            modalBS.show();
        }

        // Carga la información del docente seleccionado y abre el modal de completar datos.
        function abrirModalAsignarGrado(id) {
            fetch(`${URL_DOCENTES}/${id}`)
                .then(response => response.json())
                .then(resp => {
                    if (!resp.success) throw new Error('No data');
                    const data = resp.data;

                    document.getElementById('asignar_docente_id').value = data.id;
                    document.getElementById('asignar_nombre').value = data.nombre ?? '';
                    document.getElementById('asignar_email').value = data.email ?? '';
                    const docente = data.docente ?? {};
                    document.getElementById('asignar_telefono').value = docente.telefono ?? '';
                    document.getElementById('asignar_especialidad').value = docente.especialidad ?? '';
                    if (docente.fecha_ingreso) {
                        const d = new Date(docente.fecha_ingreso);
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        document.getElementById('asignar_fecha_ingreso').value = `${yyyy}-${mm}-${dd}`;
                    } else {
                        document.getElementById('asignar_fecha_ingreso').value = '';
                    }
                    document.getElementById('asignar_descripcion').value = docente.descripcion ?? '';
                    document.getElementById('asignar_grado_id').value = docente.grado_id ?? '';

                    modalBSAsignarGrado.show();
                })
                .catch(error => {
                    console.error('Error:', error);
                    mostrarToast('error', 'No se pudo cargar la información del docente');
                });
        }

        function cerrarModal() {
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
            document.querySelectorAll('#formCrearDocente .campo-error, #formAsignarDocente .campo-error').forEach(el => el
                .remove());
            document.querySelectorAll('#formCrearDocente .is-invalid, #formAsignarDocente .is-invalid').forEach(el => el
                .classList.remove('is-invalid'));
        }

        function mostrarErroresModal(errors) {
            limpiarErroresModal();
            for (const [campo, mensajes] of Object.entries(errors)) {
                const input = document.querySelector(`#formCrearDocente [name="${campo}"]`);
                if (!input) continue;
                input.classList.add('is-invalid');
                const div = document.createElement('div');
                div.className = 'campo-error';
                div.textContent = mensajes[0];
                input.insertAdjacentElement('afterend', div);
            }
            const primero = document.querySelector('#formCrearDocente .is-invalid');
            if (primero) primero.focus();
        }

        /* ── Crear docente (AJAX) ────────────────────────────────────── */
        document.getElementById('formCrearDocente').addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = document.getElementById('btnCrearDocente');
            btn.disabled = true;
            btn.textContent = 'Guardando…';

            const formData = new FormData(this);
            const datos = Object.fromEntries(formData.entries());
            if (!datos.ambiente_id) datos.ambiente_id = null;

            const res = await ajaxRequest(URL_DOCENTES, 'POST', datos);

            btn.disabled = false;
            btn.textContent = 'Crear Docente';

            if (res.success) {
                cerrarModal();
                mostrarToast('success', res.message);
                await cargarTabla(location.href);
            } else if (res.errors && Object.keys(res.errors).length) {
                mostrarErroresModal(res.errors);
            } else {
                mostrarToast('error', res.message || 'Error al crear el docente');
            }
        });

        /* ── Eliminar docente (AJAX) ─────────────────────────────────── */
        document.addEventListener('click', async function(e) {
            const btn = e.target.closest('.btn-eliminar');
            if (!btn) return;

            const id = btn.dataset.id;
            const nombre = btn.dataset.nombre;

            const confirmacion = await Swal.fire({
                title: '¿Eliminar docente?',
                text: `"${nombre}" será eliminado permanentemente.`,
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

        /* ── Asignar / Completar datos docente ───────────────────────── */
        // Envía al backend los datos adicionales del docente seleccionado.
        // Este formulario trabaja con el modal de completar datos y actualiza el perfil del docente.
        document.getElementById('formAsignarDocente').addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = document.getElementById('btnAsignarDocente');
            btn.disabled = true;
            btn.textContent = 'Guardando…';

            const formData = new FormData(this);
            const datos = Object.fromEntries(formData.entries());
            const id = datos.id;

            const res = await ajaxRequest(`${URL_DOCENTES}/${id}`, 'PUT', datos);

            btn.disabled = false;
            btn.textContent = 'Guardar Datos';

            if (res.success) {
                modalBSAsignarGrado.hide();
                mostrarToast('success', res.message);
                await cargarTabla(location.href);
            } else if (res.errors && Object.keys(res.errors).length) {
                mostrarToast('error', 'Errores de validación');
            } else {
                mostrarToast('error', res.message || 'Error al guardar');
            }
        });
    </script>
@endpush
