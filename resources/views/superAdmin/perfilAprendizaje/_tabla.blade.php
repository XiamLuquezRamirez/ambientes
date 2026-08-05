<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th class="text-center">Estudiantes</th>
                <th class="text-center">Estado</th>
                <th>Sistema</th>
                <th class="text-center">Vista info</th>
                <th>Última edición</th>
                <th style="text-align:center">Acciones</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($perfilesAprendizaje as $perfilAprendizaje)
                @php
                    $color = $perfilAprendizaje->color_hex ?: '#64748B';
                @endphp
                <tr id="fila-{{ $perfilAprendizaje->id }}">
                    <td>
                        <span class="badge"
                            style="background:{{ $color }}22;color:{{ $color }};border:1px solid {{ $color }}55">
                            {{ $perfilAprendizaje->codigo }}
                        </span>
                    </td>
                    <td style="font-weight:600;color:#1E293B">{{ $perfilAprendizaje->nombre }}</td>
                    <td class="text-center">
                        <span class="badge {{ $perfilAprendizaje->estudiantes_activos_count > 0 ? 'badge-blue' : 'badge-gray' }}"
                            title="Estudiantes activos asignados">
                            <i class="fa-solid fa-user-graduate"></i>
                            {{ $perfilAprendizaje->estudiantes_activos_count }}
                            {{ $perfilAprendizaje->estudiantes_activos_count === 1 ? 'activo' : 'activos' }}
                        </span>
                    </td>
                    <td>
                        <div class="d-flex justify-content-center align-items-center">
                            <div class="form-check form-switch mb-0">
                                <input class="form-check-input toggle-estado-perfil-aprendizaje" type="checkbox"
                                    role="switch" style="cursor:pointer"
                                    data-id="{{ $perfilAprendizaje->id }}"
                                    data-nombre="{{ e($perfilAprendizaje->nombre) }}"
                                    data-estudiantes="{{ $perfilAprendizaje->estudiantes_count }}"
                                    @checked($perfilAprendizaje->activa())
                                    title="{{ $perfilAprendizaje->activa() ? 'Desactivar' : 'Activar' }}">
                            </div>
                        </div>
                    </td>
                    <td>
                        @if ($perfilAprendizaje->es_sistema)
                            <span class="badge badge-orange">Sistema</span>
                        @else
                            <span class="badge badge-gray">Adicional</span>
                        @endif
                    </td>
                    <td class="text-center">
                        @if ($perfilAprendizaje->vista_info_asociada)
                            <button type="button" class="btn-accion btn btn-success"
                                onclick="abrirModalVerInfoPerfilAprendizaje({{ $perfilAprendizaje->id }})"
                                title="{{ $perfilAprendizaje->vista_info_asociada }}">
                                <i class="fa-solid fa-eye"></i> Ver
                            </button>
                        @else
                            <span class="badge badge-gray">Sin vista</span>
                        @endif
                    </td>
                    <td style="color:#64748B">
                        {{ $perfilAprendizaje->fecha_ultima_edicion_formato ?? '—' }}
                    </td>
                    <td>
                        <div class="tabla-acciones" style="justify-content:center">
                            <div class="dropdown tabla-opciones-dropdown">
                                <button class="btn-accion btn-opciones-toggle dropdown-toggle" type="button"
                                    id="dropdownPerfilAprendizaje{{ $perfilAprendizaje->id }}" data-bs-toggle="dropdown"
                                    aria-expanded="false">
                                    <i class="fa-solid fa-ellipsis-vertical"></i>
                                    Opciones
                                </button>
                                <ul class="dropdown-menu dropdown-menu-acciones"
                                    aria-labelledby="dropdownPerfilAprendizaje{{ $perfilAprendizaje->id }}">
                                    <li>
                                        <button type="button" class="btn-accion btn-editar"
                                            onclick="abrirModalEditarPerfilAprendizaje({{ $perfilAprendizaje->id }})">
                                            <i class="fa-solid fa-pencil"></i>
                                            Editar
                                        </button>
                                    </li>
                                    <li>
                                        <button type="button" class="btn-accion"
                                            onclick="abrirModalVistaInfoAsociada({{ $perfilAprendizaje->id }}, @js($perfilAprendizaje->vista_info_asociada ?? ''), @js($perfilAprendizaje->nombre))">
                                            <i class="fa-solid fa-file-code"></i>
                                            {{ $perfilAprendizaje->vista_info_asociada ? 'Editar vista info' : 'Asociar vista info' }}
                                        </button>
                                    </li>
                                    @if (!$perfilAprendizaje->es_sistema)
                                        <li>
                                            <button type="button"
                                                class="btn-accion btn-eliminar btn-eliminar-perfil-aprendizaje"
                                                data-id="{{ $perfilAprendizaje->id }}"
                                                data-nombre="{{ e($perfilAprendizaje->nombre) }}"
                                                data-estudiantes="{{ $perfilAprendizaje->estudiantes_count }}">
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
                        Sin perfiles de aprendizaje registrados
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>

{{ $perfilesAprendizaje->links('vendor.pagination.proyecto') }}
