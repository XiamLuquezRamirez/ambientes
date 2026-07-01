@extends('layouts.admin')
@section('title', 'Usuarios')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/estilosModals.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/docente/index.css') }}">
@endpush

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
        <div>
            <h1>Usuarios</h1>
            <p>Gestión de cuentas de usuarios</p>
        </div>
        <div style="display:flex;gap:10px">
            <button class="btn btn-primary" onclick="abrirModal()"><i class="fas fa-plus"></i> Nuevo Usuario</button>
        </div>
    </div>
    {{-- ── Filtros ──────────────────────────────────────────────────── --}}
    <form id="formBuscar" style="display:flex;gap:12px;margin-bottom:24px;align-items:center;flex-wrap:wrap">
        <div class="input-buscar">
            <span class="icono-buscar"><i class="fas fa-search"></i></span>
            <input type="text" name="buscar" placeholder="Buscar por nombre o correo..." value="{{ request('buscar') }}"
                autocomplete="off">
        </div>
        {{-- <select name="ambiente_id" class="form-control" style="width:auto">
            <option value="">Todos los ambientes</option>
            @foreach ($ambientes as $a)
                <option value="{{ $a->id }}" {{ request('ambiente_id') == $a->id ? 'selected' : '' }}>
                    {{ $a->nombre }}</option>
            @endforeach
        </select> --}}

        {{-- Este bloque genera las opciones del filtro "estado" para la búsqueda de docentes.
                Se utiliza un array asociativo: clave => etiqueta a mostrar.
                'true' => 'Activo', 'false' => 'Inactivo'.
                Por cada opción,
                  - value="{{ $val }}" es el valor enviado por el formulario.
                  - Se marca como selected si el estado actual en la URL coincide exactamente (comparación estricta) con el $val.
                  - La etiqueta visible será "Activo" o "Inactivo". --}}
        <select name="estado" class="form-control" style="width:auto">
            <option value="">Todos los estados</option>
            @foreach (['activo' => 'Activo', 'inactivo' => 'Inactivo', 'eliminado' => 'Eliminado'] as $val => $label)
                <option value="{{ $val }}" {{ request('estado') === $val ? 'selected' : '' }}>{{ $label }}
                </option>
            @endforeach
        </select>

        <select name="rol" class="form-control" style="width:auto">
            <option value="">Todos los roles</option>
            @foreach (['admin' => 'Administrador', 'docente' => 'Docente'] as $val => $label)
                <option value="{{ $val }}" {{ request('rol') === $val ? 'selected' : '' }}>{{ $label }}
                </option>
            @endforeach
        </select>
        <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-filter"></i> Filtrar</button>
        <a id="btnLimpiar" href="{{ route('admin.usuarios') }}" class="btn btn-sm"
            style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;
              display:{{ request()->hasAny(['buscar', 'estado', 'rol']) ? 'inline-flex' : 'none' }}">
            <i class="fas fa-broom"></i> Limpiar
        </a>
    </form>
    {{-- ── Contenedor de tabla ──────────────────────────────────────── --}}
    <div id="contenedorTabla">
        @include('admin.usuarios._tabla')
    </div>
    <div id="cargando-tabla"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>

    @include('admin.usuarios.crear_usuario')
@endsection

