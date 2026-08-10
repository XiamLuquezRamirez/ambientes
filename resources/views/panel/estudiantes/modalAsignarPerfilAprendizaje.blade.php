@php
    $perfilesAprendizajeAsignables = $perfilesAprendizajeAsignables ?? $perfilesAprendizaje ?? collect();
    $perfilActualId = (int) ($estudiante->perfil_aprendizaje_id ?? 0);
@endphp

<div class="modal fade modal-app" id="modalAsignarPerfilAprendizaje" tabindex="-1"
    aria-labelledby="modalAsignarPerfilAprendizajeLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <form class="modal-content modal-con-select" id="formAsignarPerfilAprendizaje">
            @csrf
            <div class="modal-header">
                <div class="modal-header-icon"><i class="fas fa-layer-group text-white"></i></div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalAsignarPerfilAprendizajeLabel">Asignar perfil de aprendizaje</h5>
                    <p class="modal-subtitle mb-0" id="modalAsignarPerfilAprendizajeSubtitle">
                        {{ $perfilActualId && $perfilActualId !== 1 ? 'Actualiza el perfil de aprendizaje del estudiante' : 'Selecciona un perfil de aprendizaje para el estudiante' }}
                    </p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>

            <div class="modal-body modal-body-con-select d-grid gap-3">
                <div>
                    <label class="form-label fw-semibold" for="pa_select_trigger">Perfil de aprendizaje</label>
                    <input type="hidden" name="perfil_aprendizaje_id" id="perfil_aprendizaje_id_asignar" value="" required>

                    <div class="ct-select" id="paSelect">
                        <button type="button" class="ct-select-trigger" id="pa_select_trigger">
                            <span class="ct-select-label is-placeholder" id="paSelectLabel">Selecciona un perfil de aprendizaje…</span>
                            <i class="fa-solid fa-chevron-down ct-select-chevron"></i>
                        </button>

                        <div class="ct-select-panel">
                            <div class="ct-select-search">
                                <div class="ct-select-search-wrap">
                                    <i class="fa-solid fa-search"></i>
                                    <input type="text" id="paBuscarPerfilAprendizaje" placeholder="Buscar por nombre o código…"
                                        autocomplete="off">
                                </div>
                            </div>
                            <div class="ct-select-list" id="paSelectList">
                                @forelse ($perfilesAprendizajeAsignables as $perfil)
                                    <button type="button" class="ct-select-option"
                                        data-id="{{ $perfil->id }}"
                                        data-label="{{ $perfil->nombre }}"
                                        data-codigo="{{ $perfil->codigo }}"
                                        @if ((int) $perfil->id === $perfilActualId) data-selected="1" @endif>
                                        <span class="ct-select-option-text">
                                            <strong>{{ $perfil->nombre }}</strong>
                                            <small>{{ $perfil->codigo }}</small>
                                        </span>
                                    </button>
                                @empty
                                    <div class="ct-select-empty">No hay perfiles de aprendizaje habilitados</div>
                                @endforelse
                                <div class="ct-select-empty" id="paSelectEmpty" style="display:none">Sin resultados</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button type="submit" class="btn btn-primary" id="btnAsignarPerfilAprendizaje">
                    <i class="fa-solid fa-check"></i> Guardar
                </button>
            </div>
        </form>
    </div>
</div>
