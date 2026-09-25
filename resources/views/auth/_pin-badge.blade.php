{{-- Badge del PIN: silueta + borde punteado (mockup kiosco). --}}
@php
    $primerNombre = explode(' ', trim((string) $estudiante->nombre))[0] ?? '';
    $primerApellido = explode(' ', trim((string) ($estudiante->apellido ?? '')))[0] ?? '';
    $nombreBadge = $nombreBadge ?? trim($primerNombre . ' ' . $primerApellido);
@endphp
<div class="pin-badge" style="--color-av: {{ $estudiante->color_avatar }};">
    <svg class="pin-badge__silueta" viewBox="0 0 300 360" aria-hidden="true" focusable="false">
        {{-- Relleno: círculo superior + base ancha (una sola silueta) --}}
        <path class="pin-badge__relleno" d="
            M150 22
            C228 22 278 78 278 152
            C278 210 242 258 192 274
            C236 280 268 304 268 334
            C268 348 230 352 150 352
            C70 352 32 348 32 334
            C32 304 64 280 108 274
            C58 258 22 210 22 152
            C22 78 72 22 150 22
            Z" />
        {{-- Punteado exterior con holgura respecto al relleno --}}
        <path class="pin-badge__puntos" fill="none" d="
            M150 10
            C236 10 290 72 290 152
            C290 214 252 266 198 284
            C246 292 280 316 280 336
            C280 354 234 358 150 358
            C66 358 20 354 20 336
            C20 316 54 292 102 284
            C48 266 10 214 10 152
            C10 72 64 10 150 10
            Z" />
    </svg>
    <div class="pin-badge__contenido">
        <span class="pin-badge__avatar">
            @include('auth._avatar-circulo')
        </span>
        <span class="pin-badge__nombre">{{ $nombreBadge }}</span>
    </div>
</div>
