<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Info Condiciones — PedNia</title>
    <link rel="icon" href="{{ asset('assets/images/isotipo.ico') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/fonts.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/bootstrap/bootstrap.min.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/fontawesome/css/all.min.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/info-condiciones/index.css') }}">
</head>

<body class="ic-page-publica">
    @include('partials.info-condiciones.embed')

    <script src="{{ asset('assets/css/bootstrap/js/bootstrap.bundle.min.js') }}"></script>
    <script>
        window.INFO_CONDICIONES_ABRIR_PRINCIPAL = true;
        @if ($condicionActiva ?? null)
            window.INFO_CONDICION_ABRIR = @json($condicionActiva['slug']);
            window.INFO_CONDICIONES_ABRIR_PRINCIPAL = false;
        @endif
    </script>
    <script src="{{ asset('assets/js/info-condiciones/index.js') }}"></script>
</body>

</html>
