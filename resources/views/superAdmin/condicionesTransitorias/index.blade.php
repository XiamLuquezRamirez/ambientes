@extends('layouts.superAdmin')
@section('title', 'Condiciones Transitorias')

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
        <div>
            <h1>Condiciones Transitorias Globales</h1>
            <p>Opciones del selector para docentes, agrupadas por condición base</p>
        </div>
        <div style="display:flex;gap:10px">
            <button type="button" class="btn btn-primary" onclick="abrirModalRegistrarTransitoria()">
                <i class="fas fa-plus"></i> Nueva opción
            </button>
        </div>
    </div>

    <form id="formBuscarTransitorias" method="GET" action="{{ route('superadmin.condiciones-transitorias.index') }}"
        style="display:flex;gap:12px;margin-bottom:24px;align-items:center;flex-wrap:wrap">
        <div class="input-buscar">
            <span class="icono-buscar"><i class="fas fa-search"></i></span>
            <input type="text" name="buscar" placeholder="Buscar por código o etiqueta..."
                value="{{ request('buscar') }}" autocomplete="off">
        </div>

        <select name="condicion_base_id" class="form-control" style="width:auto;min-width:220px">
            <option value="">Todas las condiciones base</option>
            @foreach ($condicionesBase as $base)
                <option value="{{ $base->id }}" @selected((string) request('condicion_base_id') === (string) $base->id)>
                    {{ $base->codigo }} — {{ $base->nombre }}
                </option>
            @endforeach
        </select>

        <select name="estado" class="form-control" style="width:auto">
            <option value="">Todos los estados</option>
            @foreach (['1' => 'Activa', '0' => 'Inactiva'] as $val => $label)
                <option value="{{ $val }}" @selected(request('estado') === $val)>{{ $label }}</option>
            @endforeach
        </select>

        <select name="es_sistema" class="form-control" style="width:auto">
            <option value="">Todos los tipos</option>
            @foreach (['1' => 'Sistema', '0' => 'Adicional'] as $val => $label)
                <option value="{{ $val }}" @selected(request('es_sistema') === $val)>{{ $label }}</option>
            @endforeach
        </select>

        <a id="btnLimpiarTransitorias" href="{{ route('superadmin.condiciones-transitorias.index') }}" class="btn btn-sm"
            style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;
              display:{{ request()->hasAny(['buscar', 'estado', 'es_sistema', 'condicion_base_id']) ? 'inline-flex' : 'none' }}">
            <i class="fas fa-broom"></i> Limpiar
        </a>
    </form>

    <div id="contenedorTablaTransitorias">
        @include('superAdmin.condicionesTransitorias._tabla')
    </div>
    <div id="cargando-tabla-transitorias" style="display:none;text-align:center;padding:40px;color:#64748B">
        <i class="fas fa-spinner fa-spin"></i> Cargando...
    </div>

    @include('superAdmin.condicionesTransitorias.ModalRegistrarTransitoria')
@endsection

