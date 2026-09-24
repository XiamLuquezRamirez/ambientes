@extends('layouts.ambiente')

@php
    $destino = $destino ?? \App\Services\SesionNinoService::DESTINO_RECORRIDO;
    $qsDestino = $destino === \App\Services\SesionNinoService::DESTINO_JUEGOS
        ? ['destino' => \App\Services\SesionNinoService::DESTINO_JUEGOS]
        : [];
    $esPolimotor = ($ambiente->slug ?? '') === 'polimotor';
@endphp

@if ($esPolimotor)
    @push('styles')
        <link rel="stylesheet"
            href="{{ asset('assets/css/kiosco-selector-polimotor.css') }}?v={{ @filemtime(public_path('assets/css/kiosco-selector-polimotor.css')) ?: time() }}">
    @endpush
@endif

@section('content')
<main class="selector-wrap{{ $esPolimotor ? ' selector-wrap--polimotor' : '' }}">
    <h2 class="selector-titulo">¿Quién eres tú?</h2>

    @if ($estudiantes->isEmpty())
        <div class="selector-vacio" role="status">
            <span class="selector-vacio__icono" aria-hidden="true"><i class="fas fa-user-graduate"></i></span>
            <p class="selector-vacio__titulo">No hay alumnos aquí</p>
            <p class="selector-vacio__texto">
                Pide a tu profe que asigne estudiantes a este ambiente para el año {{ date('Y') }}.
            </p>
        </div>
    @else
        <div class="avatares-panel">
            <div class="avatares-grid" id="avatares-grid">
                @foreach ($estudiantes as $estudiante)
                    @php
                        $tienePin = $estudiante->tiene_pin;
                        $bloqueado = $estudiante->estado_pin === 'bloqueado';
                        $primerNombre = explode(' ', trim((string) $estudiante->nombre))[0] ?? '';
                        $primerApellido = explode(' ', trim((string) ($estudiante->apellido ?? '')))[0] ?? '';
                        $nombreVisible = trim($primerNombre . ' ' . $primerApellido);
                    @endphp
                    <a
                        href="{{ route('auth.pin', array_merge(['estudianteId' => $estudiante->id], $qsDestino)) }}"
                        class="avatar-btn {{ $tienePin ? '' : 'avatar-btn--sin-pin' }}"
                        style="--color-av: {{ $estudiante->color_avatar }};"
                        aria-label="{{ $nombreVisible }}{{ $tienePin ? '' : ' (sin PIN)' }}{{ $bloqueado ? ' (PIN bloqueado)' : '' }}"
                    >
                        @if ($esPolimotor)
                            <span class="avatar-card">
                                <span class="avatar-circulo">
                                    <span class="avatar-circulo__contenido">
                                        @include('auth._avatar-circulo')
                                    </span>
                                </span>
                                <span class="avatar-nombre">{{ $nombreVisible }}</span>
                                @if (! $tienePin)
                                    <span class="avatar-meta">Sin PIN</span>
                                @elseif ($bloqueado)
                                    <span class="avatar-meta">Bloqueado</span>
                                @endif
                            </span>
                            @if (! $tienePin)
                                <span class="avatar-badge" title="Sin PIN" aria-hidden="true">
                                    <i class="fas fa-lock"></i>
                                </span>
                            @elseif ($bloqueado)
                                <span class="avatar-badge" title="PIN bloqueado" aria-hidden="true">
                                    <i class="fas fa-ban"></i>
                                </span>
                            @endif
                        @else
                            <span class="avatar-circulo">
                                @include('auth._avatar-circulo')
                            </span>
                            @if (! $tienePin)
                                <span class="avatar-badge" title="Sin PIN" aria-hidden="true">
                                    <i class="fas fa-lock"></i>
                                </span>
                                <span class="avatar-nombre">{{ $nombreVisible }}</span>
                                <span class="avatar-meta">Sin PIN</span>
                            @elseif ($bloqueado)
                                <span class="avatar-badge" title="PIN bloqueado" aria-hidden="true">
                                    <i class="fas fa-ban"></i>
                                </span>
                                <span class="avatar-nombre">{{ $nombreVisible }}</span>
                                <span class="avatar-meta">Bloqueado</span>
                            @else
                                <span class="avatar-nombre">{{ $nombreVisible }}</span>
                            @endif
                        @endif
                    </a>
                @endforeach
            </div>
            <div class="avatares-scroll" role="group" aria-label="Desplazar avatares">
                <button type="button" class="avatares-scroll__btn" id="avatares-scroll-up" aria-label="Subir">
                    <i class="fas fa-chevron-up" aria-hidden="true"></i>
                </button>
                <button type="button" class="avatares-scroll__btn" id="avatares-scroll-down" aria-label="Bajar">
                    <i class="fas fa-chevron-down" aria-hidden="true"></i>
                </button>
            </div>
        </div>
    @endif

