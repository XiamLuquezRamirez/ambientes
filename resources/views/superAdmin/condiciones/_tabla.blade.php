<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th class="text-center">Estudiantes</th>
                <th class="text-center">Estado</th>
                <th>Sistema</th>
                <th class="text-center">PDF</th>
                <th>Última edición</th>
                <th style="text-align:center">Acciones</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($condiciones as $condicion)
                @php
                    $color = $condicion->color_hex ?: '#64748B';
                @endphp
                <tr id="fila-{{ $condicion->id }}">
                    <td>
                        <span class="badge"
                            style="background:{{ $color }}22;color:{{ $color }};border:1px solid {{ $color }}55">
                            {{ $condicion->codigo }}
                        </span>
                    </td>
                    <td style="font-weight:600;color:#1E293B">{{ $condicion->nombre }}</td>
                    <td class="text-center">
                        <span class="badge {{ $condicion->estudiantes_activos_count > 0 ? 'badge-blue' : 'badge-gray' }}"
                            title="Estudiantes activos asignados">
                            <i class="fa-solid fa-user-graduate"></i>
                            {{ $condicion->estudiantes_activos_count }}
                            {{ $condicion->estudiantes_activos_count === 1 ? 'activo' : 'activos' }}
                        </span>
                    </td>
                    <td>
                        <div class="d-flex justify-content-center align-items-center">
                            <div class="form-check form-switch mb-0">
                                <input class="form-check-input toggle-estado-condicion" type="checkbox"
                                    role="switch" style="cursor:pointer"
                                    data-id="{{ $condicion->id }}"
                                    data-nombre="{{ e($condicion->nombre) }}"
                                    data-estudiantes="{{ $condicion->estudiantes_count }}"
                                    @checked($condicion->activa())
                                    title="{{ $condicion->activa() ? 'Desactivar' : 'Activar' }}">
                            </div>
                        </div>
                    </td>
                    <td>
                        @if ($condicion->es_sistema)
                            <span class="badge badge-orange">Sistema</span>
                        @else
                            <span class="badge badge-gray">Adicional</span>
                        @endif
                    </td>
                    <td class="text-center">
                        @if ($condicion->documento)
                            <button type="button" class="btn-accion btn btn-success"
                                onclick="abrirModalDocumentoCondicion({{ $condicion->id }})"
                                title="Ver / editar PDF">
                                <i class="fa-solid fa-file-pdf"></i> Ver PDF
                            </button>
                        @else
                            <button type="button" class="btn-accion btn btn-warning"
                                onclick="abrirModalDocumentoCondicion({{ $condicion->id }})"
                                title="Subir PDF">
                                <i class="fa-solid fa-upload"></i> Subir PDF
                            </button>
                        @endif
                    </td>
                    <td style="color:#64748B">
                        {{ $condicion->fecha_ultima_edicion_formato ?? '—' }}
                    </td>
                    <td>
                        <div class="tabla-acciones" style="justify-content:center">
                            <div class="dropdown tabla-opciones-dropdown">
                                <button class="btn-accion btn-opciones-toggle dropdown-toggle" type="button"
                                    id="dropdownCondicion{{ $condicion->id }}" data-bs-toggle="dropdown"
                                    aria-expanded="false">
                                    <i class="fa-solid fa-ellipsis-vertical"></i>
                                    Opciones
                                </button>
                                <ul class="dropdown-menu dropdown-menu-acciones"
                                    aria-labelledby="dropdownCondicion{{ $condicion->id }}">
                                    <li>
                                        <button type="button" class="btn-accion btn-editar"
                                            onclick="abrirModalEditarCondicion({{ $condicion->id }})">
                                            <i class="fa-solid fa-pencil"></i>
                                            Editar
                                        </button>
                                    </li>
                                    @if (!$condicion->es_sistema)
                                        <li>
                                            <button type="button"
                                                class="btn-accion btn-eliminar btn-eliminar-condicion"
                                                data-id="{{ $condicion->id }}"
                                                data-nombre="{{ e($condicion->nombre) }}"
                                                data-estudiantes="{{ $condicion->estudiantes_count }}">
                                                <i class="fa-solid fa-trash-can"></i>
                                                Eliminar
                                            </button>
                                        </li>
                                    @endif
                                </ul>
                            </div>
                        </div>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="8" style="text-align:center;color:#94A3B8;padding:32px">
                        Sin condiciones registradas
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>

{{ $condiciones->links('vendor.pagination.proyecto') }}
