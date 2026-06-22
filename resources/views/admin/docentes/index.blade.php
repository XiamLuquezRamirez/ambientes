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

        .fila-cuenta-sin-usar {
            background: #FFFBEB;
        }

        .badge-cuenta-nueva {
            margin-left: 8px;
            vertical-align: middle;
            font-size: 0.7rem;
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
            color: rgb(21, 160, 67);
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

        .btn-reestablecer-contrasena {
            background: #EFF6FF;
            border-color: #BFDBFE;
            color: #1D4ED8;
        }

        .btn-reestablecer-contrasena:hover {
            background: #2563EB;
            border-color: #2563EB;
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
        #modalAsignarInfo .modal-content {
            border: none;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 32px 80px rgba(37, 99, 235, .22), 0 8px 24px rgba(0, 0, 0, .12);
        }

        #modalEditarDocente .modal-content {
            border: none;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 32px 80px rgba(37, 99, 235, .22), 0 8px 24px rgba(0, 0, 0, .12);
        }

        #modalEditarDocente .modal-header {
            background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
            border-bottom: none;
            padding: 20px 24px;
            gap: 14px;
            align-items: center;
        }

        #modalDocente .modal-header {
            background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
            border-bottom: none;
            padding: 20px 24px;
            gap: 14px;
            align-items: center;
        }

        #modalAsignarInfo .modal-header {
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
        #modalAsignarInfo .modal-title {
            font-family: 'Fredoka One', cursive;
            font-size: 1.2rem;
            color: #FFFFFF;
            line-height: 1.2;
        }

        #modalEditarDocente .modal-title {
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
        #modalAsignarInfo .btn-close {
            filter: brightness(0) invert(1);
            opacity: .75;
            transition: opacity .15s, transform .2s;
            margin-left: auto;
        }

        #modalDocente .btn-close:hover,
        #modalAsignarInfo .btn-close:hover {
            opacity: 1;
            transform: rotate(90deg);
        }

        #modalEditarDocente .btn-close:hover {
            opacity: 1;
            transform: rotate(90deg);
        }

        #modalEditarDocente .btn-close {
            filter: brightness(0) invert(1);
            opacity: .75;
            transition: opacity .15s, transform .2s;
            margin-left: auto;
        }

        #modalDocente .modal-body,
        #modalAsignarInfo .modal-body {
            padding: 28px;
        }

        #modalEditarDocente .modal-body {
            padding: 28px;
        }

        #modalDocente .modal-footer,
        #modalAsignarInfo .modal-footer {
            border-top: 1px solid #E2E8F0;
            padding: 16px 28px 24px;
            gap: 12px;
        }

        #modalEditarDocente .modal-footer {
            border-top: 1px solid #E2E8F0;
            padding: 16px 28px 24px;
            gap: 12px;
        }

        /* Animación de entrada personalizada (reemplaza la de Bootstrap) */
        #modalDocente.fade .modal-dialog,
        #modalAsignarInfo.fade .modal-dialog,
        #modalEditarDocente.fade .modal-dialog {
            transform: scale(0.85) translateY(-30px);
            opacity: 0;
            transition: transform .35s cubic-bezier(.34, 1.56, .64, 1), opacity .25s ease;
        }

        #modalDocente.show .modal-dialog,
        #modalAsignarInfo.show .modal-dialog,
        #modalEditarDocente.show .modal-dialog {
            transform: scale(1) translateY(0);
            opacity: 1;
        }
    </style>
    <link rel="stylesheet" href="{{ asset('assets/css/docente/index.css') }}">
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
    <div class="modal fade" id="modalDocente" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false"
        aria-labelledby="modalDocenteLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-header-icon"><i class="fas fa-user-graduate text-white"></i></div>
                    <div class="flex-grow-1">
                        <h5 class="modal-title mb-0" id="modalDocenteLabel">Nuevo Docente</h5>
                        <p class="modal-subtitle mb-0" id="modalDocenteSubtitle">Completa los datos para crear la cuenta</p>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar">
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
                    <form id="formCrearDocente" method="POST">
                        @csrf
                        <div class="tab-content" style="padding: 20px;">
                            <div class="tab-pane container active" id="datosPersonales">
                                <div class="row">
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
                                            <strong class="form-label">Identificación</strong>
                                            <input type="text" id="identificacion" name="identificacion"
                                                class="form-control" placeholder="Identificación del docente"
                                                value="{{ old('identificacion') }}">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <strong class="form-label">Telefono</strong>
                                            <input type="tel" id="telefono" name="telefono" class="form-control"
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
                                                <span style="color:#94A3B8;font-size:0.78rem">(mínimo 8 caracteres)</span>
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
                                        <button type="button" id="btnGenerarPassword" class="btn btn-primary"> Generar
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
                        style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        onclick="cerrarModalDocente()">Cancelar</button>
                    <button type="submit" form="formCrearDocente" id="btnCrearDocente"
                        class="btn btn-primary">Guardar</button>
                </div>
            </div>
        </div>
    </div>

    {{-- ── Modal Bootstrap 5 – Información de la Contraseña ──────────────────────── --}}
    <div class="modal fade" id="modalBSPasswordGenerada" tabindex="-1" data-bs-backdrop="static"
        data-bs-keyboard="false" aria-labelledby="modalBSPasswordGeneradaLabel" aria-hidden="false">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="modalBSPasswordGeneradaLabel">Información de la Contraseña</h5>
                </div>
                <div class="modal-body">
                    <p>La contraseña se ha creado correctamente. Por favor, anotarla antes de cerrar.</p>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <strong>Contraseña</strong>
                                <input type="text" id="passwordGenerada" class="form-control"
                                    value="{{ 'passwordGenerada' }}" readonly>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" onclick=" cerrarModalDocente()" class="btn btn-primary"
                            data-bs-dismiss="modal">Terminar</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    {{-- ── Modal Bootstrap 5 – Asignar Informacion Del Docente ──────────────────────── --}}
    <div class="modal fade" id="modalAsignarInfo" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false"
        aria-labelledby="modalAsignarInfoLabel" aria-hidden="false">
        <div class="modal-dialog modal-dialog-centered modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-header-icon"><i class="fas fa-user-graduate text-white"></i></div>
                    <div class="flex-grow-1">
                        <h5 class="modal-title mb-0" id="modalAsignarInfoLabel">Asignar Información</h5>
                        <p class="modal-subtitle mb-0">Completa los datos para crear la cuenta</p>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar">
                    </button>
                </div>

                <div class="modal-body">
                    <form id="formAsignarInfo" method="POST">
                        @csrf
                        @method('PUT')
                        <!-- Identificador del docente para enviar la actualización al endpoint PUT -->
                        <input type="hidden" name="id" id="asignar_docente_id">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <strong>Nombre</strong>
                                    <label id="asignar_nombre" class="form-control" readonly>
                                        -
                                    </label>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <strong class="form-label">Ambiente</strong>
                                    <select name="ambiente_id" id="asignar_ambiente_id" class="form-control">
                                        <option value="">— Selecciona un ambiente —</option>
                                        @foreach ($ambientes as $a)
                                            <option value="{{ $a->id }}">{{ $a->icono }}
                                                {{ $a->nombre }}
                                            </option>
                                        @endforeach
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <strong class="form-label">Grado</strong>
                                    <select name="grado_id" id="asignar_grado_id" class="form-control">
                                        <option value="">— Sin grado —</option>
                                        @foreach ($grados as $g)
                                            <option value="{{ $g->id }}">{{ $g->nombre }}</option>
                                        @endforeach
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <strong class="form-label">Grupos</strong>
                                    <select name="grupo_id" id="asignar_grupos_id" class="form-control">
                                        <option value="">— Sin grupos —</option>
                                        @foreach ($grupos as $gr)
                                            <option value="{{ $gr->id }}">{{ $gr->nombre }}</option>
                                        @endforeach
                                    </select>
                                </div>
                            </div>
                            <div class="mb-3">
                                <strong class="form-label">Descripción</strong>
                                <textarea name="descripcion" id="asignar_descripcion" class="form-control" rows="3"></textarea>
                            </div>

                        </div>
                    </form>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn"
                        style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        onclick="cerrarModalAsignarInfo()">Cancelar</button>
                    <button type="submit" form="formAsignarInfo" id="btnAsignarInfo" class="btn btn-primary">Guardar
                        Datos</button>
                </div>
            </div>
        </div>
    </div>
