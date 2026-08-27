{{-- Requiere: $grados --}}
<div class="tematicas-filtros">
    <select id="filtroAmbiente" class="form-control" title="Ambiente">
        <option value="">Todos los ambientes</option>
    </select>

    <select id="filtroModulo" class="form-control" disabled title="Módulo">
        <option value="">Todos los módulos</option>
    </select>

    <select id="filtroEje" class="form-control" disabled title="Eje">
        <option value="">Todos los ejes</option>
    </select>

    <select id="filtroEstado" class="form-control" title="Estado">
        <option value="">Todos los estados</option>
        <option value="borrador">Borrador</option>
        <option value="activa">Activa</option>
        <option value="archivada">Archivada</option>
    </select>

    <select id="filtroGrado" class="form-control" title="Grado de experiencias">
        <option value="">Todos los grados</option>
        @foreach ($grados as $grado)
            <option value="{{ $grado->id }}">{{ $grado->nombre }}</option>
        @endforeach
    </select>

    <label class="tematicas-filtro-check" for="filtroSinDba" title="Sin DBA asignado">
        <input type="checkbox" id="filtroSinDba">
        <span>Sin DBA</span>
    </label>

    <button type="button" id="btnLimpiarFiltrosTematicas" class="btn btn-sm btn-limpiar-filtros" hidden>
        <i class="fas fa-broom"></i> Limpiar
    </button>
</div>
