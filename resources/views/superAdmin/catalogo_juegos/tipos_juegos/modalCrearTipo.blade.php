<div class="modal fade modal-app" id="modalCrearTipoJuego" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i id="modalCrearTipoJuegoIcon"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalCrearTipoJuegoLabel"></h5>
                    <p class="modal-subtitle mb-0" id="modalCrearTipoJuegoSubtitle"></p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-4">
                <form id="formCrearTipoJuego">
                    @csrf
                    <div class="form-group mb-3">
                        <label class="form-label fw-bold" for="nombre">Nombre</label>
                        <input type="text" class="form-control" id="nombre" name="nombre" required maxlength="100">
                    </div>
                    <div class="form-group">
                        <label class="form-label fw-bold" for="descripcion">Descripción</label>
                        <textarea class="form-control" id="descripcion" name="descripcion" rows="3" maxlength="500"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    data-bs-dismiss="modal">
                    <i class="fa-solid fa-xmark"></i> Cancelar</button>
                <button type="submit" form="formCrearTipoJuego" id="btnCrearTipoJuego" class="btn btn-primary">
                    <i class="fa-solid fa-floppy-disk"></i> Crear Tipo de Juego</button>
            </div>
        </div>
    </div>
</div>
