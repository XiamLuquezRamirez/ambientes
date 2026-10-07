{{-- Foto + nombre con el mismo diseño del pupitre de "¿Quién eres tú?" (vista PIN). --}}
@php
    $silla = \App\Services\PaletaAulaService::sillaPara($estudiante->color_avatar);
    $primerNombre = explode(' ', trim((string) $estudiante->nombre))[0] ?? '';
    $primerApellido = explode(' ', trim((string) ($estudiante->apellido ?? '')))[0] ?? '';
@endphp
<div class="ficha-aula" style="--marco: {{ $silla['marco'] }}; --tinta: {{ $silla['tinta'] }};">
    <span class="ficha-aula__foto">
        @if ($estudiante->avatar_url)
            <img src="{{ $estudiante->avatar_url }}" alt="" class="kiosco-avatar-img">
        @else
            <span class="ficha-aula__iniciales">{{ $estudiante->iniciales }}</span>
        @endif
    </span>
    <span class="ficha-aula__nombre">
        <span>{{ $primerNombre }}</span>
        @if ($primerApellido !== '')
            <span>{{ $primerApellido }}</span>
        @endif
    </span>
</div>
