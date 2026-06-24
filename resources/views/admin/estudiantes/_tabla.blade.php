<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Avatar</th>
                <th>Nombre</th>
                <th>Grado</th>
                <th>Condición</th>
                <th>Edad</th>
                <th>Estado</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            @forelse($estudiantes as $e)
                <tr id="fila-{{ $e->id }}">
                    <td>
                        @if($e->avatar)
                            <div class="avatar-iniciales" style="background-color:{{ $e->color_avatar }}">
                                <img src="{{ asset('storage/' . $e->avatar) }}" alt="{{ $e->nombre }}" class="avatar-img">
                            </div>
                        @else
                            <div class="avatar-iniciales" style="background-color:{{ $e->color_avatar }}">{{ $e->iniciales }}</div>
                        @endif
                    </td>
                    <td>{{ $e->nombre }}</td>
                    <td>{{ $e->grado?->nombre }}</td>
                    <td>{{ $e->condicion?->nombre }}</td>
                    <td>{{ $e->edad ? $e->edad . ' Años' : 'N/A' }}</td>
                    <td>{{ $e->activo ? 'Activo' : 'Inactivo' }}</td>
                    <td>
                        <div class="tabla-acciones">

                            <a href="{{ route('admin.estudiantes.edit', $e->id) }}" class="btn-accion btn-editar">
                                <i class="fa-solid fa-pencil"></i>
                                Editar</a>
                            <button type="button" class="btn-accion btn-eliminar" data-id="{{ $e->id }}"
                                data-nombre="{{ e($e->nombre) }}">
                                <i class="fa-solid fa-trash-can"></i>
                                Eliminar
                            </button>
                        </div>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align:center;color:#94A3B8;padding:32px">Sin estudiantes registrados
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>
{{ $estudiantes->links('vendor.pagination.proyecto') }}