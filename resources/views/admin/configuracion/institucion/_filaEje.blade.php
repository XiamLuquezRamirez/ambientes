@php
    $esPropio = (bool) ($esPropio ?? $eje->esDeInstitucion((int) session('institucion_id')));
    $puedeGestionar = (bool) ($puedeGestionar ?? $esPropio);
    $activo = (bool) $eje->activo;
    $tematicas = (int) ($eje->tematicas_activas_count ?? 0);
    $temasCount = (int) ($eje->temas_count ?? 0);
@endphp
<tr data-eje-id="{{ $eje->id }}" data-modulo-id="{{ $eje->modulo_id }}" data-nombre="{{ $eje->nombre }}"
    data-orden="{{ $eje->orden }}" data-activo="{{ $activo ? '1' : '0' }}" data-es-propio="{{ $esPropio ? '1' : '0' }}"
    data-puede-gestionar="{{ $puedeGestionar ? '1' : '0' }}" data-temas-count="{{ $temasCount }}"
    class="{{ $esPropio ? 'fila-colegio' : 'fila-oficial' }}">
    <td>
        @if ($puedeGestionar)
            <div class="reorder">
                <button type="button" class="btn-reorder" data-dir="arriba" title="Subir">▲</button>
                <button type="button" class="btn-reorder" data-dir="abajo" title="Bajar">▼</button>
            </div>
        @endif
    </td>
    <td>
        <div class="mod-name">
            <span class="eje-nombre-texto">{{ $eje->nombre }}</span>
            @if ($eje->esOficial())
                <span class="star">⭐ Oficial</span>
            @else
                <span class="badge-colegio">Del colegio</span>
            @endif
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
        @if ($puedeGestionar)
            <div class="state-row">
                <button type="button" class="switch {{ $activo ? 'on' : '' }}" data-toggle-estado-eje
                    aria-label="Cambiar estado" title="{{ $activo ? 'Desactivar' : 'Activar' }}"></button>
            </div>
        @else
            <span class="eje-estado {{ $activo ? 'is-activo' : 'is-inactivo' }}">
                {{ $activo ? 'Activo' : 'Inactivo' }}
            </span>
        @endif
    </td>

</tr>
