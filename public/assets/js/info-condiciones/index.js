(function() {
    const modalPrincipalEl = document.getElementById('modalInfoCondicionesPrincipal');
    const modalCondicionEl = document.getElementById('modalInfoCondicion');
    const modalContenidoEl = document.getElementById('modalInfoCondicionContenido');

    if (!modalPrincipalEl || !modalCondicionEl || !modalContenidoEl) return;

    const modalPrincipal = bootstrap.Modal.getOrCreateInstance(modalPrincipalEl);
    const modalCondicion = bootstrap.Modal.getOrCreateInstance(modalCondicionEl);
    const modalContenido = bootstrap.Modal.getOrCreateInstance(modalContenidoEl);
    const tituloContenido = document.getElementById('modalInfoCondicionContenidoTitulo');
    const cuerpoContenido = document.getElementById('modalInfoCondicionContenidoBody');
    const mapa = window.INFO_CONDICIONES_MAP || {};

    function abrirPrincipal() {
        modalPrincipal.show();
    }

    function abrirCondicion(slug) {
        const panel = document.getElementById('ic-condicion-' + slug);
        if (!panel) return;

        modalCondicionEl.querySelectorAll('.ic-condicion-panel').forEach(function(p) {
            p.classList.add('d-none');
        });

        panel.classList.remove('d-none');
        modalPrincipal.hide();
        modalCondicion.show();
    }

    function abrirContenidoBoton(condicionSlug, botonId) {
        const data = mapa[condicionSlug]?.[botonId];
        if (!data) return;

        if (tituloContenido) {
            tituloContenido.textContent = data.titulo || '';
        }
        if (cuerpoContenido) {
            cuerpoContenido.innerHTML = data.contenido_html || '';
        }

        modalCondicionEl.addEventListener('hidden.bs.modal', function onCondicionOculta() {
            modalCondicionEl.removeEventListener('hidden.bs.modal', onCondicionOculta);
            modalContenido.show();
        });

        modalCondicion.hide();
    }

    const btnVolverExterior = modalCondicionEl.querySelector('.ic-btn-volver-exterior');

    function ocultarVolverExterior(ocultar) {
        if (!btnVolverExterior) return;
        btnVolverExterior.classList.toggle('is-hidden', ocultar);
    }

    modalContenidoEl.addEventListener('hidden.bs.modal', function() {
        ocultarVolverExterior(false);
        modalCondicion.show();
    });

    document.querySelectorAll('[data-abrir-modal-condiciones]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            abrirPrincipal();
        });
    });

    document.querySelectorAll('[data-abrir-condicion]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            abrirCondicion(btn.dataset.abrirCondicion);
        });
    });

    document.querySelectorAll('.ic-btn-volver-principal').forEach(function(btn) {
        btn.addEventListener('click', function() {
            modalCondicion.hide();
            modalPrincipal.show();
        });
    });

    modalCondicionEl.addEventListener('click', function(e) {
        const botonCard = e.target.closest('.ic-boton-card');
        if (!botonCard) return;

        abrirContenidoBoton(botonCard.dataset.condicionSlug, botonCard.dataset.botonId);
    });

    window.abrirModalInfoCondiciones = abrirPrincipal;
    window.abrirInfoCondicion = abrirCondicion;

    if (window.INFO_CONDICION_ABRIR) {
        abrirCondicion(window.INFO_CONDICION_ABRIR);
    } else if (window.INFO_CONDICIONES_ABRIR_PRINCIPAL) {
        abrirPrincipal();
    }
})();
