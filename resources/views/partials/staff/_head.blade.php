<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="csrf-token" content="{{ csrf_token() }}">
<title>@yield('title', $titleDefault ?? 'PedNia') — PedNia</title>
@vite(['resources/css/app.css', 'resources/js/app.js'])
<link rel="stylesheet" href="{{ asset('assets/css/fonts.css') }}">
<link rel="stylesheet" href="{{ asset('assets/css/fontawesome/css/all.min.css') }}">
<link rel="stylesheet" href="{{ asset('assets/css/bootstrap/css/bootstrap.min.css') }}">
<link rel="icon" href="{{ asset('assets/images/favicon.ico') }}">
<link rel="stylesheet" href="{{ asset('assets/css/sweetalert2.min.css') }}">
<script src="{{ asset('assets/js/jquery-4.0.0.min.js') }}"></script>
<link rel="stylesheet" href="{{ asset('assets/css/index.css') }}">
@include('partials.sidebar-init')
<link rel="stylesheet" href="{{ asset('assets/css/perfil.css') }}">
<link rel="stylesheet" href="{{ asset('assets/css/estilosModals.css') }}">
<link rel="stylesheet" href="{{ asset('assets/css/docente/index.css') }}">
<link rel="stylesheet" href="{{ asset('assets/css/helpers.css') }}">
@foreach ($extraCss ?? [] as $css)
    <link rel="stylesheet" href="{{ asset($css) }}">
@endforeach
<link rel="stylesheet" href="{{ asset('assets/css/info-condiciones/index.css') }}">
@stack('styles')
@stack('head')
