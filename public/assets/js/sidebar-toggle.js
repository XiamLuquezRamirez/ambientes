(function () {
    'use strict';

    const MOBILE_BP = 992;
    const HOVER_CLOSE_DELAY_MS = 280;
    const EXPAND_DELAY_MS = 300;
    const STORAGE_KEY_PINNED = 'pednia.sidebar.pinned';
    const root = document.documentElement;

    const toggle = document.getElementById('sidebarToggle');
    const backdrop = document.getElementById('sidebarBackdrop');
    const sidebar = document.querySelector('.sidebar');

    if (!sidebar) {
        root.classList.add('sidebar-ready');
        return;
    }

    if (!sidebar.id) {
        sidebar.id = 'sidebarNav';
    }

    let hoverCloseTimer = null;

    function isMobile() {
        return window.innerWidth < MOBILE_BP;
    }

    function isCollapsed() {
        return root.classList.contains('sidebar-collapsed');
    }

    function isHoverExpanded() {
        return root.classList.contains('sidebar-hover');
    }

    function isPinned() {
        return root.classList.contains('sidebar-pinned');
    }

    function isDesktopExpanded() {
        return isHoverExpanded() || isPinned();
    }

    function isMiniMode() {
        return isCollapsed() && !root.classList.contains('sidebar-mobile-open') && !isDesktopExpanded();
    }

    function syncToggleAria() {
        if (!toggle) return;
        const open = isMobile()
            ? root.classList.contains('sidebar-mobile-open')
            : isDesktopExpanded();
        toggle.setAttribute('aria-expanded', String(open));
    }

    function linkLabel(link) {
        const labelledSpan = link.querySelector('span:not(.chevron)');
        if (labelledSpan) {
            return labelledSpan.textContent.trim();
        }

        return Array.from(link.childNodes)
            .filter(function (node) {
                return node.nodeType === Node.TEXT_NODE;
            })
            .map(function (node) {
                return node.textContent.trim();
            })
            .filter(Boolean)
            .join(' ');
    }

    function syncNavTitles() {
        sidebar.querySelectorAll('.nav a, .nav button.nav-link').forEach(function (link) {
            if (isMiniMode()) {
                if (!link.dataset.sidebarTitle) {
                    const label = linkLabel(link);
                    if (label) {
                        link.dataset.sidebarTitle = label;
                    }
                }
                if (link.dataset.sidebarTitle) {
                    link.setAttribute('title', link.dataset.sidebarTitle);
                }
            } else {
                link.removeAttribute('title');
            }
        });
    }

    function savePersistedState() {
        try {
            if (!isMobile()) {
                localStorage.setItem(STORAGE_KEY_PINNED, isPinned() ? '1' : '0');
            }
        } catch (e) {}
    }

    function restoreDesktopPinnedState() {
        try {
            if (localStorage.getItem(STORAGE_KEY_PINNED) === '1') {
                root.classList.add('sidebar-pinned', 'sidebar-hover');
            }
        } catch (e) {}
    }

    function loadPersistedState() {
        root.classList.add('sidebar-collapsed');
        root.classList.remove('sidebar-mobile-open', 'sidebar-hover', 'sidebar-pinned');

        if (!isMobile()) {
            restoreDesktopPinnedState();
        }

        syncToggleAria();
        if (backdrop) {
            backdrop.setAttribute('aria-hidden', 'true');
        }
        syncNavTitles();
    }

    function applyMobileState(open) {
        root.classList.add('sidebar-collapsed');
        root.classList.toggle('sidebar-mobile-open', !!open);
        root.classList.remove('sidebar-hover', 'sidebar-pinned');
        syncToggleAria();
        if (backdrop) {
            backdrop.setAttribute('aria-hidden', String(!open));
        }
        syncNavTitles();
    }

    function setHoverExpanded(expanded) {
        if (isMobile()) {
            return;
        }
        root.classList.toggle('sidebar-hover', !!expanded);
        syncToggleAria();
        syncNavTitles();
    }

    function setPinned(pinned) {
        if (isMobile()) {
            return;
        }
        root.classList.toggle('sidebar-pinned', !!pinned);
        if (pinned) {
            root.classList.add('sidebar-hover');
        } else {
            root.classList.remove('sidebar-hover');
        }
        syncToggleAria();
        syncNavTitles();
        savePersistedState();
    }

    function clearHoverCloseTimer() {
        if (hoverCloseTimer) {
            clearTimeout(hoverCloseTimer);
            hoverCloseTimer = null;
        }
    }

    function scheduleHoverClose() {
        if (isPinned()) {
            return;
        }
        clearHoverCloseTimer();
        hoverCloseTimer = window.setTimeout(function () {
            if (!sidebar.contains(document.activeElement) && !isPinned()) {
                setHoverExpanded(false);
            }
        }, HOVER_CLOSE_DELAY_MS);
    }

    function closeMobileSidebar() {
        applyMobileState(false);
    }

    function toggleMobileSidebar() {
        applyMobileState(!root.classList.contains('sidebar-mobile-open'));
    }

    function toggleDesktopSidebar() {
        setPinned(!isPinned());
    }

    function expandSidebarAndOpenSubmenu(trigger) {
        const targetSelector = trigger.getAttribute('href');

        if (isPinned()) {
            root.classList.add('sidebar-hover');
        } else {
            setHoverExpanded(true);
        }

        if (!targetSelector) {
            return;
        }

        window.setTimeout(function () {
            const target = document.querySelector(targetSelector);
            if (!target || target.classList.contains('show')) {
                return;
            }
            if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
                bootstrap.Collapse.getOrCreateInstance(target, { toggle: false }).show();
            }
        }, EXPAND_DELAY_MS);
    }

    loadPersistedState();

    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            root.classList.add('sidebar-ready');
        });
    });

    /* Desktop: abrir al hover / foco; cerrar al salir (salvo si está fijado) */
    sidebar.addEventListener('mouseenter', function () {
        if (isMobile()) return;
        clearHoverCloseTimer();
        setHoverExpanded(true);
    });

    sidebar.addEventListener('mouseleave', function () {
        if (isMobile()) return;
        scheduleHoverClose();
    });

    sidebar.addEventListener('focusin', function () {
        if (isMobile()) return;
        clearHoverCloseTimer();
        setHoverExpanded(true);
    });

    sidebar.addEventListener('focusout', function (e) {
        if (isMobile()) return;
        if (e.relatedTarget && sidebar.contains(e.relatedTarget)) {
            return;
        }
        scheduleHoverClose();
    });

    /* Hamburguesa: móvil = drawer; escritorio = fijar / soltar menú */
    if (toggle) {
        toggle.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (isMobile()) {
                toggleMobileSidebar();
                return;
            }
            toggleDesktopSidebar();
        });
    }

    if (backdrop) {
        backdrop.addEventListener('click', closeMobileSidebar);
    }

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (isMobile() && root.classList.contains('sidebar-mobile-open')) {
            closeMobileSidebar();
            return;
        }
        if (isPinned()) {
            setPinned(false);
            return;
        }
        if (isHoverExpanded()) {
            setHoverExpanded(false);
        }
    });

    let resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            root.classList.add('sidebar-collapsed');
            root.classList.remove('sidebar-hover', 'sidebar-pinned', 'sidebar-mobile-open');

            if (isMobile()) {
                applyMobileState(false);
            } else {
                restoreDesktopPinnedState();
                syncToggleAria();
                if (backdrop) backdrop.setAttribute('aria-hidden', 'true');
                syncNavTitles();
            }
        }, 120);
    });

    sidebar.querySelectorAll('[data-bs-toggle="collapse"]').forEach(function (trigger) {
        trigger.addEventListener('click', function (e) {
            if (isMobile()) {
                return;
            }
            if (!isMiniMode()) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            expandSidebarAndOpenSubmenu(trigger);
        });
    });

    sidebar.querySelectorAll('a.nav-link:not([data-bs-toggle])').forEach(function (link) {
        link.addEventListener('click', function () {
            if (isMobile() && root.classList.contains('sidebar-mobile-open')) {
                closeMobileSidebar();
            }
        });
    });
})();
