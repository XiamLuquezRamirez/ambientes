(function() {
    const modalPrincipalEl = document.getElementById('modalInfoCondicionesPrincipal');
    const modalCondicionEl = document.getElementById('modalInfoCondicion');
    const modalContenidoEl = document.getElementById('modalInfoCondicionContenido');

    if (!modalPrincipalEl || !modalCondicionEl || !modalContenidoEl) return;

    const modalPrincipal = bootstrap.Modal.getOrCreateInstance(modalPrincipalEl);
    const modalCondicion = bootstrap.Modal.getOrCreateInstance(modalCondicionEl);
    const modalContenido = bootstrap.Modal.getOrCreateInstance(modalContenidoEl);
    const tituloContenido = document.getElementById('modalInfoCondicionContenidoTitulo');
    const htmlDinamico = document.getElementById('ic-contenido-html-dinamico');
    const dialogCondicion = modalCondicionEl.querySelector('.ic-dialog-condicion');
    const dialogContenido = modalContenidoEl.querySelector('.ic-dialog-contenido');
    const mapa = window.INFO_CONDICIONES_MAP || {};

    let condicionActualSlug = null;
    let maximizado = false;
    let suprimirResetAlOcultarCondicion = false;

    function abrirPrincipal() {
        modalPrincipal.show();
    }

    function abrirCondicion(slug) {
        const panel = document.getElementById('ic-condicion-' + slug);
        if (!panel) return;

        condicionActualSlug = slug;

        modalCondicionEl.querySelectorAll('.ic-condicion-panel').forEach(function(p) {
            p.classList.add('d-none');
        });

        panel.classList.remove('d-none');
        modalPrincipal.hide();
        modalCondicion.show();
    }

    function esSelectorSeccion(valor) {
        if (typeof valor !== 'string') return false;
        const texto = valor.trim();
        return texto.charAt(0) === '.' || texto.charAt(0) === '#';
    }

    function ocultarTodoContenido() {
        document.querySelectorAll('.ic-condicion-pagina').forEach(function(pagina) {
            pagina.style.display = 'none';
        });
        document.querySelectorAll('.condicion-seccion').forEach(function(seccion) {
            seccion.style.display = 'none';
        });
        if (htmlDinamico) {
            htmlDinamico.classList.add('d-none');
            htmlDinamico.innerHTML = '';
        }
    }

    function mostrarSeccion(selector) {
        const seccion = document.querySelector(selector);
        if (!seccion) return false;

        const pagina = seccion.closest('.ic-condicion-pagina');
        if (pagina) pagina.style.display = '';
        seccion.style.display = '';

        const contenido = seccion.querySelector('.section-content');
        if (contenido) contenido.scrollTop = 0;

        return true;
    }

    function mostrarHtml(html) {
        if (!htmlDinamico) return;
        htmlDinamico.innerHTML = html || '';
        htmlDinamico.classList.remove('d-none');
    }

    function botonesMaximizarVisibles() {
        return modalCondicionEl.querySelectorAll('.ic-btn-maximizar-condicion');
    }

    function actualizarBotonMaximizar() {
        botonesMaximizarVisibles().forEach(function(btn) {
            const icono = btn.querySelector('i');
            const etiqueta = maximizado ? 'Restaurar' : 'Maximizar';

            if (icono) {
                icono.classList.toggle('fa-expand', !maximizado);
                icono.classList.toggle('fa-compress', maximizado);
            }

            btn.setAttribute('title', etiqueta);
            btn.setAttribute('aria-label', etiqueta);
        });
    }

    function aplicarEstadoMaximizado() {
        dialogCondicion?.classList.toggle('modal-fullscreen', maximizado);
        modalCondicionEl.classList.toggle('ic-modal-maximizado', maximizado);
        dialogContenido?.classList.toggle('modal-fullscreen', maximizado);
        modalContenidoEl.classList.toggle('ic-modal-maximizado', maximizado);
        actualizarBotonMaximizar();
    }

    function restaurarMaximizado() {
        if (!maximizado) return;

        maximizado = false;
        aplicarEstadoMaximizado();
    }

    function toggleMaximizar() {
        maximizado = !maximizado;
        aplicarEstadoMaximizado();
    }

    function abrirContenidoBoton(condicionSlug, botonId) {
        const info = (mapa[condicionSlug] || {})[botonId];
        if (!info) return;

        condicionActualSlug = condicionSlug;
        ocultarTodoContenido();

        const contenido = (info.contenido_html || '').trim();
        const esSeccion = esSelectorSeccion(contenido);

        modalContenidoEl.classList.toggle('ic-modal-solo-seccion', esSeccion);

        if (tituloContenido) {
            tituloContenido.textContent = esSeccion ? '' : (info.titulo || '');
        }

        if (esSeccion) {
            mostrarSeccion(contenido);
        } else {
            mostrarHtml(contenido);
        }

        const cuerpoModal = modalContenidoEl.querySelector('.modal-body');
        if (cuerpoModal) cuerpoModal.scrollTop = 0;

        function mostrarModalContenido() {
            modalContenido.show();
            aplicarEstadoMaximizado();
        }

        if (modalCondicionEl.classList.contains('show')) {
            suprimirResetAlOcultarCondicion = true;
            modalCondicionEl.addEventListener('hidden.bs.modal', function onCondicionOculta() {
                modalCondicionEl.removeEventListener('hidden.bs.modal', onCondicionOculta);
                mostrarModalContenido();
            });
            modalCondicion.hide();
        } else {
            mostrarModalContenido();
        }
    }

    modalCondicionEl.addEventListener('hidden.bs.modal', function() {
        if (suprimirResetAlOcultarCondicion) {
            suprimirResetAlOcultarCondicion = false;
            return;
        }

        restaurarMaximizado();
        condicionActualSlug = null;
    });

    modalCondicionEl.addEventListener('shown.bs.modal', function() {
        aplicarEstadoMaximizado();
    });

    modalContenidoEl.addEventListener('hidden.bs.modal', function() {
        modalCondicion.show();
    });

    modalContenidoEl.addEventListener('shown.bs.modal', function() {
        aplicarEstadoMaximizado();
    });

    modalCondicionEl.querySelectorAll('.ic-btn-maximizar-condicion').forEach(function(btn) {
        btn.addEventListener('click', toggleMaximizar);
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
