@extends('layouts.superAdmin')
@section('title', 'Administradores')

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
        <div>
            <h1>Administradores</h1>
            <p>Gestión de administradores</p>
        </div>
        <div style="display:flex;gap:10px">
            <button class="btn btn-primary" onclick="abrirModalCrearAdministrador()"><i class="fas fa-plus"></i> Nuevo
                Administrador</button>
        </div>
    </div>

    <form id="formBuscar" style="display:flex;gap:12px;margin-bottom:24px;align-items:center;flex-wrap:wrap">
        <div class="input-buscar">
            <span class="icono-buscar"><i class="fas fa-search"></i></span>
            <input type="text" name="buscar" placeholder="Buscar por nombre o correo..." value="{{ request('buscar') }}"
                autocomplete="off">
        </div>

        <select name="institucion_id" class="form-control" style="width:auto">
            <option value="">Todas las instituciones</option>
            @foreach ($instituciones as $institucion)
                <option value="{{ $institucion->id }}"
                    {{ request('institucion_id') === $institucion->id ? 'selected' : '' }}>{{ $institucion->nombre }}
                </option>
            @endforeach
        </select>

        <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-filter"></i> Filtrar</button>
        <a id="btnLimpiar" href="{{ route('superadmin.administradores.listar') }}" class="btn btn-sm"
            style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;
              display:{{ request()->hasAny(['buscar', 'institucion_id']) ? 'inline-flex' : 'none' }}">
            <i class="fas fa-broom"></i> Limpiar
        </a>
    </form>

    <div id="contenedorTabla">
        @include('superAdmin.administradores._tabla')
    </div>
    <div id="cargando-tabla"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
    @include('superAdmin.administradores.modalCrearAdmins')
    @include('admin.usuarios.ver_contra_gen')
    @include('superAdmin.administradores.ver-accesos')

@endsection

