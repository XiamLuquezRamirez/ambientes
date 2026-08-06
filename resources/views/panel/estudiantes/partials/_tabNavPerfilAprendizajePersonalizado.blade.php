<li class="nav-item @if (($historialPerfilesAprendizajePersonalizado ?? collect())->isEmpty()) d-none @endif"
    id="fichaTabNavPerfilPersonalizado">
    <button type="button" class="nav-link" data-bs-toggle="tab" data-bs-target="#tabPerfilesAprendizajePersonalizado"
        role="tab" aria-controls="tabPerfilesAprendizajePersonalizado" aria-selected="false">
        <i class="fa-solid fa-puzzle-piece me-2"></i>
        Historial de perfiles de aprendizaje personalizados
    </button>
</li>
