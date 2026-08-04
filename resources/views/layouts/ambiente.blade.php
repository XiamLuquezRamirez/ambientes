<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>{{ $ambiente->nombre }} — PedNia</title>
    <link rel="icon" href="{{ asset('assets/images/isotipo.ico') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/fonts.css') }}">
    <style>
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
    @yield('content')
    @stack('scripts')
</body>

</html>
