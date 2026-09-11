<div class="modal fade modal-app" id="modalJuegoCatalogo" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i id="modalJuegoCatalogoIcon" class="fas fa-gamepad text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalJuegoCatalogoLabel">Nuevo juego</h5>
                    <p class="modal-subtitle mb-0" id="modalJuegoCatalogoSubtitle">
                        Crea el registro y el stub del paquete bajo public/catalogo_juegos.
                    </p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-4">
                <form id="formJuegoCatalogo" method="POST" novalidate>
                    @csrf
                    <input type="hidden" name="juego_id" id="juego_id" value="">

                    <div class="row">
                        <div class="col-md-8">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="juego_nombre">Nombre <span class="text-danger">*</span></label>
                                <input type="text" id="juego_nombre" name="nombre" class="form-control" maxlength="150"
                                    placeholder="Nombre visible en el catálogo" required>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="juego_tipo">Tipo <span class="text-danger">*</span></label>
                                <select id="juego_tipo" name="tipo" class="form-control" required style="cursor:pointer;">
                                    <option value="">Selecciona un tipo</option>
                                    @foreach ($tiposJuego as $valor => $etiqueta)
                                        <option value="{{ $valor }}">{{ $etiqueta }}</option>
                                    @endforeach
                                </select>
                            </div>
                        </div>

                        <div class="col-md-12">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="juego_ruta">Ruta del paquete</label>
                                <input type="text" id="juego_ruta" name="ruta" class="form-control" maxlength="255"
                                    placeholder="catalogo_juegos/Polimotor/MiJuego" readonly
                                    aria-describedby="juego_ruta_ayuda">
                                <small class="text-muted" id="juego_ruta_ayuda">
                                    Se genera sola: catalogo_juegos/{Ambiente}/{Nombre}
                                    (iniciales en mayúscula). Al crear se escribe el stub; si la carpeta ya existe, falla.
                                </small>
                            </div>
                        </div>

                        <div class="col-md-12">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="juego_descripcion">Descripción</label>
                                <textarea id="juego_descripcion" name="descripcion" class="form-control" rows="3"
                                    maxlength="2000" placeholder="Descripción breve del juego"></textarea>
                            </div>
                        </div>

                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="juego_icono">Icono Font Awesome</label>
                                <input type="text" id="juego_icono" name="icono" class="form-control" maxlength="80"
                                    placeholder="fa-puzzle-piece">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="juego_color">Color</label>
                                <input type="color" id="juego_color" name="color"
                                    class="form-control form-control-color w-100" value="#2563eb"
                                    title="Color de la tarjeta">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label fw-bold d-block" for="juego_activo">Estado</label>
                                <div class="form-check form-switch mt-2">
                                    <input class="form-check-input" type="checkbox" value="1" id="juego_activo"
                                        name="activo" checked style="cursor:pointer;">
                                    <label class="form-check-label" for="juego_activo">Activo</label>
                                </div>
                            </div>
                        </div>

                        <div class="col-12">
                            <hr class="my-2">
                            <p class="fw-bold mb-3">Cadena curricular</p>
                        </div>

                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="juego_ambiente_id">Ambiente <span class="text-danger">*</span></label>
                                <select id="juego_ambiente_id" name="ambiente_id"
                                    class="form-control js-juego-form-ambiente" required style="cursor:pointer;">
                                    <option value="">Selecciona un ambiente</option>
                                    @foreach ($ambientes as $ambiente)
                                        <option value="{{ $ambiente->id }}"
                                            data-slug="{{ $ambiente->slug }}"
                                            data-nombre="{{ $ambiente->nombre }}">
                                            {{ $ambiente->nombre }}
                                        </option>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="juego_modulo_id">Módulo</label>
                                <select id="juego_modulo_id" name="modulo_id"
                                    class="form-control js-juego-form-modulo" style="cursor:pointer;">
                                    <option value="">Sin módulo</option>
                                    @foreach ($modulos as $modulo)
                                        <option value="{{ $modulo->id }}" data-ambiente-id="{{ $modulo->ambiente_id }}">
                                            {{ $modulo->nombre }}
                                        </option>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="juego_eje_id">Eje</label>
                                <select id="juego_eje_id" name="eje_id"
                                    class="form-control js-juego-form-eje" style="cursor:pointer;">
                                    <option value="">Sin eje</option>
                                    @foreach ($ejes as $eje)
                                        <option value="{{ $eje->id }}" data-modulo-id="{{ $eje->modulo_id }}">
                                            {{ $eje->nombre }}
                                        </option>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label fw-bold" for="juego_tematica_id">Temática</label>
                                <select id="juego_tematica_id" name="tematica_id"
                                    class="form-control js-juego-form-tematica" style="cursor:pointer;">
                                    <option value="">Sin temática</option>
                                    @foreach ($tematicas as $tematica)
                                        <option value="{{ $tematica->id }}" data-eje-id="{{ $tematica->eje_id }}">
                                            {{ $tematica->nombre }}
                                        </option>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    data-bs-dismiss="modal">
                    <i class="fa-solid fa-xmark"></i> Cancelar
                </button>
                <button type="submit" form="formJuegoCatalogo" id="btnGuardarJuegoCatalogo" class="btn btn-primary">
                    <i class="fa-solid fa-floppy-disk"></i> Guardar juego
                </button>
            </div>
        </div>
    </div>
</div>
