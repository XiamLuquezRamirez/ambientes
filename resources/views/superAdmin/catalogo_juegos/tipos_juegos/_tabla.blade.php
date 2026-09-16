<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Activo</th>
                <th style="text-align:center">Acciones</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($tiposJuego as $tipoJuego)
                <tr id="fila-{{ $tipoJuego->id }}">
                    <td>
                        <div style="font-weight:600;color:#1E293B">{{ $tipoJuego->nombre }}</div>
                        <div style="font-size:.75rem;color:#64748B">{{ $tipoJuego->slug }}</div>
                    </td>
                    <td>{{ $tipoJuego->descripcion ?: '—' }}</td>
                    <td>
                        <div class="form-check form-switch">
                            <input class="form-check-input toggle-activo" type="checkbox"
                                data-id="{{ $tipoJuego->id }}" data-nombre="{{ $tipoJuego->nombre }}"
                                data-juegos-count="{{ $tipoJuego->juegos_count ?? 0 }}" style="cursor: pointer;"
                                title="{{ $tipoJuego->activo ? 'Desactivar tipo de juego' : 'Activar tipo de juego' }}"
                                @checked($tipoJuego->activo)>
                        </div>
                    </td>
                    <td style="text-align:center">
                        <div class="tabla-acciones" style="justify-content:center">
                            <button type="button" class="btn-accion btn-editar" data-id="{{ $tipoJuego->id }}">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                        </div>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="4" style="text-align:center;color:#64748B;padding:24px">
                        No hay tipos de juegos
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>
