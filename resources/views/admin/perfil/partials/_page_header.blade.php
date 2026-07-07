<div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
    <div>
        <h1>Perfil</h1>
        <p>Gestión de perfil de usuario</p>
    </div>
    <div style="display:flex;gap:10px">
        <div class="d-flex gap-2">
            <button class="btn btn-primary-perfil" onclick="abrirModalEditarPerfil()">
                <i class="fa-solid fa-pen me-2"></i>
                Editar perfil
            </button>
            <button class="btn btn-primary-perfil" onclick="abrirModalCambiarContrasena()">
                <i class="fa-solid fa-lock me-2"></i>
                Cambiar contraseña
            </button>
            <div class="dropdown">
                <button class="btn btn-primary dropdown-toggle" data-bs-toggle="dropdown">
                    <i class="fa-solid fa-sliders me-2"></i>
                    Acciones
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li>
                        <a class="dropdown-item" href="#">
                            Descargar PDF
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="#">
                            Cerrar sesiones
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</div>
