<div class="modal fade modal-app" id="modalCrearEjes" tabindex="-1" data-bs-keyboard="false"
    aria-labelledby="modalCrearEjesLabel" aria-hidden="true">
    <div class="modal-dialog modal-md modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i id="modalCrearEjesIcon" class="fas fa-diagram-project text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" style="font-size: 1.4rem;" id="modalCrearEjesLabel">
                        Nuevo eje oficial
                    </h5>
                    <p class="modal-subtitle mb-0" id="modalCrearEjesSubtitle">
                        Completa los datos del eje
                    </p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>

            <form id="formCrearEjePagina" novalidate>
                <div class="modal-body p-4">
                    <input type="hidden" id="eje_pagina_modulo_id" name="modulo_id" value="">
                    <input type="hidden" id="eje_pagina_id" name="eje_id" value="">

                    <div class="mb-3">
                        <label class="form-label fw-bold" for="eje_pagina_nombre">
                            Nombre <span class="text-danger">*</span>
                        </label>
                        <input type="text" class="form-control" id="eje_pagina_nombre" name="nombre" maxlength="100"
                            placeholder="Ej. Exploración sensorial" required>
                        <small class="text-muted">
                            Máx. 100 caracteres · slug:
                            <span class="cfg-slug-preview" id="eje_pagina_slug_preview">se genera automáticamente</span>
                        </small>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold" for="eje_pagina_descripcion">Descripción</label>
                        <textarea class="form-control" id="eje_pagina_descripcion" name="descripcion" rows="3"
                            maxlength="1000" placeholder="Opcional"></textarea>
                    </div>

                    <div class="mb-1" style="max-width:120px">
                        <label class="form-label fw-bold" for="eje_pagina_orden">Orden</label>
                        <input type="number" class="form-control" id="eje_pagina_orden" name="orden" min="0"
                            max="255" placeholder="Auto">
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary" id="btnGuardarEjePagina">
                        <i class="fa-solid fa-floppy-disk"></i> Crear eje
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
