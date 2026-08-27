@php
    $tienePerfilNormal = ($estudiante->perfil_aprendizaje_id ?? null) && (int) $estudiante->perfil_aprendizaje_id !== 1;
@endphp

@if ($estudiante->requiere_apoyo === 'si' && !$tienePerfilNormal && ($perfilesAprendizaje ?? collect())->isNotEmpty())
    <button type="button" class="btn btn-outline-purple" data-bs-toggle="modal"
        data-bs-target="#modalAsignarPerfilAprendizaje">
        <i class="fa-solid fa-puzzle-piece"></i>
        Asignar perfil de aprendizaje
    </button>
@endif

@if ($estudiante->requiere_apoyo === 'si' && $tienePerfilNormal)
    <button type="button" class="btn btn-outline-purple btn-desactivar-perfil-aprendizaje"
        data-estudiante-nombre="{{ $estudiante->nombre_completo }}"
        title="Desactivar perfil de aprendizaje">
        <i class="fa-solid fa-puzzle-piece"></i> Desactivar perfil de aprendizaje
    </button>
@endif

@if (!($perfilAprendizajePersonalizadoActiva ?? null) && !$tienePerfilNormal && ($perfilesAprendizajePersonalizado ?? collect())->isNotEmpty())
    <button type="button" class="btn btn-outline-pink" data-bs-toggle="modal"
        data-bs-target="#modalAsignarPerfilAprendizajePersonalizado">
        <i class="fa-solid fa-puzzle-piece"></i> Asignar perfil de aprendizaje personalizado
    </button>
@endif

@if ($puedeDesactivarPerfilAprendizajePersonalizado ?? false)
    <button type="button" class="btn btn-outline-pink btn-desasociar-transitoria"
        data-asignacion-id="{{ $perfilAprendizajePersonalizadoActiva->id }}"
        data-nombre="{{ $estudiante->nombre_completo }}"
        title="Desactivar perfil de aprendizaje personalizado">
        <i class="fa-solid fa-puzzle-piece"></i> Desactivar perfil de aprendizaje personalizado
    </button>
@endif
