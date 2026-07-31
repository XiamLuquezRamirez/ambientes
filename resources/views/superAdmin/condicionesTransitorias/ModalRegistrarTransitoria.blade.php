{{--
    Modal: Crear / Editar condición transitoria
--}}
@push('styles')
    <style>
        .cb-select {
            position: relative;
        }

        .cb-select-trigger {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 10px;
            min-height: 46px;
            padding: 8px 12px;
            border: 1px solid #CBD5E1;
            border-radius: 10px;
            background: #fff;
            cursor: pointer;
            transition: border-color .15s, box-shadow .15s;
            text-align: left;
        }

        .cb-select-trigger:hover,
        .cb-select.open .cb-select-trigger {
            border-color: #93C5FD;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, .12);
        }

        .cb-select-swatch {
            width: 14px;
            height: 14px;
            border-radius: 4px;
            border: 1px solid rgba(15, 23, 42, .12);
            flex-shrink: 0;
        }

        .cb-select-label {
            flex: 1;
            color: #0F172A;
            font-weight: 600;
            font-size: .92rem;
        }

        .cb-select-label.is-placeholder {
            color: #94A3B8;
            font-weight: 500;
        }

        .cb-select-chevron {
            color: #64748B;
            font-size: .75rem;
            transition: transform .15s;
        }

        .cb-select.open .cb-select-chevron {
            transform: rotate(180deg);
        }

        .cb-select-panel {
            display: none;
            position: absolute;
            z-index: 1056;
            left: 0;
            right: 0;
            top: calc(100% + 6px);
            background: #fff;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            box-shadow: 0 16px 40px rgba(15, 23, 42, .12);
            overflow: hidden;
        }

        .cb-select.open .cb-select-panel {
            display: block;
        }

        .cb-select-search {
            padding: 10px;
            border-bottom: 1px solid #F1F5F9;
        }

        .cb-select-search input {
            width: 100%;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 8px 12px 8px 34px;
            font-size: .9rem;
            outline: none;
        }

        .cb-select-search input:focus {
            border-color: #93C5FD;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, .1);
        }

        .cb-select-search-wrap {
            position: relative;
        }

        .cb-select-search-wrap i {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #94A3B8;
            font-size: .85rem;
        }

        .cb-select-list {
            max-height: 220px;
            overflow-y: auto;
            padding: 6px;
        }

        .cb-select-option {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            border: 0;
            background: transparent;
            border-radius: 8px;
            padding: 10px 12px;
            cursor: pointer;
            text-align: left;
        }

        .cb-select-option:hover,
        .cb-select-option.active {
            background: #EFF6FF;
        }

        .cb-select-option-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }

        .cb-select-option-text strong {
            font-size: .9rem;
            color: #0F172A;
        }

        .cb-select-option-text small {
            font-size: .78rem;
            color: #64748B;
        }

        .cb-select-empty {
            padding: 18px 12px;
            text-align: center;
            color: #94A3B8;
            font-size: .88rem;
        }
    </style>
@endpush

