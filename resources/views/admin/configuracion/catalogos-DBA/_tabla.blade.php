{{--
    Tabla de Catálogo DBA personalizado (Admin).
    Solo registros de la institución (es_men = false).
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
                <th>Creado por</th>
                <th>Estado</th>
                <th style="text-align:center">Acciones</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($catalogos as $catalogo)
                <tr id="fila-{{ $catalogo->id }}">
                    <td style="font-weight:600;color:#1E293B">{{ $catalogo->codigo }}</td>
                    <td style="color:#64748B">{{ $catalogo->descripcion }}</td>
                    <td>{{ $catalogo->area?->nombre ?? '—' }}</td>
                    <td>{{ $catalogo->grado?->nombre ?? '—' }}</td>
                    <td>
                        <span class="badge" style="background:#FEF3C7;color:#B45309">Del colegio</span>
                    </td>
                    <td>{{ $catalogo->creadoPor?->nombre ?? '—' }}</td>
                    <td>
                        <div class="form-check form-switch">
                            <input class="form-check-input toggle-activo" type="checkbox" data-id="{{ $catalogo->id }}"
                                data-nombre="{{ e($catalogo->codigo) }}" style="cursor: pointer;"
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
                        No hay DBA personalizados registrados para la institución.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>
{{ $catalogos->links('vendor.pagination.proyecto') }}
