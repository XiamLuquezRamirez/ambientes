@php
    $kioscoPerfil = $kioscoPerfil ?? [
        'activo' => false,
        'clases' => [],
        'css_vars' => [],
        'valores' => [],
        'noop' => [],
    ];
    $kioscoPerfilActivo = !empty($kioscoPerfil['activo']);
    $kioscoPerfilClases = implode(' ', $kioscoPerfil['clases'] ?? []);
@endphp
<!DOCTYPE html>
<html lang="es" class="{{ $kioscoPerfilClases }}" data-kiosco-perfil="{{ $kioscoPerfilActivo ? '1' : '0' }}">

<head>
    <meta charset="UTF-8">
    <meta name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $ambiente->nombre }} — PedNia</title>
    <link rel="icon" href="{{ asset('assets/images/isotipo.png') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/fonts.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/fontawesome/css/all.min.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/kiosco-fullscreen.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/kiosco-auth.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/recorrido-camino.css') }}">
    <link rel="stylesheet"
        href="{{ asset('assets/css/recorrido-camino-3d.css') }}?v={{ @filemtime(public_path('assets/css/recorrido-camino-3d.css')) ?: time() }}">
    <link rel="stylesheet"
        href="{{ asset('assets/css/kiosco-perfil.css') }}?v={{ @filemtime(public_path('assets/css/kiosco-perfil.css')) ?: time() }}">
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
    @if ($kioscoPerfilActivo && !empty($kioscoPerfil['css_vars']))
        <style id="kioscoPerfilVars">
            .rn-player,
            #vnDispositivo {
                @foreach ($kioscoPerfil['css_vars'] as $kioscoVar => $kioscoVal)
                    {{ $kioscoVar }}: {{ $kioscoVal }};
                @endforeach
            }
        </style>
    @endif
    @stack('styles')
</head>

<body>
    <div id="kioscoPane">
        @yield('content')
    </div>
    @stack('scripts')
    <script src="{{ asset('assets/js/kiosco-fs-core.js') }}"></script>
    <script src="{{ asset('assets/js/jquery-4.0.0.min.js') }}"></script>
    @include('partials._captura-multimedia')
    <script type="application/json" id="kiosco-perfil-params">@json($kioscoPerfil)</script>
    <script
        src="{{ asset('assets/js/kiosco-perfil.js') }}?v={{ @filemtime(public_path('assets/js/kiosco-perfil.js')) ?: time() }}">
    </script>
    <script
        src="{{ asset('assets/js/constructor-vista-nino.js') }}?v={{ @filemtime(public_path('assets/js/constructor-vista-nino.js')) ?: time() }}">
    </script>
    {{-- Camino 3D (Three.js). Expone window.KioscoCamino.boot(). --}}
    <script type="importmap">
    { "imports": {
        "three": "{{ asset('assets/vendor/three/three.module.js') }}",
        "three/addons/": "{{ asset('assets/vendor/three/addons') }}/"
    } }
    </script>
    <script type="module"
        src="{{ asset('assets/js/recorrido-camino-3d.js') }}?v={{ @filemtime(public_path('assets/js/recorrido-camino-3d.js')) ?: time() }}">
    </script>
    {{-- Banco de juegos del catálogo PedNia (paquetes por ambiente). --}}
    <script
        src="{{ asset('assets/js/banco-juegos.js') }}?v={{ @filemtime(public_path('assets/js/banco-juegos.js')) ?: time() }}">
    </script>
    <script
        src="{{ asset('assets/js/recorrido-nino.js') }}?v={{ @filemtime(public_path('assets/js/recorrido-nino.js')) ?: time() }}">
    </script>
    <script src="{{ asset('assets/js/kiosco-bienvenida.js') }}"></script>
    <script src="{{ asset('assets/js/pin-figuras.js') }}"></script>
    <script src="{{ asset('assets/js/kiosco-navegacion.js') }}"></script>
    <script src="{{ asset('assets/js/kiosco-fullscreen.js') }}"></script>
</body>

</html>
