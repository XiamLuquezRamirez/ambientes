(function() {
    const $modal = $('#modalRegistrarCondicion');
    const $form = $('#formRegistrarCondicion');
    const $colorPicker = $('#color_hex_picker');
    const $colorHex = $('#color_hex');
    let modoEdicion = false;
    let esSistemaActual = false;

    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content'),
            'X-Requested-With': 'XMLHttpRequest'
        }
    });

    function irATabDatosGenerales() {
        const tab = document.querySelector('#tab-datos-generales');
        if (tab) {
            bootstrap.Tab.getOrCreateInstance(tab).show();
        }
    }

    window.abrirModalRegistrarCondicion = function() {
        modoEdicion = false;
        esSistemaActual = false;
        resetFormRegistrarCondicion();
        configurarModoCrear();
        irATabDatosGenerales();
        bootstrap.Modal.getOrCreateInstance($modal[0]).show();
    };

    window.abrirModalEditarCondicion = function(id) {
        modoEdicion = true;
        resetFormRegistrarCondicion();
        configurarModoEditar();
        irATabDatosGenerales();
        bootstrap.Modal.getOrCreateInstance($modal[0]).show();

        Swal.fire({
            title: 'Cargando...',
            text: 'Consultando datos del perfil de aprendizaje',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading()
        });

        $.ajax({
            url: URL_CONDICION(id),
            type: 'GET',
            dataType: 'json',
            success: function(res) {
                Swal.close();

                if (!res.success || !res.condicion) {
                    mostrarToast('error', 'No fue posible cargar el perfil de aprendizaje.');
                    cerrarModalRegistrarCondicion();
                    return;
                }

                setearDatosCondicion(res.condicion);
            },
            error: function(xhr) {
                Swal.close();
                mostrarToast('error', xhr.responseJSON?.message || 'Error al consultar el perfil de aprendizaje.');
                cerrarModalRegistrarCondicion();
            }
        });
    };

    function configurarModoCrear() {
        $('#modalRegistrarCondicionTitle').text('Nuevo Perfil de Aprendizaje');
        $('#modalRegistrarCondicionSubtitle').text('Registre un perfil de aprendizaje global.');
        $('#hintCodigoAuto').show();
        $('#wrapCodigo').hide();
        $('#wrapNombre').removeClass('col-md-8').addClass('col-12');
        $('.campo-solo-crear').show();
        $('#wrapColor').show();
        $('#wrapEsSistema').show();
        $('#estado').prop('disabled', false);
        $('#es_sistema').prop('disabled', false).prop('checked', false);
    }

    function configurarModoEditar() {
        $('#modalRegistrarCondicionTitle').text('Editar Perfil de Aprendizaje');
        $('#modalRegistrarCondicionSubtitle').text('Puede modificar nombre, descripción y color.');
        $('#hintCodigoAuto').hide();
        $('#wrapCodigo').show();
        $('#wrapNombre').removeClass('col-12').addClass('col-md-8');
        $('.campo-solo-crear').hide();
        $('#wrapColor').show();
        $('#wrapEsSistema').show();
    }

    function setearDatosCondicion(condicion) {
        esSistemaActual = !!condicion.es_sistema;

        $('#id_condicion').val(condicion.id);
        $('#codigo').val(condicion.codigo || '');
        $('#nombre').val(condicion.nombre || '');
        $('#descripcion_corta').val(condicion.descripcion_corta || '');

        const color = (condicion.color_hex || '#2563EB').toString().toUpperCase();
        $colorPicker.val(color);
        $colorHex.val(color);

        $('#es_sistema').prop('checked', esSistemaActual);
        // Sistema: marcado y bloqueado. Personalizada: editable.
        $('#es_sistema').prop('disabled', esSistemaActual);
    }

    function cerrarModalRegistrarCondicion() {
        bootstrap.Modal.getInstance($modal[0])?.hide();
    }

    function resetFormRegistrarCondicion() {
        $form[0].reset();
        $('#id_condicion').val('');
        $('#codigo').val('');
        $form.find('.is-invalid').removeClass('is-invalid');
        $form.find('.invalid-feedback').remove();
        $colorPicker.val('#2563EB');
        $colorHex.val('#2563EB');
        $('#estado').val('1');
        $('#es_sistema').prop('checked', false).prop('disabled', false);
    }

    function sincronizarColorDesdePicker() {
        $colorHex.val($colorPicker.val().toUpperCase());
    }

    function sincronizarColorDesdeTexto() {
        const valor = $colorHex.val().trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(valor)) {
            $colorPicker.val(valor);
            $colorHex.val(valor.toUpperCase());
        }
    }

    function mostrarErroresValidacion(errors) {
        $form.find('.is-invalid').removeClass('is-invalid');
        $form.find('.invalid-feedback').remove();

        $.each(errors || {}, function(campo, mensajes) {
            const $input = $form.find(`[name="${campo}"]`);
            if (!$input.length) return;

            $input.addClass('is-invalid');
            $input.after(
                `<div class="invalid-feedback d-block">${traducirErrores(mensajes[0])}</div>`
            );
        });

        irATabDatosGenerales();
    }

    function traducirErrores(mensaje) {
        switch (mensaje) {
            case 'validation.required':
                return 'El campo es requerido.';
            case 'validation.string':
                return 'El campo debe ser una cadena de texto.';
            case 'validation.max.string':
                return 'El campo debe tener menos de 150 caracteres.';
            case 'validation.min.string':
                return 'El campo debe tener al menos 10 caracteres.';
        }
    }

    function guardarCondicion() {
        if (!$form[0].checkValidity()) {
            $form[0].reportValidity();
            irATabDatosGenerales();
            return;
        }

        const id = $('#id_condicion').val();
        const datos = {
            nombre: ($('#nombre').val() || '').trim(),
            descripcion_corta: ($('#descripcion_corta').val() || '').trim(),
            color_hex: ($('#color_hex').val() || '').trim().toUpperCase(),
            _token: $('meta[name="csrf-token"]').attr('content')
        };

        if (!modoEdicion) {
            datos.estado = $('#estado').val();
            datos.es_sistema = $('#es_sistema').is(':checked') ? 1 : 0;
        } else if (!esSistemaActual) {
            datos.es_sistema = $('#es_sistema').is(':checked') ? 1 : 0;
        }

        Swal.fire({
            title: 'Guardando...',
            text: 'Por favor espere',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading()
        });

        $.ajax({
            url: modoEdicion ? URL_CONDICION(id) : URL_GUARDAR_CONDICION,
            type: modoEdicion ? 'PUT' : 'POST',
            data: datos,
            dataType: 'json',
            success: function(res) {
                if (!res.success) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: res.message || 'No fue posible guardar el perfil de aprendizaje.'
                    });
                    return;
                }

                cerrarModalRegistrarCondicion();
                Swal.close();
                mostrarToast('success', res.message || 'El perfil de aprendizaje se guardó correctamente.');

                if (typeof window.cargarTablaCondiciones === 'function') {
                    window.cargarTablaCondiciones();
                }
            },
            error: function(xhr) {
                if (xhr.status === 422) {
                    const errors = xhr.responseJSON?.errors || {};
                    if (Object.keys(errors).length) {
                        mostrarErroresValidacion(errors);
                        mostrarToast('error', 'Verifique los datos ingresados');
                        return;
                    }

                    Swal.fire({
                        icon: 'warning',
                        title: 'No permitido',
                        text: xhr.responseJSON?.message || 'No fue posible guardar el perfil de aprendizaje.'
                    });
                    return;
                }

                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: xhr.responseJSON?.message || 'Error al guardar el perfil de aprendizaje.'
                });
            }
        });
    }

    $colorPicker.on('input change', sincronizarColorDesdePicker);
    $colorHex.on('change blur', sincronizarColorDesdeTexto);
    $('#btnGuardarCondicion').on('click', guardarCondicion);

    $form.on('submit', function(e) {
        e.preventDefault();
        guardarCondicion();
    });
})();