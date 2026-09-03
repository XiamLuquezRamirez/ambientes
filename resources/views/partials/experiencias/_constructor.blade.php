@php
    $bloquesJson = $bloques instanceof \Illuminate\Support\Collection ? $bloques->values() : collect($bloques ?? []);
    $catalogoJson = collect($catalogo ?? []);
    $urls = $constructorUrls ?? [];
    $puedePublicar = $puedePublicar ?? $puedeEditar;
    $tituloPublicar = $puedePublicar
        ? 'Publicar experiencia'
        : ($puedeEditar
            ? 'Solo el creador puede publicar o cambiar el estado de esta experiencia'
            : 'No tiene permiso para publicar');
    $gnPreview = mb_strtolower($experiencia->grado->nombre ?? '');
    $nivelPreview = 'jardin';
    if (str_contains($gnPreview, 'prejardín') || str_contains($gnPreview, 'prejardin')) {
        $nivelPreview = 'prejardin';
    } elseif (str_contains($gnPreview, 'jardín') || str_contains($gnPreview, 'jardin')) {
        $nivelPreview = 'jardin';
    } elseif (str_contains($gnPreview, 'transición') || str_contains($gnPreview, 'transicion')) {
        $nivelPreview = 'transicion';
    } elseif (str_contains($gnPreview, 'primaria') || (int) ($experiencia->grado->edad_anos ?? 0) >= 6) {
        $nivelPreview = 'primaria';
    }
    $urlJuegosCatalogo = $urls['juegos_catalogo'] ?? '';
    $juegosFiltros = app(\App\Services\JuegoCatalogoService::class)->opcionesFiltro();
    $juegosFiltros['filtros'] = [];
    $juegosFiltros['texto_busqueda'] = '';
    $juegosFiltros['soloActivos'] = true;
    $juegosFiltros['mostrarVista'] = false;
    $juegosFiltros['compacto'] = true;
    $juegosFiltros['formId'] = 'formFiltrosJuegosConstructor';
    $juegosFiltros['formAction'] = $urlJuegosCatalogo;
@endphp

<div class="page-header tematicas-page-header cx-page-header">
    <div>
        <h1>Constructor de experiencia</h1>
        <p>{{ $experiencia->nombre }} - {{ $experiencia->grado->nombre }}</p>

    </div>
    <div>
        <button type="button" class="btn btn-outline-primary" id="cxBtnVistaNino"
            title="Previsualizar la experiencia como la vería el niño">
            <i class="fa-solid fa-tablet-screen-button"></i> Vista Niño
        </button>
        <button type="button" class="btn btn-success cx-btn-publicar" title="{{ $tituloPublicar }}"
            @disabled(!$puedePublicar)>
            <i class="fa-solid fa-rocket"></i> Publicar
        </button>
        <a href="{{ $volverUrl }}" class="btn btn-outline-secondary">
            <i class="fa-solid fa-arrow-left"></i> Volver a experiencias
        </a>
    </div>
</div>

<div class="cx-app" data-puede-editar="{{ $puedeEditar ? '1' : '0' }}"
    data-puede-publicar="{{ $puedePublicar ? '1' : '0' }}" data-experiencia-id="{{ $experiencia->id }}"
    data-experiencia-nombre="{{ $experiencia->nombre }}"
    data-url-juegos-catalogo="{{ $urlJuegosCatalogo }}"
    data-media-base="{{ asset('storage/experiencias/' . $experiencia->id . '/bloques') }}"
    data-estudiante-sexo="masculino"
    data-nivel-etario="{{ $nivelPreview }}"
    data-emociones-base="{{ asset('assets/images/emociones') }}"
    data-experiencia-estado="{{ $experiencia->estado }}" data-url-listar="{{ $urls['listar'] }}"
    data-url-guardar="{{ $urls['guardar'] }}" data-url-reordenar="{{ $urls['reordenar'] }}"
    data-url-limpiar="{{ $urls['limpiar'] }}" data-url-upload="{{ $urls['upload'] }}"
    data-url-tts="{{ $urls['tts'] ?? '' }}" data-url-publicar="{{ $urls['publicar'] }}"
    data-url-actualizar-template="{{ $urls['actualizar_template'] }}"
    data-url-eliminar-template="{{ $urls['eliminar_template'] }}">

    <script type="application/json" id="cx-bloques-iniciales">@json($bloquesJson)</script>
    <script type="application/json" id="cx-catalogo-inicial">@json($catalogoJson)</script>

    <div class="cx-layout {{ $puedeEditar ? '' : 'is-readonly' }}">
        {{-- Catálogo --}}
        <aside class="cx-col cx-col-catalogo" aria-label="Tipos de bloque">
            <div class="cx-col-head">
                <h2>Tipos de bloque</h2>
                <p>Haz clic para agregar a la secuencia</p>
            </div>
            <div class="cx-catalogo" id="cxCatalogo"></div>
        </aside>

        {{-- Secuencia --}}
        <section class="cx-col cx-col-secuencia" aria-label="Secuencia">
            <div class="cx-col-head cx-secuencia-head">
                <h2>Secuencia <span class="cx-count" id="cxBloquesCount">(0 bloques)</span></h2>
            </div>
            <div class="cx-secuencia-scroll">
                <div class="cx-timeline" id="cxTimeline"></div>
            </div>
            <div class="cx-secuencia-foot">
                <span class="cx-pendientes-resumen" id="cxPendientesResumen">Sin campos pendientes</span>
                <div class="cx-foot-actions">
                    <button type="button" class="btn btn-outline-secondary btn-sm" id="cxBtnLimpiar"
                        @disabled(!$puedeEditar)>
                        <i class="fa-solid fa-broom"></i> Limpiar
                    </button>
                    <button type="button" class="btn btn-success btn-sm cx-btn-publicar" @disabled(!$puedePublicar)>
                        <i class="fa-solid fa-rocket"></i> Publicar
                    </button>
                </div>
            </div>
        </section>

        {{-- Configuración --}}
        <aside class="cx-col cx-col-config" aria-label="Configuración del bloque">
            <div id="cxConfigEmpty" class="cx-config-empty">
                <i class="fa-solid fa-sliders"></i>
                <p>Selecciona un bloque de la secuencia para configurarlo</p>
            </div>
            <div id="cxConfigPanel" class="cx-config-panel" hidden>
                <div class="cx-config-head" id="cxConfigHead"></div>
                <div class="cx-config-body" id="cxConfigBody"></div>
                <div class="cx-config-save-status" id="cxSaveStatus" hidden></div>
            </div>
        </aside>
    </div>
