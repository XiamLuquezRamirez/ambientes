<div class="modal fade" id="modalVerAccesos" tabindex="-1" data-bs-keyboard="false" aria-labelledby="modalVerAccesosLabel"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl ">
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
                {{-- ── Alerta de accesos fuera del rango permitido ──────────────────────── --}}
                <div id="alertaAccesosFueraRango" class="alert alert-warning d-none" role="alert">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    Hay accesos desde IP fuera del rango permitido <strong
                        id="textoRangoPermitido">192.168.1.0/24</strong>.
                </div>

                {{-- ── Cargando historial de accesos ──────────────────────── --}}
                <div id="cargandoAccesos" class="text-center py-4 text-muted">
                    <i class="fa-solid fa-spinner fa-spin"></i> Cargando historial...
                </div>

                {{-- ── Mensaje de que el docente no tiene accesos registrados ──────────────────────── --}}
                <div id="mensajeSinAccesos" class="text-center py-4 text-muted d-none">
                    Este docente todavía no tiene accesos registrados.
                </div>

                {{-- ── Tabla de accesos ──────────────────────── --}}
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
                        <tbody id="cuerpoTablaAccesos"></tbody>
                    </table>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    data-bs-dismiss="modal"> <i class="fa-solid fa-xmark"></i> Cerrar</button>
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

        // Funcion para limpiar el modal de ver accesos
        // Se limpia la tabla, se oculta el mensaje de que no hay accesos registrados y se oculta el alerta de accesos fuera del rango permitido
        // Se muestra el cargando y se limpia el subtitulo del modal
        function limpiarModalVerAccesos() {
            document.getElementById('cuerpoTablaAccesos').innerHTML = '';
            document.getElementById('mensajeSinAccesos').classList.add('d-none');
            document.getElementById('alertaAccesosFueraRango').classList.add('d-none');
            document.getElementById('cargandoAccesos').classList.remove('d-none');
            document.getElementById('modalVerAccesosSubtitle').textContent = 'Últimos 30 ingresos registrados';
        }

        // Funcion para abrir el modal de ver accesos
        // id es el id del docente
        // Se limpia el modal y se muestra el cargando
        // Se hace una peticion a la API para obtener los datos del historial de accesos
        // Se pinta el historial de accesos en la tabla
        // Si hay un error, se muestra un toast de error
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
        // Funcion para pintar el historial de accesos en la tabla
        // data es el objeto que contiene los datos del historial de accesos
        // data.accesos es el array de accesos
        // data.docente.nombre es el nombre del docente
        // data.docente.email es el email del docente
        // data.tiene_accesos_fuera_rango es el booleano que indica si hay accesos fuera del rango permitido
        // data.rango_permitido es el rango permitido
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

        // Funcion para escapar el HTML de la IP registrada
        // value es el valor de la IP registrada
        // Se crea un div y se le asigna el valor de la IP registrada
        // Se retorna el innerHTML del div
        function escapeHtml(value) {
            // Los accesos vienen de base de datos; escapar evita inyectar HTML accidentalmente desde la IP registrada.
            const div = document.createElement('div');
            div.textContent = value;
            return div.innerHTML;
        }
    </script>
@endpush