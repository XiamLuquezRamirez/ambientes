@php
    $modo = $modo ?? 'demo';
    $esSesion = $modo === 'sesion';
    $esPortada = $modo === 'portada';
    $pasoInicial = $pasoInicial ?? ($esSesion ? 'modulos' : ($esPortada ? 'portada' : 'pin'));
    $portadaImg = $portadaImg ?? '/assets/images/ambientes/expresion-artistica-portada.png';
@endphp
<!DOCTYPE html>
<html lang="es" class="rn-html">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $arbol['ambiente']['nombre'] }} — PedNia</title>
    <link rel="icon" href="{{ asset('assets/images/isotipo.ico') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/fonts.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/fontawesome/css/all.min.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/constructor-vista-nino.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/recorrido-nino.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/kiosco-fullscreen.css') }}">
</head>
<body class="rn-body"
    style="--rn-color: {{ $arbol['ambiente']['color_hex'] }};">
    @include('experiencias._recorrido-nino-app', array_merge(get_defined_vars(), ['enKioscoShell' => false]))

    <script src="{{ asset('assets/js/kiosco-fs-core.js') }}"></script>
    <script src="{{ asset('assets/js/jquery-4.0.0.min.js') }}"></script>
    <script src="{{ asset('assets/js/constructor-vista-nino.js') }}"></script>
    <script src="{{ asset('assets/js/recorrido-nino.js') }}"></script>
</body>
</html>
