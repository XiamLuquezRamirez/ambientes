@extends('layouts.admin')
@section('title', 'Configuración')
@section('content')
    <div class="page-header">
        <h1>Configuración</h1>
        <p style="color:#64748B">Configuración de la institución</p>
    </div>

    <ul class="nav nav-tabs" role="tablist">
        <li class="nav-item" role="presentation">
            <a class="nav-link active" id="tab-datos-institucion" data-bs-toggle="tab" href="#datosInstitucion" role="tab"
                aria-controls="datosInstitucion" aria-selected="true">
                <i class="fas fa-university"></i> Datos de la Institución
            </a>
        </li>
        <li class="nav-item" role="presentation">
            <a class="nav-link" id="tab-servidores" data-bs-toggle="tab" href="#servidores" role="tab"
                aria-controls="servidores" aria-selected="false">
                <i class="fas fa-server"></i> Servidores
            </a>
        </li>
        <li class="nav-item" role="presentation">
            <a class="nav-link" id="tab-modulos" data-bs-toggle="tab" href="#modulos" role="tab" aria-controls="modulos"
                aria-selected="false">
                <i class="fas fa-cube"></i> Módulos
            </a>
        </li>
    </ul>
    <form id="formAgregarInstitucion" enctype="multipart/form-data" method="POST">
        @csrf
        <div class="tab-content" style="padding: 20px;">
            <div class="tab-pane container active" id="datosInstitucion" role="tabpanel"
                aria-labelledby="tab-datos-institucion">
                <div class="row">
                    {{-- Avatar: misma UX que foto de perfil (overlay → modal de logo) --}}
                    <div class="col-md-12 d-flex justify-content-center align-items-center">
                        <div class="mb-3">
                            <div class="avatar-wrapper mx-auto">
                                <div class="profile-avatar" id="logoPerfilPrincipal" onclick="cambiarLogoPerfil()"
                                    title="Cambiar logo" style="cursor:pointer;">
                                    <img src="" id="logoPerfilImagen" class="profile-avatar-img d-none"
                                        alt="Logo institución">
                                    <span id="logoPerfilIniciales" class="profile-avatar-iniciales">
                                        IE
                                    </span>
                                    <div class="avatar-overlay">
                                        <i class="fa-solid fa-camera"></i>
                                        <span>Cambiar logo</span>
                                    </div>
                                </div>
                            </div>
                            <p class="text-muted text-center small mt-2 mb-0">
                                JPG o PNG · máx. 2 MB · <span class="text-danger">obligatorio</span>
                            </p>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="mb-3">
                            <label class="form-label fw-bold" for="nombre">Nombre</label>
                            <input type="text" id="nombre" name="nombre" class="form-control"
                                placeholder="Nombre de la institución" required>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="mb-3">
                            <label class="form-label fw-bold" for="codigo_dane">Código DANE</label>
                            <input type="text" id="codigo_dane" name="codigo_dane" class="form-control"
                                placeholder="Código DANE de la institución" required>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="mb-3">
                            <label class="form-label fw-bold" for="municipio">Municipio</label>
                            <input type="text" id="municipio" name="municipio" class="form-control"
                                placeholder="Municipio de la institución" required>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="mb-3">
                            <label class="form-label fw-bold" for="departamento">Departamento</label>
                            <input type="text" id="departamento" name="departamento" class="form-control"
                                placeholder="Departamento de la institución" required>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="mb-3">
                            <label class="form-label fw-bold" for="correo_contacto">Correo de
                                contacto</label>
                            <input type="email" id="correo_contacto" name="correo_contacto" class="form-control"
                                placeholder="Correo de contacto de la institución" required>
                        </div>
                    </div>
                </div>
            </div>

            {{--
                Tab servidores — names alineados con InstitucionSuperAdminController:
                ambientes[id][ip|puerto|activo]
            --}}
            <div class="tab-pane container" id="servidores" role="tabpanel" aria-labelledby="tab-servidores">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Servidor</th>
                                <th>IP</th>
                                <th class="text-center">Puerto</th>
                                <th class="text-center">Activo</th>
                            </tr>
                        </thead>
                        <tbody>
                            @forelse($ambientes as $a)
                                <tr>
                                    <td style="font-weight:bold;color:#1E293B;font-size:1.2rem;">
                                        {{ $a->nombre }}
                                    </td>
                                    <td>
                                        <input type="text" class="form-control" id="ambiente_ip_{{ $a->id }}"
                                            name="ambientes[{{ $a->id }}][ip]" placeholder="192.168.1.100"
                                            autocomplete="off" disabled>
                                    </td>
                                    <td class="text-center">
                                        <input type="number" class="form-control" style="width:90px;margin:auto"
                                            id="ambiente_puerto_{{ $a->id }}"
                                            name="ambientes[{{ $a->id }}][puerto]" min="1" max="65535"
                                            placeholder="8080" disabled>
                                    </td>
                                    <td class="text-center">
                                        <div class="form-check form-switch d-inline-flex justify-content-center">
                                            <input class="form-check-input" type="checkbox"
                                                id="ambiente_activo_{{ $a->id }}"
                                                name="ambientes[{{ $a->id }}][activo]" value="1" disabled
                                                style="cursor: pointer;" title="Activar integración con este ambiente">
                                        </div>
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="4" class="text-center text-muted py-4">
                                        Sin ambientes registrados
                                    </td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="tab-pane container" id="modulos" role="tabpanel" aria-labelledby="tab-modulos">
                <p class="text-muted mb-0">La asignación de módulos estará disponible próximamente.</p>
            </div>
        </div>
    </form>
@endsection

@push('scripts')
    <script>
        const URL_CONFIGURACION_BASE = @json(url('admin/configuracion'));
        cargarDatosInstitucion({{ session('institucion_id') }});

        function cargarDatosInstitucion(id) {
            fetch(`${URL_CONFIGURACION_BASE}/datos/${id}`, {
                    headers: {
                        'Accept': 'application/json'
                    }
                })
                .then(r => r.json())
                .then(resp => {
                    if (!resp.success) throw new Error('No data');
                    mapearDatosInstitucion(resp.data);
                })
                .catch(() => {
                    mostrarToast('error', 'No se pudo cargar la información de la institución');
                });
        }

        /**
         * Rellena el formulario + switches de ambientes + estado del logo.
         * Ambientes no vinculados llegan desmarcados (sync al guardar los quita del pivot).
         */
        function mapearDatosInstitucion(data) {
            id_editar = String(data.id);
            $('#nombre').val(data.nombre ?? '');
            $('#codigo_dane').val(data.codigo_dane ?? '');
            $('#municipio').val(data.municipio ?? '');
            $('#departamento').val(data.departamento ?? '');
            $('#correo_contacto').val(data.correo_contacto ?? '');

            if (typeof window.setEstadoLogoInstitucion === 'function') {
                window.setEstadoLogoInstitucion({
                    id: data.id,
                    logoUrl: data.logo_url_publica,
                    iniciales: data.iniciales || 'IE',
                });
            }
        }
    </script>
@endpush
