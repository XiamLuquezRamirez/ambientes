@php
    $usuarioId = $usuarioId ?? auth('docente')->id();
@endphp

@if ($items->isEmpty())
    <div class="cfg-empty">
        <i class="fa-solid fa-list-check" style="font-size:1.6rem;opacity:.4"></i>
        <p class="mt-2 mb-0">No hay opciones transitorias para mostrar con estos filtros.</p>
    </div>
@else
    <div class="cfg-lista cfg-lista--panel" id="listaTransitoriasPanel">
        @foreach ($items as $item)
            @php
                $t = $item->condicionTransitoria;
                $base = $t?->condicionBase;
                $color = $base?->color_hex ?: '#64748B';
                $conteo = $conteos[$item->id_condicion_transitoria] ?? ['total' => 0, 'activos' => 0];
                $esPropia = $t && $t->esDelUsuario($usuarioId);
                $creadaPorDocente = $t?->creadaPorDocente() ?? false;
                $autorNombre = $t?->creador
                    ? trim(($t->creador->nombre ?? '') . ' ' . ($t->creador->apellido ?? ''))
                    : null;
                if ($t?->es_sistema) {
                    $autorLabel = 'Sistema';
                } elseif ($creadaPorDocente && $autorNombre) {
                    $autorLabel = $autorNombre;
                } elseif ($autorNombre) {
                    $autorLabel = $autorNombre;
                } else {
                    $autorLabel = 'Institución';
                }
            @endphp
            <article class="cfg-card cfg-card--panel {{ $item->activa ? '' : 'is-inactive' }} {{ $esPropia ? 'cfg-card--propia' : '' }}"
                data-id="{{ $item->id }}"
                data-transitoria-id="{{ $t?->id }}">
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
                        <span class="badge badge-gray" title="Creada por">
                            <i class="fa-solid fa-user"></i>
                            {{ $autorLabel }}
                        </span>
                        @if ($t?->es_sistema)
                            <span class="badge badge-orange">Sistema</span>
                        @elseif ($esPropia)
                            <span class="badge badge-blue">Creada por mí</span>
                        @endif
                        <span class="badge badge-blue badge-estudiantes-transitoria {{ $conteo['activos'] > 0 ? 'badge-estudiantes-transitoria--click' : '' }}"
                            title="{{ $conteo['activos'] > 0 ? 'Ver estudiantes asociados' : 'Sin estudiantes activos' }}"
                            data-transitoria-id="{{ $t?->id }}"
                            data-etiqueta="{{ $t?->etiqueta ?? '' }}"
                            @if ($conteo['activos'] > 0) role="button" tabindex="0" @endif>
                            <i class="fa-solid fa-user-graduate"></i>
                            {{ $conteo['activos'] }} estudiante{{ $conteo['activos'] === 1 ? '' : 's' }} activo{{ $conteo['activos'] === 1 ? '' : 's' }}
                        </span>
                    </div>
                    <h3 class="cfg-titulo">{{ $t?->etiqueta ?? 'Opción no disponible' }}</h3>
                    @if ($t?->descripcion_interna)
                        <p class="cfg-desc text-muted mb-0">{{ \Illuminate\Support\Str::limit($t->descripcion_interna, 120) }}</p>
                    @endif
                </div>
                <div class="cfg-acciones">
                    <div class="cfg-acciones-fila">
                        @if ($esPropia)
                            <div class="form-check form-switch mb-0" title="{{ $item->activa ? 'Desactivar' : 'Activar' }}">
                                <input class="form-check-input toggle-activa-transitoria-panel" type="checkbox"
                                    role="switch"
                                    data-id="{{ $item->id }}"
                                    data-nombre="{{ e($t->etiqueta) }}"
                                    @checked($item->activa)
                                    title="{{ $item->activa ? 'Desactivar condición' : 'Activar condición' }}">
                            </div>
                            <button type="button" class="btn-cfg btn-cfg-editar btn-editar-transitoria-panel"
                                data-id="{{ $t->id }}" title="Editar">
                                <i class="fa-solid fa-pencil"></i>
                                Editar
                            </button>
                            <button type="button" class="btn-cfg btn-cfg-eliminar btn-eliminar-transitoria-panel"
                                data-id="{{ $t->id }}"
                                data-orden-id="{{ $item->id }}"
                                data-nombre="{{ e($t->etiqueta) }}"
                                data-estudiantes="{{ $conteo['activos'] }}"
                                data-activa="{{ $item->activa ? '1' : '0' }}"
                                title="Eliminar">
                                <i class="fa-solid fa-trash-can"></i>
                                Eliminar
                            </button>
                        @else
                            <span class="text-muted" style="font-size:.82rem">Solo lectura</span>
                        @endif
                    </div>
                    @if ($esPropia)
                        <small class="text-muted">{{ $item->activa ? 'Activa' : 'Desactivada' }}</small>
                    @endif
                </div>
            </article>
        @endforeach
    </div>
@endif
