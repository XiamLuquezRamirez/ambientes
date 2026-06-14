@props(['estudiante'])
<button
    type="button"
    class="avatar-btn"
    onclick="window.location.href='{{ route('auth.pin', [$ambienteSlug ?? '', $estudiante->id]) }}'"
    aria-label="{{ $estudiante->nombre }}"
    style="--color-av: {{ $estudiante->color_avatar }};"
>
    <span class="avatar-circulo">{{ $estudiante->iniciales }}</span>
    <span class="avatar-nombre">{{ $estudiante->nombre }}</span>
</button>
