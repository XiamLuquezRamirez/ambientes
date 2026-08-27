<!DOCTYPE html>
<html lang="es" class="vn-dispositivo">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>{{ $experiencia->nombre }} — Vista niño</title>
    <link rel="icon" href="{{ asset('assets/images/isotipo.ico') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/fonts.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/fontawesome/css/all.min.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/constructor-vista-nino.css') }}">
    <style>
        /* Garantiza viewport completo aunque falle el CSS externo */
        html.vn-dispositivo, html.vn-dispositivo body {
            margin: 0; padding: 0; width: 100%; height: 100%;
            overflow: hidden; background: #0f172a;
        }
        #vnDispositivo {
            position: fixed; inset: 0; width: 100%; height: 100%;
            display: flex; flex-direction: column;
            background: linear-gradient(180deg, #e0f2fe 0%, #f0fdf4 42%, #fff7ed 100%);
        }
        #vnTabletScreen {
            flex: 1 1 auto; width: 100% !important; height: auto !important;
            min-height: 0 !important; max-width: none !important; max-height: none !important;
            border-radius: 0 !important; display: flex; flex-direction: column;
            background: transparent;
        }
    </style>
</head>
<body class="vn-dispositivo">
    <div id="vnDispositivo"
        data-url-estado="{{ $urlEstado }}"
        data-url-tts="{{ $urlTts }}"
        data-media-base="{{ $mediaBase }}"
        data-experiencia-nombre="{{ $experiencia->nombre }}"
        data-version="{{ $version }}">
        <button type="button" class="vn-fs-btn" id="vnBtnFullscreen" title="Ocultar barra del navegador">
            <i class="fa-solid fa-expand"></i> Pantalla completa
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
                    <strong id="vnTitle">{{ $experiencia->nombre }}</strong>
                    <span id="vnBlockName">—</span>
                </div>
                <button type="button" class="vn-nav-btn vn-nav-next" id="vnBtnNext" aria-label="Siguiente">
                    <span>Siguiente</span>
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
            </footer>
        </div>
        <p class="vn-sync-badge" id="vnSyncBadge" hidden>Sincronizado</p>
        <div class="vn-expirado" id="vnExpirado" hidden>
            <p>Este enlace ya no es válido. Genere uno nuevo desde el constructor.</p>
        </div>
    </div>
    <script type="application/json" id="vn-bloques-iniciales">@json($bloques)</script>
    <script src="{{ asset('assets/js/jquery-4.0.0.min.js') }}"></script>
    <script src="{{ asset('assets/js/constructor-vista-nino.js') }}"></script>
</body>
</html>
