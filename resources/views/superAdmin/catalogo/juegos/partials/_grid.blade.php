@php
    $esLista = ($vista ?? 'grid') === 'list';
    $hayFiltros = filled($filtros['q'] ?? null)
        || filled($filtros['ambiente_id'] ?? null)
        || filled($filtros['modulo_id'] ?? null)
        || filled($filtros['eje_id'] ?? null)
        || filled($filtros['tematica_id'] ?? null)
        || filled($filtros['tipo'] ?? null)
        || ($filtros['estado'] ?? '') !== '';
@endphp

@include('partials.juegos._filtros', [
    'filtros' => $filtros,
    'texto_busqueda' => $texto_busqueda,
    'vista' => $vista,
    'mostrarVista' => true,
    'ambientes' => $ambientes,
    'modulos' => $modulos,
    'ejes' => $ejes,
    'tematicas' => $tematicas,
    'tiposJuego' => $tiposJuego,
    'formId' => 'formFiltrosJuegos',
])

<div class="py-3 px-1">
    @include('superAdmin.catalogo.juegos.partials._estadisticas')
</div>

@if ($juegos->total() > 0)
    <div class="students-grid {{ $esLista ? 'students-grid--list' : '' }}" id="juegosGrid">
        @foreach ($juegos as $juego)
            @include('superAdmin.catalogo.juegos.partials._card', [
                'juego' => $juego,
                'tiposJuego' => $tiposJuego,
            ])
        @endforeach
    </div>
@elseif (! $hayFiltros)
    @include('superAdmin.catalogo.juegos.partials._empty')
@else
    <div class="students-empty students-empty--filters">
        <i class="fa-solid fa-magnifying-glass"></i>
        <h3>Sin resultados</h3>
        <p>No hay juegos que coincidan con los filtros aplicados.</p>
        <a href="{{ route('superadmin.catalogo.juegos') }}" class="btn btn-primary">Limpiar filtros</a>
    </div>
@endif

{{ $juegos->links('panel.estudiantes.partials._paginacion') }}
