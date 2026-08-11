<div class="modal fade modal-app" id="modalCrearCatalogoDBA" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i id="modalCrearCatalogoDBAIcon"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalCrearCatalogoDBALabel"></h5>
                    <p class="modal-subtitle mb-0" id="modalCrearCatalogoDBASubtitle"></p>
                </div>
                <button type="button" class="btn-close" id="btnCloseModalCrearCatalogoDBA" data-bs-dismiss="modal"
                    aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-4">
                <form id="formCrearCatalogoDBA" method="POST">
                    @csrf
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="codigo">Código</label>
                                <input type="text" id="codigo" name="codigo" class="form-control"
                                    placeholder="Código del catálogo" required maxlength="50">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="area_id">Área</label>
                                <select id="area_id" name="area_id" class="form-control" required
                                    style="cursor:pointer;">
                                    <option value="">Selecciona una área</option>
                                    @foreach ($areas as $area)
                                        <option value="{{ $area->id }}">
                                            {{ $area->nombre }}
                                        </option>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="grado_id">Grado</label>
                                <select id="grado_id" name="grado_id" class="form-control" required
                                    style="cursor:pointer;">
                                    <option value="">Selecciona un grado</option>
                                    @foreach ($grados as $grado)
                                        <option value="{{ $grado->id }}">
                                            {{ $grado->nombre }}
                                        </option>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="es_men">Origen</label>
                                <select id="es_men" name="es_men" class="form-control" required
                                    style="cursor:pointer;">
                                    <option value="">Selecciona un origen</option>
                                    <option value="1">MEN</option>
                                    <option value="0">NO MEN</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-12">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="descripcion">Descripción</label>
                                <textarea id="descripcion" name="descripcion" class="form-control" rows="3"
                                    placeholder="Descripción del catálogo" required maxlength="255"></textarea>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    onclick="cerrarModalCrearCatalogoDBA()">
                    <i class="fa-solid fa-xmark"></i> Cancelar</button>
                <button type="submit" form="formCrearCatalogoDBA" id="btnCrearCatalogoDBA" class="btn btn-primary">
                    <i class="fa-solid fa-floppy-disk"></i> Crear Catálogo DBA</button>
            </div>
        </div>
    </div>
</div>
