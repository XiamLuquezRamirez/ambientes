@props(['modulo', 'estado' => 'bloqueado'])
@php
$clases = ['completado' => 'card--completado', 'en_progreso' => 'card--progreso', 'bloqueado' => 'card--bloqueado'];
$clase = $clases[$estado] ?? 'card--bloqueado';
@endphp
<div class="modulo-card {{ $clase }}">
    <span class="modulo-icono">{{ $modulo->icono }}</span>
    <span class="modulo-nombre">{{ $modulo->nombre }}</span>
    @if($estado === 'completado')
        <span class="modulo-badge">✓</span>
    @elseif($estado === 'bloqueado')
        <span class="modulo-badge">🔒</span>
    @endif
</div>