@endsection

@push('scripts')
    <script>
        const URL_DOCENTES = "{{ route('admin.docentes') }}";
        var tipoPost = 1; // 1: Crear, 2: Editar
        var id_editar = '';
    </script>
    <script>
        /* ── Bootstrap Modal ─────────────────────────────────────────── */
        const modalBS = new bootstrap.Modal(document.getElementById('modalDocente'));
        const modalBSAsignarInfo = new bootstrap.Modal(document.getElementById('modalAsignarInfo'));
        const modalBSPasswordGenerada = new bootstrap.Modal(document.getElementById('modalBSPasswordGenerada'));

        // Al cerrar cualquier modal, limpiar errores y resetear el formulario correspondiente.
        document.getElementById('modalDocente').addEventListener('hidden.bs.modal', function() {
            limpiarErroresModal();
            document.getElementById('formCrearDocente').reset();
        });
        document.getElementById('modalAsignarInfo').addEventListener('hidden.bs.modal', function() {
            limpiarErroresModal();
            document.getElementById('formAsignarInfo').reset();
        });

        function abrirModal() {
            $("#modalDocenteLabel").text('Crear Docente');
            $("#modalDocenteSubtitle").text('Completa los datos para crear la cuenta');
            tipoPost = 1;
            modalBS.show();
        }

        function abrirModalEditar(id) {
            $("#modalDocenteLabel").text('Editar Docente');
            $("#modalDocenteSubtitle").text('Completa los datos para editar el docente');
            tipoPost = 2;
            cargarDatosDocente(id);
            modalBS.show();
        }

        /* ── Cerrar modal Nuevo Docente ─────────────────────────── */
        function cerrarModalDocente() {
            bootstrap.Tab.getOrCreateInstance(
                $('a[href="#datosPersonales"]')[0]
            ).show();
            document.activeElement?.blur();
            modalBS.hide();
        }

        // Carga la información del docente seleccionado y abre el modal de completar datos.
        function abrirModalAsignarGrado(id) {
            fetch(`${URL_DOCENTES}/${id}`)
                .then(response => response.json())
                .then(resp => {
                    if (!resp.success) throw new Error('No data');
                    const data = resp.data;
                    document.getElementById('asignar_docente_id').value = data.id;
                    document.getElementById('asignar_nombre').textContent = data.nombre ?? '';
                    const docente = data.docente ?? {};
                    const carga = data.carga ?? {};
                    document.getElementById('asignar_descripcion').value = docente.descripcion ?? '';
                    // Los IDs de asignación provienen de carga_docente, no de la tabla docentes.
                    document.getElementById('asignar_ambiente_id').value = carga.ambiente_id ?? '';
                    document.getElementById('asignar_grado_id').value = carga.grado_id ?? '';
                    document.getElementById('asignar_grupos_id').value = carga.grupo_id ?? '';

                    modalBSAsignarInfo.show();
                })
                .catch(error => {
                    console.error('Error:', error);
                    mostrarToast('error', 'No se pudo cargar la información del docente');
                });
        }

        /* ── Cerrar modal Asignar Información ─────────────────────────── */
        function cerrarModalAsignarInfo() {
            document.activeElement?.blur();
            modalBSAsignarInfo.hide();
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
            document.querySelectorAll('#formCrearDocente .campo-error, #formAsignarInfo .campo-error').forEach(el => el
                .remove());
            document.querySelectorAll('#formCrearDocente .is-invalid, #formAsignarInfo .is-invalid').forEach(el => el
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

        function abrirModalBSPasswordGenerada() {
            modalBSPasswordGenerada.show();
        }

        /* ── Crear docente (AJAX) ────────────────────────────────────── */
        document.getElementById('formCrearDocente').addEventListener('submit', async function(e) {
            e.preventDefault();

            if (tipoPost == 1) {
                const btn = document.getElementById('btnCrearDocente');
                btn.disabled = true;
                btn.textContent = 'Guardando…';

                const formData = new FormData(this);
                const datos = Object.fromEntries(formData.entries());
                const res = await ajaxRequest(URL_DOCENTES, 'POST', datos);

                btn.disabled = false;
                btn.textContent = 'Crear Docente';
                if (res.success) {
                    document.getElementById('passwordGenerada').value =
                        res.password_generada;

                    abrirModalBSPasswordGenerada();

                    mostrarToast('success', res.message);

                    await cargarTabla(location.href);
                } else if (res.errors && Object.keys(res.errors).length) {
                    mostrarErroresModal(res.errors);
                } else {
                    mostrarToast('error', res.message || 'Error al crear el docente');
                }
            } else {
                const btn = document.getElementById('btnCrearDocente');
                btn.disabled = true;
                btn.textContent = 'Guardando…';
                const formData = new FormData(this);
                const datos = Object.fromEntries(formData.entries());
                const id = id_editar;
                const res = await ajaxRequest(`${URL_DOCENTES}/${id}`, 'PUT', datos);
                btn.disabled = false;
                btn.textContent = 'Guardar';

                if (res.success && res.password_generada) {
                    document.getElementById('passwordGenerada').value =
                        res.password_generada;
                    abrirModalBSPasswordGenerada();
                    mostrarToast('success', res.message || 'Datos del docente actualizados.');
                    await cargarTabla(location.href);
                } else if (res.success) {
                    mostrarToast('success', res.message || 'Datos del docente actualizados.');
                    await cargarTabla(location.href);
                } else if (res.errors && Object.keys(res.errors).length) {
                    mostrarErroresModal(res.errors);
                }
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
        document.getElementById('formAsignarInfo').addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = document.getElementById('btnAsignarInfo');
            btn.disabled = true;
            btn.textContent = 'Guardando…';

            const formData = new FormData(this);
            const datos = Object.fromEntries(formData.entries());
            const id = datos.id;
            const res = await ajaxRequest(`${URL_DOCENTES}/${id}/asignar-info`, 'PUT', datos);

            btn.disabled = false;
            btn.textContent = 'Guardar Datos';

            if (res.success) {
                modalBSAsignarInfo.hide();
                mostrarToast('success', res.message);
                await cargarTabla(location.href);
            } else if (res.errors && Object.keys(res.errors).length) {
                mostrarToast('error', 'Errores de validación');
            } else {
                mostrarToast('error', res.message || 'Error al guardar');
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
        Los datos académicos y grupos asignados no serán eliminados.
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
                        title: response.estado ?
                            'Docente activado' : 'Docente desactivado',
                        timer: 1500,
                        showConfirmButton: false
                    });
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
    </script>
@endpush
