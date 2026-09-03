{{--
    Partial de gestión de parámetros por perfil de aprendizaje.
    Requiere window.PARAMETROS_PERFIL antes de cargar gestion.js (urls, csrf, modo).
    @param bool $mostrarTopbar Mostrar cabecera interna (opcional)
--}}
@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/admin/parametros-perfil.css') }}">
@endpush

<div class="pp-gestion" id="ppGestion">
    @if ($mostrarTopbar ?? false)
        <div class="pp-topbar">
            <div class="pp-logo"><i class="fa-solid fa-school"></i></div>
            <div>
                <div class="pp-topbar-title">PedNia — Parámetros de adaptación</div>
                <div class="pp-topbar-sub">50 parámetros por perfil de aprendizaje</div>
            </div>
        </div>
    @endif

    <div class="pp-top-tabs" role="tablist">
        <button type="button" class="pp-top-tab on" data-pp-view="formales" role="tab" aria-selected="true">
            <i class="fa-solid fa-layer-group" aria-hidden="true"></i> Perfiles de aprendizaje
        </button>
        <button type="button" class="pp-top-tab" data-pp-view="transitorias" role="tab" aria-selected="false">
            <i class="fa-solid fa-puzzle-piece" aria-hidden="true"></i> Perfiles de aprendizaje personalizado
        </button>
    </div>

    {{-- Vista: perfiles de aprendizaje --}}
    <div class="pp-view on" id="pp-view-formales" role="tabpanel">
        <div class="pp-layout">
            <aside class="pp-sidebar">
                <div class="pp-sb-hdr">
                    <div class="pp-sb-title" id="pp-fSbTitle">Perfiles de aprendizaje</div>
                </div>
                <div class="pp-cond-list" id="pp-listFormales"></div>
            </aside>
            <div class="pp-main">
                <div class="pp-main-hdr">
                    <div>
                        <div class="pp-main-title" id="pp-fTitle">Selecciona un perfil de aprendizaje</div>
                        <div class="pp-main-sub" id="pp-fSub">Elige un perfil del panel izquierdo</div>
                    </div>
                    <span class="pp-badge is-hidden" id="pp-fBadge"></span>
                </div>
                <div class="pp-cat-carousel-wrap is-hidden" id="pp-fCatCarousel">
                    <button type="button" class="pp-cat-nav pp-cat-nav-prev" data-ctx="f" data-dir="prev" aria-label="Categorías anteriores">
                        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                    </button>
                    <div class="pp-cat-carousel-viewport">
                        <div class="pp-cat-carousel-track" id="pp-fCatTrack"></div>
                    </div>
                    <button type="button" class="pp-cat-nav pp-cat-nav-next" data-ctx="f" data-dir="next" aria-label="Categorías siguientes">
                        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="pp-cat-dots is-hidden" id="pp-fCatDots"></div>
                <div class="pp-content-area">
                    <div class="pp-params-body" id="pp-fParams">
                        <div class="pp-empty">
                            <i class="fa-solid fa-universal-access"></i>
                            <p>Selecciona un perfil de aprendizaje para editar sus parámetros</p>
                        </div>
                    </div>
                </div>
                <div class="pp-footer">
                    <div class="pp-toast" id="pp-fToast">
                        <i class="fa-solid fa-check"></i> Guardado
                    </div>
                    <div class="pp-footer-actions">
                        <button type="button" class="pp-btn is-hidden" id="pp-fBtnReset">Restablecer</button>
                        <button type="button" class="pp-btn pp-btn-p is-hidden" id="pp-fBtnGuardar">Guardar cambios</button>
                    </div>
                </div>
            </div>
            <aside class="pp-prev-panel" id="pp-fPrev">
                <div class="pp-prev-card">
                    <div class="pp-prev-hdr">
                        <div class="pp-prev-label">Vista previa</div>
                        <div class="pp-prev-cat" id="pp-fPrevCat"></div>
                    </div>
                    <div class="pp-prev-body">
                        <div class="pp-prev-scale" id="pp-fPrevContent">
                            <div class="pp-prev-empty">
                                <i class="fa-solid fa-mobile-screen-button" aria-hidden="true"></i>
                                <p>Selecciona un perfil para ver la vista previa</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    </div>

    {{-- Vista: perfiles de aprendizaje personalizado --}}
    <div class="pp-view" id="pp-view-transitorias" role="tabpanel">
        <div class="pp-layout">
            <aside class="pp-sidebar">
                <div class="pp-sb-hdr">
                    <div class="pp-sb-title">Perfiles personalizados</div>
                </div>
                <div class="pp-cond-list" id="pp-listTransitorias"></div>
            </aside>
            <div class="pp-main">
                <div class="pp-main-hdr">
                    <div>
                        <div class="pp-main-title" id="pp-tTitle">Selecciona un perfil de aprendizaje personalizado</div>
                        <div class="pp-main-sub" id="pp-tSub">
                            Heredan parámetros de su perfil base — solo ajusta lo que necesites cambiar
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center">
                        <span class="pp-badge-trans is-hidden" id="pp-tBadgeTrans">
                            <i class="fa-solid fa-puzzle-piece" aria-hidden="true"></i> Personalizado
                        </span>
                        <span class="pp-badge is-hidden" id="pp-tBadge"></span>
                    </div>
                </div>
                <div class="pp-cat-carousel-wrap is-hidden" id="pp-tCatCarousel">
                    <button type="button" class="pp-cat-nav pp-cat-nav-prev" data-ctx="t" data-dir="prev" aria-label="Categorías anteriores">
                        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                    </button>
                    <div class="pp-cat-carousel-viewport">
                        <div class="pp-cat-carousel-track" id="pp-tCatTrack"></div>
                    </div>
                    <button type="button" class="pp-cat-nav pp-cat-nav-next" data-ctx="t" data-dir="next" aria-label="Categorías siguientes">
                        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="pp-cat-dots is-hidden" id="pp-tCatDots"></div>
                <div class="pp-content-area">
                    <div class="pp-params-body" id="pp-tParams">
                        <div class="pp-empty">
                            <i class="fa-solid fa-puzzle-piece"></i>
                            <p>Selecciona un perfil personalizado para editar sus parámetros</p>
                        </div>
                    </div>
                </div>
                <div class="pp-footer">
                    <div class="pp-toast" id="pp-tToast">
                        <i class="fa-solid fa-check"></i> Guardado
                    </div>
                    <div class="pp-footer-actions">
                        <button type="button" class="pp-btn pp-btn-danger is-hidden" id="pp-tBtnElim">
                            <i class="fa-solid fa-trash" aria-hidden="true"></i> Eliminar
                        </button>
                        <button type="button" class="pp-btn is-hidden" id="pp-tBtnReset">Restablecer a base</button>
                        <button type="button" class="pp-btn pp-btn-p is-hidden" id="pp-tBtnGuardar">Guardar cambios</button>
                    </div>
                </div>
            </div>
            <aside class="pp-prev-panel" id="pp-tPrev">
                <div class="pp-prev-card">
                    <div class="pp-prev-hdr">
                        <div class="pp-prev-label">Vista previa</div>
                        <div class="pp-prev-cat" id="pp-tPrevCat"></div>
                    </div>
                    <div class="pp-prev-body">
                        <div class="pp-prev-scale" id="pp-tPrevContent">
                            <div class="pp-prev-empty">
                                <i class="fa-solid fa-mobile-screen-button" aria-hidden="true"></i>
                                <p>Selecciona un perfil para ver la vista previa</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    </div>
</div>

@push('scripts')
    <script src="{{ asset('assets/js/parametros-perfil/gestion.js') }}"></script>
@endpush