</div>

{{-- Overlay Vista Niño: tablet simulada --}}
<div class="vn-overlay" id="vnOverlay" hidden aria-hidden="true">
    <div class="vn-backdrop" data-vn-close></div>
    <div class="vn-shell" role="dialog" aria-modal="true" aria-labelledby="vnTitle">
        <button type="button" class="vn-close" data-vn-close title="Cerrar vista niño" aria-label="Cerrar">
            <i class="fa-solid fa-xmark"></i>
        </button>
        <button type="button" class="vn-reload-btn" id="vnBtnRecargar" title="Recargar experiencia (provisional)"
            aria-label="Recargar experiencia">
            <i class="fa-solid fa-rotate"></i>
        </button>
        <div class="vn-tablet-stage" id="vnTabletStage">
            <div class="vn-tablet" id="vnTablet" data-screen-w="1280" data-screen-h="800">
                <div class="vn-tablet-bezel">
                    <div class="vn-tablet-camera" aria-hidden="true"></div>
                    <div class="vn-tablet-screen" id="vnTabletScreen">
                        <div class="vn-screen-body" id="vnScreenBody"></div>
                        <footer class="vn-screen-nav">
                            <button type="button" class="vn-nav-btn vn-nav-prev" id="vnBtnPrev"
                                aria-label="Anterior">
                                <i class="fa-solid fa-arrow-left"></i>
                                <span>Atrás</span>
                            </button>
                            <div class="vn-nav-center" aria-label="Progreso de la experiencia">
                                <div class="vn-progress" id="vnProgress" aria-hidden="true"></div>
                                <p class="vn-step-label" id="vnStepLabel">Paso 1 de 1</p>
                                <div class="vn-nav-meta">
                                    <strong id="vnTitle">Vista niño</strong>
                                    <span id="vnBlockName">Bienvenida</span>
                                </div>
                            </div>
                            <button type="button" class="vn-nav-btn vn-nav-next" id="vnBtnNext"
                                aria-label="Siguiente">
                                <span>¡Sigue!</span>
                                <i class="fa-solid fa-arrow-right"></i>
                            </button>
                        </footer>
                    </div>
                    <div class="vn-tablet-home" aria-hidden="true"></div>
                </div>
            </div>
        </div>
        <p class="vn-hint">Vista previa 1280×800 · horizontal · el niño navega bloque por bloque</p>
    </div>
</div>

{{-- Modal: catálogo de juegos --}}
<div class="modal fade modal-app cx-modal-juegos" id="cxModalJuegosModulo" tabindex="-1"
    aria-labelledby="cxModalJuegosModuloLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fa-solid fa-gamepad text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="cxModalJuegosModuloLabel">Catálogo de juegos</h5>
                    <p class="modal-subtitle mb-0" id="cxModalJuegosModuloSubtitle">Filtra y elige un juego para el bloque</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-4">
                <div class="cx-juegos-filtros-panel">
                    <div class="cx-juegos-filtros-head">
                        <i class="fa-solid fa-filter" aria-hidden="true"></i>
                        <span>Filtrar catálogo</span>
                    </div>
                    @include('partials.juegos._filtros', $juegosFiltros)
                </div>
                <div id="cxJuegosModuloResumen" class="cx-juegos-modal-resumen" hidden></div>
                <div id="cxJuegosModuloLoading" class="cx-juegos-modal-loading text-center py-4" hidden>
                    <i class="fa-solid fa-spinner fa-spin fa-2x text-primary"></i>
                    <p class="mt-2 mb-0 text-muted">Cargando juegos…</p>
                </div>
                <div id="cxJuegosModuloError" class="alert alert-warning mb-3" hidden></div>
                <div id="cxJuegosModuloLista" class="students-grid cx-juegos-catalogo-grid" role="radiogroup"
                    aria-label="Catálogo de juegos" aria-live="polite"></div>
                <div id="cxJuegosModuloPaginacion" class="paginacion-wrapper mt-3" hidden></div>
            </div>
            <div class="modal-footer justify-content-between">
                <p class="cx-juegos-modal-hint mb-0 text-muted">
                    <i class="fa-solid fa-hand-pointer"></i> Haz clic en una tarjeta para usar el juego en el bloque
                </p>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fa-solid fa-times"></i> Cerrar
                </button>
            </div>
        </div>
    </div>
</div>
