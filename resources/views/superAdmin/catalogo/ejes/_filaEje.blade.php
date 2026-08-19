@php
    $activo = (bool) $eje->activo;
    $tematicas = (int) ($eje->tematicas_oficiales_activas_count ?? 0);
    $temasCount = (int) ($eje->temas_count ?? 0);
@endphp
<tr data-eje-id="{{ $eje->id }}" data-modulo-id="{{ $eje->modulo_id }}" data-nombre="{{ $eje->nombre }}"
    data-orden="{{ $eje->orden }}" data-activo="{{ $activo ? '1' : '0' }}" data-puede-gestionar="1"
    data-temas-count="{{ $temasCount }}" class="fila-oficial">
    <td>
        <div class="reorder">
            <button type="button" class="btn-reorder" data-dir="arriba" title="Subir">▲</button>
            <button type="button" class="btn-reorder" data-dir="abajo" title="Bajar">▼</button>
        </div>
    </td>
    <td>
        <div class="mod-name">
            <span class="eje-nombre-texto">{{ $eje->nombre }}</span>
            <span class="star">⭐ Oficial</span>
        </div>
    </td>
    <td class="eje-descripcion">
        @if (filled($eje->descripcion))
            {{ $eje->descripcion }}
        @else
            <span class="text-muted">—</span>
        @endif
    </td>
    <td class="col-tematicas">{{ $tematicas }}</td>
    <td class="col-orden">{{ $eje->orden }}</td>
    <td>
        <div class="state-row">
            <button type="button" class="switch {{ $activo ? 'on' : '' }}" data-toggle-estado-eje
                aria-label="Cambiar estado" title="{{ $activo ? 'Desactivar' : 'Activar' }}"></button>
        </div>
    </td>
    <td class="col-actions">
        <div class="row-actions d-flex justify-content-center">
            <button type="button" class="btn-accion btn-editar" data-editar-eje title="Editar eje">
                <i class="fa-solid fa-pen"></i> Editar
            </button>
        </div>
    </td>
</tr>
