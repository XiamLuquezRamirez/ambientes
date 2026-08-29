{{-- Campos multimedia opcionales para módulos y ejes del currículo --}}
<div class="curriculo-media-fields border rounded p-3 mb-3 bg-light" data-curriculo-media>
    <h6 class="fw-bold mb-3">
        <i class="fa-solid fa-photo-film me-1"></i> Contenido multimedia (opcional)
    </h6>
    <p class="text-muted small mb-3">
        Se muestra en el camino 3D del kiosco al llegar a esta parada. Imagen <em>o</em> video, no ambos.
    </p>

    <div class="mb-3">
        <label class="form-label fw-bold" for="{{ $mediaIdPrefix ?? 'media' }}_tipo">Tipo</label>
        <select class="form-select" id="{{ $mediaIdPrefix ?? 'media' }}_tipo" name="tipo_media" data-cm-tipo>
            <option value="ninguno">Sin multimedia</option>
            <option value="imagen">Imagen</option>
            <option value="video">Video</option>
        </select>
    </div>

    <div class="curriculo-media-opciones" data-cm-opciones hidden>
        <div class="mb-3">
            <span class="form-label fw-bold d-block">Origen</span>
            <div class="form-check form-check-inline">
                <input class="form-check-input" type="radio" id="{{ $mediaIdPrefix ?? 'media' }}_origen_local"
                    value="local" data-cm-origen-local checked>
                <label class="form-check-label" for="{{ $mediaIdPrefix ?? 'media' }}_origen_local">Subir archivo</label>
            </div>
            <div class="form-check form-check-inline">
                <input class="form-check-input" type="radio" id="{{ $mediaIdPrefix ?? 'media' }}_origen_url"
                    value="url" data-cm-origen-url>
                <label class="form-check-label" for="{{ $mediaIdPrefix ?? 'media' }}_origen_url">URL externa</label>
            </div>
        </div>

        <div class="mb-3" data-cm-panel-local>
            <label class="form-label fw-bold" for="{{ $mediaIdPrefix ?? 'media' }}_archivo">Archivo</label>
            <input type="file" class="form-control" id="{{ $mediaIdPrefix ?? 'media' }}_archivo" name="archivo"
                accept="" data-cm-archivo>
            <small class="text-muted" data-cm-hint-archivo></small>
        </div>

        <div class="mb-3" data-cm-panel-url hidden>
            <label class="form-label fw-bold" for="{{ $mediaIdPrefix ?? 'media' }}_url">URL</label>
            <input type="url" class="form-control" id="{{ $mediaIdPrefix ?? 'media' }}_url" name="media_url"
                placeholder="https://…" data-cm-url>
            <small class="text-muted">
                Archivo directo (.jpg, .mp4…) o enlace de YouTube / Vimeo.
            </small>
        </div>

        <div class="curriculo-media-preview mb-2" data-cm-preview hidden>
            <span class="form-label fw-bold d-block">Vista previa</span>
            <div data-cm-preview-content class="border rounded p-2 bg-white text-center"></div>
        </div>

        <div class="form-check mb-0" data-cm-quitar-wrap hidden>
            <input class="form-check-input" type="checkbox" name="quitar_media" id="{{ $mediaIdPrefix ?? 'media' }}_quitar"
                value="1" data-cm-quitar>
            <label class="form-check-label text-danger" for="{{ $mediaIdPrefix ?? 'media' }}_quitar">
                Quitar multimedia actual
            </label>
        </div>
    </div>
</div>
