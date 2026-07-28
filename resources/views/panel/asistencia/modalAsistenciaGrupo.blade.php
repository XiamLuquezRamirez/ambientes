<div class="modal fade modal-app" id="modalAsistenciaGrupo" tabindex="-1">

    <div class="modal-dialog modal-xl modal-dialog-centered">

        <div class="modal-content">

            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fa-solid fa-clipboard-check text-white"></i>
                </div>
                <div>
                    <h5 class="modal-title mb-0">Reporte de asistencia</h5>
                    <p class="modal-subtitle mb-0">Resumen de asistencia de todo mi grupo.</p>
                </div>

                <div class="row ms-3 flex-grow-1 align-items-center g-2">
                    <div class="col-md-4">
                        <input type="date" id="fechaInicio" class="form-control"
                            value="{{ now()->startOfMonth()->toDateString() }}">
                    </div>
                    <div class="col-md-4">
                        <input type="date" id="fechaFin" class="form-control" value="{{ now()->toDateString() }}">
                    </div>
                    <div class="col-md-4">
                        <button type="button" class="btn btn-light w-100" onclick="cargarReporteAsistencia()">
                            <i class="fa-solid fa-filter"></i>
                            Aplicar filtro
                        </button>
                    </div>
                </div>

                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>

            <div class="modal-body">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Estudiante</th>
                                <th class="text-center">Presentes</th>
                                <th class="text-center">Registros</th>
                                <th width="220">Asistencia</th>
                                <th class="text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody id="tablaReporteAsistencia"></tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fa-solid fa-xmark"></i> Cerrar
                </button>
                <button type="button" class="btn btn-primary" onclick="exportarReporteAsistencia()">
                    <i class="fa-solid fa-file-pdf"></i> Exportar PDF
                </button>
            </div>
        </div>
    </div>
</div>
