<script>
    (function () {
        try {
            var collapsed = window.innerWidth < 992
                || localStorage.getItem('pednia-sidebar') === 'collapsed';
            if (collapsed) {
                document.documentElement.classList.add('sidebar-collapsed');
            }
        } catch (e) {}
    })();
</script>
