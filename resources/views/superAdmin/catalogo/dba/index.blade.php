@extends('layouts.superAdmin')
@section('title', 'Catálogo DBA')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/admin/catalogo-dba.css') }}">
@endpush

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
        <div>
            <h1>Catálogo DBA</h1>
            <p>Catálogo DBA oficiales de PedNia</p>
        </div>
        <div style="display:flex;gap:10px">
            <button class="btn btn-primary" onclick="abrirModalCrearCatalogoDBA()">
                <i class="fas fa-plus"></i> Nuevo Catálogo DBA
            </button>
        </div>
    </div>

    <form id="formBuscar" style="display:flex;gap:12px;margin-bottom:24px;align-items:center;flex-wrap:wrap">
        <div class="input-buscar">
            <span class="icono-buscar"><i class="fas fa-search"></i></span>
            <input type="text" name="buscar" placeholder="Buscar por código o descripción..."
                value="{{ request('buscar') }}" autocomplete="off">
        </div>

        <select name="area_id" class="form-control" style="width:auto">
            <option value="">Todas las áreas</option>
            @foreach ($areas as $area)
                <option value="{{ $area->id }}" @selected(request('area_id') == $area->id)>
                    {{ $area->nombre }}
                </option>
            @endforeach
        </select>

        <select name="grado_id" class="form-control" style="width:auto">
            <option value="">Todos los grados</option>
            @foreach ($grados as $grado)
                <option value="{{ $grado->id }}" @selected(request('grado_id') == $grado->id)>
                    {{ $grado->nombre }}
                </option>
            @endforeach
        </select>

        <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-filter"></i> Filtrar</button>
        <a id="btnLimpiar" href="{{ route('superadmin.catalogo') }}" class="btn btn-sm"
            style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;
              display:{{ request()->hasAny(['buscar', 'area_id', 'grado_id']) ? 'inline-flex' : 'none' }}">
            <i class="fas fa-broom"></i> Limpiar
        </a>
    </form>

    <div id="contenedorTabla">
        @include('superAdmin.catalogo.dba._tabla')
    </div>
    <div id="cargando-tabla"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>

    @include('superAdmin.catalogo.dba.modalCrearCatalogoDBA')
@endsection

