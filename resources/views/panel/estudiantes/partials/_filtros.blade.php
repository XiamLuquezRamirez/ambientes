<form class="students-toolbar" method="GET" action="{{ route('panel.estudiantes') }}" id="formFiltrosEstudiantes">

    <div class="search-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" name="q" id="buscarEstudiante" value="{{ $filtros['q'] ?? '' }}"
            placeholder="Buscar por nombre, documento..." autocomplete="off">
    </div>

    <div class="toolbar-actions">

        <select name="filtro" id="filtroRapido" class="toolbar-select">
            <option value="" {{ empty($filtros['filtro'] ?? '') ? 'selected' : '' }}>
                Todos ({{ $estadisticas['total'] }})
            </option>
            <option value="piar" {{ ($filtros['filtro'] ?? '') === 'piar' ? 'selected' : '' }}>Con PIAR</option>
            <option value="sin_pin" {{ ($filtros['filtro'] ?? '') === 'sin_pin' ? 'selected' : '' }}>Sin PIN</option>
        </select>

        <select name="condicion_id" id="filtroCondicion" class="toolbar-select">
            <option value="">Todas las condiciones</option>
            @foreach ($condiciones as $condicion)
                <option value="{{ $condicion->id }}"
                    {{ (string) ($filtros['condicion_id'] ?? '') === (string) $condicion->id ? 'selected' : '' }}>
                    {{ $condicion->nombre }}
                </option>
            @endforeach
        </select>

        <select name="grado_id" id="filtroGrado" class="toolbar-select">
            <option value="">Todos los grados</option>
            @foreach ($grados as $grado)
                <option value="{{ $grado->id }}"
                    {{ (string) ($filtros['grado_id'] ?? '') === (string) $grado->id ? 'selected' : '' }}>
                    {{ $grado->nombre }}
                </option>
            @endforeach
        </select>

        <select name="estado" id="filtroEstado" class="toolbar-select">
            <option value="">Estados</option>
            <option value="1" {{ ($filtros['estado'] ?? '') === '1' ? 'selected' : '' }}>Activos</option>
            <option value="0" {{ ($filtros['estado'] ?? '') === '0' ? 'selected' : '' }}>Inactivos</option>
        </select>

        <select name="orden" id="filtroOrden" class="toolbar-select">
            <option value="az" {{ ($filtros['orden'] ?? 'az') === 'az' ? 'selected' : '' }}>Ordenar: A-Z</option>
            <option value="za" {{ ($filtros['orden'] ?? '') === 'za' ? 'selected' : '' }}>Ordenar: Z-A</option>
        </select>

        <input type="hidden" name="vista" id="vistaActual" value="{{ $vista ?? 'grid' }}">

        <div class="view-toggle" role="group" aria-label="Vista">
            <button type="button" class="view-btn {{ ($vista ?? 'grid') === 'grid' ? 'active' : '' }}"
                data-vista="grid" title="Vista cuadrícula">
                <i class="fa-solid fa-grip"></i>
            </button>
            <button type="button" class="view-btn {{ ($vista ?? 'grid') === 'list' ? 'active' : '' }}"
                data-vista="list" title="Vista lista">
                <i class="fa-solid fa-list"></i>
            </button>
        </div>

    </div>

</form>
