{{--
    Tabla de Catálogo DBA (Super Admin).
    - Cada fila usa id="fila-{id}" para AJAX.
    - Estado: catalogo_dba.estado (boolean); el switch refleja activo.
--}}
<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Área</th>
                <th>Grado</th>
                <th>Origen</th>
                <th>Estado</th>
                <th style="text-align:center">Acciones</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($catalogos as $catalogo)
                <tr id="fila-{{ $catalogo->id }}">
                    <td style="font-weight:600;color:#1E293B">{{ $catalogo->codigo }}</td>
                    <td class="catalogo-dba-col-descripcion" title="{{ $catalogo->descripcion }}">
                        {{ \Illuminate\Support\Str::limit($catalogo->descripcion, 80) }}
                    </td>
                    <td>{{ $catalogo->area?->nombre ?? '—' }}</td>
                    <td>{{ $catalogo->grado?->nombre ?? '—' }}</td>
                    <td>
                        @if ($catalogo->es_men)
                            <span class="badge" style="background:#DBEAFE;color:#1D4ED8">MEN</span>
                        @else
                            <span class="badge" style="background:#F1F5F9;color:#475569">NO MEN</span>
                        @endif
                    </td>
                    <td>
                        <div class="form-check form-switch">
                            <input class="form-check-input toggle-activo" type="checkbox"
                                data-id="{{ $catalogo->id }}" data-nombre="{{ e($catalogo->codigo) }}"
                                style="cursor: pointer;"
                                title="{{ $catalogo->estado ? 'Desactivar catálogo' : 'Activar catálogo' }}"
                                @checked($catalogo->estado)>
                        </div>
                    </td>
                    <td>
                        <div class="tabla-acciones" style="justify-content:center">
                            <button type="button" class="btn-accion btn-asignar-grado"
                                onclick="abrirModalEditarCatalogoDBA({{ $catalogo->id }})">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                        </div>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" style="text-align:center;color:#64748B;padding:24px">
                        No hay catálogos DBA registrados.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>
{{ $catalogos->links('vendor.pagination.proyecto') }}
