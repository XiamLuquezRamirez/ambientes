@extends('layouts.superAdmin')
@section('title', 'Perfiles de Aprendizaje')

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
        <div>
            <h1>Perfiles de Aprendizaje</h1>
            <p>Catálogo de perfiles de aprendizaje</p>
        </div>
        <div style="display:flex;gap:10px">
            <button type="button" class="btn btn-primary" onclick="abrirModalRegistrarPerfilAprendizaje()">
                <i class="fas fa-plus"></i> Nuevo Perfil de Aprendizaje
            </button>
        </div>
    </div>

    <form id="formBuscar" method="GET" action="{{ route('superadmin.perfil-aprendizaje.index') }}"
        style="display:flex;gap:12px;margin-bottom:24px;align-items:center;flex-wrap:wrap">
        <div class="input-buscar">
            <span class="icono-buscar"><i class="fas fa-search"></i></span>
            <input type="text" name="buscar" placeholder="Buscar por código o nombre..."
                value="{{ request('buscar') }}" autocomplete="off">
        </div>

        <select name="estado" class="form-control" style="width:auto">
            <option value="">Todos los estados</option>
            @foreach (['1' => 'Activa', '0' => 'Inactiva'] as $val => $label)
                <option value="{{ $val }}" @selected(request('estado') === $val)>{{ $label }}</option>
            @endforeach
        </select>

        <select name="es_sistema" class="form-control" style="width:auto">
            <option value="">Todos los tipos</option>
            @foreach (['1' => 'Sistema', '0' => 'Personalizada'] as $val => $label)
                <option value="{{ $val }}" @selected(request('es_sistema') === $val)>{{ $label }}</option>
            @endforeach
        </select>

        <a id="btnLimpiar" href="{{ route('superadmin.perfil-aprendizaje.index') }}" class="btn btn-sm"
            style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;
              display:{{ request()->hasAny(['buscar', 'estado', 'es_sistema']) ? 'inline-flex' : 'none' }}">
            <i class="fas fa-broom"></i> Limpiar
        </a>
    </form>

    <div id="contenedorTabla">
        @include('superAdmin.perfilAprendizaje._tabla')
    </div>
    <div id="cargando-tabla"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>

    @include('superAdmin.perfilAprendizaje.ModalRegistrarPerfilAprendizaje')
    @include('superAdmin.perfilAprendizaje.ModalVistaInfoAsociada')
    @include('superAdmin.perfilAprendizaje.ModalVerInfoPerfilAprendizaje')
@endsection

