<script>
    (function () {
        try {
            var root = document.documentElement;
            var pinned = localStorage.getItem('pednia.sidebar.pinned') === '1';
            var mobile = window.innerWidth < 992;

            root.classList.add('sidebar-collapsed');

            if (pinned && !mobile) {
                root.classList.add('sidebar-pinned', 'sidebar-hover');
            }
        } catch (e) {}
    })();
</script>
