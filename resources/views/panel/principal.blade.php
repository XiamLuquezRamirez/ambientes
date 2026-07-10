@extends('layouts.panel')
@section('title', 'Principal')
@push('styles')
    <style>
        .ambientes-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
            gap: 50px;
            margin-top: 24px;
        }

        .ambiente-card {
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 14px;
            overflow: visible;
            box-shadow: 0 2px 8px rgba(0, 0, 0, .06);
            transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
            cursor: pointer;
            position: relative;
        }


        /* Efecto de ampliación al pasar el cursor */
        .ambiente-card:hover {
            transform: translateY(-5px) scale(1.04);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
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
    </style>
@endpush

@section('content')
    <div class="page-header">
        <!-- Envolvemos la bienvenida para controlarla con JS -->
        <div id="contenedor-bienvenida">
            <h1>¡Bienvenido, {{ Auth::guard('docente')->user()->nombre }}!</h1>
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

        <!-- SECCIÓN DE ESTADÍSTICAS DEL GRUPO SELECCIONADO -->
        <div id="panel-estadisticas-grupo"
            style="margin-top: 25px; display: none; padding: 20px; background: #f9f9f9; border-left: 4px solid #007bff; border-radius: 4px;">
            <h4 id="titulo-grupo-seleccionado" style="font-size: 1.1rem; margin-bottom: 15px; color: #555;"></h4>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;">
                <div
                    style="background: #fff; padding: 15px; border-radius: 6px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="font-size: 0.85rem; color: #666; font-weight: bold;">Estudiantes Activos</div>
                    <div id="stat-activos" style="font-size: 1.8rem; font-weight: bold; color: #28a745;">0</div>
                </div>
                <div
                    style="background: #fff; padding: 15px; border-radius: 6px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="font-size: 0.85rem; color: #666; font-weight: bold;">Con PIAR</div>
                    <div id="stat-piar" style="font-size: 1.8rem; font-weight: bold; color: #dc3545;">0</div>
                </div>
                <div
                    style="background: #fff; padding: 15px; border-radius: 6px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="font-size: 0.85rem; color: #666; font-weight: bold;">Sin PIN</div>
                    <div id="stat-sin-pin" style="font-size: 1.8rem; font-weight: bold; color: #ffc107;">0</div>
                </div>
            </div>
        </div>
    </div>

    <div class="c-card" style="margin-top: 20px;">
        <div class="c-card-body">
            <h5 class="c-card-title">Estadísticas del día</h5>
            <div class="c-card-text">
                <div class="c-card-text-item">
                    <span class="c-card-text-item-label">Estudiantes Activos</span>
                    <span class="c-card-text-item-value">0</span>
                </div>
            </div>
        </div>
    </div>

    <!-- CONTROL JAVASCRIPT -->
    <script>
        // Variable global para retener el nombre del ambiente en el hilo del encabezado
        let nombreAmbienteActivo = "";

        document.addEventListener('DOMContentLoaded', function() {
            const tarjetas = document.querySelectorAll('.btn-seleccionar-ambiente');
            const contenedorGrid = document.getElementById('ambientes-container');
            const panelGradosGrupos = document.getElementById('panel-grados-grupos');
            const contenidoGrados = document.getElementById('contenido-grados');
            const panelEstadisticas = document.getElementById('panel-estadisticas-grupo');
            const btnVolver = document.getElementById('btn-volver-ambientes');

            // 1. Lógica para entrar al ambiente
            function cargarAmbiente(ambienteId, ambienteNombre) {
                nombreAmbienteActivo = ambienteNombre;

                // Ocultamos los ambientes y el bloque de bienvenida
                contenedorGrid.style.display = 'none';
                document.getElementById('contenedor-bienvenida').style.display = 'none';
                panelEstadisticas.style.display = 'none';

                // Inicializamos el encabezado con el contexto del ambiente seleccionado
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
                                        ${grado.nombre} ${grupo.nombre}
                                    </span>
                                `;
                            });
                            html += `</div></div>`;
                        });
                        contenidoGrados.innerHTML = html;
                    });
            }

            // 2. Acción del botón Volver
            btnVolver.addEventListener('click', function() {
                panelGradosGrupos.style.display = 'none';

                // Ocultamos el encabezado de contexto activo y restauramos la bienvenida
                document.getElementById('contenedor-ambiente-activo').style.display = 'none';
                document.getElementById('contenedor-bienvenida').style.display = 'block';

                contenedorGrid.style.display = 'grid';
            });

            // Asignar clics a las tarjetas
            tarjetas.forEach(tarjeta => {
                tarjeta.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    const nombre = this.getAttribute('data-nombre');
                    cargarAmbiente(id, nombre);
                });
            });

            // Si hay un solo ambiente asignado, entra directo automáticamente
            @if ($ambienteSeleccionado)
                cargarAmbiente({{ $ambienteSeleccionado->id }}, '{{ $ambienteSeleccionado->nombre }}');
            @endif
        });

        // 3. Cargar Estadísticas y guardar Contexto de Sesión del Grupo Seleccionado
        function seleccionarGrupo(element) {
            // Manejo visual de la selección de los chips
            document.querySelectorAll('.badge-grupo-chip').forEach(chip => {
                chip.style.background = '#e9ecef';
                chip.style.color = '#212529';
            });
            element.style.background = '#007bff';
            element.style.color = '#fff';

            const cargaId = element.getAttribute('data-carga-id');
            const gradoNombre = element.getAttribute('data-grado');
            const grupoNombre = element.getAttribute('data-grupo');

            // Actualizar la ruta completa del contexto en el encabezado
            document.getElementById('txt-contexto-ambiente').textContent = `Ambiente: ${nombreAmbienteActivo}`;
            document.getElementById('txt-contexto-detalle').textContent = ` > ${gradoNombre} > Grupo ${grupoNombre}`;

            document.getElementById('titulo-grupo-seleccionado').innerHTML =
                `<i class="fas fa-chart-bar"></i> Estadísticas para: <strong>${gradoNombre} - ${grupoNombre}</strong>`;

            // Petición POST para guardar la carga_docente_id en la sesión de Laravel y traer estadísticas
            fetch(`/panel/principal/${cargaId}/estadisticas`, {
                    headers: {
                        'Accept': 'application/json'
                    }
                })
                .then(res => res.json())
                .then(stats => {
                    document.getElementById('panel-estadisticas-grupo').style.display = 'block';
                    document.getElementById('stat-activos').textContent = stats.activos;
                    document.getElementById('stat-piar').textContent = stats.piar;
                    document.getElementById('stat-sin-pin').textContent = stats.sin_pin;
                })
                .catch(err => console.error("Error al procesar la selección del grupo:", err));
        }
    </script>
@endsection
