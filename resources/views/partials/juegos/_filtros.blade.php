@php
    $formId = $formId ?? 'formFiltrosJuegos';
    $formAction = $formAction ?? route('superadmin.catalogo.juegos');
    $mostrarVista = $mostrarVista ?? true;
    $compacto = $compacto ?? false;
@endphp

<form class="students-toolbar{{ $compacto ? ' students-toolbar--compact' : '' }}" method="GET"
    action="{{ $formAction }}" id="{{ $formId }}">

    <div class="search-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" name="q" class="js-juego-buscar" placeholder="Buscar por nombre o descripción…"
            autocomplete="off" value="{{ $texto_busqueda ?? '' }}">
    </div>

    <div class="toolbar-actions">
        <select name="ambiente_id" class="toolbar-select js-juego-filtro-ambiente">
            <option value="">Todos los ambientes</option>
            @foreach ($ambientes as $ambiente)
                <option value="{{ $ambiente->id }}" {{ (string) ($filtros['ambiente_id'] ?? '') === (string) $ambiente->id ? 'selected' : '' }}>
                    {{ $ambiente->nombre }}
                </option>
            @endforeach
        </select>

        <select name="modulo_id" class="toolbar-select js-juego-filtro-modulo">
            <option value="">Todos los módulos</option>
            @foreach ($modulos as $modulo)
                <option value="{{ $modulo->id }}" data-ambiente-id="{{ $modulo->ambiente_id }}"
                    {{ (string) ($filtros['modulo_id'] ?? '') === (string) $modulo->id ? 'selected' : '' }}>
                    {{ $modulo->nombre }}
                </option>
            @endforeach
        </select>

        <select name="eje_id" class="toolbar-select js-juego-filtro-eje">
            <option value="">Todos los ejes</option>
            @foreach ($ejes as $eje)
                <option value="{{ $eje->id }}" data-modulo-id="{{ $eje->modulo_id }}"
                    {{ (string) ($filtros['eje_id'] ?? '') === (string) $eje->id ? 'selected' : '' }}>
                    {{ $eje->nombre }}
                </option>
            @endforeach
        </select>

        <select name="tematica_id" class="toolbar-select js-juego-filtro-tematica">
            <option value="">Todas las temáticas</option>
            @foreach ($tematicas as $tematica)
                <option value="{{ $tematica->id }}" data-eje-id="{{ $tematica->eje_id }}"
                    {{ (string) ($filtros['tematica_id'] ?? '') === (string) $tematica->id ? 'selected' : '' }}>
                    {{ $tematica->nombre }}
                </option>
            @endforeach
        </select>

        <select name="tipo" class="toolbar-select js-juego-filtro-tipo">
            <option value="">Todos los tipos</option>
            @foreach ($tiposJuego as $valor => $etiqueta)
                <option value="{{ $valor }}" {{ ($filtros['tipo'] ?? '') === $valor ? 'selected' : '' }}>
                    {{ $etiqueta }}
                </option>
            @endforeach
        </select>

        @if (! ($soloActivos ?? false))
            <select name="estado" class="toolbar-select js-juego-filtro-estado">
                <option value="">Todos los estados</option>
                <option value="1" {{ ($filtros['estado'] ?? '') === '1' ? 'selected' : '' }}>Activos</option>
                <option value="0" {{ ($filtros['estado'] ?? '') === '0' ? 'selected' : '' }}>Inactivos</option>
            </select>
        @else
            <input type="hidden" name="estado" value="1">
        @endif

        @if ($mostrarVista)
            <input type="hidden" name="vista" class="js-juego-vista" value="{{ $vista ?? 'grid' }}">
            <div class="view-toggle" role="group" aria-label="Vista">
                <button type="button" class="view-btn js-juego-view-btn {{ ($vista ?? 'grid') === 'grid' ? 'active' : '' }}"
                    data-vista="grid" title="Vista cuadrícula">
                    <i class="fa-solid fa-grip"></i>
                </button>
                <button type="button" class="view-btn js-juego-view-btn {{ ($vista ?? 'grid') === 'list' ? 'active' : '' }}"
                    data-vista="list" title="Vista lista">
                    <i class="fa-solid fa-list"></i>
                </button>
            </div>
        @endif
    </div>
</form>
