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
        <button type="button" class="btn btn-outline-secondary" id="cxBtnTablet"
            title="Abrir la vista niño en una tablet de la misma red">
            <i class="fa-solid fa-qrcode"></i> Probar en tablet
        </button>
        @if(!empty($recorridoNinoDisponible))
            <button type="button" class="btn btn-outline-info" id="cxBtnRecorrido"
                title="Demo del recorrido del niño: ambiente → módulos → ejes → temáticas → experiencia">
                <i class="fa-solid fa-route"></i> Recorrido niño
            </button>
        @endif
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
    data-media-base="{{ asset('storage/experiencias/' . $experiencia->id . '/bloques') }}"
    data-experiencia-estado="{{ $experiencia->estado }}" data-url-listar="{{ $urls['listar'] }}"
    data-url-guardar="{{ $urls['guardar'] }}" data-url-reordenar="{{ $urls['reordenar'] }}"
    data-url-limpiar="{{ $urls['limpiar'] }}" data-url-upload="{{ $urls['upload'] }}"
    data-url-tts="{{ $urls['tts'] ?? '' }}" data-url-vista-previa="{{ $urls['vista_previa'] ?? '' }}"
    data-url-vista-previa-foco="{{ $urls['vista_previa_foco'] ?? '' }}"
    data-url-recorrido-nino="{{ $urls['recorrido_nino'] ?? '' }}" data-url-publicar="{{ $urls['publicar'] }}"
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
        <div class="vn-tablet-stage" id="vnTabletStage">
            <div class="vn-tablet" id="vnTablet" data-screen-w="1280" data-screen-h="800">
                <div class="vn-tablet-bezel">
                    <div class="vn-tablet-camera" aria-hidden="true"></div>
                    <div class="vn-tablet-screen" id="vnTabletScreen">
                        <header class="vn-screen-top">
                            <div class="vn-progress" id="vnProgress" aria-hidden="true"></div>
                            <p class="vn-step-label" id="vnStepLabel">Paso 1 de 1</p>
                        </header>
                        <div class="vn-screen-body" id="vnScreenBody"></div>
                        <footer class="vn-screen-nav">
                            <button type="button" class="vn-nav-btn vn-nav-prev" id="vnBtnPrev"
                                aria-label="Anterior">
                                <i class="fa-solid fa-arrow-left"></i>
                                <span>Atrás</span>
                            </button>
                            <div class="vn-nav-meta">
                                <strong id="vnTitle">Vista niño</strong>
                                <span id="vnBlockName">Bienvenida</span>
                            </div>
                            <button type="button" class="vn-nav-btn vn-nav-next" id="vnBtnNext"
                                aria-label="Siguiente">
                                <span>Siguiente</span>
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

{{-- Modal enlace tablet --}}
<div class="vn-tablet-modal" id="vnTabletModal" hidden>
    <div class="vn-tablet-modal-backdrop" data-vn-tablet-close></div>
    <div class="vn-tablet-modal-card" role="dialog" aria-modal="true" aria-labelledby="vnTabletModalTitle">
        <button type="button" class="vn-close" data-vn-tablet-close title="Cerrar" aria-label="Cerrar">
            <i class="fa-solid fa-xmark"></i>
        </button>
        <h2 id="vnTabletModalTitle">Probar en tablet</h2>
        <p class="vn-tablet-modal-lead" id="vnTabletModalLead">Abre este enlace en la tablet (misma red Wi‑Fi). La vista se actualiza al
            guardar bloques en el constructor.</p>
        <div class="vn-tablet-qr-wrap">
            <canvas id="vnTabletQr" width="220" height="220" aria-label="Código QR"></canvas>
            <img id="vnTabletQrImg" width="220" height="220" alt="Código QR" hidden>
        </div>
        <label class="vn-tablet-url-label" for="vnTabletUrl">Enlace</label>
        <div class="vn-tablet-url-row">
            <input type="text" class="form-control" id="vnTabletUrl" readonly>
            <button type="button" class="btn btn-primary" id="vnTabletCopy">Copiar</button>
        </div>
        <p class="vn-tablet-warn" id="vnTabletLocalWarn" hidden></p>
        <label class="vn-tablet-follow" id="vnTabletFollowWrap">
            <input type="checkbox" id="vnTabletFollow" checked>
            Seguir el bloque seleccionado en el constructor
        </label>
        <p class="vn-tablet-expira" id="vnTabletExpira">El enlace dura 60 minutos.</p>
    </div>
</div>
