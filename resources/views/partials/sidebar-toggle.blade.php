@if (($only ?? 'all') === 'backdrop' || ($only ?? 'all') === 'all')
    <div class="sidebar-backdrop" id="sidebarBackdrop" aria-hidden="true"></div>
@endif

@if (($only ?? 'all') === 'button' || ($only ?? 'all') === 'all')
    <button type="button" class="sidebar-toggle-btn" id="sidebarToggle" aria-label="Alternar menú lateral"
        aria-expanded="true" aria-controls="sidebarNav">
        <i class="fa-solid fa-angles-right sidebar-toggle-icon-open" aria-hidden="true"></i>
        <i class="fa-solid fa-angles-left sidebar-toggle-icon-close" aria-hidden="true"></i>
    </button>
@endif
