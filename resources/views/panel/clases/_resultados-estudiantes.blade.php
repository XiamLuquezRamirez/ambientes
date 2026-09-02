<div class="rn-res-grid">
    @foreach ($porEstudiante as $fila)
        @php
            $est = $fila['estudiante'];
            $nombre = trim(($est['nombre'] ?? '') . ' ' . ($est['apellido'] ?? ''));
            $urlDetalle = route('panel.clases.resultados.estudiante', [
                'clase' => $clase->id,
                'estudiante' => $est['id'],
                'experiencia' => $experienciaId,
            ]);
        @endphp
        <article class="rn-res-card {{ $fila['total'] > 0 ? 'rn-res-card--activo' : 'rn-res-card--vacio' }}">
            <div class="rn-res-card__head">
                <div class="rn-res-card__avatar" style="background: {{ $est['color_avatar'] ?? '#2563EB' }}">
                    {{ $est['iniciales'] ?? '??' }}
                </div>
                <div class="rn-res-card__identity">
                    <h3>{{ $nombre !== '' ? $nombre : 'Estudiante #' . $est['id'] }}</h3>
                    <p>
                        @if ($fila['total'] > 0)
                            {{ $fila['total'] }} registro{{ $fila['total'] === 1 ? '' : 's' }}
                        @else
                            Sin registros en esta clase
                        @endif
                    </p>
                </div>
                @if ($fila['total'] > 0)
                    <a href="{{ $urlDetalle }}" class="btn btn-sm btn-outline-primary rn-res-card__link">
                        Ver detalle
                    </a>
                @endif
            </div>

            @if ($fila['total'] > 0)
                <div class="rn-res-card__stats">
                    @if ($fila['correctos'] > 0)
                        <span class="badge badge-green">{{ $fila['correctos'] }} correctas</span>
                    @endif
                    @if ($fila['incorrectos'] > 0)
                        <span class="badge badge-yellow">{{ $fila['incorrectos'] }} incorrectas</span>
                    @endif
                    @if ($fila['con_archivo'] > 0)
                        <span class="badge badge-gray">{{ $fila['con_archivo'] }} con archivo</span>
                    @endif
                </div>

                <ul class="rn-res-card__lista">
                    @foreach ($fila['resultados']->take(4) as $resultado)
                        <li>
                            <span class="rn-res-card__bloque">
                                {{ $panelService->etiquetaTipoBloque($resultado->tipo_bloque, $resultado->bloque->datos ?? []) }}
                            </span>
                            <span class="rn-res-card__resumen">{{ $resumenes[$resultado->id] ?? '—' }}</span>
                        </li>
                    @endforeach
                    @if ($fila['total'] > 4)
                        <li class="rn-res-card__mas">
                            + {{ $fila['total'] - 4 }} más en el detalle
                        </li>
                    @endif
                </ul>
            @endif
        </article>
    @endforeach
</div>
