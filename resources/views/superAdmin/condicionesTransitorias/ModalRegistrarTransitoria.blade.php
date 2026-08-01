{{--
    Modal: Crear / Editar condición transitoria
--}}
@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/condiciones/index.css') }}">
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
