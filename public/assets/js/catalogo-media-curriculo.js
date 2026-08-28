/**
 * Campos multimedia compartidos para formularios de módulos y ejes.
 */
(function (global) {
    'use strict';

    const ACCEPT = {
        imagen: 'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp',
        video: 'video/mp4,video/webm,video/mpeg,.mp4,.webm,.mpeg,.mov',
    };

    const HINT = {
        imagen: 'Formatos: JPG, PNG, GIF, WEBP.',
        video: 'Formatos: MP4, WEBM, MPEG. También puede usar URL de YouTube o Vimeo.',
    };

    async function ajaxFormRequest(url, method, formData) {
        if (method === 'PUT' || method === 'PATCH') {
            formData.append('_method', method);
        }

        try {
            const response = await fetch(url, {
                method: (method === 'PUT' || method === 'PATCH') ? 'POST' : method,
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
                body: formData,
            });

            if (response.status === 413) {
                return {
                    success: false,
                    message: 'El archivo supera el límite de subida del servidor (post_max_size / upload_max_filesize en PHP). '
                        + 'Pruebe con una URL externa (YouTube, Vimeo o enlace directo) o reinicie el servidor con límites más altos.',
                };
            }

            let json = {};
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                json = await response.json();
            }

            if (!response.ok) {
                return {
                    success: false,
                    errors: json.errors ?? {},
                    message: json.message ?? 'Error en la petición',
                };
            }
            return json;
        } catch (err) {
            console.error(err);
            return { success: false, message: 'Error de conexión' };
        }
    }

    function escapeHtml(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function detectarEmbed(url) {
        if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
        if (/vimeo\.com/i.test(url)) return 'vimeo';
        return 'directo';
    }

    function urlEmbed(url) {
        const yt = url.match(/(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
        if (yt) return 'https://www.youtube.com/embed/' + yt[1];
        const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        if (vm) return 'https://player.vimeo.com/video/' + vm[1];
        return url;
    }

    function bindMediaFields(wrap) {
        if (!wrap || wrap.dataset.cmBound === '1') return;
        wrap.dataset.cmBound = '1';

        const selTipo = wrap.querySelector('[data-cm-tipo]');
        const opciones = wrap.querySelector('[data-cm-opciones]');
        const panelLocal = wrap.querySelector('[data-cm-panel-local]');
        const panelUrl = wrap.querySelector('[data-cm-panel-url]');
        const inputArchivo = wrap.querySelector('[data-cm-archivo]');
        const inputUrl = wrap.querySelector('[data-cm-url]');
        const hintArchivo = wrap.querySelector('[data-cm-hint-archivo]');
        const previewWrap = wrap.querySelector('[data-cm-preview]');
        const previewContent = wrap.querySelector('[data-cm-preview-content]');
        const quitarWrap = wrap.querySelector('[data-cm-quitar-wrap]');
        const quitarCheck = wrap.querySelector('[data-cm-quitar]');

        function origenActual() {
            if (wrap.querySelector('[data-cm-origen-url]:checked')) return 'url';
            return 'local';
        }

        function tipoActual() {
            return selTipo ? selTipo.value : 'ninguno';
        }

        function actualizarVisibilidad() {
            const tipo = tipoActual();
            const visible = tipo !== 'ninguno';
            if (opciones) opciones.hidden = !visible;

            if (!visible) return;

            const origen = origenActual();
            if (panelLocal) panelLocal.hidden = origen !== 'local';
            if (panelUrl) panelUrl.hidden = origen !== 'url';

            if (inputArchivo) {
                inputArchivo.accept = ACCEPT[tipo] || '';
            }
            if (hintArchivo) {
                hintArchivo.textContent = HINT[tipo] || '';
            }
        }

        function renderPreviewFromData(data) {
            if (!previewWrap || !previewContent) return;
            const tipo = data?.tipo_media || 'ninguno';
            if (tipo === 'ninguno' || !data?.media_preview_url) {
                previewWrap.hidden = true;
                previewContent.innerHTML = '';
                if (quitarWrap) quitarWrap.hidden = true;
                return;
            }

            previewWrap.hidden = false;
            if (quitarWrap) quitarWrap.hidden = false;

            const url = data.media_preview_url;
            if (tipo === 'imagen') {
                previewContent.innerHTML = '<img src="' + escapeHtml(url) + '" alt="" style="max-width:100%;max-height:180px;border-radius:8px;">';
            } else if (data.media_embed === 'youtube' || data.media_embed === 'vimeo') {
                previewContent.innerHTML = '<iframe src="' + escapeHtml(urlEmbed(url)) + '" style="width:100%;aspect-ratio:16/9;border:0;border-radius:8px;" allowfullscreen></iframe>';
            } else {
                previewContent.innerHTML = '<video src="' + escapeHtml(url) + '" controls playsinline style="max-width:100%;max-height:180px;border-radius:8px;"></video>';
            }
        }

        function renderPreviewLocal() {
            if (!previewWrap || !previewContent || !inputArchivo?.files?.[0]) return;
            const file = inputArchivo.files[0];
            const tipo = tipoActual();
            const objectUrl = URL.createObjectURL(file);
            previewWrap.hidden = false;
            if (quitarCheck) quitarCheck.checked = false;

            if (tipo === 'imagen') {
                previewContent.innerHTML = '<img src="' + objectUrl + '" alt="" style="max-width:100%;max-height:180px;border-radius:8px;">';
            } else {
                previewContent.innerHTML = '<video src="' + objectUrl + '" controls playsinline style="max-width:100%;max-height:180px;border-radius:8px;"></video>';
            }
        }

        function renderPreviewUrl() {
            if (!previewWrap || !previewContent || !inputUrl?.value.trim()) return;
            const url = inputUrl.value.trim();
            const tipo = tipoActual();
            previewWrap.hidden = false;
            if (quitarCheck) quitarCheck.checked = false;

            if (tipo === 'imagen') {
                previewContent.innerHTML = '<img src="' + escapeHtml(url) + '" alt="" style="max-width:100%;max-height:180px;border-radius:8px;" onerror="this.replaceWith(document.createTextNode(\'No se pudo cargar la imagen\'))">';
            } else {
                const embed = detectarEmbed(url);
                if (embed === 'youtube' || embed === 'vimeo') {
                    previewContent.innerHTML = '<iframe src="' + escapeHtml(urlEmbed(url)) + '" style="width:100%;aspect-ratio:16/9;border:0;border-radius:8px;" allowfullscreen></iframe>';
                } else {
                    previewContent.innerHTML = '<video src="' + escapeHtml(url) + '" controls playsinline style="max-width:100%;max-height:180px;border-radius:8px;"></video>';
                }
            }
        }

        selTipo?.addEventListener('change', () => {
            actualizarVisibilidad();
            if (inputArchivo) inputArchivo.value = '';
            if (inputUrl) inputUrl.value = '';
            if (previewWrap) previewWrap.hidden = true;
        });

        wrap.querySelectorAll('[data-cm-origen-local], [data-cm-origen-url]').forEach((radio) => {
            radio.addEventListener('change', actualizarVisibilidad);
        });

        inputArchivo?.addEventListener('change', renderPreviewLocal);
        inputUrl?.addEventListener('input', () => {
            if (origenActual() === 'url') renderPreviewUrl();
        });

        quitarCheck?.addEventListener('change', () => {
            if (quitarCheck.checked && inputArchivo) inputArchivo.value = '';
        });

        wrap._cmFill = function (data) {
            if (selTipo) selTipo.value = data?.tipo_media || 'ninguno';
            const origen = data?.media_origen || 'local';
            const radioLocal = wrap.querySelector('[data-cm-origen-local]');
            const radioUrl = wrap.querySelector('[data-cm-origen-url]');
            if (radioLocal) radioLocal.checked = origen !== 'url';
            if (radioUrl) radioUrl.checked = origen === 'url';
            if (inputUrl && data?.media_url) inputUrl.value = data.media_url;
            if (inputArchivo) inputArchivo.value = '';
            if (quitarCheck) quitarCheck.checked = false;
            actualizarVisibilidad();
            renderPreviewFromData(data);
        };

        wrap._cmReset = function () {
            if (selTipo) selTipo.value = 'ninguno';
            const radioLocal = wrap.querySelector('[data-cm-origen-local]');
            const radioUrl = wrap.querySelector('[data-cm-origen-url]');
            if (radioLocal) radioLocal.checked = true;
            if (radioUrl) radioUrl.checked = false;
            if (inputArchivo) inputArchivo.value = '';
            if (inputUrl) inputUrl.value = '';
            if (quitarCheck) quitarCheck.checked = false;
            if (previewWrap) previewWrap.hidden = true;
            if (previewContent) previewContent.innerHTML = '';
            if (quitarWrap) quitarWrap.hidden = true;
            actualizarVisibilidad();
        };

        actualizarVisibilidad();
    }

    function initForm(form) {
        if (!form) return;
        form.querySelectorAll('[data-curriculo-media]').forEach(bindMediaFields);
    }

    function fillForm(form, data) {
        if (!form) return;
        form.querySelectorAll('[data-curriculo-media]').forEach((wrap) => {
            if (typeof wrap._cmFill === 'function') wrap._cmFill(data || {});
        });
    }

    function resetForm(form) {
        if (!form) return;
        form.querySelectorAll('[data-curriculo-media]').forEach((wrap) => {
            if (typeof wrap._cmReset === 'function') wrap._cmReset();
        });
    }

    function buildFormData(form, extraFields) {
        const fd = new FormData();
        Object.entries(extraFields || {}).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                fd.append(key, value);
            }
        });

        const mediaWrap = form.querySelector('[data-curriculo-media]');
        if (!mediaWrap) return fd;

        const tipo = mediaWrap.querySelector('[data-cm-tipo]')?.value || 'ninguno';
        fd.append('tipo_media', tipo);

        if (tipo === 'ninguno') {
            return fd;
        }

        const quitar = mediaWrap.querySelector('[data-cm-quitar]')?.checked;
        if (quitar) {
            fd.append('quitar_media', '1');
            return fd;
        }

        const origen = mediaWrap.querySelector('[data-cm-origen-url]:checked') ? 'url' : 'local';
        fd.append('media_origen', origen);

        if (origen === 'url') {
            const url = mediaWrap.querySelector('[data-cm-url]')?.value?.trim();
            if (url) fd.append('media_url', url);
        } else {
            const archivo = mediaWrap.querySelector('[data-cm-archivo]')?.files?.[0];
            if (archivo) fd.append('archivo', archivo);
        }

        return fd;
    }

    global.CatalogoMediaCurriculo = {
        initForm,
        fillForm,
        resetForm,
        buildFormData,
        ajaxFormRequest,
    };
})(window);
