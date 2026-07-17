@if ($paginator->hasPages())
<div class="paginacion-wrapper">
    <span class="paginacion-info">
        Mostrando {{ $paginator->firstItem() }}–{{ $paginator->lastItem() }} de {{ $paginator->total() }} registros
    </span>

    <div class="paginacion-controles">
        {{-- Anterior --}}
        @if ($paginator->onFirstPage())
            <span class="pag-btn pag-btn-disabled">&#8592; Anterior</span>
        @else
            <a href="{{ $paginator->previousPageUrl() }}" class="pag-btn">&#8592; Anterior</a>
        @endif

        {{-- Páginas --}}
        @foreach ($elements as $element)
            @if (is_string($element))
                <span class="pag-btn pag-btn-disabled">{{ $element }}</span>
            @endif
            @if (is_array($element))
                @foreach ($element as $page => $url)
                    @if ($page == $paginator->currentPage())
                        <span class="pag-btn pag-btn-activo">{{ $page }}</span>
                    @else
                        <a href="{{ $url }}" class="pag-btn">{{ $page }}</a>
                    @endif
                @endforeach
            @endif
        @endforeach

        {{-- Siguiente --}}
        @if ($paginator->hasMorePages())
            <a href="{{ $paginator->nextPageUrl() }}" class="pag-btn">Siguiente &#8594;</a>
        @else
            <span class="pag-btn pag-btn-disabled">Siguiente &#8594;</span>
        @endif
    </div>
</div>
@endif
