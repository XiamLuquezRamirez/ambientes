{{--
    Modal: Crear / Editar perfil de aprendizaje personalizado
--}}
@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/perfiles-aprendizaje/index.css') }}">
@endpush

<div class="modal fade modal-app" id="modalRegistrarTransitoria" tabindex="-1" data-bs-keyboard="false"
    aria-labelledby="modalRegistrarTransitoriaTitle" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fas fa-list-check text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" style="font-size: 1.4rem;" id="modalRegistrarTransitoriaTitle">
                        Nuevo perfil de aprendizaje personalizado</h5>
                    <p class="modal-subtitle mb-0" id="modalRegistrarTransitoriaSubtitle">
                        Defina una opción para el selector del docente.</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-4">
                <ul class="nav nav-tabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <a class="nav-link active" id="tab-datos-generales-transitoria" data-bs-toggle="tab"
                            href="#datosGeneralesTransitoria" role="tab"
                            aria-controls="datosGeneralesTransitoria" aria-selected="true">
                            <i class="fas fa-circle-info"></i> Datos generales
                        </a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="tab-ajustes-transitoria" data-bs-toggle="tab"
                            href="#ajustesTransitoria" role="tab" aria-controls="ajustesTransitoria"
                            aria-selected="false">
                            <i class="fas fa-sliders"></i> Ajustes
                        </a>
                    </li>
                </ul>

                <form id="formRegistrarTransitoria" autocomplete="off">
                    @csrf
                    <input type="hidden" id="transitoria_id" value="">
                    <input type="hidden" id="perfil_aprendizaje_id" name="perfil_aprendizaje_id" value="">

                    <div class="tab-content" style="padding: 20px 0 0;">
                        <div class="tab-pane fade show active" id="datosGeneralesTransitoria" role="tabpanel"
                            aria-labelledby="tab-datos-generales-transitoria">
                            <div class="row g-3">
                                <div class="col-md-4" id="wrapCodigoTransitoria" style="display:none">
                                    <label class="form-label fw-bold" for="codigo_transitoria">Código</label>
                                    <input type="text" id="codigo_transitoria" class="form-control" readonly>
                                </div>
                                <div class="col-md-8" id="wrapEtiquetaTransitoria">
                                    <label class="form-label fw-bold" for="etiqueta_transitoria">Etiqueta</label>
                                    <input type="text" id="etiqueta_transitoria" name="etiqueta" class="form-control"
                                        placeholder="Texto visible para el docente" maxlength="150" required>
                                    <small class="text-muted" id="hintCodigoTransitoria">
                                        El código se genera automáticamente (ej: CTR-001).
                                    </small>
                                </div>

                                <div class="col-12">
                                    <label class="form-label fw-bold">Perfil de aprendizaje base</label>
                                    <div class="cb-select" id="cbPerfilAprendizajeBase">
                                        <button type="button" class="cb-select-trigger" id="cbPerfilAprendizajeBaseTrigger">
                                            <span class="cb-select-swatch" id="cbPerfilAprendizajeBaseSwatch"
                                                style="display:none;background:#64748B"></span>
                                            <span class="cb-select-label is-placeholder" id="cbPerfilAprendizajeBaseLabel">
                                                Sin perfil de aprendizaje base
                                            </span>
                                            <i class="fa-solid fa-chevron-down cb-select-chevron"></i>
                                        </button>
                                        <div class="cb-select-panel">
                                            <div class="cb-select-search">
                                                <div class="cb-select-search-wrap">
                                                    <i class="fa-solid fa-search"></i>
                                                    <input type="text" id="buscar_perfil_aprendizaje"
                                                        placeholder="Buscar por código o nombre..." autocomplete="off">
                                                </div>
                                            </div>
                                            <div class="cb-select-list" id="cbPerfilAprendizajeBaseList">
                                                <button type="button" class="cb-select-option" data-id=""
                                                    data-codigo="" data-nombre="" data-color="">
                                                    <span class="cb-select-option-text">
                                                        <strong style="color:#64748B;font-weight:500">Sin perfil de aprendizaje base</strong>
                                                        <small>Opcional — no hereda ajustes</small>
                                                    </span>
                                                </button>
                                                @foreach ($perfilesAprendizajeBase as $base)
                                                    <button type="button" class="cb-select-option"
                                                        data-id="{{ $base->id }}"
                                                        data-codigo="{{ $base->codigo }}"
                                                        data-nombre="{{ $base->nombre }}"
                                                        data-color="{{ $base->color_hex ?: '#64748B' }}">
                                                        <span class="cb-select-swatch"
                                                            style="background:{{ $base->color_hex ?: '#64748B' }}"></span>
                                                        <span class="cb-select-option-text">
                                                            <strong>{{ $base->nombre }}</strong>
                                                            <small>{{ $base->codigo }}</small>
                                                        </span>
                                                    </button>
                                                @endforeach
                                                <div class="cb-select-empty" id="cbPerfilAprendizajeBaseEmpty" style="display:none">
                                                    Sin resultados
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <small class="text-muted">Opcional. Si elige una, hereda automáticamente sus ajustes.</small>
                                </div>

                                <div class="col-12">
                                    <label class="form-label fw-bold" for="descripcion_interna">Descripción interna</label>
                                    <textarea id="descripcion_interna" name="descripcion_interna" class="form-control"
                                        rows="3" placeholder="Detalle de uso interno (no visible para el docente)"></textarea>
                                </div>

                                @if ($esSuperAdmin)
                                    <div class="col-12" id="wrapEsSistemaTransitoria">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="es_sistema_transitoria"
                                                name="es_sistema" value="1">
                                            <label class="form-check-label fw-bold" for="es_sistema_transitoria">
                                                Perfil de aprendizaje de sistema
                                            </label>
                                        </div>
                                    </div>
                                @endif
                            </div>
                        </div>

                        <div class="tab-pane fade" id="ajustesTransitoria" role="tabpanel"
                            aria-labelledby="tab-ajustes-transitoria">
                            <div class="text-center text-muted py-5">
                                <i class="fas fa-sliders" style="font-size:2rem;opacity:.45"></i>
                                <p class="mt-3 mb-1 fw-semibold">Ajustes del perfil de aprendizaje</p>
                                <p class="mb-0" style="font-size:.9rem">
                                    Esta sección estará disponible próximamente.
                                </p>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times"></i> Cerrar
                </button>
                <button type="button" class="btn btn-primary" id="btnGuardarTransitoria">
                    <i class="fas fa-save"></i> Guardar
                </button>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        const URL_BASE = @json($urlTransitoriasBase ?? route('superadmin.perfil-aprendizaje-personalizado.index'));
        const URL_ITEM = (id) => {
            const baseItem = @json($urlTransitoriasItem ?? null);
            return baseItem ? `${baseItem}/${id}` : `${URL_BASE}/${id}`;
        };
        const esSuperAdmin = @json($esSuperAdmin ?? session('es_super_admin'));
        const esAdmin = @json(session('es_admin'));
    </script>
    @if (($esSuperAdmin ?? session('es_super_admin')))
        <script src="{{ asset('assets/js/perfiles-aprendizaje/superadmin-perfiles-aprendizaje-personalizado.js') }}"></script>
    @elseif (session('es_admin') || (($esSuperAdmin ?? null) === false))
        <script src="{{ asset('assets/js/perfiles-aprendizaje/admin-perfiles-aprendizaje-personalizado.js') }}"></script>
    @endif
@endpush
