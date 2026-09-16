/**
 * Catálogo SuperAdmin de tipos de juego: filtros AJAX, modal crear/editar, toggle activo.
 */
document.addEventListener('DOMContentLoaded', function () {
    const page = document.getElementById('tiposJuegosPage');
    if (!page) return;

    const urlBase = page.dataset.urlBase || '';
    const urlGuardar = page.dataset.urlGuardar || '';
    const urlMostrarTpl = page.dataset.urlMostrarTemplate || '';
    const urlActualizarTpl = page.dataset.urlActualizarTemplate || '';
    const urlEstadoTpl = page.dataset.urlEstadoTemplate || '';

    const modalEl = document.getElementById('modalCrearTipoJuego');
    const form = document.getElementById('formCrearTipoJuego');
    const btnGuardar = document.getElementById('btnCrearTipoJuego');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const formBuscar = document.getElementById('formBuscar');

    let modoEdicion = false;
    let idEditando = '';
    let debounceTimer;

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

    function getModal() {
        return modalEl ? bootstrap.Modal.getOrCreateInstance(modalEl) : null;
    }

    function setBtnGuardar(modo) {
        if (!btnGuardar) return;
        btnGuardar.disabled = false;
        if (modo === 'creando') {
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando…';
        } else if (modo === 'guardando') {
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';
        } else if (modo === 'crear') {
            btnGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Crear Tipo de Juego';
        } else {
            btnGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';
        }
    }

    function limpiarErroresForm() {
        if (!form) return;
        form.querySelectorAll('.campo-error').forEach((el) => el.remove());
        form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    }

    function resetForm() {
        if (!form) return;
        form.reset();
        limpiarErroresForm();
    }

    function mostrarErroresForm(errors) {
        limpiarErroresForm();
        if (!errors || !form) return;

        let primerInput = null;
        Object.keys(errors).forEach((campo) => {
            const input = form.querySelector(`[name="${campo}"]`);
            if (!input) return;
            input.classList.add('is-invalid');
            const msg = Array.isArray(errors[campo]) ? errors[campo][0] : errors[campo];
            const div = document.createElement('div');
            div.className = 'campo-error invalid-feedback d-block';
            div.textContent = msg || 'Revise este campo.';
            input.insertAdjacentElement('afterend', div);
            if (!primerInput) primerInput = input;
        });

        if (primerInput) primerInput.focus();
    }

    function abrirModalCrear() {
        modoEdicion = false;
        idEditando = '';
        document.getElementById('modalCrearTipoJuegoLabel').textContent = 'Crear Tipo de Juego';
        document.getElementById('modalCrearTipoJuegoSubtitle').textContent =
            'Completa los datos para crear el tipo de juego';
        document.getElementById('modalCrearTipoJuegoIcon').innerHTML =
            '<i class="fas fa-plus text-white"></i>';
        setBtnGuardar('crear');
        resetForm();
        getModal()?.show();
    }

    function abrirModalEditar(id) {
        modoEdicion = true;
        idEditando = String(id);
        document.getElementById('modalCrearTipoJuegoLabel').textContent = 'Editar Tipo de Juego';
        document.getElementById('modalCrearTipoJuegoSubtitle').textContent =
            'Modifica los datos del tipo de juego';
        document.getElementById('modalCrearTipoJuegoIcon').innerHTML =
            '<i class="fas fa-pen text-white"></i>';
        setBtnGuardar('editar');
        resetForm();
        getModal()?.show();
        cargarDatos(id);
    }

    async function cargarDatos(id) {
        Swal.fire({
            title: 'Cargando...',
            text: 'Consultando datos del tipo de juego',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading(),
        });

        try {
            const res = await fetch(urlConId(urlMostrarTpl, id), {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const json = await res.json().catch(() => ({}));
            Swal.close();
            if (!res.ok || !json.success) {
                throw new Error(json.message || 'No se pudo cargar el tipo de juego.');
            }
            document.getElementById('nombre').value = json.data.nombre || '';
            document.getElementById('descripcion').value = json.data.descripcion || '';
        } catch (err) {
            Swal.close();
            toast('error', err.message || 'No se pudo cargar la información del tipo de juego');
            getModal()?.hide();
        }
    }

    async function guardarTipo(e) {
        e.preventDefault();
        if (!form) return;
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const payload = {
            nombre: document.getElementById('nombre').value.trim(),
            descripcion: document.getElementById('descripcion').value.trim(),
        };

        const url = modoEdicion ? urlConId(urlActualizarTpl, idEditando) : urlGuardar;
        const method = modoEdicion ? 'PUT' : 'POST';
        setBtnGuardar(modoEdicion ? 'guardando' : 'creando');

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
                throw new Error(json.message || 'No se pudo guardar el tipo de juego.');
            }

            getModal()?.hide();
            toast('success', json.message || 'Tipo de juego guardado.');
            await cargarTabla(window.location.href);
        } catch (err) {
            toast('error', err.message || 'No se pudo guardar el tipo de juego.');
        } finally {
            setBtnGuardar(modoEdicion ? 'editar' : 'crear');
        }
    }

    async function toggleEstado(checkbox) {
        const id = checkbox.getAttribute('data-id');
        const nombre = checkbox.getAttribute('data-nombre') || 'este tipo';
        const juegosCount = parseInt(checkbox.getAttribute('data-juegos-count') || '0', 10);
        const quiereActivar = checkbox.checked;
        const estadoPrevio = !quiereActivar;

        if (!quiereActivar) {
            const texto = juegosCount > 0
                ? `Hay ${juegosCount} juego(s) de este tipo. Al desactivarlo dejará de aparecer al crear juegos; los juegos existentes se conservan.`
                : 'Dejará de aparecer al crear juegos.';

            const confirmado = await Swal.fire({
                title: `¿Desactivar ${nombre}?`,
                text: texto,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Desactivar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#DC2626',
                cancelButtonColor: '#94A3B8',
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
        } catch (err) {
            checkbox.checked = estadoPrevio;
            toast('error', err.message || 'No se pudo cambiar el estado.');
        }
    }

    function aplicarFiltros() {
        const params = new URLSearchParams(new FormData(formBuscar));
        for (const [k, v] of [...params.entries()]) {
            if (!v) params.delete(k);
        }
        const url = params.toString() ? `${urlBase}?${params.toString()}` : urlBase;
        cargarTabla(url);
    }

    async function cargarTabla(url) {
        const contenedor = document.getElementById('contenedorTabla');
        const cargando = document.getElementById('cargando-tabla');
        if (!contenedor) return;

        contenedor.style.opacity = '.4';
        if (cargando) cargando.style.display = 'block';

        try {
            const res = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json.success || !json.html) {
                throw new Error(json.message || 'Error al cargar los datos');
            }
            contenedor.innerHTML = json.html;
            history.pushState(null, '', url);
            const params = new URL(url, window.location.origin).searchParams;
            const tieneFiltros = params.has('buscar') || params.has('activo');
            if (btnLimpiar) {
                btnLimpiar.style.display = tieneFiltros ? 'inline-flex' : 'none';
            }
        } catch (err) {
            toast('error', err.message || 'Error al cargar los datos');
        } finally {
            contenedor.style.opacity = '1';
            if (cargando) cargando.style.display = 'none';
        }
    }

    document.getElementById('btnNuevoTipoJuego')?.addEventListener('click', abrirModalCrear);
    form?.addEventListener('submit', guardarTipo);

    page.addEventListener('click', function (e) {
        const btnEditar = e.target.closest('.btn-editar');
        if (btnEditar && page.contains(btnEditar)) {
            e.preventDefault();
            abrirModalEditar(btnEditar.getAttribute('data-id'));
        }
    });

    page.addEventListener('change', function (e) {
        const toggle = e.target.closest('.toggle-activo');
        if (toggle && page.contains(toggle)) {
            toggleEstado(toggle);
        }
    });

    formBuscar?.querySelectorAll('select').forEach((sel) => {
        sel.addEventListener('change', aplicarFiltros);
    });

    formBuscar?.querySelector('input[name="buscar"]')?.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(aplicarFiltros, 400);
    });

    formBuscar?.addEventListener('submit', function (e) {
        e.preventDefault();
        clearTimeout(debounceTimer);
        aplicarFiltros();
    });

    btnLimpiar?.addEventListener('click', function (e) {
        e.preventDefault();
        formBuscar?.reset();
        cargarTabla(urlBase);
    });
});
