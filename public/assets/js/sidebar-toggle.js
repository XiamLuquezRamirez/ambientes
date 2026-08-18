(function () {
    'use strict';

    const STORAGE_KEY = 'pednia-sidebar';
    const MOBILE_BP = 992;
    const EXPAND_DELAY_MS = 300;
    const root = document.documentElement;

    const toggle = document.getElementById('sidebarToggle');
    const backdrop = document.getElementById('sidebarBackdrop');
    const sidebar = document.querySelector('.sidebar');

    if (!toggle || !sidebar) {
        root.classList.add('sidebar-ready');
        return;
    }

    if (!sidebar.id) {
        sidebar.id = 'sidebarNav';
    }

    function isMobile() {
        return window.innerWidth < MOBILE_BP;
    }

    function isCollapsed() {
        return root.classList.contains('sidebar-collapsed');
    }

    function isMiniMode() {
        return isCollapsed() && !root.classList.contains('sidebar-mobile-open');
    }

    function readStoredPreference() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (_err) {
            return null;
        }
    }

    function savePreference(collapsed) {
        if (isMobile()) {
            return;
        }
        try {
            localStorage.setItem(STORAGE_KEY, collapsed ? 'collapsed' : 'expanded');
        } catch (_err) {
            /* sin persistencia */
        }
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

    function applyState(collapsed) {
        root.classList.toggle('sidebar-collapsed', collapsed);
        root.classList.toggle('sidebar-mobile-open', !collapsed && isMobile());
        toggle.setAttribute('aria-expanded', String(!collapsed));
        if (backdrop) {
            backdrop.setAttribute('aria-hidden', String(collapsed || !isMobile()));
        }
        syncNavTitles();
    }

    function resolveInitialState() {
        if (isMobile()) {
            return true;
        }
        return readStoredPreference() === 'collapsed';
    }

    function toggleSidebar() {
        applyState(!isCollapsed());
        savePreference(isCollapsed());
    }

    function closeSidebar() {
        if (!isCollapsed()) {
            applyState(true);
            savePreference(true);
        }
    }

    function expandSidebarAndOpenSubmenu(trigger) {
        const targetSelector = trigger.getAttribute('href');

        applyState(false);
        savePreference(false);

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

    applyState(resolveInitialState());
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            root.classList.add('sidebar-ready');
        });
    });

    toggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
    });

    if (backdrop) {
        backdrop.addEventListener('click', closeSidebar);
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && (!isCollapsed() || root.classList.contains('sidebar-mobile-open'))) {
            closeSidebar();
        }
    });

    let resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            if (isMobile()) {
                applyState(true);
            } else {
                applyState(readStoredPreference() === 'collapsed');
            }
        }, 120);
    });

    sidebar.querySelectorAll('[data-bs-toggle="collapse"]').forEach(function (trigger) {
        trigger.addEventListener('click', function (e) {
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
                closeSidebar();
            }
        });
    });
})();
