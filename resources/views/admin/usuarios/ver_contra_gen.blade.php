@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/estilosModals.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/docente/index.css') }}">
@endpush


{{-- ── Modal Bootstrap 5 – Información de la Contraseña ──────────────────────── --}}
<div class="modal fade" id="modalBSPasswordGenerada" tabindex="-1" data-bs-keyboard="false" data-bs-backdrop="static"
    aria-labelledby="modalBSPasswordGeneradaLabel" aria-hidden="false">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalBSPasswordGeneradaLabel"></h5>
            </div>
            <div class="modal-body">
                <p id="modalBSPasswordGeneradaSubtitle"></p>
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <strong>Correo electrónico</strong>
                            <div class="input-group">
                                <input type="text" id="asignar_email" class="form-control"
                                    value="{{ old('email') ?? '-' }}" readonly>
                                <button type="button" class="btn btn-outline-secondary btn-copiar"
                                    data-target="asignar_email" title="Copiar correo">
                                    <i class="fa-solid fa-copy"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <strong>Contraseña</strong>
                            <div class="input-group">
                                <input type="text" id="passwordGenerada" class="form-control"
                                    value="{{ $passwordGenerada ?? '' }}" readonly>
                                <button type="button" class="btn btn-outline-secondary btn-copiar"
                                    data-target="passwordGenerada" title="Copiar contraseña">
                                    <i class="fa-solid fa-copy"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" id="btnDescargarPdf" class="btn btn-danger">
                    <i class="fa-solid fa-file-pdf"></i>
                    Descargar PDF
                </button>
                <button type="button" onclick="cerrarModalBSPasswordGenerada()" class="btn btn-primary"
                    data-bs-dismiss="modal"> <i class="fa-solid fa-check"></i> Terminar</button>
            </div>
        </div>
    </div>
</div>
