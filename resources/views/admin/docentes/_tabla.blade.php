<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Fecha Ultimo Acceso</th>
                <th>Estado</th>
                <th>Estado de cuenta</th>
                <th style="text-align:center">Acciones</th>

            </tr>
        </thead>
        <tbody>
            @forelse($docentes as $d)
                <tr id="fila-{{ $d->id }}" @if ($d->cuenta_sin_usar)  @endif>
                    <td style="font-weight:600;color:#1E293B">
                        {{ $d->user->nombre }}

                        {{-- se deja comentado pero se puede activar para que se muestre el mensaje de cuenta nueva.
                         @if ($d->cuenta_sin_usar)
                            <span class="badge badge-yellow badge-cuenta-nueva"
                                title="Cuenta creada pero nunca ha iniciado sesión">
                                <i class="fa-solid fa-user-clock"></i> Nueva
                            </span>
                        @endif --}}
                    </td>
                    <td style="color:#64748B">{{ $d->email }}</td>

                    <td>
                        {{ $d->ultimo_acceso ? date('d/m/Y H:i', strtotime($d->ultimo_acceso)) : '—' }}
                    </td>
                    <td>
                        <div class="form-check form-switch">
                            <input class="form-check-input toggle-activo" type="checkbox" data-id="{{ $d->user->id }}"
                                data-nombre="{{ $d->user->nombre }}" data-apellido="{{ $d->user->apellido }}"
                                {{ $d->user->estado ? 'checked' : '' }}>
                        </div>
                    </td>
                    <td style="text-align:center">
                        @if ($d->user->cuenta_sin_usar)
                            <span class="badge badge-yellow" title="Nunca ha iniciado sesión">
                                <i class="fa-solid fa-circle-exclamation"></i> Sin usar
                            </span>
                        @else
                            <span style="color:#94A3B8">—</span>
                        @endif
                    </td>
                    <td>
                        <div class="tabla-acciones" style="justify-content:center">
                            <button class="btn-accion btn-asignar-grado"
                                onclick="abrirModalAsignarGrado({{ $d->id }})"><i class="fa-solid fa-list"></i>
                                Asignar Grupo</button>
                            <button class="btn-accion btn-editar" onclick="abrirModalEditar({{ $d->user_id }})"><i
                                    class="fa-solid fa-pencil"></i>
                                Editar</button>
                            <button type="button" class="btn-accion btn-eliminar" data-id="{{ $d->id }}"
                                data-nombre="{{ e($d->user->nombre) }}">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                            <button type="button" class="btn-accion btn-ver-accesos"
                                onclick="abrirModalVerAccesos({{ $d->user_id }})"><i
                                    class="fa-solid fa-clock-rotate-left"></i>
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
