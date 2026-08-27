{{--
    Modal: Registrar / Editar Perfil de Aprendizaje (Super Admin)
    Pestañas: Datos generales | Ajustes (próximamente)
    En edición: carga datos por AJAX → superadmin.perfil-aprendizaje.mostrar
--}}
<div class="modal fade modal-app" id="modalRegistrarPerfilAprendizaje" tabindex="-1" data-bs-keyboard="false"
    aria-labelledby="modalRegistrarPerfilAprendizajeTitle" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fas fa-layer-group text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" style="font-size: 1.4rem;" id="modalRegistrarPerfilAprendizajeTitle">
                        Nuevo Perfil de Aprendizaje</h5>
                    <p class="modal-subtitle mb-0" id="modalRegistrarPerfilAprendizajeSubtitle">
                        Registre un perfil de aprendizaje global.</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-4">
                <ul class="nav nav-tabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <a class="nav-link active" id="tab-datos-generales" data-bs-toggle="tab"
                            href="#datosGeneralesPerfilAprendizaje" role="tab" aria-controls="datosGeneralesPerfilAprendizaje"
                            aria-selected="true">
                            <i class="fas fa-circle-info"></i> Datos generales
                        </a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="tab-ajustes" data-bs-toggle="tab" href="#ajustesPerfilAprendizaje"
                            role="tab" aria-controls="ajustesPerfilAprendizaje" aria-selected="false">
                            <i class="fas fa-sliders"></i> Ajustes
                        </a>
                    </li>
                </ul>

                <form id="formRegistrarPerfilAprendizaje" method="POST" autocomplete="off">
                    @csrf
                    <input type="hidden" id="perfil_aprendizaje_id" value="">

                    <div class="tab-content" style="padding: 20px 0 0;">
                        <div class="tab-pane fade show active" id="datosGeneralesPerfilAprendizaje" role="tabpanel"
                            aria-labelledby="tab-datos-generales">
                            <div class="row g-3">
                                <div class="col-md-4" id="wrapCodigo" style="display:none">
                                    <label class="form-label fw-bold" for="codigo">Código</label>
                                    <input type="text" id="codigo" name="codigo" class="form-control" readonly>
                                </div>
                                <div class="col-md-8" id="wrapNombre">
                                    <label class="form-label fw-bold" for="nombre">Nombre</label>
                                    <input type="text" id="nombre" name="nombre" class="form-control"
                                        placeholder="Nombre del perfil de aprendizaje" maxlength="100" required>
                                    <small class="text-muted" id="hintCodigoAuto">
                                        El código se genera automáticamente (ej: COND-001).
                                    </small>
                                </div>
                                <div class="col-12">
                                    <label class="form-label fw-bold" for="descripcion_corta">Descripción corta</label>
                                    <textarea id="descripcion_corta" name="descripcion_corta" class="form-control"
                                        rows="3" placeholder="Descripción breve del perfil de aprendizaje" required></textarea>
                                </div>
                                <div class="col-md-4 campo-solo-crear">
                                    <label class="form-label fw-bold" for="estado">Estado</label>
                                    <select id="estado" name="estado" class="form-select">
                                        <option value="1" selected>Activa</option>
                                        <option value="0">Inactiva</option>
                                    </select>
                                </div>
                                <div class="col-md-4" id="wrapColor">
                                    <label class="form-label fw-bold" for="color_hex">Color</label>
                                    <div class="d-flex align-items-center gap-2">
                                        <input type="color" id="color_hex_picker" value="#2563EB"
                                            style="width:46px;height:38px;padding:2px;border:1px solid #CBD5E1;border-radius:8px;cursor:pointer"
                                            title="Seleccionar color">
                                        <input type="text" id="color_hex" name="color_hex" class="form-control"
                                            value="#2563EB" maxlength="7" pattern="^#[0-9A-Fa-f]{6}$" required>
                                    </div>
                                </div>
                                <div class="col-md-4 d-flex align-items-end" id="wrapEsSistema">
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="es_sistema"
                                            name="es_sistema" value="1">
                                        <label class="form-check-label fw-bold" for="es_sistema">
                                            Perfil de aprendizaje de sistema
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="tab-pane fade" id="ajustesPerfilAprendizaje" role="tabpanel"
                            aria-labelledby="tab-ajustes">
                            <div class="text-center text-muted py-5">
                                <i class="fas fa-sliders" style="font-size:2rem;opacity:.45"></i>
                                <p class="mt-3 mb-1 fw-semibold">Ajustes del perfil de aprendizaje</p>
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
                <button type="button" class="btn btn-primary" id="btnGuardarPerfilAprendizaje">
                    <i class="fas fa-save"></i> Guardar
                </button>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script>
         const URL_GUARDAR_PERFIL_APRENDIZAJE = @json(route('superadmin.perfil-aprendizaje.guardar'));
         const URL_PERFIL_APRENDIZAJE = (id) => @json(url('/superadmin/perfil-aprendizaje')) + '/' + id;
    </script>
    <!-- si es super admin importar el script de superadmin-perfiles-aprendizaje.js -->
    @if(session('es_super_admin'))
    <script src="{{ asset('assets/js/perfiles-aprendizaje/superadmin-perfiles-aprendizaje.js') }}"></script>
    @endif
@endpush