</main>
@endsection

@push('scripts')
<script>
(function () {
    var grid = document.getElementById('avatares-grid');
    var btnUp = document.getElementById('avatares-scroll-up');
    var btnDown = document.getElementById('avatares-scroll-down');
    if (!grid || !btnUp || !btnDown) return;

    var DURACION = 320;
    var animando = false;

    /** Tops de cada fila dentro del grid. */
    function topsFilas() {
        var items = grid.querySelectorAll('.avatar-btn');
        var tops = [];
        for (var i = 0; i < items.length; i++) {
            var t = items[i].offsetTop;
            if (!tops.length || t > tops[tops.length - 1] + 2) {
                tops.push(t);
            }
        }
        return tops;
    }

    function altoFila() {
        var tops = topsFilas();
        if (tops.length >= 2) return tops[1] - tops[0];
        var items = grid.querySelectorAll('.avatar-btn');
        if (!items.length) return 0;
        var estilos = window.getComputedStyle(grid);
        var gap = parseFloat(estilos.rowGap || estilos.gap) || 0;
        return items[0].offsetHeight + gap;
    }

    /** Scroll máximo para que el último avatar quede visible (sin espacio vacío). */
    function topeUltimaFila() {
        var items = grid.querySelectorAll('.avatar-btn');
        if (!items.length) return 0;
        var last = items[items.length - 1];
        return Math.max(0, last.offsetTop + last.offsetHeight - grid.clientHeight);
    }

    function puedeBajar() {
        var items = grid.querySelectorAll('.avatar-btn');
        if (!items.length) return false;
        var last = items[items.length - 1];
        return last.offsetTop + last.offsetHeight > grid.scrollTop + grid.clientHeight - 2;
    }

    function actualizarBotones() {
        btnUp.disabled = grid.scrollTop <= 1;
        btnDown.disabled = !puedeBajar();
    }

    function scrollAnimado(direccion) {
        if (animando) return;

        var h = altoFila();
        if (h <= 0) return;

        var desde = grid.scrollTop;
        var tope = topeUltimaFila();
        var hasta;

        if (direccion > 0) {
            if (!puedeBajar()) {
                actualizarBotones();
                return;
            }
            // Una fila por clic; en el último paso solo hasta dejar visible la última
            hasta = Math.min(desde + h, tope);
        } else {
            if (desde <= 1) {
                actualizarBotones();
                return;
            }
            // Fila anterior en la grilla de pasos (0, h, 2h…)
            hasta = Math.max(0, Math.floor((desde - 1) / h) * h);
        }

        if (Math.abs(hasta - desde) < 1) {
            actualizarBotones();
            return;
        }

        animando = true;
        var t0 = null;
        function frame(ts) {
            if (t0 === null) t0 = ts;
            var p = Math.min(1, (ts - t0) / DURACION);
            var e = 1 - Math.pow(1 - p, 3);
            grid.scrollTop = desde + (hasta - desde) * e;
            if (p < 1) {
                requestAnimationFrame(frame);
            } else {
                grid.scrollTop = hasta;
                animando = false;
                actualizarBotones();
            }
        }
        requestAnimationFrame(frame);
    }

    btnUp.addEventListener('click', function () { scrollAnimado(-1); });
    btnDown.addEventListener('click', function () { scrollAnimado(1); });

    grid.addEventListener('wheel', function (e) { e.preventDefault(); }, { passive: false });
    grid.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

    grid.style.paddingBottom = '';
    actualizarBotones();
    window.addEventListener('resize', actualizarBotones);
})();
</script>
@endpush
