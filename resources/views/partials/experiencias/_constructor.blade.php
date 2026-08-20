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
        <p>{{ $experiencia->nombre }}</p>
    </div>
    <div>
        <button type="button" class="btn btn-outline-secondary" disabled>
            <i class="fa-solid fa-eye"></i> Vista Niño (próximamente)
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
    data-experiencia-estado="{{ $experiencia->estado }}" data-url-listar="{{ $urls['listar'] }}"
    data-url-guardar="{{ $urls['guardar'] }}" data-url-reordenar="{{ $urls['reordenar'] }}"
    data-url-limpiar="{{ $urls['limpiar'] }}" data-url-upload="{{ $urls['upload'] }}"
    data-url-publicar="{{ $urls['publicar'] }}" data-url-actualizar-template="{{ $urls['actualizar_template'] }}"
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
