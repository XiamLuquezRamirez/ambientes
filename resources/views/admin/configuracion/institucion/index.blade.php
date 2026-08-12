@extends('layouts.admin')
@section('title', 'Configuración')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
@endpush

@section('content')
    <div class="page-header">
        <h1>Configuración</h1>
        <p style="color:#64748B">Configuración de la institución</p>
    </div>
    <div class="c-card ">
        <ul class="nav nav-tabs" role="tablist">
            <li class="nav-item" role="presentation">
                <a class="nav-link active" id="tab-datos-institucion" data-bs-toggle="tab" href="#datosInstitucion"
                    role="tab" aria-controls="datosInstitucion" aria-selected="true">
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
                <a class="nav-link" id="tab-modulos" data-bs-toggle="tab" href="#modulos" role="tab"
                    aria-controls="modulos" aria-selected="false">
                    <i class="fas fa-cube"></i> Módulos
                </a>
            </li>
            <li class="nav-item" role="presentation">
                <a class="nav-link" id="tab-ejes" data-bs-toggle="tab" href="#ejes" role="tab" aria-controls="ejes"
                    aria-selected="false">
                    <i class="fas fa-diagram-project"></i> Ejes
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
                                        <img src="{{ $logoUrlPublica ?? '' }}" id="logoPerfilImagen"
                                            class="profile-avatar-img {{ $logoUrlPublica ? '' : 'd-none' }}"
                                            alt="Logo institución">
                                        <span id="logoPerfilIniciales"
                                            class="profile-avatar-iniciales {{ $logoUrlPublica ? 'd-none' : '' }}">
                                            {{ $iniciales ?? 'IE' }}
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
                                    placeholder="Nombre de la institución" value="{{ old('nombre', $institucion->nombre) }}"
                                    required>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="codigo_dane">Código DANE</label>
                                <input type="text" id="codigo_dane" name="codigo_dane" class="form-control"
                                    placeholder="Código DANE de la institución"
                                    value="{{ old('codigo_dane', $institucion->codigo_dane) }}" required>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="departamento_id">Departamento</label>
                                <select id="departamento_id" name="departamento_id" class="form-control" required
                                    onchange="cargarMunicipiosInstitucion()">
                                    <option value="">Seleccione</option>
                                    @foreach ($departamentos as $d)
                                        <option value="{{ $d->codigo }}"
                                            @selected((string) old('departamento_id', $departamentoId) === (string) $d->codigo)>
                                            {{ $d->descripcion }}
                                        </option>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="municipio_id">Municipio</label>
                                <select id="municipio_id" name="municipio_id" class="form-control" required>
                                    <option value="">Seleccione</option>
                                    @foreach ($municipios as $m)
                                        <option value="{{ $m->id }}"
                                            @selected((string) old('municipio_id', $municipioId) === (string) $m->id)>
                                            {{ $m->descripcion }}
                                        </option>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="correo_contacto">Correo de
                                    contacto</label>
                                <input type="email" id="correo_contacto" name="correo_contacto" class="form-control"
                                    placeholder="Correo de contacto de la institución"
                                    value="{{ old('correo_contacto', $institucion->correo_contacto) }}" required>
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
                                            <input type="text" class="form-control"
                                                id="ambiente_ip_{{ $a->id }}" value="{{ $a->pivot->ip }}" readonly
                                                tabindex="-1">
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
                                            Sin ambientes activos contratados
                                        </td>
                                    </tr>
                                @endforelse
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="tab-pane container" id="modulos" role="tabpanel" aria-labelledby="tab-modulos">
                    @include('admin.configuracion.institucion._modulos')
                </div>

                <div class="tab-pane container" id="ejes" role="tabpanel" aria-labelledby="tab-ejes">
                    @include('admin.configuracion.institucion._ejes')
                </div>
            </div>
        </form>
    </div>

    @include('admin.configuracion.institucion.modalLogoInstitucion')
    @include('admin.configuracion.institucion.modalCrearModulos')
    @include('admin.configuracion.institucion.modalVerEjesModulo')
@endsection

@push('scripts')
    <script>
        const URL_CONFIGURACION_UPDATE = @json(route('admin.configuracion.update'));
        const URL_CARGAR_MUNICIPIOS = @json(url('admin/configuracion/cargar-municipios'));
        const INSTITUCION_ID = @json((int) $institucion->id);

        if (typeof window.setEstadoLogoInstitucion === 'function') {
            window.setEstadoLogoInstitucion({
                id: INSTITUCION_ID,
                logoUrl: @json($logoUrlPublica),
                iniciales: @json($iniciales ?? 'IE'),
            });
        } else {
            window.idInstitucionEditando = INSTITUCION_ID;
            window.logoInstitucionActualUrl = @json($logoUrlPublica);
            window.logoInstitucionIniciales = @json($iniciales ?? 'IE');
        }

        async function cargarMunicipiosInstitucion(municipioSeleccionado = null) {
            const departamento = document.getElementById('departamento_id')?.value;
            const selMunicipio = document.getElementById('municipio_id');
            if (!selMunicipio) return;

            selMunicipio.innerHTML = '<option value="">Seleccione</option>';

            if (!departamento) return;

            try {
                const res = await fetch(`${URL_CARGAR_MUNICIPIOS}/${departamento}`, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                if (!res.ok) throw new Error('Error al cargar municipios');
                const municipios = await res.json();

                (municipios || []).forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.id;
                    opt.textContent = m.descripcion;
                    if (municipioSeleccionado != null && String(m.id) === String(municipioSeleccionado)) {
                        opt.selected = true;
                    }
                    selMunicipio.appendChild(opt);
                });
            } catch (e) {
                mostrarToast('error', 'Error al cargar los municipios');
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
    <script src="{{ asset('assets/js/configuracion-ejes-ui.js') }}"></script>
    <script src="{{ asset('assets/js/admin/configuracion-modulos.js') }}"></script>
@endpush
