{{-- Requiere: $grados --}}
<div class="modal fade modal-app" id="modalExperienciaRapida" tabindex="-1"
    aria-labelledby="modalExperienciaRapidaLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fas fa-wand-magic-sparkles text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalExperienciaRapidaLabel">Nueva experiencia</h5>
                    <p class="modal-subtitle mb-0" id="modalExperienciaRapidaSubtitle">Se crea como borrador salvo que publique ahora</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-4">
                <ul class="nav nav-tabs tematicas-modal-tabs mb-0" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button type="button" class="nav-link active" id="tab-datos-experiencia"
                            data-bs-toggle="tab" data-bs-target="#datosExperiencia" role="tab"
                            aria-controls="datosExperiencia" aria-selected="true">
                            <i class="fa-solid fa-pen-to-square"></i> Datos
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button type="button" class="nav-link" id="tab-materiales-experiencia"
                            data-bs-toggle="tab" data-bs-target="#materialesExperiencia" role="tab"
                            aria-controls="materialesExperiencia" aria-selected="false">
                            <i class="fa-solid fa-toolbox"></i> Materiales
                        </button>
                    </li>
                </ul>
                <form id="formExperienciaRapida" autocomplete="off">
                    <input type="hidden" id="exp_id" value="">
                    <input type="hidden" id="exp_tematica_id" value="">
                    <div class="tab-content tematicas-exp-tabs-content">
                        <div class="tab-pane fade show active" id="datosExperiencia" role="tabpanel"
                            aria-labelledby="tab-datos-experiencia">
                            <div class="row g-3">
                                <div class="col-md-8">
                                    <label for="exp_nombre" class="form-label fw-bold">Nombre <span
                                            class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="exp_nombre" maxlength="150"
                                        required>
                                </div>
                                <div class="col-md-4">
                                    <label for="exp_grado_id" class="form-label fw-bold">Grado <span
                                            class="text-danger">*</span></label>
                                    <select id="exp_grado_id" class="form-select" required>
                                        <option value="">Seleccione…</option>
                                        @foreach ($grados as $grado)
                                            <option value="{{ $grado->id }}">{{ $grado->nombre }}</option>
                                        @endforeach
                                    </select>
                                </div>
                                <div class="col-12">
                                    <label for="exp_objetivo" class="form-label fw-bold">Objetivo de aprendizaje <span
                                            class="text-danger">*</span></label>
                                    <textarea class="form-control" id="exp_objetivo" rows="3" required
                                        placeholder="¿Qué logrará el estudiante con esta experiencia?"></textarea>
                                </div>
                                <div class="col-md-6">
                                    <label for="exp_habilidades" class="form-label fw-bold">Habilidades</label>
                                    <textarea class="form-control" id="exp_habilidades" rows="3" placeholder="Opcional"></textarea>
                                </div>
                                <div class="col-md-6">
                                    <label for="exp_proposito" class="form-label fw-bold">Propósito</label>
                                    <textarea class="form-control" id="exp_proposito" rows="3" placeholder="Opcional"></textarea>
                                </div>
                                <div class="col-md-8">
                                    <label for="exp_referente_aprendizaje" class="form-label fw-bold">Referente de
                                        aprendizaje</label>
                                    <textarea class="form-control" id="exp_referente_aprendizaje" rows="2" placeholder="Opcional"></textarea>
                                </div>
                                <div class="col-md-4">
                                    <label for="exp_duracion_minutos" class="form-label fw-bold">Duración estimada
                                        <span class="text-danger">*</span></label>
                                    <select id="exp_duracion_minutos" class="form-select" required>
                                        @foreach (\App\Models\Experiencia::DURACIONES_MINUTOS as $minutos)
                                            <option value="{{ $minutos }}" @selected($minutos === \App\Models\Experiencia::DURACION_DEFAULT)>
                                                {{ $minutos }} min
                                            </option>
                                        @endforeach
                                    </select>
                                </div>
                                <div class="col-12">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" role="switch"
                                            id="exp_publicar">
                                        <label class="form-check-label" for="exp_publicar" id="exp_publicar_label">Publicar ahora (estado activa)</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="materialesExperiencia" role="tabpanel"
                            aria-labelledby="tab-materiales-experiencia">
                            <div class="tematicas-seccion">
                                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                                    <div>
                                        <label class="form-label fw-bold mb-0">Materiales</label>
                                        <p class="form-text mb-0" id="exp_materiales_ayuda">Opcional. Puede crear la experiencia sin materiales.</p>
                                    </div>
                                    <button type="button" class="btn btn-sm btn-outline-primary" id="btnAgregarMaterialExp">
                                        <i class="fa-solid fa-plus"></i> Agregar material
                                    </button>
                                </div>
                                <div id="listaMaterialesExp" class="tematicas-materiales-lista">
                                    <p class="text-muted small mb-0">Sin materiales agregados.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn tematicas-btn-muted" data-bs-dismiss="modal">
                    <i class="fa-solid fa-xmark"></i> Cancelar
                </button>
                <button type="button" class="btn btn-primary" id="btnGuardarExperienciaRapida">
                    <i class="fa-solid fa-floppy-disk"></i> Guardar
                </button>
            </div>
        </div>
    </div>
</div>
