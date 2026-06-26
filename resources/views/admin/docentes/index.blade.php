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

        .asignaciones-actuales {
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 12px;
            background: #F8FAFC;
        }

        .asignaciones-actuales ul {
            list-style: none;
            margin: 8px 0 0;
            padding: 0;
            display: grid;
            gap: 8px;
        }

        .asignaciones-actuales li {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 8px 10px;
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            background: #FFFFFF;
            color: #334155;
            font-size: .86rem;
        }

        /* ── Modal – estilos visuales sobre Bootstrap ────────────────── */
        #modalDocente .modal-content,
        #modalAsignarInfo .modal-content,
        #modalDocentesAsignados .modal-content {
            border: none;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 32px 80px rgba(37, 99, 235, .22), 0 8px 24px rgba(0, 0, 0, .12);
        }

        #modalEditarDocente .modal-content,
        #modalBSPasswordGenerada .modal-content {
            border: none;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 32px 80px rgba(37, 99, 235, .22), 0 8px 24px rgba(0, 0, 0, .12);
        }

        #modalEditarDocente .modal-header,
        #modalBSPasswordGenerada .modal-header,
        #modalDocentesAsignados .modal-header {
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

        #modalEditarDocente .modal-title,
        #modalBSPasswordGenerada .modal-title,
        #modalDocentesAsignados .modal-title {
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
        #modalAsignarInfo .btn-close,
        #modalDocentesAsignados .btn-close {
            filter: brightness(0) invert(1);
            opacity: .75;
            transition: opacity .15s, transform .2s;
            margin-left: auto;
        }

        #modalDocente .btn-close:hover,
        #modalAsignarInfo .btn-close:hover,
        #modalDocentesAsignados .btn-close:hover {
            opacity: 1;
            transform: rotate(90deg);
        }

        #modalEditarDocente .btn-close:hover,
        #modalBSPasswordGenerada .btn-close:hover {
            opacity: 1;
            transform: rotate(90deg);
        }

        #modalEditarDocente .btn-close,
        #modalBSPasswordGenerada .btn-close {
            filter: brightness(0) invert(1);
            opacity: .75;
            transition: opacity .15s, transform .2s;
            margin-left: auto;
        }

        #modalDocente .modal-body,
        #modalAsignarInfo .modal-body,
        #modalDocentesAsignados .modal-body {
            padding: 28px;
        }

        #modalEditarDocente .modal-body,
        #modalBSPasswordGenerada .modal-body {
            padding: 28px;
        }

        #modalDocente .modal-footer,
        #modalAsignarInfo .modal-footer,
        #modalDocentesAsignados .modal-footer {
            border-top: 1px solid #E2E8F0;
            padding: 16px 28px 24px;
            gap: 12px;
        }

        #modalEditarDocente .modal-footer,
        #modalBSPasswordGenerada .modal-footer {
            border-top: 1px solid #E2E8F0;
            padding: 16px 28px 24px;
            gap: 12px;
        }

        /* Animación de entrada personalizada (reemplaza la de Bootstrap) */
        #modalDocente.fade .modal-dialog,
        #modalAsignarInfo.fade .modal-dialog,
        #modalEditarDocente.fade .modal-dialog,
        #modalBSPasswordGenerada.fade .modal-dialog,
        #modalDocentesAsignados.fade .modal-dialog {
            transform: scale(0.85) translateY(-30px);
            opacity: 0;
            transition: transform .35s cubic-bezier(.34, 1.56, .64, 1), opacity .25s ease;
        }

        #modalDocente.show .modal-dialog,
        #modalAsignarInfo.show .modal-dialog,
        #modalEditarDocente.show .modal-dialog,
        #modalBSPasswordGenerada.show .modal-dialog,
        #modalDocentesAsignados.show .modal-dialog {
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
    <div class="modal fade" id="modalDocente" tabindex="-1" data-bs-keyboard="false" aria-labelledby="modalDocenteLabel"
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
                                            <input type="number" id="identificacion" name="identificacion"
                                                class="form-control" placeholder="Identificación del docente"
                                                value="{{ old('identificacion') }}">
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
                                            <input type="file" id="firma" name="firma" class="form-control"
                                                accept="image/*" onchange="previewImage(event, '#imgPreviewFirma')">
                                        </div>
                                    </div>

                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <strong class="form-label">Vista previa de la firma</strong>
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
        aria-labelledby="modalBSPasswordGeneradaLabel" aria-hidden="false">
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

    {{-- ── Modal Bootstrap 5 – Asignar Informacion Del Docente ──────────────────────── --}}
    <div class="modal fade" id="modalAsignarInfo" tabindex="-1" data-bs-keyboard="false"
        aria-labelledby="modalAsignarInfoLabel" aria-hidden="false">
        <div class="modal-dialog modal-dialog-centered modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-header-icon"><i class="fas fa-user-graduate text-white"></i></div>
                    <div class="flex-grow-1">
                        <h5 class="modal-title mb-0" id="modalAsignarInfoLabel">Asignar grupo</h5>
                        <p class="modal-subtitle mb-0">Agrega una carga docente para el año actual</p>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar">
                    </button>
                </div>

                <div class="modal-body">
                    <form id="formAsignarInfo" method="POST">
                        @csrf
                        {{-- Modo: "docente" = asignar grupo a un docente | "grupo" = asignar docente a un grupo --}}
                        <input type="hidden" name="asignar_modo" id="asignar_modo" value="docente">
                        {{-- user_id del docente; solo se usa en modo "docente" --}}
                        <input type="hidden" name="id" id="asignar_docente_id">
                        <div class="row">
                            {{-- Visible solo en modo docente: muestra el nombre del docente seleccionado --}}
                            <div class="col-md-6" id="asignar-campo-docente-nombre">
                                <div class="mb-3">
                                    <strong>Docente</strong>
                                    <div id="asignar_nombre" class="form-control">-</div>
                                </div>
                            </div>

                            {{-- Visible solo en modo grupo: muestra grado+grupo precargados desde la fila --}}
                            <div class="col-md-6" id="asignar-campo-grupo-contexto" style="display:none">
                                <div class="mb-3">
                                    <strong>Grupo</strong>
                                    <div id="asignar_grupo_contexto" class="form-control">-</div>
                                </div>
                            </div>

                            {{-- Visible solo en modo grupo: el usuario elige qué docente asignar --}}
                            <div class="col-md-6" id="asignar-campo-docente-select" style="display:none">
                                <div class="mb-3">
                                    <strong class="form-label">Docente a asignar</strong>
                                    <select name="docente_id" id="asignar_docente_id_select" class="form-control">
                                        <option value="">— Selecciona un docente —</option>
                                        @foreach ($docentesActivos ?? [] as $docenteActivo)
                                            <option value="{{ $docenteActivo->id }}">
                                                {{ $docenteActivo->user->nombre }} {{ $docenteActivo->user->apellido }}
                                            </option>
                                        @endforeach
                                    </select>
                                </div>
                            </div>

                            <div class="col-md-6">
                                <div class="mb-3">
                                    <strong class="form-label">Ambiente</strong>
                                    <select name="ambiente_id" id="asignar_ambiente_id" class="form-control">
                                        <option value="">— Selecciona un ambiente —</option>
                                        @foreach ($ambientes as $a)
                                            <option value="{{ $a->id }}">
                                                {{ $a->icono }} {{ $a->nombre }}
                                            </option>
                                        @endforeach
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <strong class="form-label">Grado</strong>
                                    <select name="grado_id" id="asignar_grado_id" class="form-control">
                                        <option value="">— Selecciona un grado —</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <strong class="form-label">Año lectivo</strong>
                                    <input type="number" name="anio_lectivo" id="asignar_anio_lectivo"
                                        class="form-control" value="{{ date('Y') }}" readonly>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <strong class="form-label">Grupos</strong>
                                    <select name="grupo_id" id="asignar_grupos_id" class="form-control">
                                        <option value="">— Selecciona un grupo —</option>
                                    </select>
                                </div>
                            </div>
                            {{-- Solo en modo docente: historial de cargas del docente --}}
                            <div class="col-md-12" id="asignar-seccion-asignaciones-docente">
                                <div class="card p-4">
                                    <h1>Grupos asignados</h1>
                                    <p class="text-muted">Año lectivo {{ date('Y') }}</p>

                                    <div id="asignaciones_actuales_docente">
                                        Cargando...
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn"
                        style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        onclick="cerrarModalAsignarInfo()"><i class="fa-solid fa-xmark"></i> Cancelar</button>
                    <button type="submit" form="formAsignarInfo" id="btnAsignarInfo" class="btn btn-primary"><i
                            class="fa-solid fa-floppy-disk"></i> Guardar asignación</button>
                </div>
            </div>
        </div>
    </div>
    @include('admin.docentes.ver-accesos')
    @include('admin.docentes.ver_grupos')
