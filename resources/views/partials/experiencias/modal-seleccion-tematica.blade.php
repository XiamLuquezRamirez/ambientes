<div class="modal fade modal-app" id="modalSeleccionTematicaExp" tabindex="-1"
    aria-labelledby="modalSeleccionTematicaExpLabel" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fas fa-layer-group text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalSeleccionTematicaExpLabel">Seleccionar temática</h5>
                    <p class="modal-subtitle mb-0" id="expWizardSubtitle">
                        Elija ambiente, módulo, eje y temática para consultar experiencias
                    </p>
                </div>
            </div>
            <div class="modal-body p-4">
                <div class="exp-wizard-meta">
                    <p class="exp-wizard-paso-label mb-2" id="expWizardPasoLabel">Paso 1 de 4 · Ambiente</p>
                    <nav class="exp-wizard-breadcrumb" id="expWizardBreadcrumb" aria-label="Ruta de selección" hidden></nav>
                </div>
                <p class="exp-wizard-instruction mb-3" id="expWizardInstruction">Seleccione un ambiente</p>

                <div id="expWizardLoading" class="exp-wizard-loading cfg-empty" hidden>
                    Cargando opciones…
                </div>
                <div id="expWizardEmpty" class="cfg-empty exp-wizard-empty" hidden>
                    No hay opciones disponibles en este nivel.
                </div>
                <div id="expWizardCards" class="exp-wizard-cards row g-3"></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" id="btnExpWizardVolver" hidden>
                    <i class="fa-solid fa-arrow-left"></i> Volver
                </button>
                <button type="button" class="btn btn-secondary" id="btnExpWizardCancelar">Cancelar</button>
            </div>
        </div>
    </div>
</div>