@push('scripts')
    <script>
        const URL_CATALOGO_DBA_BASE = @json(url('superadmin/catalogo'));
        const URL_CATALOGO_DBA_GUARDAR = @json(route('superadmin.catalogo.guardar'));

        /** 1 = crear, 2 = editar */
        var tipoPost = 1;
        var id_editar = '';

        const modalCrearCatalogoDBA = document.getElementById('modalCrearCatalogoDBA');

        function getModalCrearCatalogoDBA() {
            return bootstrap.Modal.getOrCreateInstance(modalCrearCatalogoDBA);
        }

        function cerrarModalCrearCatalogoDBA() {
            bootstrap.Modal.getInstance(modalCrearCatalogoDBA)?.hide();
        }

        function setBtnCrearCatalogoDBA(modo) {
            const btn = document.getElementById('btnCrearCatalogoDBA');
            if (!btn) return;
            btn.disabled = false;
            if (modo === 'creando') {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando…';
            } else if (modo === 'guardando') {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';
            } else if (modo === 'crear') {
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Crear Catálogo DBA';
            } else {
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';
            }
        }

        function setOrigenEditable(editable) {
            const sel = document.getElementById('es_men');
            if (!sel) return;
            sel.disabled = !editable;
            sel.required = editable;
        }

        function abrirModalCrearCatalogoDBA() {
            tipoPost = 1;
            id_editar = '';
            $('#modalCrearCatalogoDBALabel').text('Crear Catálogo DBA');
            $('#modalCrearCatalogoDBASubtitle').text('Completa los datos para crear el catálogo');
            $('#modalCrearCatalogoDBAIcon').html('<i class="fas fa-book-medical text-white"></i>');
            setBtnCrearCatalogoDBA('crear');
            resetFormCrearCatalogoDBA();
            setOrigenEditable(true);
            getModalCrearCatalogoDBA().show();
        }

        function abrirModalEditarCatalogoDBA(id) {
            tipoPost = 2;
            id_editar = id;
            $('#modalCrearCatalogoDBALabel').text('Editar Catálogo DBA');
            $('#modalCrearCatalogoDBASubtitle').text('Modifica los datos del catálogo (el origen no se puede cambiar)');
            $('#modalCrearCatalogoDBAIcon').html('<i class="fas fa-pen-to-square text-white"></i>');
            setBtnCrearCatalogoDBA('editar');
            resetFormCrearCatalogoDBA();
            setOrigenEditable(false);
            getModalCrearCatalogoDBA().show();
            cargarDatosCatalogoDBA(id);
        }

        function resetFormCrearCatalogoDBA() {
            const form = document.getElementById('formCrearCatalogoDBA');
            if (!form) return;
            form.reset();
            limpiarErroresModal('formCrearCatalogoDBA');
        }

        function limpiarErroresModal(form) {
            document.querySelectorAll(`#${form} .campo-error`).forEach(el => el.remove());
            document.querySelectorAll(`#${form} .is-invalid`).forEach(el => el.classList.remove('is-invalid'));
        }

        function laravelKeyToInputName(campo) {
            if (!campo.includes('.')) return campo;
            const partes = campo.split('.');
            return partes[0] + partes.slice(1).map(p => `[${p}]`).join('');
        }

        function mensajeValidacionCatalogoDBA(campo, codigo) {
            switch (codigo) {
                case 'validation.unique':
                    return 'Este código ya está registrado.';
                case 'validation.exists':
                    return 'El valor seleccionado no es válido.';
                case 'validation.required':
                    return 'Este campo es requerido.';
                case 'validation.max.string':
                    return 'El texto supera la longitud permitida.';
                case 'validation.boolean':
                    return 'Seleccione una opción válida.';
                default:
                    return (codigo && !String(codigo).startsWith('validation.')) ?
                        codigo :
                        'Revise este campo.';
            }
        }

        function mostrarErroresModal(errors, form) {
            limpiarErroresModal(form);
            if (!errors) return;

            let primerInput = null;

            $.each(errors, function(campo, mensajes) {
                const nameAttr = laravelKeyToInputName(campo);
                const $input = $(document.getElementById(form)).find(`[name="${nameAttr}"]`);
                if (!$input.length) return;

                $input.addClass('is-invalid');
                $('<div>', {
                    class: 'campo-error invalid-feedback d-block',
                    text: mensajeValidacionCatalogoDBA(campo, mensajes[0])
                }).insertAfter($input);

                if (!primerInput) primerInput = $input.get(0);
            });

            if (primerInput) primerInput.focus();
        }

        /* ── Filtros ─────────────────────────────────────────────────── */
        function aplicarFiltros() {
            const params = new URLSearchParams(new FormData(document.getElementById('formBuscar')));
            for (const [k, v] of [...params.entries()]) {
                if (!v) params.delete(k);
            }
            const url = params.toString() ? `${URL_CATALOGO_DBA_BASE}?${params.toString()}` : URL_CATALOGO_DBA_BASE;
            cargarTabla(url);
        }

        document.querySelectorAll('#formBuscar select').forEach(sel => {
            sel.addEventListener('change', aplicarFiltros);
        });

        let debounceTimer;
        document.querySelector('#formBuscar input[name="buscar"]').addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(aplicarFiltros, 400);
        });

        document.getElementById('formBuscar').addEventListener('submit', function(e) {
            e.preventDefault();
            clearTimeout(debounceTimer);
            aplicarFiltros();
        });

        document.getElementById('btnLimpiar').addEventListener('click', async function(e) {
            e.preventDefault();
            document.getElementById('formBuscar').reset();
            await cargarTabla(URL_CATALOGO_DBA_BASE);
        });

        function mapearDatosCatalogoDBA(data) {
            document.getElementById('codigo').value = data.codigo || '';
            document.getElementById('area_id').value = data.area_id || '';
            document.getElementById('grado_id').value = data.grado_id || '';
            document.getElementById('descripcion').value = data.descripcion || '';
        }

        function cargarDatosCatalogoDBA(id) {
            Swal.fire({
                title: 'Cargando...',
                text: 'Consultando datos del catálogo',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading()
            });

            fetch(`${URL_CATALOGO_DBA_BASE}/datos/${id}`, {
                    headers: {
                        'Accept': 'application/json'
                    }
                })
                .then(r => r.json())
                .then(resp => {
                    Swal.close();
                    if (!resp.success) throw new Error('No data');
                    mapearDatosCatalogoDBA(resp.data);
                })
                .catch(() => {
                    Swal.close();
                    mostrarToast('error', 'No se pudo cargar la información del catálogo');
                    cerrarModalCrearCatalogoDBA();
                });
        }

        async function guardarCatalogoDBA() {
            const form = document.getElementById('formCrearCatalogoDBA');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const esCrear = tipoPost === 1;
            const formData = new FormData(form);

            if (esCrear) {
                setBtnCrearCatalogoDBA('creando');

                $.ajax({
                    url: URL_CATALOGO_DBA_GUARDAR,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    dataType: 'json',
                    success: function(res) {
                        if (!res.success) {
                            mostrarToast('error', res.message);
                            return;
                        }
                        cerrarModalCrearCatalogoDBA();
                        Swal.fire({
                            icon: 'success',
                            title: res.message,
                            timer: 1500,
                            showConfirmButton: false,
                        }).then(() => window.location.reload());
                    },
                    error: function(xhr) {
                        if (xhr.status === 422) {
                            const errors = xhr.responseJSON?.errors ?? {};
                            mostrarToast('error', 'Verifique los datos ingresados');
                            mostrarErroresModal(errors, 'formCrearCatalogoDBA');
                            return;
                        }
                        mostrarToast('error', xhr.responseJSON?.message ||
                            'Error al crear el catálogo DBA');
                    },
                    complete: function() {
                        setBtnCrearCatalogoDBA('crear');
                    }
                });
                return;
            }

            if (tipoPost === 2) {
                if (!id_editar) {
                    mostrarToast('error', 'No se identificó el catálogo a editar.');
                    return;
                }

                setBtnCrearCatalogoDBA('guardando');
                formData.delete('es_men');
                formData.append('_method', 'PUT');

                $.ajax({
                    url: `${URL_CATALOGO_DBA_BASE}/${id_editar}`,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    dataType: 'json',
                    success: function(res) {
                        if (!res.success) {
                            mostrarToast('error', res.message || 'No se pudo actualizar');
                            return;
                        }
                        cerrarModalCrearCatalogoDBA();
                        Swal.fire({
                            icon: 'success',
                            title: res.message,
                            timer: 1500,
                            showConfirmButton: false,
                        }).then(() => window.location.reload());
                    },
                    error: function(xhr) {
                        if (xhr.status === 422) {
                            const errors = xhr.responseJSON?.errors ?? {};
                            mostrarToast('error', 'Verifique los datos ingresados');
                            mostrarErroresModal(errors, 'formCrearCatalogoDBA');
                            return;
                        }
                        mostrarToast('error', xhr.responseJSON?.message ||
                            'Error al actualizar el catálogo DBA');
                    },
                    complete: function() {
                        setBtnCrearCatalogoDBA('editar');
                    }
                });
            }
        }

        $(document).on('change', '.toggle-activo', function() {
            let checkbox = $(this);
            let id = checkbox.data('id');
            let nombre = checkbox.data('nombre');

            if (checkbox.prop('checked')) {
                actualizarEstado(id, checkbox);
                return;
            }

            Swal.fire({
                title: `¿Desactivar ${nombre}?`,
                html: `El catálogo dejará de estar disponible.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Desactivar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#DC2626',
                cancelButtonColor: '#94A3B8',
            }).then((result) => {
                if (result.isConfirmed) {
                    actualizarEstado(id, checkbox);
                } else {
                    checkbox.prop('checked', true);
                }
            });
        });

        function actualizarEstado(id, checkbox) {
            $.ajax({
                url: `${URL_CATALOGO_DBA_BASE}/${id}/toggle-activo`,
                type: 'PATCH',
                data: {
                    _token: $('meta[name="csrf-token"]').attr('content')
                },
                success: function(response) {
                    Swal.fire({
                        icon: 'success',
                        title: response.estado ?
                            'Catálogo activado' : 'Catálogo desactivado',
                        timer: 1500,
                        showConfirmButton: false,
                    });
                },
                error: function(xhr) {
                    checkbox.prop('checked', !checkbox.prop('checked'));
                    Swal.fire({
                        icon: 'warning',
                        title: 'No permitido',
                        text: xhr.responseJSON?.message ??
                            'No fue posible actualizar el estado.'
                    });
                }
            });
        }

        async function cargarTabla(url) {
            const contenedor = document.getElementById('contenedorTabla');
            const cargando = document.getElementById('cargando-tabla');
            if (!contenedor) return;

            contenedor.style.opacity = '.4';
            if (cargando) cargando.style.display = 'block';

            const res = await ajaxRequest(url);

            contenedor.style.opacity = '1';
            if (cargando) cargando.style.display = 'none';

            if (res.success && res.html) {
                document.getElementById('contenedorTabla').innerHTML = res.html;
                history.pushState(null, '', url);
                const params = new URL(url).searchParams;
                const tieneFiltros = params.has('buscar') || params.has('area_id') || params.has('grado_id');
                document.getElementById('btnLimpiar').style.display = tieneFiltros ? 'inline-flex' : 'none';
            } else {
                mostrarToast('error', 'Error al cargar los datos');
            }
        }

        document.getElementById('contenedorTabla')?.addEventListener('click', function(e) {
            const link = e.target.closest('.pagination a');
            if (!link) return;
            e.preventDefault();
            cargarTabla(link.href);
        });

        document.getElementById('formCrearCatalogoDBA')?.addEventListener('submit', function(e) {
            e.preventDefault();
            guardarCatalogoDBA();
        });
    </script>
@endpush
