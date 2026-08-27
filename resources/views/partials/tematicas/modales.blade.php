{{-- Requiere: $areas, $grados --}}
<div class="modal fade modal-app" id="modalTematica" tabindex="-1" aria-labelledby="modalTematicaLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fas fa-layer-group text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalTematicaLabel">Temática</h5>
                    <p class="modal-subtitle mb-0" id="modalTematicaSubtitle">
                        Defina nombre, indicadores y DBA asociados
                    </p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-4">
                <form id="formTematica" autocomplete="off">
                    <input type="hidden" id="tematica_id" name="id" value="">

                    <ul class="nav nav-tabs tematicas-modal-tabs mb-3" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button type="button" class="nav-link active" id="tab-tematica-general"
                                data-bs-toggle="tab" data-bs-target="#pane-tematica-general" role="tab"
                                aria-controls="pane-tematica-general" aria-selected="true">
                                General
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button type="button" class="nav-link" id="tab-tematica-indicadores" data-bs-toggle="tab"
                                data-bs-target="#pane-tematica-indicadores" role="tab"
                                aria-controls="pane-tematica-indicadores" aria-selected="false">
                                Indicadores
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button type="button" class="nav-link" id="tab-tematica-dba" data-bs-toggle="tab"
                                data-bs-target="#pane-tematica-dba" role="tab" aria-controls="pane-tematica-dba"
                                aria-selected="false">
                                DBA
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button type="button" class="nav-link" id="tab-tematica-experiencias" data-bs-toggle="tab"
                                data-bs-target="#pane-tematica-experiencias" role="tab"
                                aria-controls="pane-tematica-experiencias" aria-selected="false">
                                Experiencias
                            </button>
                        </li>
                    </ul>

                    <div class="tab-content">
                        <div class="tab-pane fade show active" id="pane-tematica-general" role="tabpanel"
                            aria-labelledby="tab-tematica-general">
                            <div class="mb-3">
                                <label for="tematica_nombre" class="form-label fw-bold">Nombre <span
                                        class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="tematica_nombre" name="nombre"
                                    maxlength="150" required>
                            </div>

                            <div class="mb-3" id="wrapTematicaEjeSelect">
                                <label class="form-label fw-bold">Ubicación curricular <span
                                        class="text-danger">*</span></label>
                                <div class="row g-2">
                                    <div class="col-md-4">
                                        <select id="tematica_ambiente_id" class="form-select">
                                            <option value="">Ambiente…</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4">
                                        <select id="tematica_modulo_id" class="form-select" disabled>
                                            <option value="">Módulo…</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4">
                                        <select id="tematica_eje_id" class="form-select" disabled>
                                            <option value="">Eje…</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-3" id="wrapTematicaEjeNombre" hidden>
                                <label for="tematica_eje_nombre" class="form-label fw-bold">Eje</label>
                                <input type="text" class="form-control" id="tematica_eje_nombre" readonly
                                    tabindex="-1">
                            </div>

                            <div class="tematicas-toggles mb-3">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" role="switch"
                                        id="tematica_requiere_ra">
                                    <label class="form-check-label" for="tematica_requiere_ra">Requiere RA</label>
                                </div>
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" role="switch"
                                        id="tematica_requiere_acompanamiento">
                                    <label class="form-check-label" for="tematica_requiere_acompanamiento">Requiere
                                        acompañamiento</label>
                                </div>
                            </div>

                            <div class="mb-0">
                                <label for="tematica_referente_alternativo" class="form-label fw-bold">Referente
                                    alternativo</label>
                                <textarea class="form-control" id="tematica_referente_alternativo" name="referente_alternativo" rows="3"></textarea>
                            </div>
                        </div>

                        <div class="tab-pane fade" id="pane-tematica-indicadores" role="tabpanel"
                            aria-labelledby="tab-tematica-indicadores">
                            <div class="tematicas-seccion">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <label class="form-label fw-bold mb-0">Indicadores de logro</label>
                                    <button type="button" class="btn btn-sm btn-outline-primary"
                                        id="btnAgregarIndicador">
                                        <i class="fa-solid fa-plus"></i> Agregar
                                    </button>
                                </div>
                                <div id="listaIndicadores" class="tematicas-indicadores"></div>
                                <div class="form-text">Opcional. Máximo 300 caracteres por indicador.</div>
                            </div>
                        </div>

                        <div class="tab-pane fade" id="pane-tematica-dba" role="tabpanel"
                            aria-labelledby="tab-tematica-dba">
                            <div class="tematicas-seccion">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <label class="form-label fw-bold mb-0">DBA relacionados</label>
                                    <button type="button" class="btn btn-sm btn-outline-primary" id="btnAgregarDba">
                                        <i class="fa-solid fa-plus"></i> Agregar DBA
                                    </button>
                                </div>
                                <p class="form-text mb-2">Puede agregar, editar la relación/observación o quitar DBAs
                                    asociados.</p>
                                <div id="listaDbas" class="tematicas-dbas"></div>
                            </div>
                        </div>

                        <div class="tab-pane fade" id="pane-tematica-experiencias" role="tabpanel"
                            aria-labelledby="tab-tematica-experiencias">
                            <div class="tematicas-seccion" id="listaExperienciasTematica">
                                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                                    <label class="form-label fw-bold mb-0">Experiencias de esta temática</label>
                                    <button type="button" class="btn btn-sm btn-outline-primary"
                                        id="btnAgregarExperiencia" disabled>
                                        <i class="fa-solid fa-plus"></i> Nueva experiencia
                                    </button>
                                </div>
                                <p class="form-text mb-2">Cada experiencia se asocia a un grado. Defina objetivo,
                                    habilidades y duración estimada.</p>
                                <div id="listaExperienciasBody" class="tematicas-experiencias-lista">
                                    <p class="text-muted small mb-0">Guarde la temática para gestionar experiencias.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer flex-wrap gap-2">
                <button type="button" class="btn btn-outline-success me-auto" id="btnCrearExperienciaDesdeTematica"
                    disabled>
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Crear experiencia
                </button>
                <button type="button" class="btn tematicas-btn-muted" data-bs-dismiss="modal">
                    <i class="fa-solid fa-xmark"></i> Cancelar
                </button>
                <button type="button" class="btn btn-primary" id="btnGuardarTematica">
                    <i class="fa-solid fa-floppy-disk"></i> Guardar
                </button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade modal-app" id="modalSelectorDba" tabindex="-1" aria-labelledby="modalSelectorDbaLabel"
    aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fas fa-book-open text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalSelectorDbaLabel">Seleccionar DBA</h5>
                    <p class="modal-subtitle mb-0">Filtre por grado, área o texto</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-4">
                <div class="row g-2 mb-3">
                    <div class="col-md-4">
                        <label for="filtroDbaGrado" class="form-label fw-bold">Grado</label>
                        <select id="filtroDbaGrado" class="form-select">
                            <option value="">Todos</option>
                            @foreach ($grados as $grado)
                                <option value="{{ $grado->id }}">{{ $grado->nombre }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label for="filtroDbaArea" class="form-label fw-bold">Área</label>
                        <select id="filtroDbaArea" class="form-select">
                            <option value="">Todas</option>
                            @foreach ($areas as $area)
                                <option value="{{ $area->id }}">{{ $area->nombre }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label for="filtroDbaQ" class="form-label fw-bold">Buscar</label>
                        <input type="search" id="filtroDbaQ" class="form-control"
                            placeholder="Código o descripción…">
                    </div>
                </div>
                <div id="selectorDbaLista" class="tematicas-selector-dba-lista">
                    <p class="text-muted small mb-0">Use los filtros para buscar DBAs.</p>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn tematicas-btn-muted" data-bs-dismiss="modal">
                    <i class="fa-solid fa-xmark"></i> Cerrar
                </button>
            </div>
        </div>
    </div>
</div>

@include('partials.experiencias._modal-experiencia')

