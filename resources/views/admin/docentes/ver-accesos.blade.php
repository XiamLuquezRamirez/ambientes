<div class="modal fade" id="modalVerAccesos" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false"
    aria-labelledby="modalVerAccesosLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i class="fa-solid fa-clock-rotate-left text-white"></i></div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalVerAccesosLabel">Historial de accesos</h5>
                    <p class="modal-subtitle mb-0" id="modalVerAccesosSubtitle">Últimos 30 ingresos registrados</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>

            <div class="modal-body">
                <div id="alertaAccesosFueraRango" class="alert alert-warning d-none" role="alert">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    Hay accesos desde IP fuera del rango permitido <strong id="textoRangoPermitido">192.168.1.0/24</strong>.
                </div>

                <div id="cargandoAccesos" class="text-center py-4 text-muted">
                    <i class="fa-solid fa-spinner fa-spin"></i> Cargando historial...
                </div>

                <div id="mensajeSinAccesos" class="text-center py-4 text-muted d-none">
                    Este docente todavía no tiene accesos registrados.
                </div>

                <div class="table-container">
                    <table class="table table-striped align-middle">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Hora</th>
                                <th>IP de origen</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody id="cuerpoTablaAccesos"></tbody>
                    </table>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        const modalBSVerAccesos = new bootstrap.Modal(document.getElementById('modalVerAccesos'));

        document.getElementById('modalVerAccesos').addEventListener('hidden.bs.modal', function() {
            limpiarModalVerAccesos();
        });

        function limpiarModalVerAccesos() {
            document.getElementById('cuerpoTablaAccesos').innerHTML = '';
            document.getElementById('mensajeSinAccesos').classList.add('d-none');
            document.getElementById('alertaAccesosFueraRango').classList.add('d-none');
            document.getElementById('cargandoAccesos').classList.remove('d-none');
            document.getElementById('modalVerAccesosSubtitle').textContent = 'Últimos 30 ingresos registrados';
        }

        async function abrirModalVerAccesos(id) {
            limpiarModalVerAccesos();
            modalBSVerAccesos.show();

            try {
                const response = await fetch(`${URL_DOCENTES}/${id}/accesos`);
                const resp = await response.json();

                if (!response.ok || !resp.success) {
                    throw new Error(resp.message || 'No se pudo cargar el historial');
                }

                pintarHistorialAccesos(resp.data);
            } catch (error) {
                console.error('Error:', error);
                mostrarToast('error', 'No se pudo cargar el historial de accesos');
                document.getElementById('cargandoAccesos').classList.add('d-none');
            }
        }

        function pintarHistorialAccesos(data) {
            const tbody = document.getElementById('cuerpoTablaAccesos');
            const accesos = data.accesos ?? [];

            document.getElementById('cargandoAccesos').classList.add('d-none');
            document.getElementById('modalVerAccesosSubtitle').textContent =
                `${data.docente.nombre} · ${data.docente.email}`;
            document.getElementById('textoRangoPermitido').textContent = data.rango_permitido;

            if (data.tiene_accesos_fuera_rango) {
                document.getElementById('alertaAccesosFueraRango').classList.remove('d-none');
            }

            if (!accesos.length) {
                document.getElementById('mensajeSinAccesos').classList.remove('d-none');
                return;
            }

            // La clase visual se decide con la bandera enviada por el backend para no duplicar la regla de red en JS.
            tbody.innerHTML = accesos.map((acceso) => `
                <tr class="${acceso.ip_fuera_rango ? 'table-warning' : ''}">
                    <td>${escapeHtml(acceso.fecha ?? '—')}</td>
                    <td>${escapeHtml(acceso.hora ?? '—')}</td>
                    <td>${escapeHtml(acceso.ip ?? 'Sin registrar')}</td>
                    <td>
                        ${acceso.ip_fuera_rango
                            ? '<span class="badge bg-warning text-dark"><i class="fa-solid fa-triangle-exclamation"></i> Fuera de rango</span>'
                            : '<span class="badge bg-success"><i class="fa-solid fa-check"></i> Permitida</span>'}
                    </td>
                </tr>
            `).join('');
        }

        function escapeHtml(value) {
            // Los accesos vienen de base de datos; escapar evita inyectar HTML accidentalmente desde la IP registrada.
            const div = document.createElement('div');
            div.textContent = value;
            return div.innerHTML;
        }
    </script>
@endpush
