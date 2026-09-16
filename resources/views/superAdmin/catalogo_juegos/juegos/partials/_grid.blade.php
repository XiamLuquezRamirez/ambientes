@php
    $esLista = ($vista ?? 'grid') === 'list';
    $hayFiltros =
        filled($filtros['q'] ?? null) ||
        filled($filtros['ambiente_id'] ?? null) ||
        filled($filtros['modulo_id'] ?? null) ||
        filled($filtros['eje_id'] ?? null) ||
        filled($filtros['tematica_id'] ?? null) ||
        ($filtros['estado'] ?? '') !== '';
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
    'formId' => 'formFiltrosJuegos',
])

<div class="py-3 px-1">
    @include('superAdmin.catalogo_juegos.juegos.partials._estadisticas')
</div>

@if ($juegos->total() > 0)
    <div class="students-grid {{ $esLista ? 'students-grid--list' : '' }}" id="juegosGrid">
        @foreach ($juegos as $juego)
            @include('superAdmin.catalogo_juegos.juegos.partials._card', [
                'juego' => $juego,
            ])
        @endforeach
    </div>
@elseif (!$hayFiltros)
    @include('superAdmin.catalogo_juegos.juegos.partials._empty')
@else
    <div class="students-empty students-empty--filters">
        <i class="fa-solid fa-magnifying-glass"></i>
        <h3>Sin resultados</h3>
        <p>No hay juegos que coincidan con los filtros aplicados.</p>
        <a href="{{ route('superadmin.catalogo_juegos.index') }}" class="btn btn-primary">Limpiar filtros</a>
    </div>
@endif

{{ $juegos->links('panel.estudiantes.partials._paginacion') }}
