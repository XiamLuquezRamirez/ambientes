<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Nombre</th>
                <th>Fecha</th>
                <th style="text-align:center">Experiencias</th>
                <th>Estado</th>
                <th style="text-align:center">Acciones</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($clases as $clase)
                <tr data-clase-id="{{ $clase->id }}">
                    <td style="font-weight:600;color:#1E293B">{{ $clase->nombre }}</td>
                    <td style="color:#64748B">
                        {{ $clase->fecha?->format('d/m/Y') ?? '—' }}
                    </td>
                    <td style="text-align:center;color:#64748B">
                        {{ $clase->experiencias_clase_count ?? 0 }}
                    </td>
                    <td>
                        <span class="badge {{ $clase->badgeEstado() }}" data-clase-badge>
                            {{ $clase->etiquetaEstado() }}
                        </span>
                    </td>
                    <td style="text-align:center">
                        <div class="d-inline-flex gap-2 flex-wrap justify-content-center">
                            <button type="button"
                                class="btn btn-sm btn-outline-primary btn-clase-agregar-exp"
                                data-clase-id="{{ $clase->id }}"
                                data-clase-nombre="{{ $clase->nombre }}"
                                title="Agregar otra experiencia a esta clase">
                                <i class="fas fa-plus"></i> Experiencia
                            </button>
                            @if ($clase->estado !== \App\Models\Clase::ESTADO_ACTIVA)
                                <button type="button"
                                    class="btn btn-sm btn-success btn-clase-estado"
                                    data-estado="activa"
                                    @disabled(! $clase->fecha)
                                    title="{{ $clase->fecha ? 'Activar para el kiosco' : 'Asigna fecha primero' }}">
                                    <i class="fas fa-play"></i> Activar
                                </button>
                            @endif
                            @if ($clase->estado === \App\Models\Clase::ESTADO_ACTIVA)
                                <button type="button"
                                    class="btn btn-sm btn-outline-secondary btn-clase-estado"
                                    data-estado="finalizada"
                                    title="Marcar como finalizada">
                                    <i class="fas fa-flag-checkered"></i> Finalizar
                                </button>
                            @elseif ($clase->estado !== \App\Models\Clase::ESTADO_BORRADOR)
                                <button type="button"
                                    class="btn btn-sm btn-outline-secondary btn-clase-estado"
                                    data-estado="borrador"
                                    title="Volver a borrador">
                                    Borrador
                                </button>
                            @endif
                            <a href="{{ route('panel.clases.resultados', $clase) }}"
                                class="btn btn-sm btn-outline-secondary"
                                title="Ver resultados del kiosco">
                                <i class="fas fa-chart-simple"></i> Resultados
                            </a>
                            <button type="button" class="btn btn-danger btn-sm" disabled title="Próximamente">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" style="text-align:center;color:#64748B;padding:24px">
                        Aún no hay clases para este grupo. Usa <strong>Nueva Clase</strong> para crear la primera.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>
