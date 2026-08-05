{{-- Vista de ejemplo para vista_info_asociada: perfiles-aprendizaje.info.ejemplo --}}
<div class="perfil-aprendizaje-info-contenido">
    <h6 class="fw-bold mb-2" style="color:#1E3A8A">Información del perfil de aprendizaje</h6>
    <p class="mb-2" style="color:#475569">
        Esta es una vista de ejemplo asociada a
        <strong>{{ $perfilAprendizaje->nombre ?? 'el perfil de aprendizaje' }}</strong>
        ({{ $perfilAprendizaje->codigo ?? '—' }}).
    </p>
    @if (!empty($perfilAprendizaje->descripcion_corta))
        <p class="mb-0" style="color:#64748B">{{ $perfilAprendizaje->descripcion_corta }}</p>
    @endif
</div>
