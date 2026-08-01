@if ($items->isEmpty())
    <div class="cfg-empty">
        <i class="fa-solid fa-layer-group" style="font-size:1.6rem;opacity:.4"></i>
        <p class="mt-2 mb-0">No hay condiciones para mostrar con estos filtros.</p>
    </div>
@else
    <div class="cfg-lista" id="listaCondicionesOrden">
        @foreach ($items as $item)
            @php
                $c = $item->condicion;
                $color = $c?->color_hex ?: '#64748B';
                $conteo = $conteos[$item->id_condicion] ?? ['total' => 0, 'activos' => 0];
            @endphp
            <article class="cfg-card {{ $item->activa ? '' : 'is-inactive' }}" data-id="{{ $item->id }}">
                <div class="cfg-drag" title="Arrastrar para reordenar">
                    <i class="fa-solid fa-grip-vertical"></i>
                </div>
                <div>
                    <div class="cfg-meta">
                        <span class="badge"
                            style="background:{{ $color }}22;color:{{ $color }};border:1px solid {{ $color }}55">
                            {{ $c?->codigo ?? '—' }}
                        </span>
                        <span class="badge badge-estado-local {{ $item->activa ? 'badge-green' : 'badge-gray' }}">
                            {{ $item->activa ? 'Activa' : 'Desactivada' }}
                        </span>
                        @if ($c?->es_sistema)
                            <span class="badge badge-orange">Sistema</span>
                        @else
                            <span class="badge badge-gray">Adicional</span>
                        @endif
                        <span class="badge badge-blue" title="Estudiantes de la institución">
                            <i class="fa-solid fa-user-graduate"></i>
                            {{ $conteo['activos'] }} activos / {{ $conteo['total'] }} total
                        </span>
                    </div>
                    <h3 class="cfg-titulo">{{ $c?->nombre ?? 'Condición no disponible' }}</h3>
                </div>
                <div class="cfg-acciones">
                    <div class="form-check form-switch mb-0">
                        <input class="form-check-input toggle-activa-condicion-orden" type="checkbox"
                            role="switch" style="cursor:pointer"
                            data-id="{{ $item->id }}"
                            @checked($item->activa)
                            title="{{ $item->activa ? 'Desactivar en la institución' : 'Activar en la institución' }}">
                    </div>
                    <small class="text-muted">Visible docentes</small>
                </div>
            </article>
        @endforeach
    </div>
@endif
