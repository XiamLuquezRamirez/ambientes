<div class="modal fade modal-app" id="modalCrearModulos" tabindex="-1" data-bs-keyboard="false"
    aria-labelledby="modalCrearModulosLabel" aria-hidden="true">
    <div class="modal-dialog modal-md modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i id="modalCrearModulosIcon" class="fas fa-cube text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" style="font-size: 1.4rem;" id="modalCrearModulosLabel">
                        Nuevo módulo adicional
                    </h5>
                    <p class="modal-subtitle mb-0" id="modalCrearModulosSubtitle">
                        Completa los datos del módulo del colegio
                    </p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>

            <form id="formCrearModulo" novalidate>
                <div class="modal-body p-4">
                    <input type="hidden" id="modulo_ambiente_id" name="ambiente_id" value="">
                    <input type="hidden" id="modulo_id" name="modulo_id" value="">

                    <div class="mb-3">
                        <label class="form-label fw-bold" for="modulo_nombre">
                            Nombre <span class="text-danger">*</span>
                        </label>
                        <input type="text" class="form-control" id="modulo_nombre" name="nombre" maxlength="100"
                            placeholder="Ej. Proyecto local" required>
                        <small class="text-muted">
                            Máx. 100 caracteres · slug:
                            <span class="cfg-slug-preview" id="modulo_slug_preview">se genera automáticamente</span>
                        </small>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold" for="modulo_descripcion">Descripción</label>
                        <textarea class="form-control" id="modulo_descripcion" name="descripcion" rows="3" maxlength="1000"
                            placeholder="Opcional"></textarea>
                    </div>

                    <div class="mb-1" style="max-width:120px">
                        <label class="form-label fw-bold" for="modulo_orden">Orden</label>
                        <input type="number" class="form-control" id="modulo_orden" name="orden" min="1"
                            max="255" placeholder="Auto">
                    </div>

                    @include('partials.catalogo._campos-media-curriculo', ['mediaIdPrefix' => 'modulo'])
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary" id="btnGuardarModulo">
                        <i class="fa-solid fa-floppy-disk"></i> Crear módulo
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
