<div class="modal fade" id="modalEstudiantesCondicion" tabindex="-1" aria-labelledby="modalEstudiantesCondicionLabel"
    aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i class="fas fa-user-graduate text-white"></i></div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalEstudiantesCondicionLabel">Estudiantes asociados</h5>
                    <p class="modal-subtitle mb-0" id="modalEstudiantesCondicionSubtitle">—</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-0">
                <div id="modalEstudiantesCondicionLoading" class="text-center py-5 text-muted">
                    <i class="fas fa-spinner fa-spin fa-2x mb-2"></i>
                    <p class="mb-0">Cargando estudiantes…</p>
                </div>
                <div id="modalEstudiantesCondicionEmpty" class="cfg-empty m-3" style="display:none">
                    <i class="fa-solid fa-user-slash" style="font-size:1.4rem;opacity:.45"></i>
                    <p class="mt-2 mb-0">No hay estudiantes activos con esta condición.</p>
                </div>
                <div id="modalEstudiantesCondicionContenedor" style="display:none">
                    <div class="ct-est-filtros">
                        <input type="search" id="cnEstFiltroNombre" class="form-control form-control-sm"
                            placeholder="Buscar por nombre del estudiante…" autocomplete="off">
                    </div>
                    <div class="table-container ct-est-table-wrap">
                        <table class="ct-est-table">
                            <thead>
                                <tr>
                                    <th>Estudiante</th>
                                    <th>Grado</th>
                                    <th>Grupo</th>
                                    <th class="text-end">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="modalEstudiantesCondicionTbody"></tbody>
                        </table>
                    </div>
                    <div id="modalEstudiantesCondicionSinResultados" class="cfg-empty m-3" style="display:none">
                        <p class="mb-0">No hay estudiantes que coincidan con el filtro.</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <small class="text-muted me-auto" id="modalEstudiantesCondicionContador"></small>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            </div>
        </div>
    </div>
</div>
