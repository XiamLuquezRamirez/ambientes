@php
    // Contador para el aviso superior: grupos con alumnos pero sin ningún docente.
    $gruposSinDocente = $grupos->filter(function ($grupo) use ($anio) {
        $sinDocente = $grupo->cargasDocente->pluck('docente')->filter()->isEmpty();
        return $grupo->totalMatriculas($anio) > 0 && $sinDocente;
    });
@endphp

@if ($gruposSinDocente->isNotEmpty())
    <div class="alerta-cobertura" id="alerta-cobertura-grupos">
        <i class="fas fa-triangle-exclamation"></i>
        {{ $gruposSinDocente->count() }} grupo(s) con estudiantes matriculados sin docente asignado.
    </div>
@endif

@if ($grupos->isEmpty())
    <div style="text-align:center;padding:40px;color:#94A3B8">
        <i class="fas fa-layer-group" style="font-size:2.5rem;opacity:.35;display:block;margin-bottom:12px"></i>
        Sin grupos para los filtros seleccionados.
    </div>
@else
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Ambiente</th>
                    <th>Grado</th>
                    <th>Grupo</th>
                    <th>Docente asignado</th>
                    <th>Estudiantes</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($grupos as $grupo)
                    @php
                        $cargasAsignadas = $grupo->cargasDocente->filter(fn($c) => $c->docente);
                        $tieneAlumnos = $grupo->totalMatriculas($anio) > 0;
                        $sinDocentes = $cargasAsignadas->isEmpty();
                        $claseFila = $tieneAlumnos && $sinDocentes ? 'fila-grupo-sin-docente' : '';
                        $estudiantes = $grupo->totalMatriculas($anio);
                    @endphp
                    @if ($cargasAsignadas->isEmpty())
                        <tr class="{{ $claseFila }}" data-grupo-id="{{ $grupo->id }}"
                            id="fila-grupo-{{ $grupo->id }}" {{-- se muestra un tooltip con el mensaje de grupo con estudiantes matriculados sin docente asignado --}}
                            @if ($tieneAlumnos && $sinDocentes) title="Grupo con estudiantes matriculados sin docente asignado" @endif>
                            <td><span class="text-muted">—</span></td>
                            <td>{{ $grupo->grado->nombre }}</td>
                            <td>{{ $grupo->nombre }}</td>
                            <td class="celda-docentes-grupo">
                                <span class="text-muted">Sin docentes asignados</span>
                            </td>
                            <td class="celda-estudiantes-grupo">{{ $estudiantes }}</td>
                        </tr>
                    @else
                        @foreach ($cargasAsignadas as $index => $carga)
                            <tr class="{{ $claseFila }}" data-grupo-id="{{ $grupo->id }}"
                                @if ($index === 0) id="fila-grupo-{{ $grupo->id }}" @endif
                                @if ($tieneAlumnos && $sinDocentes) title="Grupo con estudiantes matriculados sin docente asignado" @endif>
                                <td>{{ $carga->ambiente?->nombre ?? '—' }}</td>
                                <td>{{ $grupo->grado->nombre }}</td>
                                <td>{{ $grupo->nombre }}</td>
                                <td class="celda-docentes-grupo">
                                    {{ trim($carga->docente->user->nombre . ' ' . $carga->docente->user->apellido) }}
                                </td>
                                <td class="celda-estudiantes-grupo">{{ $estudiantes }}</td>
                            </tr>
                        @endforeach
                    @endif
                @endforeach
            </tbody>
        </table>
    </div>
@endif
