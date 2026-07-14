@php
    $esLista = ($vista ?? 'grid') === 'list';
@endphp

<div class="container-grid" id="container-grid">
    <div class="students-grid {{ $esLista ? 'students-grid--list' : '' }}" id="studentsGrid">

        @foreach ($estudiantes as $e)
            @include('panel.estudiantes.partials._card')
        @endforeach

    </div>
</div>