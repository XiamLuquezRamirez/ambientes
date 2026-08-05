@php
    $grupoActual = '__unset__';
    $esSuperAdmin = $esSuperAdmin ?? false;
@endphp
<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Código</th>
                <th>Etiqueta</th>
                <th class="text-center">Estudiantes</th>
                <th class="text-center">Estado</th>
                <th>Tipo</th>
                <th style="text-align:center">Acciones</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($perfilesAprendizajePersonalizado as $perfilAprendizajePersonalizado)
                @php
                    $claveGrupo = $perfilAprendizajePersonalizado->perfil_aprendizaje_id ?? '__sin_base__';
                    $color = $perfilAprendizajePersonalizado->perfilAprendizaje?->color_hex ?: '#64748B';
                    $activos = $perfilAprendizajePersonalizado->estudiantes_activos_count ?? 0;
                    $total = $perfilAprendizajePersonalizado->estudiantes_count ?? 0;
                    $puedeGestionar = $esSuperAdmin || ! $perfilAprendizajePersonalizado->es_sistema;
                @endphp

                @if ($grupoActual !== $claveGrupo)
                    @php $grupoActual = $claveGrupo; @endphp
                    <tr class="grupo-perfil-aprendizaje-base">
                        <td colspan="6"
                            style="background:#F8FAFC;font-weight:700;color:#1E3A8A;padding:10px 16px;border-top:2px solid #DBEAFE">
                            @if ($perfilAprendizajePersonalizado->perfilAprendizaje)
                                <span class="badge"
                                    style="background:{{ $color }}22;color:{{ $color }};border:1px solid {{ $color }}55;margin-right:8px">
                                    {{ $perfilAprendizajePersonalizado->perfilAprendizaje->codigo }}
                                </span>
                                {{ $perfilAprendizajePersonalizado->perfilAprendizaje->nombre }}
                            @else
                                <span class="badge badge-gray" style="margin-right:8px">Sin base</span>
                                Sin perfil de aprendizaje base
                            @endif
                        </td>
                    </tr>
                @endif

                <tr id="fila-transitoria-{{ $perfilAprendizajePersonalizado->id }}">
                    <td>
                        <span class="badge"
                            style="background:{{ $color }}22;color:{{ $color }};border:1px solid {{ $color }}55">
                            {{ $perfilAprendizajePersonalizado->codigo }}
                        </span>
                    </td>
                    <td style="font-weight:600;color:#1E293B">{{ $perfilAprendizajePersonalizado->etiqueta }}</td>
                    <td class="text-center">
                        <span class="badge {{ $activos > 0 ? 'badge-blue' : 'badge-gray' }}"
                            title="Estudiantes activos / total asociados">
                            <i class="fa-solid fa-user-graduate"></i>
                            {{ $activos }} activos
                            @if ($total !== $activos)
                                <span style="opacity:.75">({{ $total }})</span>
                            @endif
                        </span>
                    </td>
                    <td>
                        <div class="d-flex justify-content-center align-items-center">
                            <div class="form-check form-switch mb-0">
                                <input class="form-check-input toggle-estado-transitoria" type="checkbox"
                                    role="switch" style="cursor:pointer"
                                    data-id="{{ $perfilAprendizajePersonalizado->id }}"
                                    data-nombre="{{ e($perfilAprendizajePersonalizado->etiqueta) }}"
                                    @checked($perfilAprendizajePersonalizado->activa())
                                    @disabled(! $puedeGestionar)
                                    title="{{ $perfilAprendizajePersonalizado->activa() ? 'Desactivar' : 'Activar' }}">
                            </div>
                        </div>
                    </td>
                    <td>
                        @if ($perfilAprendizajePersonalizado->es_sistema)
                            <span class="badge badge-orange">Sistema</span>
                        @else
                            <span class="badge badge-gray">Adicional</span>
                        @endif
                    </td>
                    <td>
                        @if ($puedeGestionar)
                            <div class="tabla-acciones" style="justify-content:center">
                                <div class="dropdown tabla-opciones-dropdown">
                                    <button class="btn-accion btn-opciones-toggle dropdown-toggle" type="button"
                                        id="dropdownTransitoria{{ $perfilAprendizajePersonalizado->id }}" data-bs-toggle="dropdown"
                                        aria-expanded="false">
                                        <i class="fa-solid fa-ellipsis-vertical"></i>
                                        Opciones
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-acciones"
                                        aria-labelledby="dropdownTransitoria{{ $perfilAprendizajePersonalizado->id }}">
                                        <li>
                                            <button type="button" class="btn-accion btn-editar"
                                                onclick="abrirModalEditarTransitoria({{ $perfilAprendizajePersonalizado->id }})">
                                                <i class="fa-solid fa-pencil"></i>
                                                Editar
                                            </button>
                                        </li>
                                        @if (!$perfilAprendizajePersonalizado->es_sistema)
                                            <li>
                                                <button type="button"
                                                    class="btn-accion btn-eliminar btn-eliminar-transitoria"
                                                    data-id="{{ $perfilAprendizajePersonalizado->id }}"
                                                    data-nombre="{{ e($perfilAprendizajePersonalizado->etiqueta) }}"
                                                    data-estudiantes="{{ $total }}">
                                                    <i class="fa-solid fa-trash-can"></i>
                                                    Eliminar
                                                </button>
                                            </li>
                                        @endif
                                    </ul>
                                </div>
                            </div>
                        @else
                            <span style="color:#94A3B8;font-size:.85rem">Solo lectura</span>
                        @endif
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align:center;color:#94A3B8;padding:32px">
                        Sin perfiles de aprendizaje personalizados registrados
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>

{{ $perfilesAprendizajePersonalizado->links('vendor.pagination.proyecto') }}
