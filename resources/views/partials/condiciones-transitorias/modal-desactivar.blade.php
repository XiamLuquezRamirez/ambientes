<div class="modal fade" id="modalDesasociarTransitoria" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <form id="formDesasociarTransitoria" class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Desactivar estudiante</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body" style="display:grid;gap:14px">
                <p class="mb-0 text-muted" id="desasociarEstudianteNombre"></p>
                <p class="mb-0" style="font-size:.88rem">
                    La condición permanente del estudiante no se modifica. Solo se cierra esta asignación transitoria.
                </p>
                <input type="hidden" id="desasociarAsignacionId" value="">
                <div>
                    <label for="motivo_cierre" class="form-label fw-semibold">Motivo del cierre</label>
                    <select id="motivo_cierre" name="motivo_cierre" class="form-select" required>
                        <option value="">— Selecciona un motivo —</option>
                        <option value="diagnostico_formal">Diagnóstico formal confirmado</option>
                        <option value="condicion_no_confirmada">Condición no confirmada</option>
                        <option value="otro">Otro</option>
                    </select>
                </div>
                <div>
                    <label for="observacion_cierre" class="form-label fw-semibold">Observación</label>
                    <textarea id="observacion_cierre" name="observacion_cierre" class="form-control" rows="4"
                        required minlength="20" maxlength="2000"
                        placeholder="Indique por qué se desvincula al estudiante de esta condición transitoria…"></textarea>
                    <small class="text-muted">Mínimo 20 caracteres.</small>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-danger">Desactivar</button>
            </div>
        </form>
    </div>
</div>
