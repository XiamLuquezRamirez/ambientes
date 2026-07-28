@php
    $esLista = ($vista ?? 'grid') === 'list';
@endphp
<div id="container-grid">
    @include('panel.estudiantes.partials._filtros')
    <div class="py-3 px-1">
        @include('panel.estudiantes.partials._estadisticas')
    </div>
    @if (!$estudiantes->isEmpty())
        <div class="students-grid {{ $esLista ? 'students-grid--list' : '' }}" id="studentsGrid">

            @forelse ($estudiantes as $e)
                @include('panel.estudiantes.partials._card')
            @empty
                <div class="students-empty students-empty--filters">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <h3>Sin resultados</h3>
                    <p>No hay estudiantes que coincidan con los filtros aplicados.</p>
                    <a href="{{ route('panel.estudiantes') }}" class="btn btn-primary link-ambiente">Limpiar filtros</a>
                </div>
            @endforelse

        </div>
    @else
        @include('panel.estudiantes.partials._empty')
    @endif
    {{ $estudiantes->links('panel.estudiantes.partials._paginacion') }}
</div>