@push('scripts')
    <script>
        (function() {
            window.URL_TRANSITORIAS = @json(route('superadmin.condiciones-transitorias.index'));
            const URL_TRANSITORIAS = window.URL_TRANSITORIAS;
            const URL_ESTADO = (id) => `${URL_TRANSITORIAS}/${id}/estado`;
            const URL_ELIMINAR = (id) => `${URL_TRANSITORIAS}/${id}`;

            $.ajaxSetup({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content'),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            window.cargarTablaTransitorias = async function(url = null) {
                const destino = url || construirUrlFiltros();
                const $contenedor = $('#contenedorTablaTransitorias');
                const $cargando = $('#cargando-tabla-transitorias');

                $contenedor.css('opacity', '.4');
                $cargando.show();

                try {
                    const res = await $.ajax({
                        url: destino,
                        type: 'GET',
                        dataType: 'json',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    });

                    if (res.success) {
                        $contenedor.html(res.html);
                        history.pushState(null, '', destino);
                        const params = new URL(destino, window.location.origin).searchParams;
                        const tieneFiltros = params.has('buscar') || params.has('estado') ||
                            params.has('es_sistema') || params.has('condicion_base_id');
                        $('#btnLimpiarTransitorias').css('display', tieneFiltros ? 'inline-flex' : 'none');
                    } else {
                        mostrarToast('error', 'Error al cargar los datos');
                    }
                } catch (e) {
                    mostrarToast('error', 'Error al cargar los datos');
                } finally {
                    $contenedor.css('opacity', '1');
                    $cargando.hide();
                }
            };

            function construirUrlFiltros() {
                const params = new URLSearchParams(new FormData(document.getElementById('formBuscarTransitorias')));
                for (const [k, v] of [...params.entries()]) {
                    if (!v) params.delete(k);
                }
                return params.toString() ? `${URL_TRANSITORIAS}?${params.toString()}` : URL_TRANSITORIAS;
            }

            function aplicarFiltros() {
                cargarTablaTransitorias(construirUrlFiltros());
            }

            $('#formBuscarTransitorias select').on('change', aplicarFiltros);

            let debounceTimer;
            $('#formBuscarTransitorias input[name="buscar"]').on('input', function() {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(aplicarFiltros, 400);
            });

            $('#formBuscarTransitorias').on('submit', function(e) {
                e.preventDefault();
                clearTimeout(debounceTimer);
                aplicarFiltros();
            });

            $('#btnLimpiarTransitorias').on('click', function(e) {
                e.preventDefault();
                $('#formBuscarTransitorias')[0].reset();
                cargarTablaTransitorias(URL_TRANSITORIAS);
            });

            $(document).on('click', '#contenedorTablaTransitorias .pag-btn[href]', function(e) {
                e.preventDefault();
                cargarTablaTransitorias(this.href);
            });

            $(document).on('change', '.toggle-estado-transitoria', async function() {
                const $toggle = $(this);
                const id = $toggle.data('id');
                const nombre = $toggle.data('nombre');
                const quiereActivar = $toggle.is(':checked');

                if (!quiereActivar) {
                    const confirmacion = await Swal.fire({
                        icon: 'question',
                        title: 'Confirmar desactivación',
                        html: `¿Desea desactivar <strong>"${nombre}"</strong>?<br><small>Dejará de aparecer en el selector del docente.</small>`,
                        showCancelButton: true,
                        confirmButtonText: 'Sí, desactivar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#D97706',
                        cancelButtonColor: '#94A3B8',
                    });

                    if (!confirmacion.isConfirmed) {
                        $toggle.prop('checked', true);
                        return;
                    }
                }

                $toggle.prop('disabled', true);

                $.ajax({
                    url: URL_ESTADO(id),
                    type: 'PATCH',
                    data: {
                        _token: $('meta[name="csrf-token"]').attr('content')
                    },
                    dataType: 'json',
                    success: function(res) {
                        mostrarToast('success', res.message);
                        cargarTablaTransitorias();
                    },
                    error: function(xhr) {
                        $toggle.prop('checked', !quiereActivar);
                        mostrarToast('error', xhr.responseJSON?.message || 'No fue posible cambiar el estado.');
                    },
                    complete: function() {
                        $toggle.prop('disabled', false);
                    }
                });
            });

            $(document).on('click', '.btn-eliminar-transitoria', async function() {
                const id = $(this).data('id');
                const nombre = $(this).data('nombre');
                const estudiantes = parseInt($(this).data('estudiantes'), 10) || 0;

                if (estudiantes > 0) {
                    const result = await Swal.fire({
                        icon: 'warning',
                        title: 'No se puede eliminar',
                        html: `La opción <strong>"${nombre}"</strong> tiene <strong>${estudiantes}</strong> estudiante(s) asociados.<br><br>Puede desactivarla en su lugar.`,
                        showCancelButton: true,
                        confirmButtonText: 'Desactivar',
                        cancelButtonText: 'Cerrar',
                        confirmButtonColor: '#D97706',
                        cancelButtonColor: '#94A3B8',
                    });

                    if (result.isConfirmed) {
                        const $toggle = $(`#fila-transitoria-${id} .toggle-estado-transitoria`);
                        if ($toggle.length && $toggle.is(':checked')) {
                            $toggle.prop('checked', false).trigger('change');
                        }
                    }
                    return;
                }

                const confirmacion = await Swal.fire({
                    title: '¿Eliminar opción?',
                    text: `"${nombre}" será eliminada permanentemente.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#DC2626',
                    cancelButtonColor: '#94A3B8',
                });

                if (!confirmacion.isConfirmed) return;

                $.ajax({
                    url: URL_ELIMINAR(id),
                    type: 'DELETE',
                    dataType: 'json',
                    success: function(res) {
                        mostrarToast('success', res.message);
                        cargarTablaTransitorias();
                    },
                    error: function(xhr) {
                        mostrarToast('error', xhr.responseJSON?.message || 'No fue posible eliminar.');
                    }
                });
            });
        })();
    </script>
@endpush
