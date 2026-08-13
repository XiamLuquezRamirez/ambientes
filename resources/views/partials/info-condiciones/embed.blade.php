{{-- Modales Info Condiciones (principal → condición → contenido) --}}
<div class="modal fade modal-info-condicion modal-info-condicion-principal" id="modalInfoCondicionesPrincipal"
    tabindex="-1" aria-labelledby="modalInfoCondicionesPrincipalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl ic-modal-dialog-principal">
        <div class="modal-content ic-modal-shell ic-modal-shell-principal">
            <div class="modal-header ic-modal-header-principal border-0">
                <div class="ic-modal-header-principal-brand">
                    <span class="ic-modal-header-principal-icon" aria-hidden="true">
                        <i class="fa-solid fa-clipboard-list"></i>
                    </span>
                    <div>
                        <h5 class="modal-title fw-bold mb-1" id="modalInfoCondicionesPrincipalLabel">Condiciones</h5>
                        <p class="ic-modal-subtitulo mb-0">Selecciona una condición para ver su información.</p>
                    </div>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body ic-modal-body-principal">
                <div class="ic-condiciones-grid ic-condiciones-grid-modal"
                    data-total-condiciones="{{ count($infoCondiciones) }}">
                    @foreach ($infoCondiciones as $item)
                        <button type="button" class="ic-condicion-card"
                            data-abrir-condicion="{{ $item['slug'] }}"
                            style="--ic-card-accent: {{ $item['color_accent'] ?? $item['color'] ?? '#64748B' }}">
                            <span class="ic-condicion-card-accent" aria-hidden="true"></span>
                            <span class="ic-condicion-card-main">
                                @if (!empty($item['icono']))
                                    <span class="ic-condicion-card-icon-wrap">
                                        <img src="{{ asset($item['icono']) }}" alt=""
                                            class="ic-condicion-card-icon-img">
                                    </span>
                                @else
                                    <span class="ic-condicion-card-icon-fallback"
                                        style="background: {{ $item['color_accent'] ?? $item['color'] ?? '#64748B' }};">
                                        {{ strtoupper(substr($item['nombre'], 0, 3)) }}
                                    </span>
                                @endif
                                <span class="ic-condicion-card-texto">
                                    <strong>{{ $item['nombre'] }}</strong>
                                    <small>{{ $item['descripcion_corta'] ?? '' }}</small>
                                </span>
                            </span>
                            <span class="ic-condicion-card-arrow" aria-hidden="true">
                                <i class="fa-solid fa-chevron-right"></i>
                            </span>
                        </button>
                    @endforeach
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade modal-info-condicion modal-info-condicion-detalle" id="modalInfoCondicion" tabindex="-1"
    aria-hidden="true">
    <button type="button" class="ic-btn-volver-exterior ic-btn-volver-principal" aria-label="Volver a condiciones">
        <i class="fa-solid fa-arrow-left"></i> Volver
    </button>
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl" style="width: 90vw !important; max-width: 90vw;">
        <div class="modal-content ic-modal-shell">
            <div class="modal-body ic-modal-body-padded">
                @foreach ($infoCondicionesDetalle as $slug => $condicion)
                    @include('info-condiciones.partials.panel-condicion', [
                        'condicion' => $condicion,
                        'condicionActivaSlug' => null,
                        'servicio' => $infoCondicionesServicio,
                    ])
                @endforeach
            </div>
        </div>
    </div>
</div>

<div class="modal fade modal-info-condicion modal-info-condicion-contenido" id="modalInfoCondicionContenido"
    tabindex="-1" aria-labelledby="modalInfoCondicionContenidoTitulo" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
        <div class="modal-content ic-modal-shell">
            <div class="modal-header ic-modal-header-contenido border-0">
                <h5 class="modal-title fw-bold" id="modalInfoCondicionContenidoTitulo"></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body ic-modal-body-padded ic-modal-body-contenido">
                <div id="modalInfoCondicionContenidoBody" class="ic-contenido-html"></div>
            </div>
        </div>
    </div>
</div>

<script>
    window.INFO_CONDICIONES_MAP = @json($infoCondicionesMapa);
</script>