@endsection

@push('scripts')
    <script>
        const URL_DOCENTES = "{{ route('admin.docentes') }}";
        const ANIO_LECTIVO_ACTUAL = "{{ date('Y') }}";
        // Endpoint para asignar docente a grupo (modo inverso al flujo docente→grupo).
        const URL_GRUPOS_ASIGNAR = "{{ url('admin/grupos') }}/:id/asignar-docente";
        var tipoPost = 1; // 1: Crear, 2: Editar
        var id_editar = '';
        // ID del grupo cuando se abre el modal desde la tabla global (modo "grupo").
        let grupoAsignarId = null;
    </script>
    <script>
        /* ── Bootstrap Modal ─────────────────────────────────────────── */
        const modalBS = new bootstrap.Modal(document.getElementById('modalDocente'));
        const modalBSAsignarInfo = new bootstrap.Modal(document.getElementById('modalAsignarInfo'));
        const modalBSPasswordGenerada = new bootstrap.Modal(document.getElementById('modalBSPasswordGenerada'));

        // Al cerrar cualquier modal, limpiar errores y resetear el formulario correspondiente.
        document.getElementById('modalDocente').addEventListener('hidden.bs.modal', function() {
            limpiarErroresModal();
            document.getElementById('formDocente').reset();
        });
        document.getElementById('modalAsignarInfo').addEventListener('hidden.bs.modal', function() {
            limpiarErroresModal();
            document.getElementById('formAsignarInfo').reset();
            document.getElementById('asignar_anio_lectivo').value = ANIO_LECTIVO_ACTUAL;
            renderizarAsignacionesActuales([]);
            // Restaurar modo por defecto al cerrar.
            grupoAsignarId = null;
            configurarModalAsignarModo('docente');
        });

        /**
         * Alterna la UI del modal según el flujo:
         * - docente: se elige grupo para un docente ya conocido.
         * - grupo: se elige docente para un grupo ya precargado.
         */
        function configurarModalAsignarModo(modo) {
            const esModoGrupo = modo === 'grupo';
            document.getElementById('asignar_modo').value = modo;

            document.getElementById('asignar-campo-docente-nombre').style.display = esModoGrupo ? 'none' : '';
            document.getElementById('asignar-campo-grupo-contexto').style.display = esModoGrupo ? '' : 'none';
            document.getElementById('asignar-campo-docente-select').style.display = esModoGrupo ? '' : 'none';
            document.getElementById('asignar-seccion-asignaciones-docente').style.display = esModoGrupo ? 'none' : '';

            // En modo grupo, grado y grupo vienen fijos desde la fila.
            document.getElementById('asignar_grado_id').disabled = esModoGrupo;
            document.getElementById('asignar_grupos_id').disabled = esModoGrupo;

            const titulo = document.getElementById('modalAsignarInfoLabel');
            const subtitulo = document.querySelector('#modalAsignarInfo .modal-subtitle');
            if (titulo) {
                titulo.textContent = esModoGrupo ? 'Asignar docente' : 'Asignar grupo';
            }
            if (subtitulo) {
                subtitulo.textContent = esModoGrupo ?
                    'Selecciona el docente y el ambiente para este grupo' :
                    'Agrega una carga docente para el año actual';
            }
        }

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
            limpiarErroresModal();
            document.activeElement?.blur();
            modalBSPasswordGenerada.hide();
        }


        /* ── Cerrar modal Nuevo Docente ─────────────────────────── */
        function cerrarModalDocente() {
            limpiarErroresModal();
            document.activeElement?.blur();
            modalBS.hide();
        }

        /* ── Cerrar modal Asignar Información ─────────────────────────── */
        function cerrarModalAsignarInfo() {
            limpiarErroresModal();
            document.activeElement?.blur();
            modalBSAsignarInfo.hide();
        }

        // Carga el docente y sus cargas actuales; la nueva asignación se elige en blanco para evitar duplicados accidentales.
        async function abrirModalAsignarGrado(id) {
            try {
                const resp = await ajaxRequest(`${URL_DOCENTES}/${id}`);
                if (!resp.success) throw new Error('No data');

                const data = resp.data;
                grupoAsignarId = null;
                configurarModalAsignarModo('docente');

                document.getElementById('formAsignarInfo').reset();
                document.getElementById('asignar_modo').value = 'docente';
                document.getElementById('asignar_docente_id').value = data.id;
                document.getElementById('asignar_nombre').textContent =
                    `${data.nombre ?? ''} ${data.apellido ?? ''}`.trim();
                document.getElementById('asignar_anio_lectivo').value = ANIO_LECTIVO_ACTUAL;
                document.getElementById('asignar_grado_id').innerHTML =
                    '<option value="">— Selecciona un grado —</option>';
                document.getElementById('asignar_grupos_id').innerHTML =
                    '<option value="">— Selecciona un grupo —</option>';
                renderizarAsignacionesActuales(data.asignaciones ?? []);

                modalBSAsignarInfo.show();
            } catch (error) {
                console.error('Error:', error);
                mostrarToast('error', 'No se pudo cargar la información del docente');
            }
        }

        function renderizarAsignacionesActuales(asignaciones) {
            const contenedor = document.getElementById('asignaciones_actuales_docente');
            const docenteId = document.getElementById('asignar_docente_id').value;

            if (!asignaciones.length) {
                contenedor.innerHTML = `
            <div class="seccion-vacia">
                <p>Este docente aún no tiene grupos asignados para el año actual.</p>
            </div>
        `;
                return;
            }

            const filas = asignaciones.map(a => `
        <tr id="fila-asignacion-${a.id}">
            <td>${a.ambiente}</td>
            <td>${a.grado}</td>
            <td>${a.grupo}</td>
            <td>${a.estudiantes}</td>
            <td>${a.estado}</td>
            <td style="text-align:center">
                <button
                    type="button"
                    class="btn-accion btn-eliminar"
                    onclick="quitarAsignacion(${docenteId}, ${a.id})">
                    <i class="fa-solid fa-trash-can"></i> Quitar
                </button>
            </td>
        </tr>
    `).join('');

            contenedor.innerHTML = `
        <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Ambiente</th>
                    <th>Grado</th>
                    <th>Grupo</th>
                    <th>Estudiantes</th>
                    <th>Estado</th>
                    <th style="width:110px;text-align:center">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${filas}
            </tbody>
        </table>
        </div>
    `;
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
                const res = await ajaxRequest(URL_DOCENTES, 'POST', datos);
                let titulo = '';
                btn.disabled = false;
                btn.textContent = 'Crear Docente';
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Guardar';
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
                } else if (res.errors && Object.keys(res.errors).length) {
                    mostrarErroresModal(res.errors);
                } else {
                    Swal.fire(
                        'Error al crear el docente',
                        res.message,
                        'error'
                    );
                }
            } else {
                const btn = document.getElementById('btnDocente');
                btn.disabled = true;
                btn.textContent = 'Guardando…';
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Guardando…';
                const formData = new FormData(this);
                const datos = Object.fromEntries(formData.entries());
                const id = id_editar;
                const res = await ajaxRequest(`${URL_DOCENTES}/${id}`, 'PUT', datos);
                btn.disabled = false;
                btn.textContent = 'Guardar';
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Guardar';
                let titulo = '';
                let texto = '';
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
                } else if (res.errors && Object.keys(res.errors).length) {
                    mostrarErroresModal(res.errors);
                }
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

        /* ── Asignar grupo/docente (un solo submit para ambos flujos) ── */
        document.getElementById('formAsignarInfo').addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = document.getElementById('btnAsignarInfo');
            btn.disabled = true;

            // Los <select> disabled no se incluyen en FormData; habilitarlos momentáneamente.
            const gradoSelect = document.getElementById('asignar_grado_id');
            const grupoSelect = document.getElementById('asignar_grupos_id');
            const gradoEstabaDeshabilitado = gradoSelect.disabled;
            const grupoEstabaDeshabilitado = grupoSelect.disabled;
            gradoSelect.disabled = false;
            grupoSelect.disabled = false;

            const formData = new FormData(this);
            const datos = Object.fromEntries(formData.entries());

            if (gradoEstabaDeshabilitado) gradoSelect.disabled = true;
            if (grupoEstabaDeshabilitado) grupoSelect.disabled = true;

            const modo = datos.asignar_modo || 'docente';

            let res;
            if (modo === 'grupo' && grupoAsignarId) {
                // Flujo grupo→docente: POST a /admin/grupos/{id}/asignar-docente
                const url = URL_GRUPOS_ASIGNAR.replace(':id', grupoAsignarId);
                res = await ajaxRequest(url, 'POST', datos);
            } else {
                // Flujo docente→grupo: POST a /admin/docentes/{user}/asignar-grupo
                const id = datos.id;
                res = await ajaxRequest(`${URL_DOCENTES}/${id}/asignar-grupo`, 'POST', datos);
            }

            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar asignación';

            if (res.success) {
                if (modo === 'grupo') {
                    mostrarToast('success', res.message || 'Docente asignado correctamente.');
                    modalBSAsignarInfo.hide();
                    grupoAsignarId = null;

                    // Actualizar solo la fila afectada en el modal de grupos (sin reload).
                    if (res.data && typeof actualizarFilaGrupoAsignado === 'function') {
                        actualizarFilaGrupoAsignado(res.data);
                    }
                } else {
                    renderizarAsignacionesActuales(res.data?.asignaciones ?? []);
                    document.getElementById('asignar_grado_id').innerHTML =
                        '<option value="">— Selecciona un grado —</option>';
                    document.getElementById('asignar_grupos_id').innerHTML =
                        '<option value="">— Selecciona un grupo —</option>';
                    document.getElementById('asignar_ambiente_id').value = '';
                    mostrarToast('success', res.message);
                    await cargarTabla(location.href);
                }
            } else if (res.errors && Object.keys(res.errors).length) {
                mostrarErroresAsignacion(res.errors);
            } else {
                mostrarToast('error', res.message || 'Error al guardar');
            }
        });

        function mostrarErroresAsignacion(errors) {
            limpiarErroresModal();
            for (const [campo, mensajes] of Object.entries(errors)) {
                const input = document.querySelector(`#formAsignarInfo [name="${campo}"]`);
                if (!input) continue;
                input.classList.add('is-invalid');
                const div = document.createElement('div');
                div.className = 'campo-error';
                div.textContent = mensajes[0];
                input.insertAdjacentElement('afterend', div);
            }
            const primero = document.querySelector('#formAsignarInfo .is-invalid');
            if (primero) primero.focus();
        }

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

        $('#asignar_ambiente_id').on('change', function() {

            const ambienteId = $(this).val();
            const anio = $('#asignar_anio_lectivo').val();

            $('#asignar_grado_id').html(
                '<option value="">— Selecciona un grado —</option>'
            );
            $('#asignar_grupos_id').html(
                '<option value="">— Selecciona un grupo —</option>'
            );

            if (!ambienteId) return;

            $.get(`/admin/ambientes/${ambienteId}/gradoslistado`, {
                anio_lectivo: anio
            }, function(grados) {
                // El backend ya excluye grupos ocupados dentro del mismo ambiente/año.
                grados.forEach(grado => {
                    $('#asignar_grado_id').append(
                        `<option value="${grado.id}">${grado.nombre}</option>`
                    );
                });

            });

        });

        function cargarGrupos() {

            const ambienteId = $('#asignar_ambiente_id').val();
            const gradoId = $('#asignar_grado_id').val();
            const anio = $('#asignar_anio_lectivo').val();

            $('#asignar_grupos_id').html(
                '<option value="">— Selecciona un grupo —</option>'
            );

            if (!ambienteId || !gradoId || !anio) {
                return;
            }

            $.get(`/admin/grados/${gradoId}/grupos`, {
                anio_lectivo: anio,
                ambiente_id: ambienteId,
            }, function(grupos) {

                grupos.forEach(grupo => {

                    $('#asignar_grupos_id').append(
                        `<option value="${grupo.id}">
                ${grupo.nombre}
            </option>`
                    );

                });

            });

        }

        $('#asignar_grado_id').on('change', function() {
            cargarGrupos();
        });

        $('#asignar_anio_lectivo').on('change', function() {
            cargarGrupos();
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

        // Confirma la desasignación del docente desde el detalle individual.
        function quitarAsignacion(docenteId, cargaId) {
            Swal.fire({
                title: '¿Quitar asignación?',
                text: 'Se desasignará este grupo del docente para el año actual.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, quitar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#DC2626',
            }).then(async (result) => {
                if (!result.isConfirmed) return;

                // Llama al endpoint DELETE que marca la carga como inactiva.
                const res = await ajaxRequest(`${URL_DOCENTES}/${docenteId}/asignaciones/${cargaId}`, 'DELETE');
                if (res.success) {
                    const fila = document.getElementById(`fila-asignacion-${cargaId}`);
                    if (fila) {
                        fila.remove();
                    }

                    mostrarToast('success', res.message);

                    // Si ya no quedan filas en la tabla, recargamos para mostrar el estado vacío.
                    if (!document.querySelector('.tabla-asignaciones tbody tr')) {
                        location.reload();
                    }
                } else {
                    mostrarToast('error', res.message || 'Error al quitar la asignación');
                }
            });
        }
    </script>
@endpush
