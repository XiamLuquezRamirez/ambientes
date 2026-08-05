@if ($estudiante->piar == null)
    @if (!($perfilesAprendizajePersonalizado ?? collect())->isEmpty() && !($perfilAprendizajePersonalizadoActiva ?? null))
        <button type="button" class="btn btn-outline-pink" data-bs-toggle="modal"
            data-bs-target="#modalPerfilAprendizajePersonalizado">
            <i class="fa-solid fa-puzzle-piece"></i> Activar perfil de aprendizaje personalizado
        </button>
    @endif
@endif

@if ($puedeDesactivarPerfilAprendizajePersonalizado ?? false)
    <button type="button" class="btn btn-outline-pink btn-desasociar-transitoria"
        data-asignacion-id="{{ $perfilAprendizajePersonalizadoActiva->id }}"
        data-nombre="{{ $estudiante->nombre_completo }}"
        title="Desactivar perfil de aprendizaje personalizado">
        <i class="fa-solid fa-puzzle-piece"></i> Desactivar perfil de aprendizaje personalizado
    </button>
@endif
