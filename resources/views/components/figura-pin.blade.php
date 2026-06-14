@props(['figura', 'seleccionada' => false])
@php
$simbolos = [
    'circulo'   => '⬤',
    'estrella'  => '★',
    'corazon'   => '♥',
    'triangulo' => '▲',
    'cuadrado'  => '■',
    'luna'      => '☽',
    'diamante'  => '◆',
    'rayo'      => '⚡',
];
$simbolo = $simbolos[$figura] ?? '?';
@endphp
<button
    type="button"
    data-figura="{{ $figura }}"
    class="figura-btn {{ $seleccionada ? 'seleccionada' : '' }}"
    onclick="seleccionarFigura('{{ $figura }}')"
    aria-label="{{ $figura }}"
>
    {{ $simbolo }}
</button>
