@php
    $modulo = $item['modelo'];
    $esPropio = $item['es_propio'];
    $activo = $esPropio ? (bool) $modulo->activo : (bool) $item['puede_gestionar_ejes'];
    $ejesCount = (int) ($modulo->ejes_count ?? ($modulo->ejes_propios_count ?? 0));
    $temasCount = (int) ($modulo->temas_count ?? 0);
@endphp
<tr data-modulo-id="{{ $modulo->id }}" data-nombre="{{ $modulo->nombre }}" data-orden="{{ $modulo->orden }}"
    data-activo="{{ $activo ? '1' : '0' }}" data-es-propio="{{ $esPropio ? '1' : '0' }}"
    data-puede-gestionar="{{ $item['puede_gestionar'] ? '1' : '0' }}"
    data-puede-gestionar-ejes="{{ $item['puede_gestionar_ejes'] ? '1' : '0' }}"
    data-temas-activos="{{ $modulo->temas_activos_count }}" data-ejes-count="{{ $ejesCount }}"
    data-temas-count="{{ $temasCount }}" class="{{ $esPropio ? 'fila-colegio' : 'fila-oficial' }}">
    <td>
        @if ($esPropio)
            <div class="reorder">
                <button type="button" class="btn-reorder" data-dir="arriba" title="Subir">▲</button>
                <button type="button" class="btn-reorder" data-dir="abajo" title="Bajar">▼</button>
            </div>
        @endif
    </td>
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
        @if ($esPropio)
            <div class="state-row">
                <button type="button" class="switch {{ $modulo->activo ? 'on' : '' }}" data-toggle-estado
                    aria-label="Cambiar estado" title="{{ $modulo->activo ? 'Desactivar' : 'Activar' }}"></button>
            </div>
        @else
            <span class="eje-estado {{ $activo ? 'is-activo' : 'is-inactivo' }}">
                {{ $activo ? 'Activo' : 'Inactivo' }}
            </span>
        @endif
    </td>
    <td class="col-ejes-propios">{{ $modulo->ejes_propios_count }}</td>
    <td class="col-actions">
        <div class="row-actions d-flex justify-content-center">
            <button type="button" class="btn-accion btn-asignar-grado" data-ejes-modulo title="Ver ejes del módulo">
                <i class="fa-solid fa-diagram-project"></i> Ejes
            </button>
            @if ($esPropio)
                <button type="button" class="btn-accion btn-editar" data-editar-modulo title="Editar módulo">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>
                <button type="button" class="btn-accion btn-eliminar" data-eliminar-modulo title="Eliminar módulo">
                    <i class="fa-solid fa-trash"></i> Eliminar
                </button>
            @endif
        </div>
    </td>
</tr>
