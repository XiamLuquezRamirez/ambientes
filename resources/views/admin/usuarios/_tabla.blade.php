<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Nombre(s)</th>
                <th>Apellido(s)</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Fecha Ultimo Acceso</th>
                <th>Estado de cuenta</th>
                <th>Estado</th>
                <th style="text-align:center">Acciones</th>

            </tr>
        </thead>
        <tbody>
            @forelse($usuarios as $u)
                <tr id="fila-{{ $u->id }}">
                    <td style="font-weight:600;color:#1E293B">
                        {{ $u->nombre }}
                    </td>
                    <td style="font-weight:600;color:#1E293B">
                        {{ $u->apellido }}
                    </td>
                    <td style="color:#64748B">{{ $u->email }}</td>

                    <td style="color:#64748B">{{ ucfirst($u->rol) }}</td>

                    <td>
                        {{ $u->ultimo_acceso ? date('d/m/Y H:i', strtotime($u->ultimo_acceso)) : '—' }}
                    </td>

                    <td style="text-align:center">
                        @if ($u->cuenta_sin_usar)
                            <span class="badge badge-yellow" title="Nunca ha iniciado sesión">
                                <i class="fa-solid fa-circle-exclamation"></i> Sin usar
                            </span>
                        @else
                            <span style="color:#94A3B8">—</span>
                        @endif
                    </td>
                    <td>
                        <div class="form-check form-switch">
                            <input class="form-check-input toggle-activo" type="checkbox" data-id="{{ $u->id }}"
                                data-nombre="{{ $u->nombre }}" style="cursor: pointer;"
                                data-apellido="{{ $u->apellido }}" @checked($u->estado === 'activo')>
                        </div>
                    </td>
                    <td>
                        <div class="tabla-acciones" style="justify-content:center">

                            <span data-bs-toggle="tooltip"
                                title="{{ $u->rol === 'docente' ? 'Completar información' : 'Solo disponible para usuarios con rol docente' }}">

                                <button class="btn btn-primary btn-sm" {{ $u->rol !== 'docente' ? 'disabled' : '' }}
                                    onclick="abrirModalCompletarInfo('{{ $u->id }}')">
                                    <i class="bi bi-info-circle-fill"></i>
                                    Completar información
                                </button>

                            </span>
                            <button class="btn-accion btn-editar" onclick="abrirModalEditar({{ $u->id }})"><i
                                    class="fa-solid fa-pencil"></i>
                                Editar</button>
                            <button type="button" id="btn-eliminar" class="btn-accion btn-eliminar" title="Eliminar"
                                data-id="{{ $u->id }}" data-nombre="{{ e($u->nombre) }}"
                                data-apellido="{{ e($u->apellido) }}">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                            <button type="button" class="btn-accion btn-ver-accesos" title="Ver Accesos"
                                onclick="abrirModalVerAccesos({{ $u->id }})"><i
                                    class="fa-solid fa-clock-rotate-left"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align:center;color:#94A3B8;padding:32px">Sin usuarios registrados
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>
{{ $usuarios->links('vendor.pagination.proyecto') }}
