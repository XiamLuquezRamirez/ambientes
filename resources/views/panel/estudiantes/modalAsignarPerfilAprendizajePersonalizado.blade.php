@php
    $perfilesAprendizajePersonalizadoAsignables = $perfilesAprendizajePersonalizadoAsignables ?? $perfilesAprendizajePersonalizado ?? collect();
@endphp

<div class="modal fade modal-app" id="modalAsignarPerfilAprendizajePersonalizado" tabindex="-1"
    aria-labelledby="modalAsignarPerfilAprendizajePersonalizadoLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <form class="modal-content modal-con-select" id="formAsignarPerfilAprendizajePersonalizado">
            @csrf
            <div class="modal-header">
                <div class="modal-header-icon"><i class="fas fa-puzzle-piece text-white"></i></div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalAsignarPerfilAprendizajePersonalizadoLabel">Asignar perfil de aprendizaje personalizado</h5>
                    <p class="modal-subtitle mb-0">Solo puede haber uno activo por estudiante</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>

            <div class="modal-body modal-body-con-select d-grid gap-3">
                <div>
                    <label class="form-label fw-semibold" for="pap_select_trigger">Perfil de aprendizaje personalizado</label>
                    <input type="hidden" name="perfil_aprendizaje_personalizado_id" id="perfil_aprendizaje_personalizado_id_asignar" value="" required>

                    <div class="ct-select" id="papSelect">
                        <button type="button" class="ct-select-trigger" id="pap_select_trigger">
                            <span class="ct-select-label is-placeholder" id="papSelectLabel">Selecciona un perfil de aprendizaje…</span>
                            <i class="fa-solid fa-chevron-down ct-select-chevron"></i>
                        </button>

                        <div class="ct-select-panel">
                            <div class="ct-select-search">
                                <div class="ct-select-search-wrap">
                                    <i class="fa-solid fa-search"></i>
                                    <input type="text" id="papBuscarPerfilAprendizajePersonalizado" placeholder="Buscar por nombre o código…"
                                        autocomplete="off">
                                </div>
                            </div>
                            <div class="ct-select-list" id="papSelectList">
                                @forelse ($perfilesAprendizajePersonalizadoAsignables as $perfilAprendizajePersonalizado)
                                    <button type="button" class="ct-select-option"
                                        data-id="{{ $perfilAprendizajePersonalizado->id }}"
                                        data-label="{{ $perfilAprendizajePersonalizado->etiqueta }}"
                                        data-codigo="{{ $perfilAprendizajePersonalizado->codigo }}">
                                        <span class="ct-select-option-text">
                                            <strong>{{ $perfilAprendizajePersonalizado->etiqueta }}</strong>
                                            <small>{{ $perfilAprendizajePersonalizado->codigo }}</small>
                                        </span>
                                    </button>
                                @empty
                                    <div class="ct-select-empty">No hay perfiles de aprendizaje habilitados</div>
                                @endforelse
                                <div class="ct-select-empty" id="papSelectEmpty" style="display:none">Sin resultados</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label for="observacion_perfil_personalizado" class="form-label fw-semibold">Observación</label>
                    <textarea name="observacion" id="observacion_perfil_personalizado" class="form-control" rows="4" required
                        minlength="20" maxlength="2000"
                        placeholder="Describe por qué se asigna este perfil de aprendizaje personalizado…"></textarea>
                    <small class="text-muted">Mínimo 20 caracteres.</small>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button type="submit" class="btn btn-primary" id="btnAsignarPerfilAprendizajePersonalizado">
                    <i class="fa-solid fa-check"></i> Asignar
                </button>
            </div>
        </form>
    </div>
</div>