<div class="modal fade" id="modalRegistrarTransitoria" tabindex="-1" data-bs-keyboard="false"
    aria-labelledby="modalRegistrarTransitoriaTitle" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fas fa-list-check text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" style="font-size: 1.4rem;" id="modalRegistrarTransitoriaTitle">
                        Nueva condición transitoria</h5>
                    <p class="modal-subtitle mb-0" id="modalRegistrarTransitoriaSubtitle">
                        Defina una opción para el selector del docente.</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-4">
                <ul class="nav nav-tabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <a class="nav-link active" id="tab-datos-generales-transitoria" data-bs-toggle="tab"
                            href="#datosGeneralesTransitoria" role="tab"
                            aria-controls="datosGeneralesTransitoria" aria-selected="true">
                            <i class="fas fa-circle-info"></i> Datos generales
                        </a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="tab-ajustes-transitoria" data-bs-toggle="tab"
                            href="#ajustesTransitoria" role="tab" aria-controls="ajustesTransitoria"
                            aria-selected="false">
                            <i class="fas fa-sliders"></i> Ajustes
                        </a>
                    </li>
                </ul>

                <form id="formRegistrarTransitoria" autocomplete="off">
                    @csrf
                    <input type="hidden" id="transitoria_id" value="">
                    <input type="hidden" id="condicion_base_id" name="condicion_base_id" value="">

                    <div class="tab-content" style="padding: 20px 0 0;">
                        <div class="tab-pane fade show active" id="datosGeneralesTransitoria" role="tabpanel"
                            aria-labelledby="tab-datos-generales-transitoria">
                            <div class="row g-3">
                                <div class="col-md-4" id="wrapCodigoTransitoria" style="display:none">
                                    <label class="form-label fw-bold" for="codigo_transitoria">Código</label>
                                    <input type="text" id="codigo_transitoria" class="form-control" readonly>
                                </div>
                                <div class="col-md-8" id="wrapEtiquetaTransitoria">
                                    <label class="form-label fw-bold" for="etiqueta_transitoria">Etiqueta</label>
                                    <input type="text" id="etiqueta_transitoria" name="etiqueta" class="form-control"
                                        placeholder="Texto visible para el docente" maxlength="150" required>
                                    <small class="text-muted" id="hintCodigoTransitoria">
                                        El código se genera automáticamente (ej: CTR-001).
                                    </small>
                                </div>

                                <div class="col-12">
                                    <label class="form-label fw-bold">Condición base</label>
                                    <div class="cb-select" id="cbCondicionBase">
                                        <button type="button" class="cb-select-trigger" id="cbCondicionBaseTrigger">
                                            <span class="cb-select-swatch" id="cbCondicionBaseSwatch"
                                                style="display:none;background:#64748B"></span>
                                            <span class="cb-select-label is-placeholder" id="cbCondicionBaseLabel">
                                                Sin condición base
                                            </span>
                                            <i class="fa-solid fa-chevron-down cb-select-chevron"></i>
                                        </button>
                                        <div class="cb-select-panel">
                                            <div class="cb-select-search">
                                                <div class="cb-select-search-wrap">
                                                    <i class="fa-solid fa-search"></i>
                                                    <input type="text" id="buscar_condicion_base"
                                                        placeholder="Buscar por código o nombre..." autocomplete="off">
                                                </div>
                                            </div>
                                            <div class="cb-select-list" id="cbCondicionBaseList">
                                                <button type="button" class="cb-select-option" data-id=""
                                                    data-codigo="" data-nombre="" data-color="">
                                                    <span class="cb-select-option-text">
                                                        <strong style="color:#64748B;font-weight:500">Sin condición base</strong>
                                                        <small>Opcional — no hereda ajustes</small>
                                                    </span>
                                                </button>
                                                @foreach ($condicionesBase as $base)
                                                    <button type="button" class="cb-select-option"
                                                        data-id="{{ $base->id }}"
                                                        data-codigo="{{ $base->codigo }}"
                                                        data-nombre="{{ $base->nombre }}"
                                                        data-color="{{ $base->color_hex ?: '#64748B' }}">
                                                        <span class="cb-select-swatch"
                                                            style="background:{{ $base->color_hex ?: '#64748B' }}"></span>
                                                        <span class="cb-select-option-text">
                                                            <strong>{{ $base->nombre }}</strong>
                                                            <small>{{ $base->codigo }}</small>
                                                        </span>
                                                    </button>
                                                @endforeach
                                                <div class="cb-select-empty" id="cbCondicionBaseEmpty" style="display:none">
                                                    Sin resultados
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <small class="text-muted">Opcional. Si elige una, hereda automáticamente sus ajustes.</small>
                                </div>

                                <div class="col-12">
                                    <label class="form-label fw-bold" for="descripcion_interna">Descripción interna</label>
                                    <textarea id="descripcion_interna" name="descripcion_interna" class="form-control"
                                        rows="3" placeholder="Detalle de uso interno (no visible para el docente)"></textarea>
                                </div>

                                @if ($esSuperAdmin)
                                    <div class="col-12" id="wrapEsSistemaTransitoria">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="es_sistema_transitoria"
                                                name="es_sistema" value="1">
                                            <label class="form-check-label fw-bold" for="es_sistema_transitoria">
                                                Condición de sistema
                                            </label>
                                        </div>
                                    </div>
                                @endif
                            </div>
                        </div>

                        <div class="tab-pane fade" id="ajustesTransitoria" role="tabpanel"
                            aria-labelledby="tab-ajustes-transitoria">
                            <div class="text-center text-muted py-5">
                                <i class="fas fa-sliders" style="font-size:2rem;opacity:.45"></i>
                                <p class="mt-3 mb-1 fw-semibold">Ajustes de la condición</p>
                                <p class="mb-0" style="font-size:.9rem">
                                    Esta sección estará disponible próximamente.
                                </p>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times"></i> Cerrar
                </button>
                <button type="button" class="btn btn-primary" id="btnGuardarTransitoria">
                    <i class="fas fa-save"></i> Guardar
                </button>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        (function() {
            const URL_BASE = @json(route('superadmin.condiciones-transitorias.index'));
            const URL_ITEM = (id) => `${URL_BASE}/${id}`;
            const $modal = $('#modalRegistrarTransitoria');
            const $form = $('#formRegistrarTransitoria');
            const $cb = $('#cbCondicionBase');
            const esSuperAdmin = @json($esSuperAdmin);
            let modoEdicion = false;
            let esSistemaActual = false;

            $.ajaxSetup({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content'),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            function irATabDatosGenerales() {
                const tab = document.querySelector('#tab-datos-generales-transitoria');
                if (tab) bootstrap.Tab.getOrCreateInstance(tab).show();
            }

            function abrirCb() {
                $cb.addClass('open');
                setTimeout(() => $('#buscar_condicion_base').trigger('focus'), 30);
            }

            function cerrarCb() {
                $cb.removeClass('open');
            }

            function seleccionarBase(id, codigo, nombre, color) {
                $('#condicion_base_id').val(id || '');
                if (!id) {
                    $('#cbCondicionBaseSwatch').hide();
                    $('#cbCondicionBaseLabel').text('Sin condición base').addClass('is-placeholder');
                    $('.cb-select-option').removeClass('active');
                    $('.cb-select-option[data-id=""]').addClass('active');
                    return;
                }

                $('#cbCondicionBaseSwatch').css('background', color || '#64748B').show();
                $('#cbCondicionBaseLabel').text(`${nombre} (${codigo})`).removeClass('is-placeholder');
                $('.cb-select-option').removeClass('active');
                $(`.cb-select-option[data-id="${id}"]`).addClass('active');
            }

            function filtrarCondicionesBase(texto) {
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

                $('#cbCondicionBaseEmpty').toggle(visibles === 0);
            }

            $('#cbCondicionBaseTrigger').on('click', function(e) {
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
                $('#buscar_condicion_base').val('');
                filtrarCondicionesBase('');
            });

            $('#buscar_condicion_base').on('input', function() {
                filtrarCondicionesBase($(this).val());
            });

            $(document).on('click', function(e) {
                if (!$(e.target).closest('#cbCondicionBase').length) {
                    cerrarCb();
                }
            });

            window.abrirModalRegistrarTransitoria = function() {
                modoEdicion = false;
                esSistemaActual = false;
                resetFormTransitoria();
                configurarModoCrear();
                irATabDatosGenerales();
                bootstrap.Modal.getOrCreateInstance($modal[0]).show();
            };

            window.abrirModalEditarTransitoria = function(id) {
                modoEdicion = true;
                resetFormTransitoria();
                configurarModoEditar();
                irATabDatosGenerales();
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
                        if (!res.success || !res.condicion) {
                            mostrarToast('error', 'No fue posible cargar la condición.');
                            cerrarModal();
                            return;
                        }
                        setearDatos(res.condicion);
                    },
                    error: function(xhr) {
                        Swal.close();
                        mostrarToast('error', xhr.responseJSON?.message || 'Error al consultar.');
                        cerrarModal();
                    }
                });
            };

            function configurarModoCrear() {
                $('#modalRegistrarTransitoriaTitle').text('Nueva condición transitoria');
                $('#modalRegistrarTransitoriaSubtitle').text('Defina una opción para el selector del docente.');
                $('#hintCodigoTransitoria').show();
                $('#wrapCodigoTransitoria').hide();
                $('#wrapEtiquetaTransitoria').removeClass('col-md-8').addClass('col-12');
                if (esSuperAdmin) {
                    $('#es_sistema_transitoria').prop('disabled', false).prop('checked', false);
                    $('#wrapEsSistemaTransitoria').show();
                }
            }

            function configurarModoEditar() {
                $('#modalRegistrarTransitoriaTitle').text('Editar condición transitoria');
                $('#modalRegistrarTransitoriaSubtitle').text('Actualice la etiqueta, descripción o condición base.');
                $('#hintCodigoTransitoria').hide();
                $('#wrapCodigoTransitoria').show();
                $('#wrapEtiquetaTransitoria').removeClass('col-12').addClass('col-md-8');
            }

            function setearDatos(c) {
                esSistemaActual = !!c.es_sistema;
                $('#transitoria_id').val(c.id);
                $('#codigo_transitoria').val(c.codigo || '');
                $('#etiqueta_transitoria').val(c.etiqueta || '');
                $('#descripcion_interna').val(c.descripcion_interna || '');

                const base = c.condicion_base || {};
                seleccionarBase(
                    c.condicion_base_id,
                    base.codigo || '',
                    base.nombre || '',
                    base.color_hex || '#64748B'
                );

                if (esSuperAdmin) {
                    $('#es_sistema_transitoria').prop('checked', esSistemaActual);
                    $('#es_sistema_transitoria').prop('disabled', esSistemaActual);
                    $('#wrapEsSistemaTransitoria').show();
                }
            }

            function resetFormTransitoria() {
                $form[0].reset();
                $('#transitoria_id').val('');
                $('#codigo_transitoria').val('');
                $form.find('.is-invalid').removeClass('is-invalid');
                $form.find('.invalid-feedback').remove();
                $('#buscar_condicion_base').val('');
                filtrarCondicionesBase('');
                seleccionarBase('', '', '', '');
                cerrarCb();
            }

            function cerrarModal() {
                bootstrap.Modal.getInstance($modal[0])?.hide();
            }

            function mostrarErrores(errors) {
                $form.find('.is-invalid').removeClass('is-invalid');
                $form.find('.invalid-feedback').remove();
                $.each(errors || {}, function(campo, mensajes) {
                    if (campo === 'condicion_base_id') {
                        $('#cbCondicionBaseTrigger').css('border-color', '#DC2626');
                        mostrarToast('error', traducirErrores(mensajes[0]));
                    }
                    const $input = $form.find(`[name="${campo}"]`);
                    if (!$input.length) return;
                    $input.addClass('is-invalid');
                    $input.after(`<div class="invalid-feedback d-block">${traducirErrores(mensajes[0])}</div>`);
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
                    case 'validation.exists':
                        return 'La condición base no existe.';
                }
            }

            function guardar() {
                if (!$form[0].checkValidity()) {
                    $form[0].reportValidity();
                    irATabDatosGenerales();
                    return;
                }

                $('#cbCondicionBaseTrigger').css('border-color', '');

                const id = $('#transitoria_id').val();
                const baseId = $('#condicion_base_id').val();
                const datos = {
                    etiqueta: ($('#etiqueta_transitoria').val() || '').trim(),
                    descripcion_interna: ($('#descripcion_interna').val() || '').trim(),
                    condicion_base_id: baseId || null,
                    _token: $('meta[name="csrf-token"]').attr('content')
                };

                if (esSuperAdmin && !esSistemaActual) {
                    datos.es_sistema = $('#es_sistema_transitoria').is(':checked') ? 1 : 0;
                }

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
                        if (typeof window.cargarTablaTransitorias === 'function') {
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
    </script>
@endpush
