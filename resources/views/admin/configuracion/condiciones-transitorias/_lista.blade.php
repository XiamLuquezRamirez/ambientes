@if ($items->isEmpty())
    <div class="cfg-empty">
        <i class="fa-solid fa-list-check" style="font-size:1.6rem;opacity:.4"></i>
        <p class="mt-2 mb-0">No hay opciones transitorias para mostrar con estos filtros.</p>
    </div>
@else
    <div class="cfg-lista lista-transitorias-orden" id="listaTransitoriasOrden">
        @foreach ($items as $item)
            @php
                $t = $item->condicionTransitoria;
                $base = $t?->condicionBase;
                $color = $base?->color_hex ?: '#64748B';
                $conteo = $conteos[$item->id_condicion_transitoria] ?? ['total' => 0, 'activos' => 0];
                $puedeGestionar = $t && ! $t->es_sistema && (int) $t->id_institucion === (int) session('institucion_id');
            @endphp
            <article class="cfg-card {{ $item->activa ? '' : 'is-inactive' }}"
                data-id="{{ $item->id }}"
                data-transitoria-id="{{ $t?->id }}">
                <div class="cfg-drag" title="Arrastrar para reordenar">
                    <i class="fa-solid fa-grip-vertical"></i>
                </div>
                <div>
                    <div class="cfg-meta">
                        <span class="badge"
                            style="background:{{ $color }}22;color:{{ $color }};border:1px solid {{ $color }}55">
                            {{ $t?->codigo ?? '—' }}
                        </span>
                        @if ($base)
                            <span class="badge"
                                style="background:{{ $color }}22;color:{{ $color }};border:1px solid {{ $color }}55"
                                title="Condición base / padre">
                                <i class="fa-solid fa-link"></i>
                                {{ $base->codigo }} — {{ $base->nombre }}
                            </span>
                        @else
                            <span class="badge badge-gray">Sin condición base</span>
                        @endif
                        <span class="badge badge-estado-local {{ $item->activa ? 'badge-green' : 'badge-gray' }}">
                            {{ $item->activa ? 'Activa' : 'Desactivada' }}
                        </span>
                        @if ($t?->es_sistema)
                            <span class="badge badge-orange">Sistema</span>
                        @else
                            <span class="badge badge-gray">Adicional</span>
                        @endif
                        <span class="badge badge-blue" title="Estudiantes de la institución">
                            <i class="fa-solid fa-user-graduate"></i>
                            {{ $conteo['activos'] }} activos / {{ $conteo['total'] }} total
                        </span>
                    </div>
                    <h3 class="cfg-titulo">{{ $t?->etiqueta ?? 'Opción no disponible' }}</h3>
                </div>
                <div class="cfg-acciones">
                    <div class="form-check form-switch mb-0">
                        <input class="form-check-input toggle-activa-transitoria-orden" type="checkbox"
                            role="switch" style="cursor:pointer"
                            data-id="{{ $item->id }}"
                            @checked($item->activa)
                            title="{{ $item->activa ? 'Desactivar en la institución' : 'Activar en la institución' }}">
                    </div>
                    <small class="text-muted">Visible docentes</small>
                    @if ($puedeGestionar)
                        <div class="cfg-btns-crud">
                            <button type="button" class="btn btn-sm btn-outline-primary btn-editar-transitoria"
                                data-id="{{ $t->id }}" title="Editar">
                                <i class="fa-solid fa-pencil"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-transitoria"
                                data-id="{{ $t->id }}"
                                data-nombre="{{ e($t->etiqueta) }}"
                                data-estudiantes="{{ $conteo['total'] }}"
                                title="Eliminar">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    @endif
                </div>
            </article>
        @endforeach
    </div>
@endif
