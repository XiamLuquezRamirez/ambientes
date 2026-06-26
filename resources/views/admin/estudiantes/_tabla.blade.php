<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Avatar</th>
                <th>Nombre</th>
                <th>Grado</th>
                <th>Condición</th>
                <th>Edad</th>
                <th class="text-center">Estado</th>
                <th class="text-center">Acciones</th>
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
                    <td style="text-transform: capitalize;">{{ $e->nombre }} {{ $e->apellido }}</td>
                    <td>{{ $e->grado?->nombre }}</td>
                    <td>{{ $e->condicion?->nombre }}</td>
                    <td>{{ $e->edad ? $e->edad . ' Años' : 'N/A' }}</td>
                    <td>
                        <div class="d-flex justify-content-center align-items-center">
                            <div class="form-check form-switch">
                                <input onchange="cambiarEstadoEstudiante('{{ $e->id }}', this)" {{ $e->activo == 1 ? 'checked' : '' }} class="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckDefault">
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="tabla-acciones d-flex justify-content-center align-items-center">
                            <a href="#" onclick="abrirModalEditarEstudiante('{{ $e->id }}')" class="btn-accion btn-editar">
                                <i class="fa-solid fa-pencil"></i>
                                Editar</a>
                            <button type="button" class="btn-accion btn-eliminar" onclick="confirmarEliminacionEstudiante('{{ $e->id }}', '{{ $e->nombre }}')">
                                <i class="fa-solid fa-trash-can"></i>
                                Eliminar
                            </button>
                            @if($e->requiere_apoyo == "si" && $e->estado_piar == 0)
                                <a href="{{ route('admin.estudiantes.diligenciar-piar', ['idEstudiante' => $e->id]) }}" class="btn-accion btn-warning">
                                    <i class="fa-solid fa-file-pen"></i>
                                    Diligenciar PIAR
                                </a>
                            @endif
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