/**
 * Lista de perfiles de aprendizaje — Panel docente (solo lectura)
 */
(function() {
    const URL_INDEX = window.URL_PANEL_PERFILES_APRENDIZAJE;
    if (!URL_INDEX) return;

    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content'),
            'X-Requested-With': 'XMLHttpRequest'
        }
    });

    function construirParams() {
        const form = document.getElementById('formFiltrosPerfilesAprendizajePanel');
        if (!form) return '';
        const params = new URLSearchParams(new FormData(form));
        for (const [k, v] of [...params.entries()]) {
            if (!v) params.delete(k);
        }
        return params.toString();
    }

    window.cargarListaPerfilesAprendizajePanel = function(url) {
        const destino = url || (construirParams() ? `${URL_INDEX}?${construirParams()}` : URL_INDEX);
        const $contenedor = $('#contenedorListaPerfilesAprendizajePanel');
        $contenedor.addClass('loading');

        $.ajax({
            url: destino,
            type: 'GET',
            dataType: 'json',
            success: function(res) {
                if (res.success && res.html !== undefined) {
                    $contenedor.html(res.html);
                }
            },
            error: function(xhr) {
                if (typeof mostrarToast === 'function') {
                    mostrarToast('error', xhr.responseJSON?.message || 'Error al cargar la lista.');
                }
            },
            complete: function() {
                $contenedor.removeClass('loading');
            }
        });
    };

    const $form = $('#formFiltrosPerfilesAprendizajePanel');
    if (!$form.length) return;

    let debounceTimer;
    $form.on('change', 'select', () => window.cargarListaPerfilesAprendizajePanel());

    $form.find('input[name="buscar"]').on('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => window.cargarListaPerfilesAprendizajePanel(), 400);
    }).on('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(debounceTimer);
            window.cargarListaPerfilesAprendizajePanel();
        }
    });
})();
