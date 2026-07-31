{{-- Vista de ejemplo para vista_info_asociada: condiciones.info.ejemplo --}}
<div class="condicion-info-contenido">
    <h6 class="fw-bold mb-2" style="color:#1E3A8A">Información de la condición</h6>
    <p class="mb-2" style="color:#475569">
        Esta es una vista de ejemplo asociada a
        <strong>{{ $condicion->nombre ?? 'la condición' }}</strong>
        ({{ $condicion->codigo ?? '—' }}).
    </p>
    @if (!empty($condicion->descripcion_corta))
        <p class="mb-0" style="color:#64748B">{{ $condicion->descripcion_corta }}</p>
    @endif
</div>
