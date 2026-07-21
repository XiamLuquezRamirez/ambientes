(function () {
    const form = document.getElementById('formFiltrosEstudiantes');
    if (!form) return;

    const buscaInput = document.getElementById('buscarEstudiante');
    const vistaInput = document.getElementById('vistaActual');
    const grid = document.getElementById('studentsGrid');
    let debounceTimer = null;

    form.querySelectorAll('select').forEach((select) => {
        select.addEventListener('change', () => {
            aplicarFiltrosEstudiantes();
        });
    });

    if (buscaInput) {
        buscaInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                aplicarFiltrosEstudiantes();
            }, 400);
        });

        buscaInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(debounceTimer);
                aplicarFiltrosEstudiantes();
            }
        });
    }

    function aplicarFiltrosEstudiantes() {
        var action = $('#formFiltrosEstudiantes').attr('action');
        const params = new URLSearchParams(new FormData($('#formFiltrosEstudiantes')[0]));
        for (const [k, v] of [...params.entries()]) {
            if (!v) params.delete(k);
        }
        const url = params.toString() ? `${action}?${params.toString()}` : action;
        cargarTabla(url);
    }

    document.querySelectorAll('.view-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const vista = btn.dataset.vista;
            if (!vista || !vistaInput) return;

            vistaInput.value = vista;
            document.querySelectorAll('.view-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');

            if (grid) {
                grid.classList.toggle('students-grid--list', vista === 'list');
            }

            const url = new URL(window.location.href);
            url.searchParams.set('vista', vista);
            window.history.replaceState({}, '', url.toString());
        });
    });
})();
