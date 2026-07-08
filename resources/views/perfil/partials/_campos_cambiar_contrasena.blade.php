{{--
    Campos reutilizables para cambio de contraseña (pestaña Seguridad y modal).

    @param string $formId       ID del formulario contenedor
    @param string $prefix       Prefijo para IDs únicos (seguridad | modal)
    @param string $columnClass  Clase de columna Bootstrap (col-md-4 en pestaña, col-12 en modal)
--}}
@php
    $formId = $formId ?? 'formCambiarContrasena';
    $prefix = $prefix ?? 'seguridad';
    $columnClass = $columnClass ?? 'col-md-4';
@endphp

<div class="row g-3">
    <div class="{{ $columnClass }}">
        <div class="mb-3">
            <strong class="form-label">Contraseña actual</strong>
            <input type="password" id="{{ $prefix }}_password_actual" name="password_actual" class="form-control"
                placeholder="Tu contraseña actual" autocomplete="off" required>
        </div>
    </div>
    <div class="{{ $columnClass }}">
        <div class="mb-3">
            <strong class="form-label">Nueva contraseña</strong>
            <input type="password" id="{{ $prefix }}_password" name="password" class="form-control"
                placeholder="Mínimo 8 caracteres" autocomplete="off" required minlength="8">
            <div id="{{ $prefix }}_password_requisitos" class="password-requisitos mt-1">
                <i class="fa-solid fa-circle-info me-1"></i>
                <span id="{{ $prefix }}_password_longitud">Mínimo 8 caracteres</span>
            </div>
        </div>
    </div>
    <div class="{{ $columnClass }}">
        <div class="mb-3">
            <strong class="form-label">Confirmar nueva contraseña</strong>
            <input type="password" id="{{ $prefix }}_password_confirmation" name="password_confirmation"
                class="form-control" placeholder="Repite la nueva contraseña" autocomplete="off" required
                minlength="8">
            <div id="{{ $prefix }}_password_coincidencia" class="password-requisitos mt-1 d-none">
                <i class="fa-solid fa-circle-xmark me-1"></i>
                <span>Las contraseñas no coinciden</span>
            </div>
        </div>
    </div>
</div>
