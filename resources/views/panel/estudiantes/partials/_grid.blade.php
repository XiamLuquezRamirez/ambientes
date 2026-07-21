@php
    $esLista = ($vista ?? 'grid') === 'list';
@endphp

<div class="container-grid" id="container-grid">
    <div class="py-3 px-1">
        @include('panel.estudiantes.partials._estadisticas')
    </div>
    <div class="students-grid {{ $esLista ? 'students-grid--list' : '' }}" id="studentsGrid">

        @forelse ($estudiantes as $e)
            @include('panel.estudiantes.partials._card')
        @empty
            <div class="students-empty students-empty--filters" style="grid-column: span 4;">
                <i class="fa-solid fa-magnifying-glass"></i>
                <h3>Sin resultados</h3>
                <p>No hay estudiantes que coincidan con los filtros aplicados.</p>
                <a href="{{ route('panel.estudiantes', ['ambiente' => '__ID__']) }}" class="btn btn-primary link-ambiente">Limpiar filtros</a>
            </div>
        @endforelse

    </div>
    {{ $estudiantes->links('panel.estudiantes.partials._paginacion') }}
</div>