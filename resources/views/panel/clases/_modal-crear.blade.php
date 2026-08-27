<div class="modal fade modal-app exp-wizard-modal" id="modalCrearClase" tabindex="-1"
    aria-labelledby="modalCrearClaseLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fas fa-chalkboard-user text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalCrearClaseLabel">Nueva clase</h5>
                    <p class="modal-subtitle mb-0" id="claseWizardSubtitle">
                        Seleccione módulo, eje, temática y experiencia
                    </p>
                </div>
            </div>
            <div class="modal-body p-4">
                <div id="claseWizardSeleccion">
                    <div class="exp-wizard-meta">
                        <p class="exp-wizard-paso-label mb-2" id="claseWizardPasoLabel">Paso 1 de 4 · Módulo</p>
                        <nav class="exp-wizard-breadcrumb" id="claseWizardBreadcrumb" aria-label="Ruta de selección"
                            hidden></nav>
                    </div>
                    <p class="exp-wizard-instruction mb-3" id="claseWizardInstruction">Seleccione un módulo</p>

                    <div id="claseWizardLoading" class="exp-wizard-loading cfg-empty" hidden>
                        Cargando opciones…
                    </div>
                    <div id="claseWizardEmpty" class="cfg-empty exp-wizard-empty" hidden>
                        No hay opciones disponibles en este nivel.
                    </div>
                    <div id="claseWizardCards" class="exp-wizard-cards row g-3"></div>
                </div>

                <div id="claseWizardDatos" hidden>
                    <p class="exp-wizard-instruction mb-3">
                        Confirme los datos de la clase
                    </p>
                    <div class="row g-3">
                        <div class="col-md-8">
                            <label for="clase_nombre" class="form-label">Nombre <span
                                    class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="clase_nombre" maxlength="150" required>
                        </div>
                        <div class="col-md-4">
                            <label for="clase_fecha" class="form-label">Fecha</label>
                            <input type="date" class="form-control" id="clase_fecha">
                        </div>
                        <div class="col-12">
                            <label for="clase_descripcion" class="form-label">Descripción</label>
                            <textarea class="form-control" id="clase_descripcion" rows="3" maxlength="1000" placeholder="Opcional"></textarea>
                        </div>
                        <div class="col-12">
                            <div class="clase-replica-card" id="claseReplicaCard">
                                <div class="clase-replica-card-header">
                                    <div>
                                        <h6 class="clase-replica-card-title mb-1">
                                            <i class="fa-solid fa-people-group"></i>
                                            Replicar en grupos del grado
                                        </h6>
                                        <p class="clase-replica-card-hint mb-0" id="claseReplicaHint">
                                            Selecciona los grupos donde quieres crear esta misma clase.
                                        </p>
                                    </div>
                                    <div class="clase-replica-card-actions">
                                        <button type="button" class="btn btn-sm btn-outline-primary"
                                            id="btnClaseReplicaTodos">
                                            Todos
                                        </button>
                                        <button type="button" class="btn btn-sm btn-outline-secondary"
                                            id="btnClaseReplicaNinguno">
                                            Solo actual
                                        </button>
                                    </div>
                                </div>
                                <div class="clase-replica-grupos row g-2" id="claseReplicaGrupos"></div>
                            </div>
                        </div>
                        <div class="col-12">
                            <div class="cfg-empty mb-0" id="claseWizardResumen" style="text-align:left"></div>
                        </div>

                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" id="btnClaseWizardVolver" hidden>
                    <i class="fa-solid fa-arrow-left"></i> Volver
                </button>
                <button type="button" class="btn btn-secondary" id="btnClaseWizardCancelar" data-bs-dismiss="modal">
                    Cancelar
                </button>
                <button type="button" class="btn btn-primary" id="btnClaseWizardGuardar" hidden>
                    <i class="fa-solid fa-check"></i> Crear clase
                </button>
            </div>
        </div>
    </div>
</div>
