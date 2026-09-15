/**
 * Catálogo SuperAdmin de juegos: filtros AJAX, CRUD modal, preview overlay.
 */
document.addEventListener('DOMContentLoaded', function () {
    const page = document.getElementById('juegosPage');
    if (!page) return;

    const urlBase = page.dataset.urlBase || '';
    const urlGuardar = page.dataset.urlGuardar || '';
    const urlMostrarTpl = page.dataset.urlMostrarTemplate || '';
    const urlActualizarTpl = page.dataset.urlActualizarTemplate || '';
    const urlEstadoTpl = page.dataset.urlEstadoTemplate || '';

    const overlay = document.getElementById('cjPreviewOverlay');
    const frame = document.getElementById('cjPreviewFrame');
    const tablet = document.getElementById('cjTablet');
    const stage = document.getElementById('cjTabletStage');
    const titleEl = document.getElementById('cjPreviewTitle');
    const btnReload = document.getElementById('cjPreviewReload');

    const modalEl = document.getElementById('modalJuegoCatalogo');
    const form = document.getElementById('formJuegoCatalogo');
    const btnGuardar = document.getElementById('btnGuardarJuegoCatalogo');
    const labelEl = document.getElementById('modalJuegoCatalogoLabel');
    const subtitleEl = document.getElementById('modalJuegoCatalogoSubtitle');
    const iconEl = document.getElementById('modalJuegoCatalogoIcon');

    const SCREEN_W = 1280;
    const SCREEN_H = 800;

    let urlActual = '';
    let modoEdicion = false;
    let juegoEditandoId = null;
    let nombreOriginalEdicion = '';
    let ambienteOriginalEdicion = '';
    let rutaOriginalEdicion = '';

    function csrfToken() {
        return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    }

    function toast(tipo, msg) {
        if (typeof mostrarToast === 'function') mostrarToast(tipo, msg);
        else alert(msg);
    }

    function urlConId(tpl, id) {
        return String(tpl || '').replace('__ID__', String(id));
    }

    function perfilPayload() {
        try {
            const el = document.getElementById('cj-perfil-payload');
            return el ? JSON.parse(el.textContent || 'null') : null;
        } catch (e) {
            return null;
        }
    }

    function inyectarPerfil() {
        const perfil = perfilPayload();
        if (!perfil || !frame || !frame.contentWindow) return;
        try {
            frame.contentWindow.__PEDNIA_PERFIL__ = perfil;
            frame.contentWindow.postMessage({
                type: 'pednia:perfil',
                perfil: perfil,
            }, window.location.origin);
        } catch (e) { /* noop */ }
    }

    function ajustarEscalaTablet() {
        if (!overlay || overlay.hidden || !tablet) return;

        tablet.style.transform = 'none';
        const padX = 48;
        const padY = 96;
        const availW = Math.max(280, window.innerWidth - padX);
        const availH = Math.max(200, window.innerHeight - padY);
        const naturalW = tablet.offsetWidth || (SCREEN_W + 56);
        const naturalH = tablet.offsetHeight || (SCREEN_H + 80);
        const scale = Math.min(availW / naturalW, availH / naturalH, 1);

        tablet.style.transform = 'scale(' + scale + ')';
        tablet.style.transformOrigin = 'center center';

        if (stage) {
            stage.style.width = Math.round(naturalW * scale) + 'px';
            stage.style.height = Math.round(naturalH * scale) + 'px';
        }
    }

    function abrirPreview(url, nombre) {
        if (!overlay || !frame || !url) return;
        urlActual = url;
        if (titleEl) titleEl.textContent = nombre || 'Juego';
        if (frame) frame.title = nombre || 'Vista previa del juego';

        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        frame.onload = function () {
            inyectarPerfil();
        };
        frame.src = url;
        requestAnimationFrame(ajustarEscalaTablet);
    }

    function cerrarPreview() {
        if (!overlay) return;
        if (frame) {
            frame.onload = null;
            frame.src = 'about:blank';
        }
        urlActual = '';
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (tablet) tablet.style.transform = 'none';
        if (stage) {
            stage.style.width = '';
            stage.style.height = '';
        }
    }

    function recargarPreview() {
        if (!urlActual || !frame) return;
        frame.src = 'about:blank';
        requestAnimationFrame(function () {
            frame.src = urlActual;
        });
    }

    function getModal() {
        if (!modalEl || typeof bootstrap === 'undefined') return null;
        return bootstrap.Modal.getOrCreateInstance(modalEl);
    }

    function filtrarOpcionesForm(select, attr, valorPadre) {
        if (!select) return;
        select.querySelectorAll('option[' + attr + ']').forEach(function (opt) {
            const visible = !valorPadre || opt.getAttribute(attr) === String(valorPadre);
            opt.hidden = !visible;
            if (!visible && opt.selected) {
                select.value = '';
            }
        });
    }

    function aplicarCascadaForm() {
        if (!form) return;
        const ambienteId = form.querySelector('.js-juego-form-ambiente')?.value || '';
        const moduloId = form.querySelector('.js-juego-form-modulo')?.value || '';
        const ejeId = form.querySelector('.js-juego-form-eje')?.value || '';

        filtrarOpcionesForm(form.querySelector('.js-juego-form-modulo'), 'data-ambiente-id', ambienteId);
        filtrarOpcionesForm(form.querySelector('.js-juego-form-eje'), 'data-modulo-id', moduloId);
        filtrarOpcionesForm(form.querySelector('.js-juego-form-tematica'), 'data-eje-id', ejeId);
    }

    function resetForm() {
        if (!form) return;
        limpiarErroresForm();
        form.reset();
        form.querySelector('#juego_id').value = '';
        form.querySelector('#juego_color').value = '#2563eb';
        form.querySelector('#juego_activo').checked = true;
        form.querySelector('#juego_tipo_nuevo').value = '';
        form.querySelectorAll('select option[hidden]').forEach(function (opt) {
            opt.hidden = false;
        });
        aplicarCascadaForm();
        sincronizarTipoNuevo();
    }

    function limpiarErroresForm() {
        if (!form) return;
        form.querySelectorAll('.campo-error').forEach((el) => el.remove());
        form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    }

    function mensajeValidacionJuego(codigo) {
        switch (codigo) {
            case 'validation.unique':
                return 'Este valor ya está registrado.';
            case 'validation.exists':
                return 'El valor seleccionado no es válido.';
            case 'validation.required':
                return 'Este campo es requerido.';
            case 'validation.max.string':
                return 'El texto supera la longitud permitida.';
            case 'validation.integer':
            case 'validation.numeric':
                return 'El valor debe ser un número.';
            case 'validation.boolean':
                return 'Seleccione una opción válida.';
            case 'validation.regex':
                return 'El formato no es válido.';
            case 'validation.not_in':
                return 'Selecciona o crea un tipo válido.';
            default:
                return (codigo && !String(codigo).startsWith('validation.'))
                    ? codigo
                    : 'Revise este campo.';
        }
    }

    function mostrarErroresForm(errors) {
        limpiarErroresForm();
        if (!errors || !form) return;

        let primerInput = null;

        Object.entries(errors).forEach(([campo, mensajes]) => {
            let input = form.querySelector(`[name="${campo}"]`);

            // Si falla tipo y estamos en "Agregar nuevo", marcar el input custom.
            if (campo === 'tipo') {
                const sel = form.querySelector('#juego_tipo');
                if (sel && sel.value === '__nuevo__') {
                    input = form.querySelector('#juego_tipo_nuevo') || input;
                }
            }

            if (!input) return;

            input.classList.add('is-invalid');
            const div = document.createElement('div');
            div.className = 'campo-error invalid-feedback d-block';
            div.textContent = mensajeValidacionJuego(
                Array.isArray(mensajes) ? mensajes[0] : String(mensajes || '')
            );

            const wrapNuevo = input.id === 'juego_tipo_nuevo'
                ? input.closest('#juego_tipo_nuevo_wrap')
                : null;
            if (wrapNuevo) {
                wrapNuevo.appendChild(div);
            } else {
                input.insertAdjacentElement('afterend', div);
            }

            if (!primerInput) primerInput = input;
        });

        if (primerInput) primerInput.focus();
    }

    function slugifyTipo(texto) {
        return String(texto || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .replace(/_+/g, '_');
    }

    function sincronizarTipoNuevo() {
        if (!form) return;
        const sel = form.querySelector('#juego_tipo');
        const wrap = form.querySelector('#juego_tipo_nuevo_wrap');
        const input = form.querySelector('#juego_tipo_nuevo');
        if (!sel || !wrap || !input) return;

        const esNuevo = sel.value === '__nuevo__';
        wrap.hidden = !esNuevo;
        input.required = esNuevo;
        if (!esNuevo) {
            input.value = '';
        }
    }

    function resolverTipoPayload() {
        const sel = form.querySelector('#juego_tipo');
        const valor = sel ? String(sel.value || '').trim() : '';
        if (valor === '__nuevo__') {
            return slugifyTipo(form.querySelector('#juego_tipo_nuevo')?.value || '');
        }
        return valor;
    }

    function setModoCrear() {
        modoEdicion = false;
        juegoEditandoId = null;
        resetForm();
        if (labelEl) labelEl.textContent = 'Nuevo juego';
        if (subtitleEl) {
            subtitleEl.textContent = 'Crea el registro y el stub del paquete bajo public/catalogo_juegos.';
        }
        if (iconEl) iconEl.className = 'fas fa-plus text-white';
        if (btnGuardar) {
            btnGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Crear juego';
        }
        actualizarRutaPreview();
    }

    function setModoEditar() {
        modoEdicion = true;
        if (labelEl) labelEl.textContent = 'Editar juego';
        if (subtitleEl) {
            subtitleEl.textContent = 'Si cambias nombre o ambiente, se renombra la carpeta del paquete.';
        }
        if (iconEl) iconEl.className = 'fas fa-pen-to-square text-white';
        if (btnGuardar) {
            btnGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';
        }
    }

    /** StudlyCase aproximado al PHP (Str::ascii + studly), suficiente para la vista previa. */
    function segmentoCarpeta(texto) {
        const mapa = {
            á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n',
            Á: 'a', É: 'e', Í: 'i', Ó: 'o', Ú: 'u', Ü: 'u', Ñ: 'n',
        };
        const ascii = String(texto || '')
            .replace(/[áéíóúüñÁÉÍÓÚÜÑ]/g, (c) => mapa[c] || c)
            .replace(/[^A-Za-z0-9]+/g, ' ')
            .trim()
            .toLowerCase();
        if (!ascii) return '';
        return ascii
            .split(/\s+/)
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            .join('');
    }

    function actualizarRutaPreview() {
        if (!form) return;
        const inputRuta = form.querySelector('#juego_ruta');
        if (!inputRuta) return;

        const nombre = (form.querySelector('#juego_nombre')?.value || '').trim();
        const ambSelect = form.querySelector('#juego_ambiente_id');
        const opt = ambSelect?.selectedOptions?.[0];
        const ambRaw = (opt?.getAttribute('data-slug') || opt?.getAttribute('data-nombre') || '').trim();

        const ambSeg = segmentoCarpeta(ambRaw);
        const juegoSeg = segmentoCarpeta(nombre);

        if (ambSeg && juegoSeg) {
            inputRuta.value = 'catalogo_juegos/' + ambSeg + '/' + juegoSeg;
        } else if (!modoEdicion) {
            inputRuta.value = '';
            inputRuta.placeholder = 'Se completa al elegir ambiente y nombre';
        }
    }

    function rellenarForm(data) {
        if (!form || !data) return;
        limpiarErroresForm();
        form.querySelector('#juego_id').value = data.slug || '';
        form.querySelector('#juego_nombre').value = data.nombre || '';

        const selTipo = form.querySelector('#juego_tipo');
        const tipo = String(data.tipo || '');
        if (selTipo) {
            const existe = Array.from(selTipo.options).some((o) => o.value === tipo);
            if (tipo && !existe) {
                const opt = document.createElement('option');
                opt.value = tipo;
                opt.textContent = tipo.replace(/_/g, ' ');
                selTipo.insertBefore(opt, selTipo.querySelector('option[value="__nuevo__"]'));
            }
            selTipo.value = tipo || '';
        }
        form.querySelector('#juego_tipo_nuevo').value = '';
        sincronizarTipoNuevo();

        form.querySelector('#juego_ruta').value = data.ruta || '';
        form.querySelector('#juego_descripcion').value = data.descripcion || '';
        form.querySelector('#juego_icono').value = data.icono || '';
        form.querySelector('#juego_color').value = data.color || '#2563eb';
        form.querySelector('#juego_activo').checked = !!data.activo;

        const cadena = data.cadena || {};
        form.querySelector('#juego_ambiente_id').value = cadena.ambiente_id || data.ambiente_id || '';
        aplicarCascadaForm();
        form.querySelector('#juego_modulo_id').value = cadena.modulo_id || '';
        aplicarCascadaForm();
        form.querySelector('#juego_eje_id').value = cadena.eje_id || '';
        aplicarCascadaForm();
        form.querySelector('#juego_tematica_id').value = cadena.tematica_id || '';

        // En edición mostramos la ruta real; al cambiar nombre/ambiente se recalcula la preview.
        nombreOriginalEdicion = String(data.nombre || '').trim();
        ambienteOriginalEdicion = String(cadena.ambiente_id || data.ambiente_id || '');
        rutaOriginalEdicion = String(data.ruta || '');
    }

    function sincronizarRutaSegunIdentidad() {
        if (!modoEdicion) {
            actualizarRutaPreview();
            return;
        }
        const nombre = (form.querySelector('#juego_nombre')?.value || '').trim();
        const ambienteId = form.querySelector('#juego_ambiente_id')?.value || '';
        if (nombre === nombreOriginalEdicion && ambienteId === ambienteOriginalEdicion) {
            form.querySelector('#juego_ruta').value = rutaOriginalEdicion;
            return;
        }
        actualizarRutaPreview();
    }

    function abrirCrear() {
        setModoCrear();
        getModal()?.show();
    }

    async function abrirEditar(id) {
        setModoEditar();
        juegoEditandoId = id;
        try {
            const res = await fetch(urlConId(urlMostrarTpl, id), {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.message || 'No se pudo cargar el juego.');
            }
            rellenarForm(json.data);
            getModal()?.show();
        } catch (err) {
            toast('error', err.message || 'No se pudo cargar el juego.');
        }
    }

    function payloadDesdeForm() {
        const fd = new FormData(form);
        const activo = form.querySelector('#juego_activo').checked;
        const tipo = resolverTipoPayload();

        return {
            nombre: String(fd.get('nombre') || '').trim(),
            tipo: tipo,
            descripcion: String(fd.get('descripcion') || '').trim() || null,
            icono: String(fd.get('icono') || '').trim() || null,
            color: String(fd.get('color') || '').trim() || null,
            ambiente_id: Number(fd.get('ambiente_id') || 0) || null,
            modulo_id: Number(fd.get('modulo_id') || 0) || null,
            eje_id: Number(fd.get('eje_id') || 0) || null,
            tematica_id: Number(fd.get('tematica_id') || 0) || null,
            activo: activo,
        };
    }

    function validarClienteAntesDeEnviar(payload) {
        limpiarErroresForm();
        const errors = {};

        if (!payload.nombre) {
            errors.nombre = ['Este campo es requerido.'];
        }

        const selTipo = form.querySelector('#juego_tipo')?.value || '';
        if (!selTipo) {
            errors.tipo = ['Este campo es requerido.'];
        } else if (selTipo === '__nuevo__' && !payload.tipo) {
            errors.tipo = ['Indica el nombre del nuevo tipo.'];
        } else if (payload.tipo && !/^[a-z][a-z0-9_]*$/.test(payload.tipo)) {
            errors.tipo = ['El tipo debe estar en snake_case (ej. memoria_visual).'];
        }

        if (!payload.ambiente_id) {
            errors.ambiente_id = ['Este campo es requerido.'];
        }

        if (Object.keys(errors).length) {
            mostrarErroresForm(errors);
            return false;
        }
        return true;
    }

    async function guardarJuego(e) {
        e.preventDefault();
        if (!form) return;

        const payload = payloadDesdeForm();
        if (!validarClienteAntesDeEnviar(payload)) {
            return;
        }

        const url = modoEdicion
            ? urlConId(urlActualizarTpl, juegoEditandoId)
            : urlGuardar;
        const method = modoEdicion ? 'PUT' : 'POST';

        if (btnGuardar) btnGuardar.disabled = true;

        try {
            const res = await fetch(url, {
                method: method,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify(payload),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json.success) {
                if (json.errors) {
                    mostrarErroresForm(json.errors);
                    toast('error', 'Verifique los datos ingresados');
                    return;
                }
                throw new Error(json.message || 'No se pudo guardar el juego.');
            }

            getModal()?.hide();
            toast('success', json.message || 'Juego guardado.');
            await cargarGrid(window.location.href);
        } catch (err) {
            toast('error', err.message || 'No se pudo guardar el juego.');
        } finally {
            if (btnGuardar) btnGuardar.disabled = false;
        }
    }

    async function toggleEstadoDesdeSwitch(checkbox) {
        const id = checkbox.getAttribute('data-juego-id');
        const nombre = checkbox.getAttribute('data-nombre') || 'este juego';
        const quiereActivar = checkbox.checked;
        // El change ya movió el check; si cancela, se revierte.
        const estadoPrevio = !quiereActivar;

        if (!quiereActivar) {
            const confirmado = await Swal.fire({
                title: `¿Desactivar ${nombre}?`,
                text: 'Dejará de aparecer en el kiosco y listados de activos.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Desactivar',
                cancelButtonText: 'Cancelar',
            }).then((r) => r.isConfirmed);

            if (!confirmado) {
                checkbox.checked = estadoPrevio;
                return;
            }
        }

        try {
            const res = await fetch(urlConId(urlEstadoTpl, id), {
                method: 'PATCH',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken(),
                },
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json.success) {
                throw new Error(json.message || 'No se pudo cambiar el estado.');
            }
            toast('success', json.message || 'Estado actualizado.');
            await cargarGrid(window.location.href);
        } catch (err) {
            checkbox.checked = estadoPrevio;
            toast('error', err.message || 'No se pudo cambiar el estado.');
        }
    }

    // Delegación: sobrevive al re-render AJAX del grid
    page.addEventListener('click', function (e) {
        const btnPreview = e.target.closest('[data-cj-preview]');
        if (btnPreview && page.contains(btnPreview)) {
            e.preventDefault();
            abrirPreview(
                btnPreview.getAttribute('data-url-paquete'),
                btnPreview.getAttribute('data-juego-nombre')
            );
            return;
        }

        const btnEditar = e.target.closest('[data-cj-editar]');
        if (btnEditar && page.contains(btnEditar)) {
            e.preventDefault();
            abrirEditar(btnEditar.getAttribute('data-juego-id'));
            return;
        }

        if (e.target.closest('#btnNuevoJuegoCatalogoEmpty')) {
            e.preventDefault();
            abrirCrear();
        }
    });

    page.addEventListener('change', function (e) {
        const toggle = e.target.closest('.toggle-activo-juego');
        if (!toggle || !page.contains(toggle)) return;
        toggleEstadoDesdeSwitch(toggle);
    });

    document.getElementById('btnNuevoJuegoCatalogo')?.addEventListener('click', function (e) {
        e.preventDefault();
        abrirCrear();
    });

    form?.addEventListener('submit', guardarJuego);
    form?.querySelector('#juego_tipo')?.addEventListener('change', sincronizarTipoNuevo);
    form?.querySelector('.js-juego-form-ambiente')?.addEventListener('change', function () {
        aplicarCascadaForm();
        sincronizarRutaSegunIdentidad();
    });
    form?.querySelector('.js-juego-form-modulo')?.addEventListener('change', aplicarCascadaForm);
    form?.querySelector('.js-juego-form-eje')?.addEventListener('change', aplicarCascadaForm);
    form?.querySelector('#juego_nombre')?.addEventListener('input', sincronizarRutaSegunIdentidad);

    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target.closest('[data-cj-close]')) {
                e.preventDefault();
                cerrarPreview();
            }
        });
    }

    if (btnReload) {
        btnReload.addEventListener('click', function (e) {
            e.preventDefault();
            recargarPreview();
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay && !overlay.hidden) {
            cerrarPreview();
        }
    });

    window.addEventListener('resize', function () {
        if (overlay && !overlay.hidden) ajustarEscalaTablet();
    });

    async function cargarGrid(url) {
        const contenedor = document.getElementById('container-grid');
        if (!contenedor) return;

        contenedor.style.opacity = '0.45';
        try {
            const res = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.message || 'No se pudo cargar el listado.');
            }
            contenedor.innerHTML = json.html;
            history.pushState(null, '', url);
            enlazarFiltros();
        } catch (err) {
            const msg = err.message || 'No se pudo cargar el listado de juegos.';
            toast('error', msg);
        } finally {
            contenedor.style.opacity = '1';
        }
    }

    function aplicarFiltros() {
        const formFiltros = document.getElementById('formFiltrosJuegos');
        if (!formFiltros) return;
        const params = window.JuegosFiltrosUi.paramsDesdeForm(formFiltros);
        const url = params.toString() ? `${urlBase}?${params.toString()}` : urlBase;
        cargarGrid(url);
    }

    function enlazarFiltros() {
        const formFiltros = document.getElementById('formFiltrosJuegos');
        window.JuegosFiltrosUi.enlazar(formFiltros, aplicarFiltros);

        document.querySelectorAll('.pag-btn[href]').forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                cargarGrid(link.getAttribute('href'));
            });
        });
    }

    enlazarFiltros();
});
