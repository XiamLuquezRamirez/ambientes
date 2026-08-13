@php
    $slug = $condicion['slug'];
    $fondo = $condicion['color_fondo'] ?? '#D1F2E5';
    $botones = $condicion['botones'] ?? [];
    $totalBotones = count($botones);

    if ($totalBotones === 10) {
        $filasBotones = [
            array_slice($botones, 0, 5),
            array_slice($botones, 5, 5),
        ];
    } elseif ($totalBotones === 11) {
        $filasBotones = [
            array_slice($botones, 0, 6),
            array_slice($botones, 6, 5),
        ];
    } else {
        $filasBotones = [$botones];
    }
@endphp

<div id="ic-condicion-{{ $slug }}"
    class="ic-condicion-panel {{ ($condicionActivaSlug ?? null) === $slug ? '' : 'd-none' }}"
    data-condicion-slug="{{ $slug }}" style="height: 100%">

    <div class="ic-modal-inner" style="background: {{ $fondo }}; height: 100%">
        <div class="ic-banner">
            <div class="ic-banner-texto">
                <span class="ic-banner-etiqueta">{{ $condicion['etiqueta'] ?? 'Conozcamos sobre' }}</span>
                <h2 class="ic-banner-titulo">{{ $condicion['titulo'] }}</h2>
            </div>
            <div class="ic-banner-imagen">
                @if (!empty($condicion['banner_imagen']))
                    <img src="{{ $servicio->assetUrl($condicion['banner_imagen']) }}"
                        alt="Ilustración {{ $condicion['titulo'] }}">
                @endif
            </div>
        </div>

        <div class="ic-botones-grid" data-total-botones="{{ $totalBotones }}">
            @foreach ($filasBotones as $fila)
                <div class="ic-botones-fila">
                    @foreach ($fila as $boton)
                        <button type="button" class="ic-boton-card"
                            data-condicion-slug="{{ $slug }}"
                            data-boton-id="{{ $boton['id'] }}"
                            aria-label="{{ $boton['titulo'] }}">
                            <div class="ic-boton-card-top">
                                <span class="ic-boton-numero"
                                    style="background: {{ $boton['color_numero'] ?? '#64748B' }};">
                                    {{ $boton['numero'] }}
                                </span>
                                <p class="ic-boton-titulo">{{ $boton['titulo'] }}</p>
                            </div>
                            @if (!empty($boton['imagen']))
                                <div class="ic-boton-card-imagen">
                                    <img class="{{ !empty($boton['imagen_abajo']) ? 'img-abajo' : '' }}" src="{{ $servicio->assetUrl($boton['imagen']) }}" alt="" aria-hidden="true">
                                </div>
                            @endif
                        </button>
                    @endforeach
                </div>
            @endforeach
        </div>
    </div>
</div>
