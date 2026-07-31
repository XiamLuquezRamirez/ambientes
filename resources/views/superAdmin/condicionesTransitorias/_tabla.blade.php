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
            @forelse ($condiciones as $condicion)
                @php
                    $claveGrupo = $condicion->condicion_base_id ?? '__sin_base__';
                    $color = $condicion->condicionBase?->color_hex ?: '#64748B';
                    $activos = $condicion->estudiantes_activos_count ?? 0;
                    $total = $condicion->estudiantes_count ?? 0;
                    $puedeGestionar = $esSuperAdmin || ! $condicion->es_sistema;
                @endphp

                @if ($grupoActual !== $claveGrupo)
                    @php $grupoActual = $claveGrupo; @endphp
                    <tr class="grupo-condicion-base">
                        <td colspan="6"
                            style="background:#F8FAFC;font-weight:700;color:#1E3A8A;padding:10px 16px;border-top:2px solid #DBEAFE">
                            @if ($condicion->condicionBase)
                                <span class="badge"
                                    style="background:{{ $color }}22;color:{{ $color }};border:1px solid {{ $color }}55;margin-right:8px">
                                    {{ $condicion->condicionBase->codigo }}
                                </span>
                                {{ $condicion->condicionBase->nombre }}
                            @else
                                <span class="badge badge-gray" style="margin-right:8px">Sin base</span>
                                Sin condición base
                            @endif
                        </td>
                    </tr>
                @endif

                <tr id="fila-transitoria-{{ $condicion->id }}">
                    <td>
                        <span class="badge"
                            style="background:{{ $color }}22;color:{{ $color }};border:1px solid {{ $color }}55">
                            {{ $condicion->codigo }}
                        </span>
                    </td>
                    <td style="font-weight:600;color:#1E293B">{{ $condicion->etiqueta }}</td>
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
                                    data-id="{{ $condicion->id }}"
                                    data-nombre="{{ e($condicion->etiqueta) }}"
                                    @checked($condicion->activa())
                                    @disabled(! $puedeGestionar)
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
                    <td>
                        @if ($puedeGestionar)
                            <div class="tabla-acciones" style="justify-content:center">
                                <div class="dropdown tabla-opciones-dropdown">
                                    <button class="btn-accion btn-opciones-toggle dropdown-toggle" type="button"
                                        id="dropdownTransitoria{{ $condicion->id }}" data-bs-toggle="dropdown"
                                        aria-expanded="false">
                                        <i class="fa-solid fa-ellipsis-vertical"></i>
                                        Opciones
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-acciones"
                                        aria-labelledby="dropdownTransitoria{{ $condicion->id }}">
                                        <li>
                                            <button type="button" class="btn-accion btn-editar"
                                                onclick="abrirModalEditarTransitoria({{ $condicion->id }})">
                                                <i class="fa-solid fa-pencil"></i>
                                                Editar
                                            </button>
                                        </li>
                                        @if (!$condicion->es_sistema)
                                            <li>
                                                <button type="button"
                                                    class="btn-accion btn-eliminar btn-eliminar-transitoria"
                                                    data-id="{{ $condicion->id }}"
                                                    data-nombre="{{ e($condicion->etiqueta) }}"
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
                        Sin condiciones transitorias registradas
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>

{{ $condiciones->links('vendor.pagination.proyecto') }}
