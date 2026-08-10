<div class="modal fade modal-app" id="modalDesasociarTransitoria" tabindex="-1"
    aria-labelledby="modalDesasociarTransitoriaLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <form id="formDesasociarTransitoria" class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i class="fas fa-unlink text-white"></i></div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalDesasociarTransitoriaLabel">Desactivar perfil de aprendizaje personalizado</h5>
                    <p class="modal-subtitle mb-0">Cierre la asignación del estudiante</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body d-grid gap-3">
                <p class="mb-0 fw-semibold" id="desasociarEstudianteNombre"></p>
                <p class="mb-0 text-muted" style="font-size:.9rem">
                    El perfil de aprendizaje permanente del estudiante no se modifica. Solo se cierra esta asignación
                    del perfil personalizado.
                </p>
                <input type="hidden" id="desasociarAsignacionId" value="">
                <div>
                    <label for="motivo_cierre" class="form-label fw-semibold">Motivo del cierre</label>
                    <select id="motivo_cierre" name="motivo_cierre" class="form-select" required>
                        <option value="">— Selecciona un motivo —</option>
                        <option value="diagnostico_formal">Diagnóstico formal confirmado</option>
                        <option value="perfil_aprendizaje_no_confirmado">Perfil de aprendizaje no confirmado</option>
                        <option value="otro">Otro</option>
                    </select>
                </div>
                <div>
                    <label for="observacion_cierre" class="form-label fw-semibold">Observación</label>
                    <textarea id="observacion_cierre" name="observacion_cierre" class="form-control" rows="4"
                        required minlength="20" maxlength="2000"
                        placeholder="Indique por qué se desactiva el perfil de aprendizaje personalizado del estudiante…"></textarea>
                    <small class="text-muted">Mínimo 20 caracteres.</small>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button type="submit" class="btn btn-danger">
                    <i class="fa-solid fa-unlink"></i> Desactivar
                </button>
            </div>
        </form>
    </div>
</div>
