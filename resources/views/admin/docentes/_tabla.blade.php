<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Fecha Ultimo Acceso</th>
                <th>Estado</th>
                <th style="text-align:center">Acciones</th>
            </tr>
        </thead>
        <tbody>
            @forelse($docentes as $d)
                <tr id="fila-{{ $d->id }}">
                    <td style="font-weight:600;color:#1E293B">{{ $d->nombre }}</td>
                    <td style="color:#64748B">{{ $d->email }}</td>

                    <td>
                        {{ $d->docente?->fecha_ingreso ? date('d/m/Y', strtotime($d->docente?->fecha_ingreso)) : '—' }}
                    </td>
                    <td>
                        <span class="badge {{ $d->estado ? 'badge-green' : 'badge-red' }}">
                            {{ $d->estado ? 'Activo' : 'Inactivo' }}
                        </span>
                    </td>
                    <td>
                        <div class="tabla-acciones" style="justify-content:center">
                            <button class="btn-accion btn-asignar-grado"
                                onclick="abrirModalAsignarGrado({{ $d->id }})"><i class="fa-solid fa-list"></i>
                                Asignar Grado</button>
                            <a href="{{ route('admin.docentes.edit', $d->id) }}" class="btn-accion btn-editar">
                                <i class="fa-solid fa-pencil"></i>
                                Editar</a>
                            <button type="button" class="btn-accion btn-eliminar" data-id="{{ $d->id }}"
                                data-nombre="{{ e($d->nombre) }}">
                                <i class="fa-solid fa-trash-can"></i>
                                Eliminar
                            </button>
                        </div>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align:center;color:#94A3B8;padding:32px">Sin docentes registrados
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>
{{ $docentes->links('vendor.pagination.proyecto') }}
