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

    <form id="formDatosInstitucion" method="POST">
        @csrf
        <div class="tab-content" style="padding: 20px;">
            <div class="tab-pane container active" id="datosInstitucion" role="tabpanel"
                aria-labelledby="tab-datos-institucion">
                <div class="row">
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
                                JPG o PNG · máx. 2 MB
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
                <div class="d-flex justify-content-end gap-2 mt-3">
                    <button type="button" class="btn btn-primary" id="btnActualizarInstitucion"
                        onclick="actualizarDatosInstitucion()">
                        <i class="fas fa-save"></i> Guardar cambios
                    </button>
                </div>
            </div>

            {{-- Servidores: solo lectura (gestionados por Super Admin) --}}
            <div class="tab-pane container" id="servidores" role="tabpanel" aria-labelledby="tab-servidores">
                <p class="text-muted small mb-3">
                    <i class="fas fa-lock me-1"></i>
                    Información de servidores en solo lectura. Contacte al administrador del sistema para cambios.
                </p>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Servidor</th>
                                <th>IP de conexión</th>
                                <th class="text-center">Puerto</th>
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
                                            value="{{ $a->pivot->ip }}" readonly tabindex="-1">
                                    </td>
                                    <td class="text-center">
                                        <input type="text" class="form-control" style="width:90px;margin:auto"
                                            id="ambiente_puerto_{{ $a->id }}" value="{{ $a->pivot->puerto }}"
                                            readonly tabindex="-1">
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="3" class="text-center text-muted py-4">
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

    @include('admin.configuracion.institucion.modalLogoInstitucion')
@endsection

@push('scripts')
    <script>
        const URL_CONFIGURACION_BASE = @json(url('admin/configuracion'));
        const URL_CONFIGURACION_UPDATE = @json(route('admin.configuracion.update'));
        const INSTITUCION_ID = @json((int) session('institucion_id'));

        cargarDatosInstitucion(INSTITUCION_ID);

        function cargarDatosInstitucion(id) {
            fetch(`${URL_CONFIGURACION_BASE}/datos/${id}`, {
                    headers: {
                        'Accept': 'application/json'
                    }
                })
                .then(r => {
                    if (!r.ok) throw new Error('No data');
                    return r.json();
                })
                .then(resp => {
                    if (!resp.success) throw new Error('No data');
                    mapearDatosInstitucion(resp.data);
                })
                .catch(() => {
                    mostrarToast('error', 'No se pudo cargar la información de la institución');
                });
        }

        function mapearDatosInstitucion(data) {
            $('#nombre').val(data.nombre ?? '');
            $('#codigo_dane').val(data.codigo_dane ?? '');
            $('#municipio').val(data.municipio ?? '');
            $('#departamento').val(data.departamento ?? '');
            $('#correo_contacto').val(data.correo_contacto ?? '');

            (data.ambientes || []).forEach(function(amb) {
                const ip = document.getElementById(`ambiente_ip_${amb.id}`);
                const puerto = document.getElementById(`ambiente_puerto_${amb.id}`);
                if (ip) ip.value = amb.ip ?? '';
                if (puerto) puerto.value = amb.puerto ?? '';
            });

            if (typeof window.setEstadoLogoInstitucion === 'function') {
                window.setEstadoLogoInstitucion({
                    id: data.id,
                    logoUrl: data.logo_url_publica,
                    iniciales: data.iniciales || 'IE',
                });
            }
        }

        function setBtnActualizar(modo) {
            const btn = document.getElementById('btnActualizarInstitucion');
            if (!btn) return;
            if (modo === 'guardando') {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';
            } else {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Guardar cambios';
            }
        }

        function mostrarErroresFormulario(errors) {
            const form = document.getElementById('formDatosInstitucion');
            form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            form.querySelectorAll('.invalid-feedback.ajax-error').forEach(el => el.remove());

            Object.entries(errors || {}).forEach(([campo, mensajes]) => {
                const input = form.querySelector(`[name="${campo}"]`);
                if (!input) return;
                input.classList.add('is-invalid');
                const div = document.createElement('div');
                div.className = 'invalid-feedback ajax-error d-block';
                div.textContent = Array.isArray(mensajes) ? mensajes[0] : mensajes;
                input.parentNode.appendChild(div);
            });
        }

        function actualizarDatosInstitucion() {
            const form = document.getElementById('formDatosInstitucion');
            const formData = new FormData(form);

            setBtnActualizar('guardando');

            $.ajax({
                url: URL_CONFIGURACION_UPDATE,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'json',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? ''
                },
                success: function(res) {
                    if (!res.success) {
                        mostrarToast('error', res.message || 'No se pudo actualizar');
                        return;
                    }
                    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
                    form.querySelectorAll('.invalid-feedback.ajax-error').forEach(el => el.remove());
                    mostrarToast('success', res.message || 'Datos actualizados correctamente');
                },
                error: function(xhr) {
                    if (xhr.status === 422) {
                        const errors = xhr.responseJSON?.errors ?? {};
                        mostrarErroresFormulario(errors);
                        const msgLogo = errors.logo?.[0];
                        mostrarToast('error', msgLogo || 'Verifique los datos ingresados');
                        return;
                    }
                    mostrarToast('error', xhr.responseJSON?.message || 'Error al actualizar la institución');
                },
                complete: function() {
                    setBtnActualizar('listo');
                }
            });
        }
    </script>
@endpush