@push('scripts')
    <script>
        const URL_ADMINISTRADORES_BASE = @json(url('superadmin/administradores'));
        const URL_ADMINISTRADORES_GUARDAR = @json(route('superadmin.administradores.guardar'));

        /** 1 = crear, 2 = editar */
        var tipoPost = 1;
        var id_editar = '';

        const modalCrearAdministrador = document.getElementById('modalCrearAdministrador');
        const modalBSPasswordGeneradaEl = document.getElementById('modalBSPasswordGenerada');
        const modalBSPasswordGenerada = modalBSPasswordGeneradaEl ?
            new bootstrap.Modal(modalBSPasswordGeneradaEl) :
            null;

        function getModalCrearAdministrador() {
            return bootstrap.Modal.getOrCreateInstance(modalCrearAdministrador);
        }

        function cerrarModalCrearAdministrador() {
            bootstrap.Modal.getInstance(modalCrearAdministrador)?.hide();
        }

        function setBtnCrearAdministrador(modo) {
            const btn = document.getElementById('btnCrearAdministrador');
            if (!btn) return;
            btn.disabled = false;
            if (modo === 'creando') {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando…';
            } else if (modo === 'guardando') {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';
            } else if (modo === 'crear') {
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Crear Administrador';
            } else {
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';
            }
        }

        function abrirModalCrearAdministrador() {
            tipoPost = 1;
            id_editar = '';
            $('#modalCrearAdministradorLabel').text('Crear Administrador');
            $('#modalCrearAdministradorSubtitle').text('Completa los datos para crear el administrador');
            $('#modalCrearAdministradorIcon').html('<i class="fas fa-user-plus text-white"></i>');
            setBtnCrearAdministrador('crear');
            resetFormCrearAdministrador();
            getModalCrearAdministrador().show();
        }

        function abrirModalEditarAdministrador(id) {
            tipoPost = 2;
            id_editar = id;
            $('#modalCrearAdministradorLabel').text('Editar Administrador');
            $('#modalCrearAdministradorSubtitle').text('Modifica los datos del administrador');
            $('#modalCrearAdministradorIcon').html('<i class="fas fa-user-pen text-white"></i>');
            setBtnCrearAdministrador('editar');
            resetFormCrearAdministrador();
            getModalCrearAdministrador().show();
            cargarDatosAdministrador(id);
        }

        function resetFormCrearAdministrador() {
            const form = document.getElementById('formCrearAdministrador');
            if (!form) return;

            form.reset();
            limpiarErroresModal('formCrearAdministrador');
        }

        function abrirModalBSPasswordGenerada() {
            if (!modalBSPasswordGenerada) return;
            $("#modalBSPasswordGeneradaLabel").text('Información del Administrador');
            $("#modalBSPasswordGeneradaSubtitle").text(
                'El administrador se ha creado correctamente. Por favor, anote la contraseña antes de cerrar.');
            modalBSPasswordGenerada.show();
        }

        function cerrarModalBSPasswordGenerada() {
            limpiarErroresModal('formCrearAdministrador');
            document.activeElement?.blur();
            modalBSPasswordGenerada.hide();
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

        function mensajeValidacionAdministrador(campo, codigo) {
            switch (codigo) {
                case 'validation.unique':
                    return 'Este valor ya está registrado.';
                case 'validation.email':
                    return 'El correo electrónico no es válido.';
                case 'validation.exists':
                    return 'La institución seleccionada no es válida.';
                case 'validation.integer':
                case 'validation.numeric':
                    return 'El valor debe ser un número.';
                case 'validation.string':
                    return 'El valor debe ser una cadena de texto.';
                case 'validation.required':
                    return 'Este campo es requerido.';
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
                    text: mensajeValidacionAdministrador(campo, mensajes[0])
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
            const url = params.toString() ? `${URL_ADMINISTRADORES_BASE}?${params.toString()}` : URL_ADMINISTRADORES_BASE;
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
            await cargarTabla(URL_ADMINISTRADORES_BASE);
        });


        function mapearDatosAdministrador(data) {
            document.getElementById('nombre').value = data.nombre || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('institucion').value = data.institucion_id || '';
        }

        function mostrarExitoAlCerrarModalPassword(mensaje) {
            document.getElementById('modalBSPasswordGenerada').addEventListener('hidden.bs.modal', function() {
                Swal.fire({
                    icon: 'success',
                    title: mensaje,
                    timer: 1600,
                    showConfirmButton: false,
                }).then(() => window.location.reload());
            }, {
                once: true
            });
        }

        function cargarDatosAdministrador(id) {
            Swal.fire({
                title: 'Cargando...',
                text: 'Consultando datos del administrador',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading()
            });

            fetch(`${URL_ADMINISTRADORES_BASE}/datos/${id}`, {
                    headers: {
                        'Accept': 'application/json'
                    }
                })
                .then(r => r.json())
                .then(resp => {
                    Swal.close();
                    if (!resp.success) throw new Error('No data');
                    mapearDatosAdministrador(resp.data);
                })
                .catch(() => {
                    Swal.close();
                    mostrarToast('error', 'No se pudo cargar la información del administrador');
                    cerrarModalCrearAdministrador();
                });
        }

        async function guardarAdministrador() {
            const form = document.getElementById('formCrearAdministrador');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            const esCrear = tipoPost === 1;
            const formData = new FormData(form);

            if (esCrear) {
                setBtnCrearAdministrador('creando');

                $.ajax({
                    url: URL_ADMINISTRADORES_GUARDAR,
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

                        const credenciales = res.credenciales;
                        document.getElementById('passwordGenerada').value = credenciales.password;
                        document.getElementById('asignar_email').value = credenciales.correo;

                        const btnPdf = document.getElementById('btnDescargarPdf');
                        if (btnPdf && res.usuario) {
                            btnPdf.dataset.usuarioId = res.usuario.id;
                            btnPdf.dataset.nombre = res.usuario.nombre;
                        }

                        cerrarModalCrearAdministrador();
                        abrirModalBSPasswordGenerada();
                        mostrarExitoAlCerrarModalPassword(res.message);
                    },
                    error: function(xhr) {
                        if (xhr.status === 422) {
                            const errors = xhr.responseJSON?.errors ?? {};
                            mostrarToast('error', 'Verifique los datos ingresados');
                            mostrarErroresModal(errors, 'formCrearAdministrador');
                            return;
                        }
                        mostrarToast('error', xhr.responseJSON?.message ||
                            'Error al crear el administrador');
                    },
                    complete: function() {
                        setBtnCrearAdministrador('crear');
                    }
                });
                return;
            }

            if (tipoPost === 2) {
                if (!id_editar) {
                    mostrarToast('error', 'No se identificó el administrador a editar.');
                    return;
                }

                setBtnCrearAdministrador('guardando');
                formData.append('_method', 'PUT');

                $.ajax({
                    url: `${URL_ADMINISTRADORES_BASE}/${id_editar}`,
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

                        if (res.success) {
                            cerrarModalCrearAdministrador();
                            Swal.fire({
                                icon: 'success',
                                title: res.message,
                                timer: 1500,
                                showConfirmButton: false,
                            }).then(() => window.location.reload());
                        } else if (res.credenciales) {
                            const credenciales = res.credenciales;
                            document.getElementById('passwordGenerada').value = credenciales.password;
                            document.getElementById('asignar_email').value = credenciales.correo;

                            const btnPdf = document.getElementById('btnDescargarPdf');
                            if (btnPdf && res.usuario) {
                                btnPdf.dataset.usuarioId = res.usuario.id;
                                btnPdf.dataset.nombre = res.usuario.nombre;
                            }
                            cerrarModalCrearAdministrador();
                            abrirModalBSPasswordGenerada();
                            mostrarExitoAlCerrarModalPassword(res.message);
                        }

                    },
                    error: function(xhr) {
                        if (xhr.status === 422) {
                            const errors = xhr.responseJSON?.errors ?? {};
                            mostrarToast('error', 'Verifique los datos ingresados');
                            mostrarErroresModal(errors, 'formCrearAdministrador');
                            return;
                        }
                        mostrarToast('error', xhr.responseJSON?.message ||
                            'Error al actualizar el administrador');
                    },
                    complete: function() {
                        setBtnCrearAdministrador('editar');
                    }
                });
            }
        }

        function verPassword(inputId, iconId) {
            const icon = $(iconId)[0];
            const input = $(inputId)[0];

            if (input.type == 'password') {
                input.type = 'text';
                $(icon).removeClass('fa-eye').addClass('fa-eye-slash');
            } else {
                input.type = 'password';
                $(icon).removeClass('fa-eye-slash').addClass('fa-eye');
            }
        }

        function validarPasswords(passwordId, passwordConfirmationId, mensajeId) {
            const password = document.getElementById(passwordId);
            const passwordConfirmation = document.getElementById(passwordConfirmationId);
            const mensaje = document.getElementById(mensajeId);


            if (!passwordConfirmation.value) {
                mensaje.textContent = '';
                return;
            }

            if (password.value === passwordConfirmation.value) {
                mensaje.textContent = 'Las contraseñas coinciden';
                mensaje.className = 'text-success';
            } else {
                mensaje.textContent = 'Las contraseñas no coinciden';
                mensaje.className = 'text-danger';
            }
        }
        // Generar contraseña aleatoria.
        // Esta función se utiliza para generar una contraseña aleatoria cuando se crea un nuevo docente.
        function generarPasswordAleatoria() {
            const length = 8;
            const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let password = '';
            for (let i = 0; i < length; i++) {
                password += charset.charAt(Math.floor(Math.random() * charset.length));
            }
            return password;
        }

        $("#btnGenerarPassword").click(function() {
            const password = generarPasswordAleatoria();
            $("#password").val(password);
            $("#password_confirmation").val(password);
            validarPasswords('password', 'password_confirmation', 'mensajePassword');
        });

        $("#password").on('input', function() {
            validarPasswords('password', 'password_confirmation', 'mensajePassword');
        });

        $("#password_confirmation").on('input', function() {
            validarPasswords('password', 'password_confirmation', 'mensajePassword');
        });

        $(document).on('change', '.toggle-activo', function() {

            let checkbox = $(this);
            let id = checkbox.data('id');
            let nombre = checkbox.data('nombre');

            // Si se está activando, ejecutar directamente
            if (checkbox.prop('checked')) {
                actualizarEstado(id, checkbox);
                return;
            }

            // Solo mostrar confirmación al desactivar
            Swal.fire({
                title: `¿Desactivar a ${nombre} ?`,
                html: `Se cerrará cualquier sesión activa de este administrador.`,
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

        /**
         * Alterna users.estado (activo ↔ inactivo) vía PATCH.
         * El backend responde con { success, estado, message }.
         */
        function actualizarEstado(id, checkbox) {
            $.ajax({
                url: `${URL_ADMINISTRADORES_BASE}/${id}/toggle-activo`,
                type: 'PATCH',
                data: {
                    _token: $('meta[name="csrf-token"]').attr('content')
                },
                success: function(response) {
                    Swal.fire({
                        icon: 'success',
                        title: response.estado === 'activo' ?
                            'Administrador activado' : 'Administrador desactivado',
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

        /**
         * Eliminar administrador (soft-delete vía DELETE).
         * Patrón alineado con admin/usuarios + loading de superadmin/perfiles-aprendizaje:
         * 1) Swal de confirmación
         * 2) Swal loading mientras corre la petición
         * 3) Quita #fila-{id} con fade; si no quedan filas, recarga el partial por AJAX
         * 4) En bloqueo de negocio (403) muestra Swal en lugar de solo toast
         */
        document.addEventListener('click', async function(e) {
            const btn = e.target.closest('.btn-eliminar');
            if (!btn) return;

            const id = btn.dataset.id;
            const nombre = btn.dataset.nombre;

            const confirmacion = await Swal.fire({
                title: '¿Eliminar administrador?',
                text: `"${nombre}" será eliminado.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#DC2626',
                cancelButtonColor: '#94A3B8',
                iconColor: '#F59E0B',
            });

            if (!confirmacion.isConfirmed) return;

            Swal.fire({
                title: 'Eliminando...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading()
            });

            const res = await ajaxRequest(`${URL_ADMINISTRADORES_BASE}/${id}`, 'DELETE');

            if (res.success) {
                Swal.close();
                const fila = document.getElementById(`fila-${id}`);
                if (fila) {
                    fila.style.transition = 'opacity .25s';
                    fila.style.opacity = '0';
                    setTimeout(() => {
                        fila.remove();
                        if (!document.querySelector('#contenedorTabla tbody tr[id^="fila-"]')) {
                            cargarTabla(URL_ADMINISTRADORES_BASE);
                        }
                    }, 250);
                }
                mostrarToast('success', res.message);
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'No permitido',
                    text: res.message || 'No fue posible eliminar el administrador.'
                });
            }
        });

        /**
         * Recarga el partial _tabla vía AJAX (listar responde { success, html }).
         * Se usa cuando, tras eliminar, la tabla queda vacía y hay que pintar el empty state.
         */
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
                const tieneFilros = params.has('buscar') || params.has('institucion_id');
                document.getElementById('btnLimpiar').style.display = tieneFilros ? 'inline-flex' : 'none';
            } else {
                mostrarToast('error', 'Error al cargar los datos');
            }
        }

        document.getElementById('formCrearAdministrador')?.addEventListener('submit', function(e) {
            e.preventDefault();
            guardarAdministrador();
        });

        document.getElementById('btnDescargarPdf')?.addEventListener('click', function() {
            const id = this.dataset.usuarioId;
            if (!id) return;
            window.open(`${URL_ADMINISTRADORES_BASE}/${id}/generar-pdf`, '_blank');
        });
    </script>
@endpush
