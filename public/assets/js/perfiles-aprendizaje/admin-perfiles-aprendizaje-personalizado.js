/**
 * Modal crear/editar perfil de aprendizaje personalizado — Admin institución
 * No permite marcar "es_sistema".
 * Requiere: URL_BASE, URL_ITEM (definidos en la vista)
 */
(function() {
    const $modal = $('#modalRegistrarTransitoria');
    const $form = $('#formRegistrarTransitoria');
    const $cb = $('#cbPerfilAprendizajeBase');
    let modoEdicion = false;
    const esSuperAdmin = false;

    if (!$modal.length) return;

    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content'),
            'X-Requested-With': 'XMLHttpRequest'
        }
    });


    function abrirCb() {
        $cb.addClass('open');
        setTimeout(() => $('#buscar_perfil_aprendizaje').trigger('focus'), 30);
    }

    function cerrarCb() {
        $cb.removeClass('open');
    }

    function seleccionarBase(id, codigo, nombre, color) {
        $('#perfil_aprendizaje_id').val(id || '');
        if (!id) {
            $('#cbPerfilAprendizajeBaseSwatch').hide();
            $('#cbPerfilAprendizajeBaseLabel').text('Sin perfil de aprendizaje base').addClass('is-placeholder');
            $('.cb-select-option').removeClass('active');
            $('.cb-select-option[data-id=""]').addClass('active');
            return;
        }

        $('#cbPerfilAprendizajeBaseSwatch').css('background', color || '#64748B').show();
        $('#cbPerfilAprendizajeBaseLabel').text(`${nombre} (${codigo})`).removeClass('is-placeholder');
        $('.cb-select-option').removeClass('active');
        $(`.cb-select-option[data-id="${id}"]`).addClass('active');
    }

    function filtrarPerfilesAprendizajeBase(texto) {
        const q = (texto || '').toLowerCase().trim();
        let visibles = 0;

        $('.cb-select-option').each(function() {
            const $opt = $(this);
            const sinBase = String($opt.attr('data-id') || '') === '';
            if (sinBase) {
                $opt.show();
                return;
            }
            const codigo = String($opt.data('codigo') || '').toLowerCase();
            const nombre = String($opt.data('nombre') || '').toLowerCase();
            const match = !q || codigo.includes(q) || nombre.includes(q);
            $opt.toggle(match);
            if (match) visibles++;
        });

        $('#cbPerfilAprendizajeBaseEmpty').toggle(visibles === 0);
    }

    $('#cbPerfilAprendizajeBaseTrigger').on('click', function(e) {
        e.preventDefault();
        $cb.hasClass('open') ? cerrarCb() : abrirCb();
    });

    $(document).on('click', '.cb-select-option', function() {
        const $opt = $(this);
        const id = $opt.attr('data-id');
        seleccionarBase(
            id,
            $opt.data('codigo'),
            $opt.data('nombre'),
            $opt.data('color')
        );
        cerrarCb();
        $('#buscar_perfil_aprendizaje').val('');
        filtrarPerfilesAprendizajeBase('');
    });

    $('#buscar_perfil_aprendizaje').on('input', function() {
        filtrarPerfilesAprendizajeBase($(this).val());
    });

    $(document).on('click', function(e) {
        if (!$(e.target).closest('#cbPerfilAprendizajeBase').length) {
            cerrarCb();
        }
    });

    window.abrirModalRegistrarTransitoria = function() {
        modoEdicion = false;
        resetFormTransitoria();
        configurarModoCrear();
        bootstrap.Modal.getOrCreateInstance($modal[0]).show();
    };

    window.abrirModalEditarTransitoria = function(id) {
        modoEdicion = true;
        resetFormTransitoria();
        configurarModoEditar();
        bootstrap.Modal.getOrCreateInstance($modal[0]).show();

        Swal.fire({
            title: 'Cargando...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading()
        });

        $.ajax({
            url: URL_ITEM(id),
            type: 'GET',
            dataType: 'json',
            success: function(res) {
                Swal.close();
                if (!res.success || !res.perfil_aprendizaje_personalizado) {
                    mostrarToast('error', 'No fue posible cargar el perfil de aprendizaje.');
                    cerrarModal();
                    return;
                }
                setearDatos(res.perfil_aprendizaje_personalizado);
            },
            error: function(xhr) {
                Swal.close();
                mostrarToast('error', xhr.responseJSON?.message || 'Error al consultar.');
                cerrarModal();
            }
        });
    };

    function configurarModoCrear() {
        $('#modalRegistrarTransitoriaTitle').text('Nuevo perfil de aprendizaje personalizado');
        $('#modalRegistrarTransitoriaSubtitle').text('Opción adicional para su institución.');
        $('#hintCodigoTransitoria').show();
        $('#wrapCodigoTransitoria').hide();
        $('#wrapEtiquetaTransitoria').removeClass('col-md-8').addClass('col-12');
        $('#wrapEsSistemaTransitoria').hide();
    }

    function configurarModoEditar() {
        $('#modalRegistrarTransitoriaTitle').text('Editar perfil de aprendizaje personalizado');
        $('#modalRegistrarTransitoriaSubtitle').text('Actualice la etiqueta o perfil de aprendizaje base.');
        $('#hintCodigoTransitoria').hide();
        $('#wrapCodigoTransitoria').show();
        $('#wrapEtiquetaTransitoria').removeClass('col-12').addClass('col-md-8');
        $('#wrapEsSistemaTransitoria').hide();
    }

    function setearDatos(c) {
        $('#transitoria_id').val(c.id);
        $('#codigo_transitoria').val(c.codigo || '');
        $('#etiqueta_transitoria').val(c.etiqueta || '');
        $('#descripcion_interna').val(c.descripcion_interna || '');

        const base = c.perfil_aprendizaje || {};
        seleccionarBase(
            c.perfil_aprendizaje_id,
            base.codigo || '',
            base.nombre || '',
            base.color_hex || '#64748B'
        );

        $('#wrapEsSistemaTransitoria').hide();
    }

    function resetFormTransitoria() {
        $form[0].reset();
        $('#transitoria_id').val('');
        $('#codigo_transitoria').val('');
        $form.find('.is-invalid').removeClass('is-invalid');
        $form.find('.invalid-feedback').remove();
        $('#buscar_perfil_aprendizaje').val('');
        filtrarPerfilesAprendizajeBase('');
        seleccionarBase('', '', '', '');
        cerrarCb();
        $('#wrapEsSistemaTransitoria').hide();
    }

    function cerrarModal() {
        bootstrap.Modal.getInstance($modal[0])?.hide();
    }

    function mostrarErrores(errors) {
        $form.find('.is-invalid').removeClass('is-invalid');
        $form.find('.invalid-feedback').remove();
        $.each(errors || {}, function(campo, mensajes) {
            if (campo === 'perfil_aprendizaje_id') {
                $('#cbPerfilAprendizajeBaseTrigger').css('border-color', '#DC2626');
                mostrarToast('error', traducirErrores(mensajes[0]));
            }
            const $input = $form.find(`[name="${campo}"]`);
            if (!$input.length) return;
            $input.addClass('is-invalid');
            $input.after(`<div class="invalid-feedback d-block">${traducirErrores(mensajes[0])}</div>`);
        });
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
            case 'validation.exists':
                return 'El perfil de aprendizaje base no existe.';
            default:
                return mensaje;
        }
    }

    function guardar() {
        if (!$form[0].checkValidity()) {
            $form[0].reportValidity();
            return;
        }

        $('#cbPerfilAprendizajeBaseTrigger').css('border-color', '');

        const id = $('#transitoria_id').val();
        const baseId = $('#perfil_aprendizaje_id').val();
        const datos = {
            etiqueta: ($('#etiqueta_transitoria').val() || '').trim(),
            descripcion_interna: ($('#descripcion_interna').val() || '').trim(),
            perfil_aprendizaje_id: baseId || null,
            _token: $('meta[name="csrf-token"]').attr('content')
        };

        // Admin nunca envía es_sistema
        void esSuperAdmin;

        Swal.fire({
            title: 'Guardando...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading()
        });

        $.ajax({
            url: modoEdicion ? URL_ITEM(id) : URL_BASE,
            type: modoEdicion ? 'PUT' : 'POST',
            data: datos,
            dataType: 'json',
            success: function(res) {
                Swal.close();
                if (!res.success) {
                    mostrarToast('error', res.message || 'No fue posible guardar.');
                    return;
                }
                cerrarModal();
                mostrarToast('success', res.message);
                if (typeof window.cargarListaTransitoriasAdmin === 'function') {
                    window.cargarListaTransitoriasAdmin();
                } else if (typeof window.cargarTablaTransitorias === 'function') {
                    window.cargarTablaTransitorias();
                }
            },
            error: function(xhr) {
                Swal.close();
                if (xhr.status === 422) {
                    const errors = xhr.responseJSON?.errors || {};
                    if (Object.keys(errors).length) {
                        mostrarErrores(errors);
                        mostrarToast('error', 'Verifique los datos ingresados');
                        return;
                    }
                }
                mostrarToast('error', xhr.responseJSON?.message || 'Error al guardar.');
            }
        });
    }

    $('#btnGuardarTransitoria').on('click', guardar);
    $form.on('submit', function(e) {
        e.preventDefault();
        guardar();
    });

    $modal.on('hidden.bs.modal', function() {
        cerrarCb();
    });
})();
