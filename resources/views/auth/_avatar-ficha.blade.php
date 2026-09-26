{{-- Ficha circular + pastilla de nombre (lista alumnos / PIN). --}}
@php
    $primerNombre = explode(' ', trim((string) $estudiante->nombre))[0] ?? '';
    $primerApellido = explode(' ', trim((string) ($estudiante->apellido ?? '')))[0] ?? '';
    $nombreFicha = $nombreFicha ?? trim($primerNombre . ' ' . $primerApellido);
@endphp
<span class="avatar-card">
    <span class="avatar-circulo">
        <span class="avatar-circulo__contenido">
            @include('auth._avatar-circulo')
        </span>
    </span>
    <span class="avatar-nombre">{{ $nombreFicha }}</span>
    @if (!empty($metaFicha))
        <span class="avatar-meta">{{ $metaFicha }}</span>
    @endif
</span>
