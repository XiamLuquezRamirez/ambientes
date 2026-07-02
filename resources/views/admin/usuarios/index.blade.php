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
    @include('admin.usuarios.ver_contra_gen')
    @include('admin.usuarios.completar_info')
@endsection

@push('scripts')
    <script>
        window.URL_USUARIOS = "{{ route('admin.usuarios') }}";
        const URL_USUARIOS = window.URL_USUARIOS;
        var tipoPost = 1; // 1: Crear, 2: Editar
        var id_editar = '';

        /* ── Bootstrap Modal ─────────────────────────────────────────── */
        const modalBSUsuario = new bootstrap.Modal(document.getElementById('modalUsuario'));
        const modalBSPasswordGenerada = new bootstrap.Modal(document.getElementById('modalBSPasswordGenerada'));
        const modalBSCompletarInfo = new bootstrap.Modal(document.getElementById('modalBSCompletarInfo'));
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');

        // Al cerrar cualquier modal, limpiar errores y resetear el formulario correspondiente.
        document.getElementById('modalUsuario').addEventListener('hidden.bs.modal', function() {
            limpiarErroresModal();
            document.getElementById('formUsuario').reset();
        });
        document.getElementById('modalBSCompletarInfo').addEventListener('hidden.bs.modal', function() {
            limpiarErroresModal();
        });
        document.getElementById('modalBSPasswordGenerada').addEventListener('hidden.bs.modal', function() {
            limpiarErroresModal();
            document.getElementById('formPasswordGenerada').reset();
        });

        function abrirModal() {
            $("#modalUsuarioLabel").text('Crear Usuario');
            $("#modalUsuarioSubtitle").text('Completa los datos para crear el usuario');
            $("#modalUsuarioIcon").html('<i class="fas fa-user-plus text-white"></i>');
            bootstrap.Tab.getOrCreateInstance(
                $('a[href="#datosPersonales"]')[0]
            ).show();
            tipoPost = 1;
            modalBSUsuario.show();
        }

        function abrirModalEditar(id) {
            $("#modalUsuarioLabel").text('Editar Usuario');
            $("#modalUsuarioSubtitle").text('Completa los datos para editar el usuario');
            $("#modalUsuarioIcon").html('<i class="fas fa-user-edit text-white"></i>');
            bootstrap.Tab.getOrCreateInstance(
                $('a[href="#datosPersonales"]')[0]
            ).show();
            tipoPost = 2;
            cargarDatosUsuario(id);
            modalBSUsuario.show();
        }


        /* ── Modal Bootstrap 5 – Información de la Cuenta ──────────────────────── */
        function abrirModalBSPasswordGenerada() {
            $("#modalBSPasswordGeneradaLabel").text('Información de la Cuenta');
            $("#modalBSPasswordGeneradaSubtitle").text(
                'La cuenta se ha creado correctamente. Por favor, anotar la contraseña antes de cerrar.');
            $("#modalBSPasswordGeneradaIcon").html('<i class="fas fa-info-circle text-white"></i>');
            modalBSPasswordGenerada.show();
        }

        function cerrarModalBSCompletarInfo() {
            modalBSCompletarInfo.hide();
        }

        function cerrarModalUsuario() {
            document.getElementById('formUsuario').reset();
            modalBSUsuario.hide();
        }

        /* ── Errores inline en modal ─────────────────────────────────── */
        // Elimina cualquier mensaje o estado de validación que haya quedado en los formularios.
        function limpiarErroresModal() {
            document.querySelectorAll('#formUsuario .campo-error, #formCompletarInfo .campo-error').forEach(el => el
                .remove());
            document.querySelectorAll('#formUsuario .is-invalid, #formCompletarInfo .is-invalid').forEach(el => el
                .classList.remove('is-invalid'));
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

        function mostrarErroresModal(errors, form) {
            limpiarErroresModal();
            $.each(errors, function(campo, mensajes) {
                const $input = $(`#${form} [name="${campo}"]`);
                if (!$input.length) return;
                $input.addClass('is-invalid');

                var mensaje = '';
                switch (mensajes[0]) {
                    case 'validation.unique':
                        mensaje = 'Ya existe un usuario con';
                        if (campo === 'email') {
                            mensaje += ' este correo electrónico';
                        } else if (campo === 'identificacion') {
                            mensaje += ' esta identificación';
                        }
                        mensaje += '.';
                        break;
                    case 'validation.email':
                        mensaje = 'El correo electrónico no es válido';
                        break;
                    case 'validation.integer':
                        mensaje = 'El valor debe ser un número entero';
                        break;
                    case 'validation.string':
                        mensaje = 'El valor debe ser una cadena de texto';
                        break;
                    case 'validation.numeric':
                        mensaje = 'El valor debe ser un número';
                        break;
                    case 'validation.required':
                        mensaje = 'Este campo es requerido';
                        break;
                    default:
                        mensaje = 'Este campo es requerido';
                        break;
                }
                $('<div>', {
                    class: 'campo-error',
                    text: mensaje
                }).insertAfter($input);
            });
            $(`#${form} .is-invalid`).first().focus();
        }

        let idCompletarInfo = null;

        async function abrirModalCompletarInfo(id) {
            try {
                idCompletarInfo = id;
                const resp = await ajaxRequest(`${URL_USUARIOS}/${id}`);
                if (!resp.success) throw new Error('No data');

                const usuario = resp.usuario;

                document.getElementById('formCompletarInfo').reset();

                document.getElementById('nombre').value = usuario.nombre;
                document.getElementById('apellido').value = usuario.apellido;
                document.getElementById('email').value = usuario.email;
                document.getElementById('identificacion').value = usuario.identificacion;

                document.getElementById('telefono').value = usuario.telefono ?? '';
                document.getElementById('direccion').value = usuario.direccion ?? '';
                document.getElementById('especialidad').value = usuario.especialidad ?? '';
                document.getElementById('fecha_ingreso').value = usuario.fecha_ingreso ?? '';
                $("#modalBSCompletarInfoIcon").html('<i class="fas fa-user-edit text-white"></i>');
                $("#modalBSCompletarInfoLabel").text('Completar Información');
                $("#modalBSCompletarInfoSubtitle").text(`${usuario.nombre} ${usuario.apellido} · ${usuario.email}`);
                modalBSCompletarInfo.show();
            } catch (error) {
                console.error(error);
                mostrarToast('error', 'No se pudo cargar la información');
            }
        }

        document.getElementById('formCompletarInfo')
            .addEventListener('submit', function(e) {
                e.preventDefault();
                const btn = document.getElementById('btnCompletarInfo');
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Guardando...';
                const formData = new FormData(this);
                formData.append('_method', 'PUT');
                $.ajax({
                    url: `${URL_USUARIOS}/${idCompletarInfo}/completar-info`,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: async function(res) {
                        modalBSCompletarInfo.hide();
                        if (res.password_generada) {
                            document.getElementById('passwordGenerada').value =
                                res.password_generada;
                            abrirModalBSPasswordGeneradaEditar();
                        }
                        await cargarTabla(location.href);
                        Swal.fire({
                            icon: 'success',
                            title: res.message,
                            timer: 1600,
                            showConfirmButton: false
                        });
                    },
                    error: function(xhr) {
                        mostrarErroresModal(xhr.responseJSON.errors, 'formCompletarInfo');
                        mostrarToast(
                            'error',
                            'Verifique la información ingresada.'
                        );

                    },
                    complete: function() {
                        btn.disabled = false;
                        btn.innerHTML =
                            '<i class="fa-solid fa-save"></i> Guardar';
                    }

                });

            });

        /* ── Crear usuario (AJAX) ────────────────────────────────────── */
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
                            modalBSUsuario.hide();
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

                        mostrarErroresModal(xhr.responseJSON.errors, 'formCompletarInfo');
                    },
                    complete: function() {
                        $('#btnUsuario').prop('disabled', false).text('Crear Usuario');
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
                            modalBSUsuario.hide();
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
                            modalBSUsuario.hide();
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

                        mostrarErroresModal(xhr.responseJSON.errors, 'formUsuario');
                    },
                    complete: function() {
                        $('#btnUsuario').prop('disabled', false).text('Crear Usuario');
                    }
                });
            }
        });

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
            let apellido = checkbox.data('apellido');

            // Si se está activando, ejecutar directamente
            if (checkbox.prop('checked')) {
                actualizarEstado(id, checkbox);
                return;
            }

            // Solo mostrar confirmación al desactivar
            Swal.fire({
                title: `¿Desactivar a ${nombre} ${apellido} ?`,
                html: `
Se cerrará cualquier sesión activa de este docente.
<br><br>
Las asignaciones de grupos quedarán liberadas.
`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Desactivar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    actualizarEstado(id, checkbox);
                } else {
                    // Revertir el switch
                    checkbox.prop('checked', true);
                }
            });

        });

        // Actualizar el estado del docente.
        function actualizarEstado(id, checkbox) {
            $.ajax({
                url: `${URL_DOCENTES}/${id}/toggle-activo`,
                type: 'PATCH',
                data: {
                    _token: $('meta[name="csrf-token"]').attr('content')
                },
                success: function(response) {
                    Swal.fire({
                        icon: 'success',
                        title: response.estado === 'activo' ?
                            'Docente activado' : 'Docente desactivado',
                        text: response.estado === 'inactivo' && response.asignaciones_liberadas > 0 ?
                            `Se liberaron ${response.asignaciones_liberadas} asignación(es) de grupo.` :
                            undefined,
                        timer: response.estado === 'inactivo' && response.asignaciones_liberadas > 0 ?
                            undefined : 1500,
                        showConfirmButton: response.estado === 'inactivo' && response
                            .asignaciones_liberadas > 0,
                    });

                    if (response.estado === 'inactivo') {
                        refrescarModalDocentesAsignadosSiAbierto();
                    }
                },
                error: function() {
                    // Revertir el estado si falla
                    checkbox.prop('checked', !checkbox.prop('checked'));
                    Swal.fire(
                        'Error',
                        'No fue posible actualizar el estado.',
                        'error'
                    );
                }
            });
        }

        function cargarDatosUsuario(id) {
            fetch(`${URL_USUARIOS}/datos/${id}`)
                .then(response => response.json())
                .then(resp => {
                    if (!resp.success) throw new Error('No data');
                    mapearDatosUsuario(resp.data);
                })
                .catch(error => {
                    mostrarToast('error', 'No se pudo cargar la información del usuario');
                });
        }

        function mapearDatosUsuario(data) {
            $('#nombre').val(data.nombre);
            $('#apellido').val(data.apellido);
            $('#email').val(data.email);
            $('#identificacion').val(data.identificacion);
            $('#rol').val(data.rol);
            id_editar = data.id;
        }


        // Copiar contraseña al portapapeles.
        $(document).on('click', '.btn-copiar', function() {
            const inputId = $(this).data('target');
            const texto = $('#' + inputId).val();
            navigator.clipboard.writeText(texto)
                .then(() => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Copiado al portapapeles',
                        timer: 1200,
                        showConfirmButton: false
                    });
                })
                .catch(() => {
                    Swal.fire(
                        'Error',
                        'No fue posible copiar el texto.',
                        'error'
                    );
                });

        });
        // Descargar PDF del usuario seleccionado.
        document.getElementById('btnDescargarPdf')
            .addEventListener('click', function() {
                const id = this.dataset.usuarioId;
                window.open(`${URL_USUARIOS}/${id}/generar-pdf`, '_blank');
            });


        tooltipTriggerList.forEach(el => {
            new bootstrap.Tooltip(el);
        });
    </script>
@endpush