@push('scripts')
    <script>
        (function() {
            window.URL_PERFILES_APRENDIZAJE = @json(route('superadmin.perfil-aprendizaje.index'));
            const URL_PERFILES_APRENDIZAJE = window.URL_PERFILES_APRENDIZAJE;
            const URL_ESTADO = (id) => `${URL_PERFILES_APRENDIZAJE}/${id}/estado`;
            const URL_ELIMINAR = (id) => `${URL_PERFILES_APRENDIZAJE}/${id}`;

            $.ajaxSetup({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content'),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            window.cargarTablaPerfilesAprendizaje = async function(url = null) {
                const destino = url || construirUrlFiltros();
                const $contenedor = $('#contenedorTabla');
                const $cargando = $('#cargando-tabla');

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
                        const tieneFiltros = params.has('buscar') || params.has('estado') || params.has('es_sistema');
                        $('#btnLimpiar').css('display', tieneFiltros ? 'inline-flex' : 'none');
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
                const params = new URLSearchParams(new FormData(document.getElementById('formBuscar')));
                for (const [k, v] of [...params.entries()]) {
                    if (!v) params.delete(k);
                }
                return params.toString() ? `${URL_PERFILES_APRENDIZAJE}?${params.toString()}` : URL_PERFILES_APRENDIZAJE;
            }

            function aplicarFiltros() {
                cargarTablaPerfilesAprendizaje(construirUrlFiltros());
            }

            $('#formBuscar select').on('change', aplicarFiltros);

            let debounceTimer;
            $('#formBuscar input[name="buscar"]').on('input', function() {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(aplicarFiltros, 400);
            });

            $('#formBuscar').on('submit', function(e) {
                e.preventDefault();
                clearTimeout(debounceTimer);
                aplicarFiltros();
            });

            $('#btnLimpiar').on('click', function(e) {
                e.preventDefault();
                $('#formBuscar')[0].reset();
                cargarTablaPerfilesAprendizaje(URL_PERFILES_APRENDIZAJE);
            });

            $(document).on('click', '.pag-btn[href]', function(e) {
                e.preventDefault();
                cargarTablaPerfilesAprendizaje(this.href);
            });

            $(document).on('change', '.toggle-estado-perfil-aprendizaje', async function() {
                const $toggle = $(this);
                const id = $toggle.data('id');
                const nombre = $toggle.data('nombre');
                const estudiantes = parseInt($toggle.data('estudiantes'), 10) || 0;
                const quiereActivar = $toggle.is(':checked');

                if (!quiereActivar) {
                    let html = `¿Desea desactivar el perfil de aprendizaje <strong>"${nombre}"</strong>?`;
                    if (estudiantes > 0) {
                        html = `El perfil de aprendizaje <strong>"${nombre}"</strong> tiene <strong>${estudiantes}</strong> estudiante(s) asignado(s).<br><br>¿Desea desactivarlo de todas formas?`;
                    }

                    const confirmacion = await Swal.fire({
                        icon: 'question',
                        title: 'Confirmar desactivación',
                        html: html,
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
                        confirmar: 1,
                        _token: $('meta[name="csrf-token"]').attr('content')
                    },
                    dataType: 'json',
                    success: function(res) {
                        mostrarToast('success', res.message);
                        cargarTablaPerfilesAprendizaje();
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

            $(document).on('click', '.btn-eliminar-perfil-aprendizaje', async function() {
                const id = $(this).data('id');
                const nombre = $(this).data('nombre');
                const estudiantes = parseInt($(this).data('estudiantes'), 10) || 0;

                if (estudiantes > 0) {
                    const result = await Swal.fire({
                        icon: 'warning',
                        title: 'No se puede eliminar',
                        html: `El perfil de aprendizaje <strong>"${nombre}"</strong> tiene <strong>${estudiantes}</strong> estudiante(s) asignado(s).<br><br>No es posible eliminarlo. ¿Desea desactivarlo en su lugar?`,
                        showCancelButton: true,
                        confirmButtonText: 'Sí, desactivar',
                        cancelButtonText: 'Cerrar',
                        confirmButtonColor: '#D97706',
                        cancelButtonColor: '#94A3B8',
                    });

                    if (result.isConfirmed) {
                        $.ajax({
                            url: URL_ESTADO(id),
                            type: 'PATCH',
                            data: {
                                confirmar: 1,
                                _token: $('meta[name="csrf-token"]').attr('content')
                            },
                            dataType: 'json',
                            success: function(res) {
                                mostrarToast('success', res.message);
                                cargarTablaPerfilesAprendizaje();
                            },
                            error: function(xhr) {
                                mostrarToast('error', xhr.responseJSON?.message || 'No fue posible desactivar el perfil de aprendizaje.');
                            }
                        });
                    }
                    return;
                }

                const confirmacion = await Swal.fire({
                    title: '¿Eliminar perfil de aprendizaje?',
                    text: `"${nombre}" será eliminado permanentemente.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#DC2626',
                    cancelButtonColor: '#94A3B8',
                });

                if (!confirmacion.isConfirmed) return;

                Swal.fire({
                    title: 'Eliminando...',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    didOpen: () => Swal.showLoading()
                });

                $.ajax({
                    url: URL_ELIMINAR(id),
                    type: 'DELETE',
                    dataType: 'json',
                    success: function(res) {
                        Swal.close();
                        mostrarToast('success', res.message);
                        cargarTablaPerfilesAprendizaje();
                    },
                    error: function(xhr) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: xhr.responseJSON?.message || 'No fue posible eliminar el perfil de aprendizaje.'
                        });
                    }
                });
            });
        })();
    </script>
@endpush
