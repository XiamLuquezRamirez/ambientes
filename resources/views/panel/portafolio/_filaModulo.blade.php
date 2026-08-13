@php
    $modulo = $item['modelo'];
    $esPropio = $item['es_propio'];
    $activo = $esPropio ? (bool) $modulo->activo : (bool) $item['puede_gestionar_ejes'];
@endphp
<tr data-modulo-id="{{ $modulo->id }}" data-nombre="{{ $modulo->nombre }}"
    data-es-oficial="{{ $modulo->esOficial() ? '1' : '0' }}"
    data-puede-gestionar-ejes="{{ $item['puede_gestionar_ejes'] ? '1' : '0' }}"
    data-ejes-count="{{ (int) ($modulo->ejes_count ?? 0) }}" class="{{ $esPropio ? 'fila-colegio' : 'fila-oficial' }}">
    <td>
        <div class="mod-name">
            <span class="mod-nombre-texto">{{ $modulo->nombre }}</span>
            @if ($modulo->esOficial())
                <span class="star">⭐ Oficial</span>
            @else
                <span class="badge-colegio">Del colegio</span>
            @endif
        </div>
    </td>
    <td class="slug">{{ $modulo->slug }}</td>
    <td>
        <span class="eje-estado {{ $activo ? 'is-activo' : 'is-inactivo' }}">
            {{ $activo ? 'Activo' : 'Inactivo' }}
        </span>
    </td>
    <td class="col-ejes-propios">{{ $modulo->ejes_propios_count }}</td>
    <td class="col-actions">
        <div class="row-actions d-flex justify-content-center">
            <button type="button" class="btn-accion btn-asignar-grado" data-ejes-modulo title="Ver ejes del módulo">
                <i class="fa-solid fa-diagram-project"></i> Ejes
            </button>
        </div>
    </td>
</tr>
