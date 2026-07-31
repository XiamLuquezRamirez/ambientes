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
            @foreach ($administradores as $admin)
                <tr>
                    <td style="font-weight:600;color:#1E293B">{{ $admin->nombre }}</td>
                    <td>{{ $admin->email }}</td>
                    <td style="color:#64748B">{{ $institucion->nombre }}</td>
                    <td>{{ ucfirst($admin->rol) }}</td>
                    <td>
                        <div class="form-check form-switch switch-activo-institucion" onclick="event.stopPropagation()">
                            <input class="form-check-input toggle-activo-institucion" type="checkbox"
                                id="admin_estado_{{ $admin->id }}" data-id="{{ $admin->id }}"
                                data-nombre="{{ $admin->nombre }}" value="1" style="cursor: pointer;"
                                title="{{ $admin->estado ? 'Suspender administrador' : 'Activar administrador' }}"
                                {{ $admin->estado ? 'checked' : '' }}>
                        </div>
                    </td>
                    <td style="text-align:center">
                        <button class="btn btn-primary"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>
</div>
