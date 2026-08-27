{{-- DBA del MEN: oficiales, solo lectura --}}
<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Área</th>
                <th>Grado</th>
                <th>Estado</th>
                <th style="text-align:center">Acciones</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($catalogosMen as $catalogo)
                <tr id="fila-men-{{ $catalogo->id }}">
                    <td style="font-weight:600;color:#1E293B">{{ $catalogo->codigo }}</td>
                    <td class="catalogo-dba-col-descripcion" title="{{ $catalogo->descripcion }}">
                        {{ \Illuminate\Support\Str::limit($catalogo->descripcion, 80) }}
                    </td>
                    <td>{{ $catalogo->area?->nombre ?? '—' }}</td>
                    <td>{{ $catalogo->grado?->nombre ?? '—' }}</td>
                    <td>
                        @if ($catalogo->estado)
                            <span class="badge badge-estado-activo">Activo</span>
                        @else
                            <span class="badge badge-estado-inactivo">Inactivo</span>
                        @endif
                    </td>
                    <td>
                        <div class="tabla-acciones" style="justify-content:center">
                            <button type="button" class="btn-accion btn-ver-dba" title="Ver detalle"
                                onclick="abrirModalVerCatalogoDBA({{ $catalogo->id }})">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                        </div>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align:center;color:#64748B;padding:24px">
                        No hay DBA del MEN con los filtros actuales.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>
{{ $catalogosMen->links('vendor.pagination.proyecto') }}
