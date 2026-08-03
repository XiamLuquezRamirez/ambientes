
inicializarEventos();

function inicializarEventos() {
    const form = document.getElementById("formFiltrosEstudiantes");

    if (!form) {
        return;
    }

    form.querySelectorAll("select").forEach(select => {
        select.addEventListener("change", aplicarFiltrosEstudiantes);
    });

    var buscaInput = document.getElementById('buscarEstudiante');
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

    //autofocus en el input de busqueda despues de la ultima letra escrita
    if (buscaInput) {
        buscaInput.focus();
        buscaInput.setSelectionRange(
            buscaInput.value.length,
            buscaInput.value.length
        );
    }
    var vistaInput = document.getElementById('vistaActual');
    var grid = document.getElementById('studentsGrid');

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
}

function aplicarFiltrosEstudiantes() {
    var action = $('#formFiltrosEstudiantes').attr('action');
    const params = new URLSearchParams(new FormData($('#formFiltrosEstudiantes')[0]));
    for (const [k, v] of [...params.entries()]) {
        if (!v) params.delete(k);
    }
    const url = params.toString() ? `${action}?${params.toString()}` : action;
    cargarTabla(url);
    setTimeout(() => {
        inicializarEventos();
    }, 500);
}
