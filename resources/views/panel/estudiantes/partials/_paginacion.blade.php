@if ($estudiantes->hasPages() || $estudiantes->total() > 0)
    <div class="students-footer">
        <div class="students-pagination">
            @if ($estudiantes->onFirstPage())
                <span class="page-nav page-nav--disabled">
                    <i class="fa-solid fa-chevron-left"></i>
                </span>
            @else
                <a href="{{ $estudiantes->previousPageUrl() }}" class="page-nav" aria-label="Anterior">
                    <i class="fa-solid fa-chevron-left"></i>
                </a>
            @endif

            @foreach ($estudiantes->getUrlRange(1, $estudiantes->lastPage()) as $page => $url)
                @if ($page == $estudiantes->currentPage())
                    <span class="page-num page-num--active">{{ $page }}</span>
                @else
                    <a href="{{ $url }}" class="page-num">{{ $page }}</a>
                @endif
            @endforeach

            @if ($estudiantes->hasMorePages())
                <a href="{{ $estudiantes->nextPageUrl() }}" class="page-nav" aria-label="Siguiente">
                    <i class="fa-solid fa-chevron-right"></i>
                </a>
            @else
                <span class="page-nav page-nav--disabled">
                    <i class="fa-solid fa-chevron-right"></i>
                </span>
            @endif
        </div>

        <p class="students-count">
            Mostrando {{ $estudiantes->firstItem() ?? 0 }} a {{ $estudiantes->lastItem() ?? 0 }} de {{ $estudiantes->total() }}
        </p>
    </div>
@endif
