<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $ambiente->nombre }} — PedNia</title>
    <link rel="icon" href="{{ asset('assets/images/isotipo.png') }}">
    <link rel="stylesheet" href="@assetv('assets/css/fonts.css')">
    <link rel="stylesheet" href="{{ asset('assets/css/fontawesome/css/all.min.css') }}">
    <link rel="stylesheet" href="@assetv('assets/css/kiosco-fullscreen.css')">
    <link rel="stylesheet" href="@assetv('assets/css/kiosco-auth.css')">
    <link rel="stylesheet" href="@assetv('assets/css/recorrido-camino.css')">
    <link rel="stylesheet" href="@assetv('assets/css/recorrido-camino-3d.css')">
    <style id="kioscoLayoutStyles">
        :root {
            --color-ambiente: {{ $ambiente->color_hex }};
            --fondo: #060C0A;
            --texto: #F0FAF4;
            --dorado: #F59E0B;
        }

        *,
        *::before,
        *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html,
        body {
            width: 100%;
            min-height: 100vh;
            min-height: 100dvh;
            background: var(--fondo);
            color: var(--texto);
            font-family: 'Nunito', sans-serif;
            font-size: 18px;
            overflow-x: hidden;
        }

        h1,
        h2,
        h3,
        .titulo {
            font-family: 'Fredoka One', cursive;
        }
    </style>
    @stack('styles')
</head>

<body>
    <button type="button" class="kiosco-fs-btn" id="kioscoBtnFullscreen" title="Pantalla completa" aria-label="Pantalla completa">
        <svg class="kiosco-fs-icon-expand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <path d="M8 3H3v5M16 3h5v5M16 21h5v-5M8 21H3v-5"/>
        </svg>
        <svg class="kiosco-fs-icon-compress" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" hidden>
            <path d="M9 3H3v6M15 3h6v6M21 15v6h-6M9 21H3v-6"/>
        </svg>
    </button>

    <button
        type="button"
        class="kiosco-salir-btn"
        id="kioscoBtnSalir"
        title="Salir"
        aria-label="Salir"
        data-salir-url="{{ route('auth.salir') }}"
        hidden
    >
        Salir
    </button>

    <div class="kiosco-fs-hint" id="kioscoFsHint" hidden>
        <p class="kiosco-fs-hint__texto" id="kioscoFsHintTexto">
            Toca el botón de expandir (esquina superior derecha) para ver PedNia a pantalla completa.
        </p>
        <button type="button" class="kiosco-fs-hint__cerrar" id="kioscoFsHintCerrar">Entendido</button>
    </div>

    <div id="kioscoPane">
        @yield('content')
    </div>
    @stack('scripts')
    <script src="@assetv('assets/js/kiosco-fs-core.js')"></script>
    <script src="@assetv('assets/js/jquery-4.0.0.min.js')"></script>
    <script src="@assetv('assets/js/constructor-vista-nino.js')"></script>
    {{-- Camino 3D: bundle esbuild (Three.js + módulos incluidos, minificado).
         Expone window.KioscoCamino.boot(). Generar con `npm run build:kiosco`. --}}
    <script type="module" src="@assetv('assets/dist/recorrido-camino-3d.bundle.js')"></script>
    {{-- Juegos web nativos del banco (deben cargar ANTES de banco-juegos.js). --}}
    <script src="@assetv('assets/js/juego-memoria-animales.js')"></script>
    <script src="@assetv('assets/js/juego-colores-magicos.js')"></script>
    {{-- Banco de juegos (prototipo). Expone window.BancoJuegos.abrir(). Antes de recorrido-nino.js. --}}
    <script src="@assetv('assets/js/banco-juegos.js')"></script>
    <script src="@assetv('assets/js/recorrido-nino.js')"></script>
    <script src="@assetv('assets/js/kiosco-bienvenida.js')"></script>
    <script src="@assetv('assets/js/pin-figuras.js')"></script>
    <script src="@assetv('assets/js/kiosco-navegacion.js')"></script>
    <script src="@assetv('assets/js/kiosco-fullscreen.js')"></script>
</body>

</html>
