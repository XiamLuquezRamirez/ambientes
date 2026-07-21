@push('styles')
    <style>
        .resumen-actividad-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 14px;
        }

        .resumen-stat-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
        }

        .resumen-stat-icon {
            width: 42px;
            height: 42px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.1rem;
            flex-shrink: 0;
        }

        .resumen-stat-value {
            display: block;
            font-size: 1.35rem;
            font-weight: 700;
            color: #1E293B;
            line-height: 1.2;
        }

        .resumen-stat-label {
            display: block;
            font-size: 0.8rem;
            color: #64748B;
        }

        .resumen-actividad-seccion-titulo {
            font-weight: 600;
            color: #334155;
        }

        <link rel="stylesheet" href="{{ asset('assets/css/estilosModals.css') }}">
    </style>
@endpush

<div class="modal fade modal-app" id="modalVerResumen" tabindex="-1" data-bs-keyboard="false"
    aria-labelledby="modalVerResumenLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i class="fa-solid fa-chart-pie text-white"></i></div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalVerResumenLabel">Resumen de carga y actividad</h5>
                    <p class="modal-subtitle mb-0" id="modalVerResumenSubtitle"></p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>

            <div class="modal-body">
                <div id="cargandoResumen" class="text-center py-4 text-muted">
                    <i class="fa-solid fa-spinner fa-spin"></i> Cargando resumen...
                </div>
                <div id="contenidoResumenDocente" class="d-none"></div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    data-bs-dismiss="modal"><i class="fa-solid fa-xmark"></i> Cerrar</button>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        const modalBSVerResumen = new bootstrap.Modal(document.getElementById('modalVerResumen'));

        document.getElementById('modalVerResumen').addEventListener('hidden.bs.modal', limpiarModalResumenDocente);

        function limpiarModalResumenDocente() {
            document.getElementById('cargandoResumen').classList.remove('d-none');
            document.getElementById('contenidoResumenDocente').classList.add('d-none');
            document.getElementById('contenidoResumenDocente').innerHTML = '';
            document.getElementById('modalVerResumenSubtitle').textContent = '';
        }

        async function abrirModalResumenDocente(id) {
            limpiarModalResumenDocente();
            modalBSVerResumen.show();

            try {
                const response = await fetch(`${URL_USUARIOS}/${id}/resumen`);
                const resp = await response.json();
                if (!response.ok || !resp.success) {
                    throw new Error(resp.message || 'No se pudo cargar el resumen');
                }

                pintarResumenDocente(resp.data);
            } catch (error) {
                console.error('Error:', error);
                mostrarToast('error', 'No se pudo cargar el resumen de actividad');
                document.getElementById('cargandoResumen').classList.add('d-none');
            }
        }

        function pintarResumenDocente(data) {
            const docente = data.docente ?? {};
            const cargas = data.cargas ?? [];
            const totales = data.totales ?? {};
            const anio = data.anio ?? new Date().getFullYear();
            const tieneCarga = data.tiene_carga ?? cargas.length > 0;
            const puedeAsignar = typeof abrirModalAsignarGrado === 'function';

            document.getElementById('cargandoResumen').classList.add('d-none');
            document.getElementById('modalVerResumenSubtitle').textContent =
                `${docente.nombre ?? ''} · ${docente.email ?? ''}`;

            const filasCargas = cargas.map((carga) => `
                <tr>
                    <td>${escapeHtmlResumen(carga.ambiente ?? '—')}</td>
                    <td>${escapeHtmlResumen(carga.grado ?? '—')}</td>
                    <td>${escapeHtmlResumen(carga.grupo ?? '—')}</td>
                    <td style="text-align:center">${Number(carga.estudiantes ?? 0).toLocaleString('es-CO')}</td>
                </tr>
            `).join('');

            const botonAsignar = puedeAsignar ?
                `<button type="button" class="btn btn-primary" onclick="modalBSVerResumen.hide(); abrirModalAsignarGrado(${docente.id})">
                        <i class="fa-solid fa-list"></i> Asignar grupo
                   </button>` :
                `<a href="{{ route('admin.docentes') }}" class="btn btn-primary">
                        <i class="fa-solid fa-list"></i> Ir a asignar grupo
                   </a>`;

            const tablaCargas = tieneCarga ? `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Ambiente</th>
                                <th>Grado</th>
                                <th>Grupo</th>
                                <th style="text-align:center">Estudiantes</th>
                            </tr>
                        </thead>
                        <tbody>${filasCargas}</tbody>
                    </table>
                </div>
            ` : `
                <div class="resumen-sin-carga text-center py-4">
                    <i class="fa-solid fa-folder-open fa-2x text-muted mb-3 d-block"></i>
                    <p class="text-muted mb-3">Este docente no tiene carga asignada para el año ${anio}.</p>
                    ${botonAsignar}
                </div>
            `;

            document.getElementById('contenidoResumenDocente').innerHTML = `
                <div class="resumen-actividad-docente">
                    <p class="resumen-actividad-anio text-muted mb-3">
                        <i class="fa-solid fa-calendar-days"></i> Año lectivo ${anio}
                    </p>
                    <div class="resumen-actividad-stats">
                        <div class="resumen-stat-card">
                            <span class="resumen-stat-icon" style="background:#EFF6FF;color:#2563EB"><i class="fa-solid fa-user-graduate"></i></span>
                            <div>
                                <span class="resumen-stat-value">${Number(totales.estudiantes ?? 0).toLocaleString('es-CO')}</span>
                                <span class="resumen-stat-label">Estudiantes a cargo</span>
                            </div>
                        </div>
                        <div class="resumen-stat-card">
                            <span class="resumen-stat-icon" style="background:#FFF7ED;color:#EA580C"><i class="fa-solid fa-clipboard-check"></i></span>
                            <div>
                                <span class="resumen-stat-value">${Number(totales.observaciones ?? 0).toLocaleString('es-CO')}</span>
                                <span class="resumen-stat-label">Observaciones</span>
                            </div>
                        </div>
                        <div class="resumen-stat-card">
                            <span class="resumen-stat-icon" style="background:#FFF7ED;color:#EA580C"><i class="fa-solid fa-clipboard-check"></i></span>
                            <div>
                                <span class="resumen-stat-value">${Number(totales.asistencias ?? 0).toLocaleString('es-CO')}</span>
                                <span class="resumen-stat-label">Asistencias tomadas</span>
                            </div>
                        </div>
                    </div>
                    <h6 class="resumen-actividad-seccion-titulo mt-4 mb-2">Cargas activas</h6>
                    ${tablaCargas}
                </div>
            `;

            document.getElementById('contenidoResumenDocente').classList.remove('d-none');
        }

        function escapeHtmlResumen(value) {
            const div = document.createElement('div');
            div.textContent = value;
            return div.innerHTML;
        }
    </script>
@endpush
