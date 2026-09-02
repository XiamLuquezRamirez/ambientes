@php
    /** @var \App\Models\ResultadoBloqueNino $resultado */
    /** @var \App\Services\ResultadoNinoPanelService $panelService */
    $archivoUrl = $panelService->urlArchivo($resultado);
    $esImagen = $panelService->esArchivoImagen($resultado);
@endphp
<tr>
    @if ($mostrarEstudiante ?? false)
        <td style="font-weight:600;color:#1E293B">
            {{ $panelService->nombreEstudiante($resultado->estudiante) }}
        </td>
    @endif
    @if ($mostrarExperiencia ?? true)
        <td style="color:#64748B">{{ $resultado->experiencia->nombre ?? '—' }}</td>
    @endif
    <td style="color:#64748B">
        {{ $panelService->etiquetaTipoBloque($resultado->tipo_bloque, $resultado->bloque->datos ?? []) }}
        @if ($resultado->bloque)
            <span class="text-muted">#{{ $resultado->bloque->orden }}</span>
        @endif
    </td>
    <td>{{ $resumenes[$resultado->id] ?? '—' }}</td>
    <td>
        @if ($resultado->correcto === true)
            <span class="badge badge-green">Correcto</span>
        @elseif ($resultado->correcto === false)
            <span class="badge badge-yellow">Incorrecto</span>
        @else
            <span class="badge badge-gray">Registrado</span>
        @endif
    </td>
    <td>
        @if ($archivoUrl)
            @if ($esImagen && ($mostrarMiniatura ?? false))
                <a href="{{ $archivoUrl }}" target="_blank" rel="noopener" class="rn-res-thumb-link">
                    <img src="{{ $archivoUrl }}" alt="Evidencia" class="rn-res-thumb">
                </a>
            @else
                <a href="{{ $archivoUrl }}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-primary">
                    Ver
                </a>
            @endif
        @else
            <span class="text-muted">—</span>
        @endif
    </td>
    <td style="color:#64748B;white-space:nowrap">
        {{ $resultado->creado_en?->format('d/m/Y H:i') ?? '—' }}
    </td>
</tr>
