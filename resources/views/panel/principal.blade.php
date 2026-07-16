@extends('layouts.panel')
@section('title', 'Principal')
@push('styles')
    <style>
        .ambientes-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
            gap: 28px;
            margin-top: 24px;
        }

        .ambiente-card {
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 16px;
            overflow: visible;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
            transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
            cursor: pointer;
            position: relative;
        }

        .ambiente-card:hover {
            transform: translateY(-4px) scale(1.01);
            box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
            border-color: #93C5FD;
        }

        .panel-estadisticas {
            margin-top: 24px;
            padding: 20px 22px;
            border-radius: 18px;
            background: linear-gradient(135deg, #f8fbff 0%, #f5f9ff 100%);
            border: 1px solid #dbeafe;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
        }

        .panel-estadisticas-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 16px;
        }

        .panel-estadisticas-title {
            margin: 0;
            font-size: 1.05rem;
            font-weight: 700;
            color: #1E3A8A;
        }

        .panel-estadisticas-subtitle {
            margin: 4px 0 0;
            font-size: 0.9rem;
            color: #64748B;
        }

        .status-pill {
            display: inline-flex;
            align-items: center;
            border-radius: 999px;
            padding: 6px 10px;
            font-size: 0.78rem;
            font-weight: 600;
            white-space: nowrap;
            background: #E2E8F0;
            color: #475569;
        }

        .status-pill--loading {
            background: #DBEAFE;
            color: #1D4ED8;
        }

        .status-pill--ready {
            background: #DCFCE7;
            color: #166534;
        }

        .status-pill--idle {
            background: #FEF3C7;
            color: #92400E;
        }

        .estadisticas-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 14px;
        }

        .estadistica-item {
            padding: 16px;
            border-radius: 14px;
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
            text-align: center;
            transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .estadistica-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
        }

        .estadistica-item--clickable {
            cursor: pointer;
        }

        .estadistica-item--clickable:focus-visible {
            outline: 2px solid #2563EB;
            outline-offset: 2px;
        }

        .estadistica-item--activa {
            border-color: #2563EB;
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
        }

        .estadistica-label {
            display: block;
            font-size: 0.8rem;
            font-weight: 700;
            color: #64748B;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .estadistica-valor {
            display: block;
            font-size: 1.8rem;
            font-weight: 800;
            color: #0F172A;
        }

        .estadistica-item--alerta {
            background: #FFF8E1;
            border-color: #FCD34D;
        }

        .link-configurar-pin {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 12px;
            font-size: 0.85rem;
            color: #2563EB;
            text-decoration: none;
            font-weight: 600;
        }

        .link-configurar-pin:hover {
            color: #1D4ED8;
            text-decoration: underline;
        }

        .alerta-piar {
            margin-top: 12px;
            padding: 10px 14px;
            border-left: 4px solid #DC2626;
            background: #FFF5F5;
            color: #842029;
            border-radius: 10px;
            font-size: 0.9rem;
        }

        .quick-actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-top: 24px;
        }

        .quick-action-card {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 18px;
            border-radius: 16px;
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
            text-decoration: none;
            color: inherit;
        }

        .quick-action-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
            border-color: #93C5FD;
        }

        .quick-action-card__icon {
            width: 46px;
            height: 46px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            background: #EFF6FF;
            color: #2563EB;
            font-size: 1.15rem;
        }

        .quick-action-card__title {
            font-weight: 700;
            color: #0F172A;
            font-size: 0.98rem;
        }

        .quick-action-card__text {
            font-size: 0.84rem;
            color: #64748B;
            line-height: 1.4;
        }

        .quick-action-badge {
            position: absolute;
            top: 14px;
            right: 14px;
            min-width: 24px;
            height: 24px;
            padding: 0 7px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 700;
            background: #DC2626;
            color: #FFFFFF;
        }

        .quick-action-badge--neutral {
            background: #E2E8F0;
            color: #475569;
        }

        .panel-estudiantes-grupo {
            margin-top: 24px;
            padding: 20px 22px;
            border-radius: 18px;
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
        }

        .panel-estudiantes-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .panel-estudiantes-title {
            margin: 0;
            font-size: 1.02rem;
            font-weight: 700;
            color: #0F172A;
        }

        .panel-estudiantes-subtitle {
            margin: 4px 0 0;
            font-size: 0.9rem;
            color: #64748B;
        }

        .filtros-estudiantes {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            min-width: 58%;
        }

        .filtro-estudiantes {
            border: 1px solid #CBD5E1;
            border-radius: 999px;
            padding: 8px 12px;
            font-size: 0.9rem;
            color: #334155;
            background: #F8FAFC;
        }

        .buscador-estudiantes {
            width: min(320px, 100%);
            border: 1px solid #CBD5E1;
            border-radius: 999px;
            padding: 8px 14px;
            font-size: 0.9rem;
            color: #334155;
            background: #FFFFFF;
        }

        .lista-estudiantes {
            display: grid;
            gap: 12px;
        }

        .estudiante-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 16px;
            border-radius: 14px;
            border: 1px solid #E2E8F0;
            background: #F8FAFC;
            cursor: pointer;
            text-decoration: none;
            color: inherit;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .estudiante-card:hover,
        .estudiante-card:focus,
        .estudiante-card:visited {
            transform: translateY(-2px);
            box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
            text-decoration: none;
            color: inherit;
        }

        .estudiante-card .estudiante-nombre,
        .estudiante-card .estudiante-submeta {
            text-decoration: none;
        }

        .estudiante-card__info {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
            min-width: 0;
        }

        .estudiante-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            color: #FFFFFF;
            flex-shrink: 0;
        }

        .estudiante-meta {
            min-width: 0;
        }

        .estudiante-nombre {
            font-weight: 700;
            color: #0F172A;
            margin: 0;
        }

        .estudiante-submeta {
            font-size: 0.84rem;
            color: #64748B;
            margin: 3px 0 0;
        }

        .estudiante-tags {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
        }

        .tag-estudiante {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 0.78rem;
            font-weight: 600;
            white-space: nowrap;
        }

        .tag-estudiante--activo {
            background: #DCFCE7;
            color: #166534;
        }

        .tag-estudiante--inactivo {
            background: #FEE2E2;
            color: #B91C1C;
        }

        .tag-estudiante--pin {
            background: #DBEAFE;
            color: #1D4ED8;
        }

        .tag-estudiante--pin-pendiente {
            background: #FEF3C7;
            color: #92400E;
        }

        .tag-estudiante--piar {
            background: #F5E7FF;
            color: #7C3AED;
        }

        .tag-estudiante--piar-pendiente {
            background: #FFF7ED;
            color: #C2410C;
        }

        .estudiante-alerta {
            color: #EA580C;
            font-size: 1rem;
        }

        .card-franja {
            height: 6px;
            border-radius: 14px 14px 0 0;
        }

        /* Cabecera */
        .card-head {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            padding: 18px 18px 0;
        }

        .card-icono {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            flex-shrink: 0;
        }

        .card-info {
            flex: 1;
            min-width: 0;
        }

        .card-nombre {
            font-weight: 700;
            font-size: .98rem;
            color: #1E293B;
        }

        .card-ip {
            font-family: monospace;
            font-size: .77rem;
            color: #64748B;
            margin-top: 3px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .card-ip-texto {
            cursor: default;
        }

        /* Punto de conexión */
        .dot-conexion {
            display: inline-block;
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #CBD5E1;
            flex-shrink: 0;
            transition: background .3s;
            cursor: default;
        }

        .dot-conexion.dot-online {
            background: #22C55E;
        }

        .dot-conexion.dot-offline {
            background: #EF4444;
        }

        .dot-conexion.dot-check {
            background: #F59E0B;
            animation: parpadeo .6s infinite alternate;
        }

        @keyframes parpadeo {
            to {
                opacity: .35;
            }
        }

        /* Botón tres puntos */
        .btn-menu {
            background: none;
            border: none;
            color: #94A3B8;
            font-size: 1.25rem;
            cursor: pointer;
            padding: 2px 8px;
            border-radius: 6px;
            transition: background .15s;
            line-height: 1;
            flex-shrink: 0;
        }

        .btn-menu:hover {
            background: #F1F5F9;
            color: #475569;
        }

        /* Dropdown */
        .dropdown-menu-card {
            position: absolute;
            top: 52px;
            right: 12px;
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 10px;
            box-shadow: 0 8px 28px rgba(0, 0, 0, .13);
            z-index: 100;
            min-width: 220px;
            display: none;
            overflow: hidden;
        }

        .dropdown-menu-card.abierto {
            display: block;
        }

        .dropdown-menu-card button {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            padding: 10px 16px;
            font-size: .85rem;
            color: #1E293B;
            background: none;
            border: none;
            text-align: left;
            cursor: pointer;
            transition: background .12s;
            font-family: 'Nunito', sans-serif;
        }

        .dropdown-menu-card button:hover {
            background: #F8FAFC;
        }

        .dropdown-menu-card button i {
            width: 16px;
            text-align: center;
            color: #64748B;
        }

        .dropdown-sep {
            height: 1px;
            background: #F1F5F9;
            margin: 4px 0;
        }

        /* Badges estadísticas */
        .card-stats {
            display: flex;
            flex-wrap: wrap;
            /* Evita que los badges salten de línea */
            gap: 10px;
            /* Espacio horizontal entre los dos badges */
            padding: 12px 18px 16px;
            /* Ajustamos el padding inferior */
            align-items: center;
        }

        .badge-stat {
            white-space: nowrap;
            /* Evita que el texto interno se rompa en dos renglones */
            flex: 1;
            /* Hace que ambos compartan el espacio de forma equitativa (opcional) */
            text-align: center;
        }

        .bs-azul {
            background: #EFF6FF;
            color: #1D4ED8;
        }

        .bs-verde {
            background: #F0FDF4;
            color: #166534;
        }

        .bs-morado {
            background: #F5F3FF;
            color: #5B21B6;
        }

        .bs-slate {
            background: #F8FAFC;
            color: #475569;
            border: 1px solid #E2E8F0;
        }

        /* Info secundaria */
        .card-meta {
            padding: 0 18px 10px;
            font-size: .78rem;
            color: #64748B;
            display: flex;
            flex-wrap: wrap;
            gap: 14px;
        }

        .card-meta span {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .card-meta i {
            font-size: .72rem;
        }

        /* Footer */
        .card-footer-amb {
            padding: 12px 18px 16px;
            border-top: 1px solid #F1F5F9;
            background: #F8FAFC;
        }

        .grados-lista {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin-bottom: 10px;
        }

        .grado-chip {
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            padding: 2px 8px;
            font-size: .74rem;
            color: #475569;
        }

        .btn-gestionar {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 9px 16px;
            background: linear-gradient(135deg, #1E3A8A, #2563EB);
            color: #fff;
            border: none;
            border-radius: 8px;
            font-size: .84rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: opacity .15s;
        }

        .btn-gestionar:hover {
            opacity: .88;
            color: #fff;
        }

        .modal-header-azul {
            background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
            border-bottom: none;
            padding: 18px 22px;
        }

        .modal-header-azul .modal-title {
            font-family: 'Fredoka One', cursive;
            color: #fff;
            font-size: 1.1rem;
        }

        .modal-header-azul .btn-close {
            filter: brightness(0) invert(1);
            opacity: .75;
        }

        .campo-error {
            font-size: .78rem;
            color: #DC2626;
            margin-top: 3px;
            min-height: 16px;
        }

        /* Módulos */
        .modulo-fila {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 0;
            border-bottom: 1px solid #F1F5F9;
        }

        .modulo-fila:last-child {
            border-bottom: none;
        }

        .modulo-icono {
            font-size: 1.4rem;
            width: 36px;
            text-align: center;
            flex-shrink: 0;
        }

        .modulo-nombre {
            flex: 1;
            font-weight: 600;
            font-size: .9rem;
            color: #1E293B;
        }

        .modulo-toggles {
            display: flex;
            gap: 10px;
            flex-shrink: 0;
        }

        .tog {
            display: flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
            font-size: .75rem;
            color: #64748B;
            user-select: none;
        }

        .tog input {
            display: none;
        }

        .tog-track {
            width: 34px;
            height: 18px;
            border-radius: 9px;
            background: #CBD5E1;
            position: relative;
            transition: background .2s;
            flex-shrink: 0;
        }

        .tog-track::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #fff;
            transition: transform .2s;
            box-shadow: 0 1px 3px rgba(0, 0, 0, .2);
        }

        .tog input:checked+.tog-track {
            background: #2563EB;
        }

        .tog input:checked+.tog-track::after {
            transform: translateX(16px);
        }

        /* Tabla docentes */
        .tabla-docentes {
            width: 100%;
            border-collapse: collapse;
            font-size: .85rem;
        }

        .tabla-docentes th {
            background: #F8FAFC;
            padding: 8px 12px;
            font-weight: 600;
            color: #475569;
            text-align: left;
            border-bottom: 2px solid #E2E8F0;
        }

        .tabla-docentes td {
            padding: 10px 12px;
            border-bottom: 1px solid #F1F5F9;
            color: #1E293B;
        }

        .tabla-docentes tr:last-child td {
            border-bottom: none;
        }

        .estudiante-asistencia {

            display: flex;
            align-items: center;
            justify-content: space-between;

            margin: 18px 0;

            padding: 14px 0;

            border-top: 1px solid #EEF2F7;
            border-bottom: 1px solid #EEF2F7;

        }

        .switch {

            position: relative;

            display: inline-block;

            width: 52px;

            height: 28px;

        }

        .switch input {

            display: none;

        }

        .slider {

            position: absolute;

            inset: 0;

            background: #CBD5E1;

            border-radius: 30px;

            transition: .25s;

        }

        .slider::before {

            content: "";

            position: absolute;

            width: 22px;

            height: 22px;

            left: 3px;

            top: 3px;

            border-radius: 50%;

            background: white;

            transition: .25s;

        }

        .switch input:checked+.slider {

            background: #10B981;

        }

        .switch input:checked+.slider::before {

            transform: translateX(24px);

        }

        .quick-action-badge--warning {
            background: #FEF3C7;
            color: #92400E;
        }

        .quick-action-badge--success {
            background: #DCFCE7;
            color: #166534;
        }
    </style>
@endpush

@section('content')
    <div class="page-header">
        <!-- Envolvemos la bienvenida para controlarla con JS -->
        <div id="contenedor-bienvenida">
            <h1>¡Bienvenido, {{ Auth::guard('docente')->user()->nombre }}!</h1>
            <strong>{{ \Carbon\Carbon::now()->locale('es')->isoFormat('dddd, D [de] MMMM [de] YYYY') }}</strong>

            <strong>Selecciona el ambiente con el que trabajarás hoy.</strong>
        </div>

        <!-- Este contenedor empezará oculto y mostrará el contexto activo en tiempo real -->
        <div id="contenedor-ambiente-activo" style="display: none;">
            <h1 style="font-size: 1.8rem; margin: 0; color: #333;">
                <span id="txt-contexto-ambiente"></span>
                <span id="txt-contexto-detalle" style="color: #007bff;"></span>
            </h1>
        </div>
    </div>

    <!-- GRID DE AMBIENTES (Se ocultará al seleccionar uno) -->
    <div class="ambientes-grid" id="ambientes-container">
        @foreach ($ambientes as $amb)
            <div class="ambiente-card btn-seleccionar-ambiente" id="tarjeta-amb-{{ $amb->id }}"
                data-id="{{ $amb->id }}" data-nombre="{{ $amb->nombre }}">

                <div class="card-franja" style="background:{{ $amb->color_hex }}"></div>

                <div class="card-head">
                    <div class="card-icono" style="background:{{ $amb->color_hex }}22">{{ $amb->icono }}</div>
                    <div class="card-info">
                        <div class="card-nombre">{{ $amb->nombre }}</div>
                        <div class="card-ip">
                            <i class="fas fa-server" style="font-size:.7rem"></i>
                            <span class="card-ip-texto">{{ $amb->servidor_ip ?? 'Sin IP configurada' }}</span>
                        </div>
                    </div>
                </div>

                <div class="card-stats">
                    <span class="badge-stat bs-azul">
                        <i class="fas fa-graduation-cap"></i> {{ $amb->grados_count }} grado(s)
                    </span>
                    <span class="badge-stat bs-verde">
                        <i class="fas fa-child"></i> {{ $amb->grupos_count }} grupo(s)
                    </span>
                </div>
            </div>
        @endforeach
    </div>

    <!-- CONTENEDOR DE GRADOS Y GRUPOS (Reemplaza la vista de ambientes) -->
    <div id="panel-grados-grupos" class="c-card c-card-body" style="display: none; margin-top: 20px;">

        <!-- Botón para regresar a los ambientes -->
        <button id="btn-volver-ambientes" class="btn btn-link"
            style="padding: 0; margin-bottom: 20px; text-decoration: none; color: #007bff; font-weight: 500; font-size: 0.95rem;">
            <i class="fas fa-arrow-left"></i> Volver a Ambientes
        </button>

        <h3
            style="margin-bottom: 20px; font-size: 1.3rem; color: #333; border-bottom: 2px solid #eee; padding-bottom: 8px;">
            <i class="fas fa-layer-group"></i> Grados y Grupos Habilitados
        </h3>

        <!-- Contenedor horizontal estricto para los grados -->
        <div id="contenido-grados"
            style="display: flex; flex-wrap: nowrap; gap: 24px; overflow-x: auto; padding-bottom: 15px;"></div>

    </div>

    <div id="panel-estadisticas-grupo" class="panel-estadisticas" aria-live="polite">
        <div class="panel-estadisticas-header">
            <div>
                <h5 class="panel-estadisticas-title" id="titulo-grupo-seleccionado">
                    <i class="fas fa-chart-bar"></i> Estadísticas del grupo seleccionado
                </h5>
                <p class="panel-estadisticas-subtitle" id="texto-feedback">
                    Selecciona un grupo para ver el resumen del día.
                </p>
            </div>
            <span id="estado-estadisticas" class="status-pill status-pill--idle">Esperando selección</span>
        </div>

        <div class="estadisticas-grid">
            <div id="card-estudiantes-activos" class="estadistica-item estadistica-item--clickable" role="button"
                tabindex="0" title="Ver estudiantes del grupo activo" aria-controls="panel-estudiantes-grupo"
                aria-expanded="false">
                <span class="estadistica-label">Estudiantes Activos</span>
                <span class="estadistica-valor" id="stat-activos">0</span>
            </div>
            <div class="estadistica-item">
                <span class="estadistica-label">Con PIAR</span>
                <span class="estadistica-valor" id="stat-piar">0</span>
            </div>
            <div id="card-sin-pin" class="estadistica-item">
                <span class="estadistica-label">Sin PIN</span>
                <span class="estadistica-valor" id="stat-sin-pin">0</span>
                <a id="link-configurar-pin" href="{{ route('panel.estudiantes') }}" class="link-configurar-pin"
                    style="display: none;">
                    <i class="fas fa-key"></i> Configurar PIN
                </a>
            </div>
        </div>

        <div id="alerta-piar" class="alerta-piar" style="display: none;">
            <i class="fas fa-exclamation-triangle"></i>
            <span id="texto-alerta-piar">0 estudiantes requieren PIAR sin diligenciar</span>
        </div>
    </div>

    <div class="panel-estudiantes-grupo" id="panel-estudiantes-grupo" style="display: none;">
        <div class="panel-estudiantes-header">
            <div>
                <h5 class="panel-estudiantes-title"><i class="fas fa-users"></i> Estudiantes del grupo activo</h5>
                <p class="panel-estudiantes-subtitle">Gestiona el alumnado matriculado en el grupo seleccionado.</p>
            </div>
            <div class="filtros-estudiantes">
                <input id="buscador-estudiantes" class="buscador-estudiantes" type="text"
                    placeholder="Buscar por nombre..." />
                <select id="filtro-estado-estudiante" class="filtro-estudiantes">
                    <option value="todos">Todos los estados</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                </select>
                <select id="filtro-condicion-estudiante" class="filtro-estudiantes">
                    <option value="todas">Todas las condiciones</option>
                    @foreach ($condiciones as $condicion)
                        <option value="{{ $condicion->id }}">{{ $condicion->nombre }}</option>
                    @endforeach
                </select>
            </div>
        </div>

        <div id="lista-estudiantes" class="lista-estudiantes"></div>
    </div>

    <div class="quick-actions" id="quick-actions">
        <a href="{{ route('panel.asistencia') }}" class="quick-action-card" data-context-route="asistencia">

            <span class="quick-action-card__icon">
                <i class="fas fa-clipboard-check"></i>
            </span>

            <span class="quick-action-card__title">
                Registrar asistencia
            </span>

            <span class="quick-action-card__text">
                Toma la asistencia del grupo activo de forma rápida.
            </span>

            <span id="badge-asistencia" class="quick-action-badge d-none">
            </span>

        </a>
        <a href="{{ route('panel.estudiantes') }}" class="quick-action-card" data-context-route="pin">
            <span class="quick-action-card__icon"><i class="fas fa-key"></i></span>
            <span class="quick-action-card__title">Configurar PIN</span>
            <span class="quick-action-card__text">Revisa quién aún necesita un PIN configurado.</span>
            <span id="badge-pin" class="quick-action-badge quick-action-badge--neutral">0</span>
        </a>

        <a href="{{ route('panel.sesion') }}" class="quick-action-card" data-context-route="monitor">
            <span class="quick-action-card__icon"><i class="fas fa-desktop"></i></span>
            <span class="quick-action-card__title">Monitor de sesión</span>
            <span class="quick-action-card__text">Consulta en tiempo real quién está conectado.</span>
            <span id="badge-monitor" class="quick-action-badge quick-action-badge--neutral">0</span>
        </a>

        <a href="{{ route('panel.portafolio') }}" class="quick-action-card" data-context-route="observacion">
            <span class="quick-action-card__icon"><i class="fas fa-comment-medical"></i></span>
            <span class="quick-action-card__title">Nueva observación</span>
            <span class="quick-action-card__text">Registra una observación para el grupo activo.</span>
            <span id="badge-observacion" class="quick-action-badge quick-action-badge--neutral">0</span>
        </a>
    </div>

    <!-- CONTROL JAVASCRIPT -->
    <script>
        // Mantiene el contexto activo del ambiente para actualizar el encabezado y las estadísticas.
        let nombreAmbienteActivo = "";
        let panelEstadisticas;
        const URL_FICHA_ESTUDIANTE = @json(url('/panel/estudiantes/ficha'));
        let estudiantesGrupoCache = [];

        document.addEventListener('DOMContentLoaded', function() {
            const tarjetas = document.querySelectorAll('.btn-seleccionar-ambiente');
            const contenedorGrid = document.getElementById('ambientes-container');
            const quickActions = document.querySelectorAll('.quick-action-card');
            const panelGradosGrupos = document.getElementById('panel-grados-grupos');
            const contenidoGrados = document.getElementById('contenido-grados');
            panelEstadisticas = document.getElementById('panel-estadisticas-grupo');
            const btnVolver = document.getElementById('btn-volver-ambientes');

            // Muestra un estado temporal mientras se consultan los indicadores del grupo.
            function mostrarEstadoCargaEstadisticas() {
                document.getElementById('stat-activos').textContent = '—';
                document.getElementById('stat-piar').textContent = '—';
                document.getElementById('stat-sin-pin').textContent = '—';
                document.getElementById('titulo-grupo-seleccionado').innerHTML =
                    '<i class="fas fa-spinner fa-spin"></i> Cargando estadísticas...';
                document.getElementById('link-configurar-pin').style.display = 'none';
                document.getElementById('alerta-piar').style.display = 'none';
                actualizarFeedback('loading', 'Consultando los indicadores del grupo seleccionado...');
            }

            // Carga los grados y grupos del ambiente seleccionado y activa el primer grupo por defecto.
            function cargarAmbiente(ambienteId, ambienteNombre) {
                nombreAmbienteActivo = ambienteNombre;

                // Ocultamos los ambientes y el bloque de bienvenida para enfocar la vista del ambiente.
                contenedorGrid.style.display = 'none';
                document.getElementById('contenedor-bienvenida').style.display = 'none';
                mostrarEstadoCargaEstadisticas();

                document.getElementById('txt-contexto-ambiente').textContent = `Ambiente: ${ambienteNombre}`;
                document.getElementById('txt-contexto-detalle').textContent = '';
                document.getElementById('contenedor-ambiente-activo').style.display = 'block';

                panelGradosGrupos.style.display = 'block';
                contenidoGrados.innerHTML =
                    '<p><i class="fas fa-spinner fa-spin"></i> Cargando grados asignados...</p>';

                fetch(`/panel/principal/${ambienteId}/grados`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.length === 0) {
                            contenidoGrados.innerHTML =
                                '<p class="text-muted">No tienes grados asignados aquí para el año actual.</p>';
                            actualizarFeedback('idle', 'No hay grupos disponibles para este ambiente.');
                            return;
                        }

                        let html = '';
                        data.forEach(grado => {
                            html += `
                                <div style="flex: 0 0 auto; min-width: 220px;">
                                    <h5 style="font-weight: bold; color: #444; margin-bottom: 10px; white-space: nowrap;">${grado.nombre}</h5>
                                    <div style="display: flex; flex-wrap: nowrap; gap: 8px;">
                            `;
                            grado.grupos.forEach(grupo => {
                                html += `
                                    <span class="badge-grupo-chip"
                                          style="padding: 6px 14px; background: #e9ecef; border: 1px solid #ced4da; border-radius: 20px; cursor: pointer; font-size: 0.85rem; font-weight: 500; white-space: nowrap; display: inline-block; transition: all 0.2s;"
                                          data-carga-id="${grupo.carga_docente_id}"
                                          data-grado="${grado.nombre}"
                                          data-grupo="${grupo.nombre}"
                                          onclick="seleccionarGrupo(this)">
                                          <i class="fas fa-graduation-cap"></i>
                                        ${grado.nombre} ${grupo.nombre}
                                    </span>
                                `;
                            });
                            html += `</div></div>`;
                        });
                        contenidoGrados.innerHTML = html;

                        const primerGrupo = contenidoGrados.querySelector('.badge-grupo-chip');
                        if (primerGrupo) {
                            seleccionarGrupo(primerGrupo);
                        } else {
                            document.getElementById('titulo-grupo-seleccionado').innerHTML =
                                '<i class="fas fa-exclamation-circle"></i> No hay grupos disponibles para este ambiente';
                            document.getElementById('stat-activos').textContent = '0';
                            document.getElementById('stat-piar').textContent = '0';
                            document.getElementById('stat-sin-pin').textContent = '0';
                            document.getElementById('link-configurar-pin').style.display = 'none';
                            document.getElementById('alerta-piar').style.display = 'none';
                            ocultarPanelEstudiantesGrupo();
                            actualizarFeedback('idle', 'No hay grupos disponibles para este ambiente.');
                        }
                    });
            }

            // Vuelve a la vista inicial de ambientes y limpia el contexto activo.
            btnVolver.addEventListener('click', function() {
                panelGradosGrupos.style.display = 'none';
                document.getElementById('contenedor-ambiente-activo').style.display = 'none';
                document.getElementById('contenedor-bienvenida').style.display = 'block';
                contenedorGrid.style.display = 'grid';
                resetearEstadisticas();
            });

            // Asigna el comportamiento de selección a cada tarjeta de ambiente.
            tarjetas.forEach(tarjeta => {
                tarjeta.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    const nombre = this.getAttribute('data-nombre');
                    cargarAmbiente(id, nombre);
                });
            });

            const rutasConContexto = ['pin', 'sesion', 'monitor', 'observacion', 'asistencia'];

            quickActions.forEach(link => {
                link.addEventListener('click', function(event) {
                    const grupoActivo = document.querySelector('.badge-grupo-chip.active');

                    if (!grupoActivo) {
                        event.preventDefault();

                        Swal.fire({
                            icon: 'warning',
                            title: 'Seleccione un grupo',
                            text: 'Debe seleccionar un grupo antes de continuar.'
                        });

                        return;
                    }

                    const route = this.dataset.contextRoute;

                    if (!rutasConContexto.includes(route)) {
                        return;
                    }

                    event.preventDefault();

                    const params = new URLSearchParams({
                        carga: grupoActivo.dataset.cargaId,
                        contexto: nombreAmbienteActivo
                    });

                    window.location.href = `${this.href}?${params}`;
                });
            });

            // Si sólo existe un ambiente asignado, entra directamente a la vista del mismo.
            @if ($ambienteSeleccionado)
                cargarAmbiente({{ $ambienteSeleccionado->id }}, '{{ $ambienteSeleccionado->nombre }}');
            @endif
        });

        function resetearEstadisticas() {
            const cardSinPin = document.getElementById('card-sin-pin');
            const linkConfigurarPin = document.getElementById('link-configurar-pin');
            const alertaPiar = document.getElementById('alerta-piar');

            document.getElementById('titulo-grupo-seleccionado').innerHTML =
                '<i class="fas fa-chart-bar"></i> Estadísticas del grupo seleccionado';
            document.getElementById('stat-activos').textContent = '0';
            document.getElementById('stat-piar').textContent = '0';
            document.getElementById('stat-sin-pin').textContent = '0';
            cardSinPin.classList.remove('estadistica-item--alerta');
            linkConfigurarPin.style.display = 'none';
            alertaPiar.style.display = 'none';
            ocultarPanelEstudiantesGrupo();
            actualizarFeedback('idle', 'Selecciona un ambiente para ver sus grupos y estadísticas.');
        }

        function ocultarPanelEstudiantesGrupo() {
            const panelEstudiantes = document.getElementById('panel-estudiantes-grupo');
            const listaEstudiantes = document.getElementById('lista-estudiantes');
            const cardActivos = document.getElementById('card-estudiantes-activos');

            estudiantesGrupoCache = [];
            if (panelEstudiantes) {
                panelEstudiantes.style.display = 'none';
            }
            if (listaEstudiantes) {
                listaEstudiantes.innerHTML = '';
            }
            if (cardActivos) {
                cardActivos.classList.remove('estadistica-item--activa');
                cardActivos.setAttribute('aria-expanded', 'false');
            }
        }

        function mostrarEstudiantesGrupoActivo() {
            const grupoActivo = document.querySelector('.badge-grupo-chip.active');
            const cardActivos = document.getElementById('card-estudiantes-activos');

            if (!grupoActivo) {
                actualizarFeedback('idle', 'Selecciona un grupo antes de ver los estudiantes activos.');
                return;
            }

            if (cardActivos) {
                cardActivos.classList.add('estadistica-item--activa');
                cardActivos.setAttribute('aria-expanded', 'true');
            }

            cargarEstudiantesGrupo(grupoActivo.getAttribute('data-carga-id'));
        }

        // Actualiza el texto y el estilo del estado de carga de las estadísticas.
        function actualizarFeedback(estado, mensaje) {
            const estadoEl = document.getElementById('estado-estadisticas');
            const mensajeEl = document.getElementById('texto-feedback');

            if (!estadoEl || !mensajeEl) {
                return;
            }

            estadoEl.className = 'status-pill';
            if (estado === 'loading') {
                estadoEl.classList.add('status-pill--loading');
                estadoEl.textContent = 'Actualizando...';
            } else if (estado === 'ready') {
                estadoEl.classList.add('status-pill--ready');
                estadoEl.textContent = 'Actualizado';
            } else {
                estadoEl.classList.add('status-pill--idle');
                estadoEl.textContent = 'Esperando selección';
            }

            mensajeEl.textContent = mensaje;
        }

        // Consulta las estadísticas del grupo seleccionado y refresca la tarjeta visual.
        function seleccionarGrupo(element) {
            document.querySelectorAll('.badge-grupo-chip').forEach(chip => {
                chip.classList.remove('active');
                chip.style.background = '#e9ecef';
                chip.style.color = '#212529';
            });
            element.classList.add('active');
            element.style.background = '#007bff';
            element.style.color = '#fff';

            const cargaId = element.getAttribute('data-carga-id');
            const gradoNombre = element.getAttribute('data-grado');
            const grupoNombre = element.getAttribute('data-grupo');

            document.getElementById('txt-contexto-ambiente').textContent = `Ambiente: ${nombreAmbienteActivo}`;
            document.getElementById('txt-contexto-detalle').textContent = ` > ${gradoNombre} > Grupo ${grupoNombre}`;

            document.getElementById('titulo-grupo-seleccionado').innerHTML =
                `<i class="fas fa-chart-bar"></i> Estadísticas para: <strong>${gradoNombre} - ${grupoNombre}</strong>`;
            ocultarPanelEstudiantesGrupo();
            actualizarFeedback('loading', 'Consultando los indicadores del grupo seleccionado...');

            fetch(`/panel/principal/${cargaId}/estadisticas`, {
                    headers: {
                        'Accept': 'application/json'
                    }
                })
                .then(res => res.json())
                .then(stats => {
                    const cardSinPin = document.getElementById('card-sin-pin');
                    const linkConfigurarPin = document.getElementById('link-configurar-pin');
                    const alertaPiar = document.getElementById('alerta-piar');
                    const textoAlertaPiar = document.getElementById('texto-alerta-piar');
                    const badge = document.getElementById('badge-asistencia');

                    panelEstadisticas.style.display = 'block';
                    document.getElementById('stat-activos').textContent = stats.activos;
                    document.getElementById('stat-piar').textContent = stats.piar;
                    document.getElementById('stat-sin-pin').textContent = stats.sin_pin;
                    document.getElementById('badge-pin').textContent = stats.sin_pin;
                    document.getElementById('badge-monitor').textContent = stats.conectados ?? 0;
                    document.getElementById('badge-observacion').textContent = stats.observaciones ?? 0;

                    badge.classList.remove('d-none');


                    if (!cargaId) {
                        badge.classList.add('d-none');
                        return;
                    }

                    badge.classList.remove('d-none');

                    if (stats.lista_tomada) {

                        badge.textContent = 'Lista tomada';
                        badge.className = 'quick-action-badge quick-action-badge--success';

                    } else {

                        badge.textContent = 'Lista de hoy sin tomar';
                        badge.className = 'quick-action-badge quick-action-badge--warning';

                    }

                    if (stats.tiene_alerta_pin) {
                        cardSinPin.classList.add('estadistica-item--alerta');
                        linkConfigurarPin.style.display = 'inline-flex';
                    } else {
                        cardSinPin.classList.remove('estadistica-item--alerta');
                        linkConfigurarPin.style.display = 'none';
                    }

                    if (stats.tiene_alerta_piar) {
                        alertaPiar.style.display = 'block';
                        textoAlertaPiar.textContent =
                            `${stats.requiere_piar_sin_diligenciar} estudiantes requieren PIAR sin diligenciar`;
                    } else {
                        alertaPiar.style.display = 'none';
                    }

                    actualizarFeedback('ready', stats.tiene_alerta_pin ?
                        'Se encontraron estudiantes sin PIN configurado.' :
                        'Las estadísticas del grupo están al día. Haz clic en Estudiantes Activos para ver el listado.'
                    );
                })
                .catch(err => {
                    console.error('Error al procesar la selección del grupo:', err);
                    actualizarFeedback('idle', 'No fue posible cargar las estadísticas.');
                });
        }

        function renderListaEstudiantesGrupo() {
            const listaEstudiantes = document.getElementById('lista-estudiantes');
            const buscador = document.getElementById('buscador-estudiantes');
            const filtroEstado = document.getElementById('filtro-estado-estudiante');
            const filtroCondicion = document.getElementById('filtro-condicion-estudiante');
            let estudiantesFiltrados = estudiantesGrupoCache;

            if (buscador) {
                const texto = buscador.value.trim().toLowerCase();
                if (texto) {
                    estudiantesFiltrados = estudiantesFiltrados.filter(estudiante =>
                        (estudiante.nombre || '').toLowerCase().includes(texto)
                    );
                }
            }

            if (filtroEstado && filtroEstado.value !== 'todos') {
                estudiantesFiltrados = estudiantesFiltrados.filter(estudiante =>
                    (estudiante.estado || '').toLowerCase() === filtroEstado.value
                );
            }

            if (filtroCondicion && filtroCondicion.value !== 'todas') {
                const condicionId = String(filtroCondicion.value);
                estudiantesFiltrados = estudiantesFiltrados.filter(estudiante =>
                    String(estudiante.condicion_id ?? '') === condicionId
                );
            }

            if (estudiantesFiltrados.length === 0) {
                listaEstudiantes.innerHTML =
                    '<p style="color:#64748B;padding:12px 0;">No hay estudiantes con esos filtros.</p>';
                return;
            }

            listaEstudiantes.innerHTML = estudiantesFiltrados.map(estudiante => {
                const estadoClase = estudiante.activo ? 'tag-estudiante--activo' :
                    'tag-estudiante--inactivo';
                const pinClase = estudiante.tiene_pin ? 'tag-estudiante--pin' :
                    'tag-estudiante--pin-pendiente';
                const piarClase = estudiante.requiere_atencion_piar ? 'tag-estudiante--piar-pendiente' :
                    'tag-estudiante--piar';
                const alerta = estudiante.requiere_atencion_piar ?
                    '<i class="fas fa-exclamation-triangle estudiante-alerta" title="Requiere PIAR"></i>' :
                    '';
                const condicionLabel = estudiante.condicion_nombre || estudiante.condicion || 'Estandar';
                const fichaUrl = `${URL_FICHA_ESTUDIANTE}/${estudiante.id}`;

                return `
                    <a href="${fichaUrl}" class="estudiante-card" title="Ver ficha completa">
                        <div class="estudiante-card__info">
                            <div class="estudiante-avatar" style="background:${estudiante.color_avatar || '#2563EB'}">
                                ${estudiante.iniciales || 'E'}
                            </div>
                            <div class="estudiante-meta">
                                <p class="estudiante-nombre">${estudiante.nombre}</p>
                                <p class="estudiante-submeta">Condición: ${condicionLabel} · ${estudiante.estado || 'Activo'}</p>
                            </div>
                        </div>
                        <div class="estudiante-tags">
                            <span class="tag-estudiante ${estadoClase}">${estudiante.estado || 'Activo'}</span>
                            <span class="tag-estudiante ${pinClase}">${estudiante.tiene_pin ? 'PIN' : 'Sin PIN'}</span>
                            <span class="tag-estudiante ${piarClase}">${estudiante.estado_piar || 'No aplica'}</span>
                            ${alerta}
                        </div>
                    </a>
                `;
            }).join('');
        }

        function cargarEstudiantesGrupo(cargaId) {
            const panelEstudiantes = document.getElementById('panel-estudiantes-grupo');
            const listaEstudiantes = document.getElementById('lista-estudiantes');

            panelEstudiantes.style.display = 'block';
            listaEstudiantes.innerHTML =
                '<p style="color:#64748B"><i class="fas fa-spinner fa-spin"></i> Cargando estudiantes...</p>';

            fetch(`/panel/principal/${cargaId}/estudiantes`, {
                    headers: {
                        'Accept': 'application/json'
                    }
                })
                .then(res => res.json())
                .then(estudiantes => {
                    estudiantesGrupoCache = Array.isArray(estudiantes) ? estudiantes : [];
                    renderListaEstudiantesGrupo();
                })
                .catch(err => {
                    console.error('Error al cargar los estudiantes del grupo:', err);
                    estudiantesGrupoCache = [];
                    listaEstudiantes.innerHTML =
                        '<p style="color:#64748B;padding:12px 0;">No fue posible cargar el listado.</p>';
                });
        }

        document.getElementById('card-estudiantes-activos').addEventListener('click', function() {
            mostrarEstudiantesGrupoActivo();
        });

        document.getElementById('card-estudiantes-activos').addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                mostrarEstudiantesGrupoActivo();
            }
        });

        document.getElementById('buscador-estudiantes').addEventListener('input', function() {
            const panelEstudiantes = document.getElementById('panel-estudiantes-grupo');
            if (panelEstudiantes && panelEstudiantes.style.display !== 'none') {
                renderListaEstudiantesGrupo();
            }
        });

        document.getElementById('filtro-estado-estudiante').addEventListener('change', function() {
            const panelEstudiantes = document.getElementById('panel-estudiantes-grupo');
            if (panelEstudiantes && panelEstudiantes.style.display !== 'none') {
                renderListaEstudiantesGrupo();
            }
        });

        document.getElementById('filtro-condicion-estudiante').addEventListener('change', function() {
            const panelEstudiantes = document.getElementById('panel-estudiantes-grupo');
            if (panelEstudiantes && panelEstudiantes.style.display !== 'none') {
                renderListaEstudiantesGrupo();
            }
        });
    </script>
@endsection
