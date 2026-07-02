@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/estilosModals.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/docente/index.css') }}">
@endpush


{{-- ── Modal Bootstrap 5 – Completar Información ──────────────────────── --}}
<div class="modal fade" id="modalBSCompletarInfo" tabindex="-1" data-bs-keyboard="false" data-bs-backdrop="static"
    aria-labelledby="modalBSCompletarInfoLabel" aria-hidden="false">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i id="modalBSCompletarInfoIcon"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalBSCompletarInfoLabel"></h5>
                    <p class="modal-subtitle mb-0" id="modalBSCompletarInfoSubtitle"></p>
                </div>
                <button type="button" class="btn-close" onclick="cerrarModalBSCompletarInfo()" data-bs-dismiss="modal"
                    aria-label="Cerrar">
                </button>
            </div>
            <div class="modal-body">
                {{-- Un solo formulario para ambas pestañas: evita IDs duplicados y envía todos los campos. --}}
                <form id="formCompletarInfo" enctype="multipart/form-data" method="POST">
                    @csrf
                    <div class="tab-content" style="padding: 20px;">
                        <div class="row">
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <strong class="form-label">Telefono</strong>
                                    <input type="number" id="telefono" name="telefono" class="form-control"
                                        placeholder="Telefono del docente" value="{{ old('telefono') }}">
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <strong class="form-label">Dirección</strong>
                                    <input type="text" id="direccion" name="direccion" class="form-control"
                                        placeholder="Dirección del docente" value="{{ old('direccion') }}">
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <strong class="form-label">Especialidad</strong>
                                    <input type="text" id="especialidad" name="especialidad" class="form-control"
                                        placeholder="Especialidad del docente" value="{{ old('especialidad') }}">
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <strong class="form-label">Fecha de ingreso</strong>
                                    <input type="date" id="fecha_ingreso" name="fecha_ingreso" class="form-control"
                                        placeholder="Fecha de ingreso del docente" value="{{ old('fecha_ingreso') }}">
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <strong class="form-label">Firma</strong>
                                    <input type="file" id="firma_url" name="firma_url" class="form-control"
                                        accept="image/*" onchange="previewImage(event, '#imgPreviewFirma')">
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <strong class="form-label" id="lblVistaPreviaFirma">Vista previa de la
                                        firma</strong>
                                    <img id="imgPreviewFirma" class="w-50"
                                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMmyTPv4M5fFPvYLrMzMQcPD_VO34ByNjouQ&s"
                                        alt="Firma del docente">
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    onclick="cerrarModalBSCompletarInfo()">
                    <i class="fa-solid fa-xmark"></i> Cancelar</button>
                <button type="submit" form="formCompletarInfo" id="btnCompletarInfo" class="btn btn-primary">
                    <i class="fa-solid fa-floppy-disk"></i> Completar</button>
            </div>
        </div>
    </div>
</div>
