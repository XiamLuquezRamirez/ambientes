<!DOCTYPE html>
<html lang="es" class="rn-html">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>{{ $arbol['ambiente']['nombre'] }} — Recorrido niño</title>
    <link rel="icon" href="{{ asset('assets/images/isotipo.ico') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/fonts.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/fontawesome/css/all.min.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/constructor-vista-nino.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/recorrido-nino.css') }}">
</head>
<body class="rn-body"
    style="--rn-color: {{ $arbol['ambiente']['color_hex'] }};">
    <div id="rnApp"
        data-url-experiencia="{{ $urlExperienciaTemplate }}"
        data-url-tts="{{ $urlTts }}"
        data-portada-img="{{ asset('assets/images/ambientes/expresion-artistica-portada.png') }}">
        <script type="application/json" id="rn-arbol">@json($arbol)</script>

        {{-- Caparazón de navegación curricular --}}
        <div id="rnShell" class="rn-shell rn-shell--pin">
            <button type="button" class="rn-fs-btn" id="rnBtnFullscreen" title="Pantalla completa">
                <i class="fa-solid fa-expand"></i>
            </button>
            <button type="button" class="rn-back" id="rnBtnBack" hidden>
                <i class="fa-solid fa-arrow-left"></i>
                <span>Volver</span>
            </button>
            <div id="rnPaso" class="rn-paso" data-paso="pin" aria-live="polite"></div>
        </div>

        {{-- Player de experiencia (mismo markup que vista-previa-nino) --}}
        <div id="vnDispositivo"
            class="rn-player"
            hidden
            data-vn-defer="1"
            data-url-tts="{{ $urlTts }}"
            data-media-base=""
            data-experiencia-nombre=""
            data-version="">
            <button type="button" class="vn-fs-btn" id="vnBtnFullscreen" title="Pantalla completa">
                <i class="fa-solid fa-expand"></i> Pantalla completa
            </button>
            <button type="button" class="rn-back rn-back--player" id="rnBtnSalirExperiencia">
                <i class="fa-solid fa-arrow-left"></i>
                <span>Salir</span>
            </button>
            <div class="vn-tablet-screen" id="vnTabletScreen">
                <header class="vn-screen-top">
                    <div class="vn-progress" id="vnProgress" aria-hidden="true"></div>
                    <p class="vn-step-label" id="vnStepLabel">Paso 1 de 1</p>
                </header>
                <div class="vn-screen-body" id="vnScreenBody"></div>
                <footer class="vn-screen-nav">
                    <button type="button" class="vn-nav-btn vn-nav-prev" id="vnBtnPrev" aria-label="Anterior">
                        <i class="fa-solid fa-arrow-left"></i>
                        <span>Atrás</span>
                    </button>
                    <div class="vn-nav-meta">
                        <strong id="vnTitle">Experiencia</strong>
                        <span id="vnBlockName">—</span>
                    </div>
                    <button type="button" class="vn-nav-btn vn-nav-next" id="vnBtnNext" aria-label="Siguiente">
                        <span>Siguiente</span>
                        <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </footer>
            </div>
        </div>
    </div>

    <script src="{{ asset('assets/js/jquery-4.0.0.min.js') }}"></script>
    <script src="{{ asset('assets/js/constructor-vista-nino.js') }}"></script>
    <script src="{{ asset('assets/js/recorrido-nino.js') }}"></script>
</body>
</html>
