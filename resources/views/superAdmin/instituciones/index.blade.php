@extends('layouts.superAdmin')
@section('title', 'Instituciones')
@push('styles')
    <style>
        .instituciones-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
            gap: 28px;
            margin-top: 24px;
        }

        .instituciones-card {
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 16px;
            overflow: visible;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
            transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
            cursor: pointer;
            position: relative;
        }

        .instituciones-card:hover {
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

        .bienvenida-meta {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 6px;
            color: #64748B;
            font-size: .95rem;
            font-weight: 500;
        }

        .bienvenida-separador {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #CBD5E1;
            flex-shrink: 0;
        }

        .content {
            position: relative;
        }

        #contenedor-cargando {
            display: flex;
            width: calc(100% - 240px);
            left: 240px;
            opacity: 1;
            transition: opacity 0.3s ease-in-out;
        }

        .grado-section {
            margin-bottom: 24px;
        }

        .grado-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 14px;
            font-size: 1.1rem;
            font-weight: 700;
            color: #1e293b;
        }

        .grupo-cards {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 16px;
        }

        .grupo-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 14px;
            cursor: pointer;
            transition: .25s;
            box-shadow: 0 2px 8px rgba(15, 23, 42, .05);
        }

        .grupo-card:hover {
            transform: translateY(-3px);
            border-color: #2563eb;
            box-shadow: 0 10px 24px rgba(37, 99, 235, .15);
        }

        .grupo-card-icon {
            width: 50px;
            height: 50px;
            border-radius: 12px;
            background: #eff6ff;
            color: #2563eb;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.3rem;
        }

        .grupo-card-content {
            flex: 1;
        }

        .grupo-card-content h6 {
            margin: 0;
            font-size: 1rem;
            font-weight: 600;
            color: #1e293b;
        }

        .grupo-card-content small {
            color: #64748b;
        }

        .grupo-card-arrow {
            color: #94a3b8;
            transition: .2s;
        }

        .grupo-card:hover .grupo-card-arrow {
            color: #2563eb;
            transform: translateX(4px);
        }

        .grupo-card.active {
            background: #2563eb;
            border-color: #2563eb;
            color: #fff;
        }

        .grupo-card.active .grupo-card-content h6,
        .grupo-card.active .grupo-card-content small,
        .grupo-card.active .grupo-card-arrow {
            color: #fff;
        }

        .grupo-card.active .grupo-card-icon {
            background: rgba(255, 255, 255, .18);
            color: #fff;
        }
    </style>
@endpush

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
        <div>
            <h1>Instituciones</h1>
            <p>Gestión de instituciones</p>
        </div>
        <div style="display:flex;gap:10px">
            <button class="btn btn-primary" onclick="abrirModalInstituciones()"><i class="fas fa-plus"></i> Nueva
                Institución</button>
        </div>
    </div>

    {{-- ── Filtros ──────────────────────────────────────────────────── --}}
    <form id="formBuscar" style="display:flex;gap:12px;margin-bottom:24px;align-items:center;flex-wrap:wrap">
        <div class="input-buscar">
            <span class="icono-buscar"><i class="fas fa-search"></i></span>
            <input type="text" name="buscar" placeholder="Buscar por nombre o correo..." value="{{ request('buscar') }}"
                autocomplete="off">
        </div>
    </form>

    <!-- GRID DE instituciones (Se ocultará al seleccionar uno) -->
    <div class="instituciones-grid" id="instituciones-container">
        @foreach ($instituciones as $inst)
            <div class="instituciones-card btn-seleccionar-instituciones" id="tarjeta-amb-{{ $inst->id }}"
                data-id="{{ $inst->id }}" data-nombre="{{ $inst->nombre }}" onclick="seleccionarinstituciones(this)">

                <div class="card-head">
                    <div class="card-icono">🌿</div>
                    <div class="card-info">
                        <div class="card-nombre">{{ $inst->nombre }}</div>
                        <div class="card-ip">
                            <i class="fas fa-envelope" style="font-size:.7rem"></i>
                            {{ $inst->correo_contacto }}
                        </div>
                        <div class="card-ip">
                            <i class="fas fa-server" style="font-size:.7rem"></i>
                            {{ $inst->codigo_dane }}
                        </div>

                        <div class="card-ip">
                            <i class="fas fa-map-marker-alt" style="font-size:.7rem"></i>
                            {{ $inst->municipio }}, {{ $inst->departamento }}
                        </div>
                    </div>
                </div>

                <div class="card-stats">
                    <span class="badge-stat bs-azul">
                        <i class="fas fa-graduation-cap"></i> {{ $inst->grados_count }} grado(s)
                    </span>
                </div>
            </div>
        @endforeach
    </div>
    @include('superAdmin.instituciones.modalAgregarInstitucion')
    @include('admin.usuarios.ver_contra_gen')

@endsection
