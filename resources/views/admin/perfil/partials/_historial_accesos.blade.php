<div class="modal fade modal-app" id="modalHistorialAccesosPerfil" tabindex="-1" data-bs-keyboard="false"
    aria-labelledby="modalHistorialAccesosPerfilLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i class="fa-solid fa-clock-rotate-left text-white"></i></div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalHistorialAccesosPerfilLabel">Historial de accesos</h5>
                    <p class="modal-subtitle mb-0" id="modalHistorialAccesosPerfilSubtitle"></p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>

            <div class="modal-body">
                <div id="alertaAccesosPerfilFueraRango" class="alert alert-warning d-none" role="alert">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    Hay accesos desde IP fuera del rango permitido
                    <strong id="textoRangoPermitidoPerfil">192.168.1.0/24</strong>.
                </div>

                <div id="cargandoAccesosPerfil" class="text-center py-4 text-muted">
                    <i class="fa-solid fa-spinner fa-spin"></i> Cargando historial...
                </div>

                <div id="mensajeSinAccesosPerfil" class="text-center py-4 text-muted d-none">
                    Todavía no hay accesos registrados.
                </div>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Hora</th>
                                <th>IP de origen</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody id="cuerpoTablaAccesosPerfil"></tbody>
                    </table>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    data-bs-dismiss="modal">
                    <i class="fa-solid fa-xmark"></i> Cerrar
                </button>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        const URL_PERFIL_ACCESOS = @json(route('admin.perfil.accesos'));
        const modalHistorialAccesosPerfil = new bootstrap.Modal(document.getElementById('modalHistorialAccesosPerfil'));

        document.getElementById('modalHistorialAccesosPerfil').addEventListener('hidden.bs.modal', function() {
            limpiarModalHistorialAccesosPerfil();
        });

        function limpiarModalHistorialAccesosPerfil() {
            document.getElementById('cuerpoTablaAccesosPerfil').innerHTML = '';
            document.getElementById('mensajeSinAccesosPerfil').classList.add('d-none');
            document.getElementById('alertaAccesosPerfilFueraRango').classList.add('d-none');
            document.getElementById('cargandoAccesosPerfil').classList.remove('d-none');
            document.getElementById('modalHistorialAccesosPerfilSubtitle').textContent = 'Últimos 30 ingresos registrados';
        }

        async function abrirHistorialAccesosPerfil() {
            limpiarModalHistorialAccesosPerfil();
            modalHistorialAccesosPerfil.show();

            try {
                const response = await fetch(URL_PERFIL_ACCESOS);
                const resp = await response.json();

                if (!response.ok || !resp.success) {
                    throw new Error(resp.message || 'No se pudo cargar el historial');
                }

                pintarHistorialAccesosPerfil(resp.data);
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('cargandoAccesosPerfil').classList.add('d-none');
            }
        }

        function pintarHistorialAccesosPerfil(data) {
            const tbody = document.getElementById('cuerpoTablaAccesosPerfil');
            const accesos = data.accesos ?? [];
            const usuario = data.usuario ?? {};

            document.getElementById('cargandoAccesosPerfil').classList.add('d-none');
            document.getElementById('modalHistorialAccesosPerfilSubtitle').textContent =
                `${usuario.nombre ?? ''} · ${usuario.email ?? ''}`;
            document.getElementById('textoRangoPermitidoPerfil').textContent = data.rango_permitido;

            if (data.tiene_accesos_fuera_rango) {
                document.getElementById('alertaAccesosPerfilFueraRango').classList.remove('d-none');
            }

            if (!accesos.length) {
                document.getElementById('mensajeSinAccesosPerfil').classList.remove('d-none');
                return;
            }

            tbody.innerHTML = accesos.map((acceso) => `
                <tr class="${acceso.ip_fuera_rango ? 'table-warning' : ''}">
                    <td>${escapeHtmlPerfil(acceso.fecha ?? '—')}</td>
                    <td>${escapeHtmlPerfil(acceso.hora ?? '—')}</td>
                    <td>${escapeHtmlPerfil(acceso.ip ?? 'Sin registrar')}</td>
                    <td>
                        ${acceso.ip_fuera_rango
                            ? '<span class="badge bg-warning text-dark"><i class="fa-solid fa-triangle-exclamation"></i> Fuera de rango</span>'
                            : '<span class="badge bg-success"><i class="fa-solid fa-check"></i> Permitida</span>'}
                    </td>
                </tr>
            `).join('');
        }

        function escapeHtmlPerfil(value) {
            const div = document.createElement('div');
            div.textContent = value;
            return div.innerHTML;
        }
    </script>
@endpush
