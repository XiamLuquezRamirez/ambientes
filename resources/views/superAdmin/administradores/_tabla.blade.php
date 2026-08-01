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
                <tr>
                    <td style="font-weight:600;color:#1E293B">{{ $admin->nombre }}</td>
                    <td>{{ $admin->email }}</td>
                    <td style="color:#64748B">{{ $admin->institucion?->nombre ?? '—' }}</td>
                    <td>{{ ucfirst($admin->rol) }}</td>
                    <td>
                        <div class="form-check form-switch">
                            <input class="form-check-input toggle-activo" type="checkbox" data-id="{{ $admin->id }}"
                                data-nombre="{{ $admin->nombre }}" style="cursor: pointer;" @checked($admin->activo)>
                        </div>
                    </td>
                    <td style="text-align:center">
                        <button type="button" class="btn btn-primary"
                            onclick="abrirModalEditarAdministrador({{ $admin->id }})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button type="button" class="btn btn-danger"><i class="fas fa-trash"></i> Eliminar</button>
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