@push('scripts')
    <script>
        window.URL_USUARIOS = "{{ route('admin.usuarios') }}";
        const URL_USUARIOS = window.URL_USUARIOS;
        var tipoPost = 1; // 1: Crear, 2: Editar
        var id_editar = '';
        const modalBSUsuario = new bootstrap.Modal(document.getElementById('modalUsuario'));

        // Al cerrar cualquier modal, limpiar errores y resetear el formulario correspondiente.
        document.getElementById('modalUsuario').addEventListener('hidden.bs.modal', function() {
            limpiarErroresModal();
        });

        function abrirModal() {
            $("#modalUsuarioLabel").text('Crear Usuario');
            $("#modalUsuarioSubtitle").text('Completa los datos para crear el usuario');
            $("#modalUsuarioIcon").html('<i class="fas fa-user-plus text-white"></i>');
            // bootstrap.Tab.getOrCreateInstance(
            //     $('a[href="#datosUsuario"]')[0]
            // ).show();
            tipoPost = 1;
            modalBSUsuario.show();
        }

        function cerrarModalUsuario() {
            document.getElementById('formUsuario').reset();
            modalBSUsuario.hide();
        }

        /* ── Tabla AJAX ──────────────────────────────────────────────── */
        async function cargarTabla(url) {
            document.getElementById('contenedorTabla').style.opacity = '.4';
            document.getElementById('cargando-tabla').style.display = 'block';

            const res = await ajaxRequest(url);

            document.getElementById('contenedorTabla').style.opacity = '1';
            document.getElementById('cargando-tabla').style.display = 'none';

            if (res.success) {
                document.getElementById('contenedorTabla').innerHTML = res.html;
                history.pushState(null, '', url);
                const params = new URL(url).searchParams;
                const tieneFilros = params.has('buscar') || params.has('estado') || params.has('rol');
                document.getElementById('btnLimpiar').style.display = tieneFilros ? 'inline-flex' : 'none';
            } else {
                mostrarToast('error', 'Error al cargar los datos');
            }
        }

        document.addEventListener('click', function(e) {
            const pagBtn = e.target.closest('.pag-btn[href]');
            if (pagBtn) {
                e.preventDefault();
                cargarTabla(pagBtn.href);
            }
        });

        /* ── Filtros ─────────────────────────────────────────────────── */
        function aplicarFiltros() {
            const params = new URLSearchParams(new FormData(document.getElementById('formBuscar')));
            for (const [k, v] of [...params.entries()]) {
                if (!v) params.delete(k);
            }
            const url = params.toString() ? `${URL_USUARIOS}?${params.toString()}` : URL_USUARIOS;
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
            await cargarTabla(URL_USUARIOS);
        });

        /* ── Errores inline en modal ─────────────────────────────────── */
        // Elimina cualquier mensaje o estado de validación que haya quedado en los formularios.
        function limpiarErroresModal() {
            document.querySelectorAll('#formBuscar .campo-error, #formAsignarInfo .campo-error').forEach(el => el
                .remove());
            document.querySelectorAll('#formBuscar .is-invalid, #formAsignarInfo .is-invalid').forEach(el => el
                .classList.remove('is-invalid'));
        }

        function mostrarErroresModal(errors) {
            limpiarErroresModal();
            for (const [campo, mensajes] of Object.entries(errors)) {
                const input = document.querySelector(`#formBuscar [name="${campo}"]`);
                if (!input) continue;
                input.classList.add('is-invalid');
                const div = document.createElement('div');
                div.className = 'campo-error';
                div.textContent = mensajes[0];
                input.insertAdjacentElement('afterend', div);
            }
            const primero = document.querySelector('#formBuscar .is-invalid');
            if (primero) primero.focus();
        }

        /* ── Crear docente (AJAX) ────────────────────────────────────── */
        document.getElementById('formUsuario').addEventListener('submit', async function(e) {
            e.preventDefault();
            if (tipoPost == 1) {
                const btn = document.getElementById('btnUsuario');
                btn.disabled = true;
                btn.textContent = 'Guardando…';
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Guardando…';
                const formData = new FormData(this);
                const datos = Object.fromEntries(formData.entries());
                let titulo = '';
                btn.disabled = false;
                btn.textContent = 'Crear Usuario';
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Guardar';

                $.ajax({
                    url: URL_USUARIOS,
                    type: 'POST',
                    data: formData,
                    dataType: 'json',
                    success: async function(res) {
                        Swal.close();
                        if (res.success) {
                            document.getElementById('passwordGenerada').value =
                                res.password_generada;
                            document.getElementById('asignar_email').value = datos.email ?? '';
                            modalBS.hide();
                            const btnPdf = document.getElementById('btnDescargarPdf');
                            btnPdf.dataset.usuarioId = res.usuario.id;
                            abrirModalBSPasswordGenerada();
                            await cargarTabla(location.href);
                            document.getElementById('modalBSPasswordGenerada')
                                .addEventListener('hidden.bs.modal', function() {
                                    Swal.fire({
                                        icon: 'success',
                                        title: res.message,
                                        timer: 1600,
                                        showConfirmButton: false,
                                    });
                                });
                        } else {
                            mostrarToast('error', res.message);
                        }
                    },
                    error: function(xhr) {
                        Swal.close();
                        if (xhr.responseJSON.message.includes('validation.')) {
                            mostrarToast('error', 'Verifique los datos ingresados');
                        } else {
                            mostrarToast('error', "Error al crear el usuario");
                        }

                        mostrarErroresModal(xhr.responseJSON.errors);
                    },
                    complete: function() {
                        $('#btnCrearUsuario').prop('disabled', false).text('Crear Usuario');
                    }
                });

            } else {
                const btn = document.getElementById('btnUsuario');
                btn.disabled = true;
                btn.textContent = 'Guardando…';
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Guardando…';
                const formData = new FormData(this);
                const datos = Object.fromEntries(formData.entries());
                const id = id_editar;
                btn.disabled = false;
                btn.textContent = 'Guardar';
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Guardar';
                let titulo = '';
                let texto = '';

                formData.append('_method', 'PUT');
                $.ajax({
                    url: `${URL_USUARIOS}/${id}`,
                    type: 'POST',
                    data: formData,
                    dataType: 'json',
                    success: async function(res) {
                        Swal.close();
                        if (res.success && res.password_generada) {
                            document.getElementById('passwordGenerada').value =
                                res.password_generada;
                            document.getElementById('asignar_email').value = datos.email ?? '';
                            modalBS.hide();
                            const btnPdf = document.getElementById('btnDescargarPdf');
                            btnPdf.dataset.usuarioId = res.usuario.id;
                            btnPdf.dataset.nombre = res.usuario.nombre;
                            abrirModalBSPasswordGeneradaEditar();
                            await cargarTabla(location.href);
                            document.getElementById('modalBSPasswordGenerada')
                                .addEventListener('hidden.bs.modal', function() {
                                    Swal.fire({
                                        icon: 'success',
                                        title: res.message,
                                        timer: 1600,
                                        showConfirmButton: false,
                                    });
                                });
                        } else if (res.success) {
                            modalBS.hide();
                            Swal.fire({
                                icon: 'success',
                                title: res.message,
                                timer: 1600,
                                showConfirmButton: false,
                            });
                            await cargarTabla(location.href);
                        }
                    },
                    error: function(xhr) {
                        Swal.close();
                        if (xhr.responseJSON.message.includes('validation.')) {
                            mostrarToast('error', 'Verifique los datos ingresados');
                        } else {
                            mostrarToast('error', "Error al crear el usuario");
                        }

                        mostrarErroresModal(xhr.responseJSON.errors);
                    },
                    complete: function() {
                        $('#btnCrearUsuario').prop('disabled', false).text('Crear Usuario');
                    }
                });
            }
        });
    </script>
@endpush
