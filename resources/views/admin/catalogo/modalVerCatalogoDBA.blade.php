<div class="modal fade modal-app" id="modalVerCatalogoDBA" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fa-solid fa-eye text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalVerCatalogoDBALabel">Detalle del DBA</h5>
                    <p class="modal-subtitle mb-0" id="modalVerCatalogoDBASubtitle">Información del catálogo</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-4">
                <div id="cargandoDetalleCatalogoDBA" class="text-center py-4 text-muted" style="display:none">
                    <i class="fa-solid fa-spinner fa-spin"></i> Cargando detalle...
                </div>
                <div id="contenidoDetalleCatalogoDBA">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold text-muted mb-1" style="font-size:.8rem">Código</label>
                            <div id="detalleCodigo" style="font-weight:600;color:#1E293B;font-size:1.05rem"></div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold text-muted mb-1" style="font-size:.8rem">Origen</label>
                            <div id="detalleOrigen"></div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold text-muted mb-1" style="font-size:.8rem">Área</label>
                            <div id="detalleArea" style="color:#334155"></div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold text-muted mb-1" style="font-size:.8rem">Grado</label>
                            <div id="detalleGrado" style="color:#334155"></div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold text-muted mb-1" style="font-size:.8rem">Estado</label>
                            <div id="detalleEstado"></div>
                        </div>
                        <div class="col-12">
                            <label class="form-label fw-bold text-muted mb-1" style="font-size:.8rem">Descripción</label>
                            <div id="detalleDescripcion" class="catalogo-dba-detalle-descripcion"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-limpiar-filtros" data-bs-dismiss="modal">
                    <i class="fa-solid fa-xmark"></i> Cerrar
                </button>
            </div>
        </div>
    </div>
</div>
