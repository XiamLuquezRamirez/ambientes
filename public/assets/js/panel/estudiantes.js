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

    const $viewButtons = $('.view-btn');
    $viewButtons.on('click', function () {
        const vista = $(this).data('vista');
        if (!vista || !vistaInput) return;

        vistaInput.value = vista;

        $('.view-btn.active').removeClass('active');
        $(this).addClass('active');

        if (grid) {
            $(grid).toggleClass('students-grid--list', vista === 'list');
        }

        aplicarFiltrosEstudiantes();
    });
})();
