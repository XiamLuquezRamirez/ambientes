@php
    $theadEjesModal = '
        <tr>
            <th style="width:34px"></th>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Temáticas</th>
            <th>Orden</th>
            <th>Estado</th>
            <th style="text-align:center">Acciones</th>
        </tr>
    ';
@endphp

<div class="modal fade modal-app" id="modalVerEjesModulo" tabindex="-1" data-bs-keyboard="false"
    aria-labelledby="modalVerEjesModuloLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fas fa-diagram-project text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" style="font-size: 1.4rem;" id="modalVerEjesModuloLabel">
                        Ejes del módulo
                    </h5>
                    <p class="modal-subtitle mb-0" id="modalVerEjesModuloSubtitle">
                        Ejes oficiales (solo lectura) y ejes propios del colegio
                    </p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>

            <div class="modal-body p-4">
                <input type="hidden" id="ejes_modulo_id" value="">

                <div id="ejesModuloLoading" class="ejes-modal-state" hidden>
                    <i class="fa-solid fa-spinner fa-spin"></i> Cargando ejes…
                </div>

                <div id="ejesModuloError" class="ejes-modal-state text-danger" hidden></div>

                <div id="ejesModuloContenido" hidden>
                    <p class="text-muted small mb-3">
                        Los <span class="star">⭐ Oficiales</span> son del sistema (solo lectura).
                        En <span class="badge-colegio">Del colegio</span> gestiona ejes propios del módulo.
                    </p>

                    {{-- Ejes oficiales --}}
                    <div class="modulos-seccion modulos-seccion-oficiales mb-3" data-seccion="oficiales">
                        <div class="modulos-seccion-head">
                            <span class="modulos-seccion-title">
                                <span class="star">⭐ Oficial</span>
                                Ejes oficiales
                            </span>
                            <span class="modulos-seccion-hint">Catálogo PedNia · solo lectura</span>
                        </div>
                        <div class="table-container" data-wrap-ejes-oficiales hidden>
                            <table id="tablaEjesOficiales">
                                <thead>{!! $theadEjesModal !!}</thead>
                                <tbody id="tablaEjesOficialesBody" data-tbody-ejes-oficiales></tbody>
                            </table>
                        </div>
                        <div id="ejesOficialesEmpty" class="cfg-empty" data-empty-ejes-oficiales>
                            Este módulo no tiene ejes oficiales registrados.
                        </div>
                    </div>

                    {{-- Ejes del colegio --}}
                    <div class="modulos-seccion modulos-seccion-colegio mb-4" data-seccion="colegio">
                        <div class="modulos-seccion-head">
                            <span class="modulos-seccion-title">
                                <span class="badge-colegio">Del colegio</span>
                                Ejes del colegio
                            </span>
                            <span class="modulos-seccion-hint">Creados por su institución · editables</span>
                        </div>
                        <div class="table-container" data-wrap-ejes-colegio hidden>
                            <table id="tablaEjesColegio">
                                <thead>{!! $theadEjesModal !!}</thead>
                                <tbody id="tablaEjesColegioBody" data-tbody-ejes-colegio></tbody>
                            </table>
                        </div>
                        <div id="ejesColegioEmpty" class="cfg-empty" data-empty-ejes-colegio>
                            Aún no hay ejes del colegio en este módulo.
                        </div>
                    </div>

                    <div class="ejes-form-crear" id="ejesFormCrearWrap">
                        <h6 class="ejes-form-title" id="ejesFormTitle">
                            <i class="fa-solid fa-plus" id="ejesFormTitleIcon"></i>
                            <span id="ejesFormTitleText">Nuevo eje del colegio</span>
                        </h6>
                        <form id="formCrearEje" novalidate>
                            <input type="hidden" id="eje_id" value="">
                            <div class="row g-3">
                                <div class="col-md-5">
                                    <label class="form-label fw-bold" for="eje_nombre">
                                        Nombre <span class="text-danger">*</span>
                                    </label>
                                    <input type="text" class="form-control" id="eje_nombre" name="nombre"
                                        maxlength="100" placeholder="Ej. Exploración sensorial" required>
                                    <small class="text-muted">
                                        Máx. 100 caracteres · slug:
                                        <span class="cfg-slug-preview" id="eje_slug_preview">se genera
                                            automáticamente</span>
                                    </small>
                                </div>
                                <div class="col-md-5">
                                    <label class="form-label fw-bold" for="eje_descripcion">Descripción</label>
                                    <textarea class="form-control" id="eje_descripcion" name="descripcion" rows="2" maxlength="1000"
                                        placeholder="Opcional"></textarea>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label fw-bold" for="eje_orden">Orden</label>
                                    <input type="number" class="form-control" id="eje_orden" name="orden"
                                        min="0" max="255" placeholder="Auto">
                                </div>
                            </div>
                            <div class="d-flex justify-content-end gap-2 mt-3">
                                <button type="button" class="btn btn-secondary" id="btnCancelarEje" hidden>
                                    Cancelar
                                </button>
                                <button type="submit" class="btn btn-primary" id="btnGuardarEje">
                                    <i class="fa-solid fa-floppy-disk"></i> Crear eje
                                </button>
                            </div>
                        </form>
                    </div>
                    <div id="ejesFormInactivoHint" class="cfg-empty" hidden>
                        Active el módulo para crear y gestionar ejes del colegio.
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            </div>
        </div>
    </div>
</div>
