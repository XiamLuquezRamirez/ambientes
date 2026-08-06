@php
    $motivosCierreTransitoria = $motivosCierreTransitoria
        ?? \App\Services\EstudiantePerfilAprendizajePersonalizadoService::MOTIVOS_CIERRE;
    $historialPerfilesAprendizajePersonalizado = $historialPerfilesAprendizajePersonalizado ?? collect();
@endphp

<p class="ficha-section-title">Historial de perfiles de aprendizaje personalizados</p>

@if ($historialPerfilesAprendizajePersonalizado->isNotEmpty())
    <section class="c-card">
        <h3 class="ficha-section-title">
            <i class="fa-solid fa-clock-rotate-left me-1"></i> Historial de perfiles de aprendizaje personalizados
        </h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Perfil de aprendizaje</th>
                        <th>Estado</th>
                        <th>Activación</th>
                        <th>Cierre</th>
                        <th>Docente</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($historialPerfilesAprendizajePersonalizado as $registro)
                        <tr>
                            <td>
                                <strong>{{ $registro->perfilAprendizajePersonalizado?->etiqueta ?? '—' }}</strong>
                                <small class="d-block text-muted">{{ $registro->perfilAprendizajePersonalizado?->codigo }}</small>
                            </td>
                            <td>
                                @if ($registro->activa)
                                    <span class="stu-badge stu-badge--transitoria">Activa</span>
                                @else
                                    <span class="stu-badge stu-badge--inactivo">Cerrada</span>
                                @endif
                            </td>
                            <td>
                                {{ $registro->fecha_activacion?->format('d/m/Y H:i') ?? '—' }}
                                @if ($registro->observacion)
                                    <small class="d-block text-muted">{{ \Illuminate\Support\Str::limit($registro->observacion, 80) }}</small>
                                @endif
                            </td>
                            <td>
                                @if ($registro->fecha_cierre)
                                    {{ $registro->fecha_cierre->format('d/m/Y H:i') }}
                                    <small class="d-block text-muted">
                                        {{ $motivosCierreTransitoria[$registro->motivo_cierre] ?? $registro->motivo_cierre }}
                                    </small>
                                    @if ($registro->observacion_cierre)
                                        <small class="d-block text-muted">{{ \Illuminate\Support\Str::limit($registro->observacion_cierre, 80) }}</small>
                                    @endif
                                @else
                                    —
                                @endif
                            </td>
                            <td>
                                {{ trim(($registro->docente?->user?->nombre ?? '') . ' ' . ($registro->docente?->user?->apellido ?? '')) ?: '—' }}
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
        <p class="ficha-empty mb-0 mt-2" style="font-size:.85rem">
            El perfil de aprendizaje permanente del estudiante no se modifica al cerrar uno personalizado.
        </p>
    </section>
@else
    <p class="ficha-empty">Sin registros en el historial.</p>
@endif
