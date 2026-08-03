{{--
    Tabla de administradores (Super Admin).
    - Cada fila usa id="fila-{id}" para que el JS pueda quitarla tras eliminar (AJAX).
    - El botón Eliminar usa clase .btn-eliminar (no id repetido) + data-id / data-nombre.
    - Estado de cuenta: users.estado (activo|inactivo|eliminado); el switch refleja activo.
--}}
<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Institución Asignada</th>
                <th>Rol</th>
                <th>Estado</th>
                <th style="text-align:center">Acciones</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($administradores as $admin)
                <tr id="fila-{{ $admin->id }}">
                    <td style="font-weight:600;color:#1E293B">{{ $admin->nombre }}</td>
                    <td>{{ $admin->email }}</td>
                    <td style="color:#64748B">{{ $admin->institucion?->nombre ?? '—' }}</td>
                    <td>{{ ucfirst($admin->rol) }}</td>
                    <td>
                        <div class="form-check form-switch">
                            <input class="form-check-input toggle-activo" type="checkbox" data-id="{{ $admin->id }}"
                                data-nombre="{{ $admin->nombre }}" style="cursor: pointer;"
                                title="{{ $admin->estado === 'activo' ? 'Desactivar administrador' : 'Activar administrador' }}"
                                @checked($admin->estado === 'activo')>
                        </div>
                    </td>
                    <td>
                        <div class="tabla-acciones" style="justify-content:center">
                            <button type="button" class="btn-accion btn-asignar-grado"
                                onclick="abrirModalEditarAdministrador({{ $admin->id }})">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button type="button" class="btn-accion btn-eliminar" title="Eliminar"
                                data-id="{{ $admin->id }}" data-nombre="{{ e($admin->nombre) }}">
                                <i class="fa-solid fa-trash-can"></i>
                                Eliminar
                            </button>
                            <button type="button" class="btn-accion btn-ver-accesos"
                                onclick="abrirModalVerAccesos({{ $admin->id }})">
                                <i class="fa-solid fa-clock-rotate-left"></i>
                                Ver Accesos
                            </button>
                        </div>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align:center;color:#64748B;padding:24px">
                        No hay administradores registrados.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>
