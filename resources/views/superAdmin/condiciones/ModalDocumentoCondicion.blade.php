{{--
    Modal: Subir / Ver / Reemplazar PDF de condición
--}}
<div class="modal fade" id="modalDocumentoCondicion" tabindex="-1" data-bs-keyboard="false"
    aria-labelledby="modalDocumentoCondicionTitle" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fas fa-file-pdf text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" style="font-size: 1.4rem;" id="modalDocumentoCondicionTitle">
                        Documento PDF</h5>
                    <p class="modal-subtitle mb-0" id="modalDocumentoCondicionSubtitle">
                        Adjunte o actualice el PDF de la condición.</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-4">
                <input type="hidden" id="documento_condicion_id" value="">

                <div id="bloqueDocumentoActual" style="display:none;margin-bottom:20px">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">
                        <div>
                            <div style="font-weight:700;color:#0F172A" id="documentoNombreArchivo">—</div>
                            <div style="color:#64748B;font-size:.9rem" id="documentoMetaInfo">—</div>
                        </div>
                        <div style="display:flex;gap:8px">
                            <a href="#" id="btnAbrirDocumentoNuevaPestana" target="_blank" class="btn btn-sm"
                                style="background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE">
                                <i class="fas fa-external-link-alt"></i> Abrir
                            </a>
                            <button type="button" class="btn btn-sm" id="btnEliminarDocumentoCondicion"
                                style="background:#FEF2F2;color:#DC2626;border:1px solid #FECACA">
                                <i class="fas fa-trash-can"></i> Eliminar
                            </button>
                        </div>
                    </div>
                    <div style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;background:#F8FAFC">
                        <iframe id="iframeDocumentoCondicion" title="Vista previa PDF"
                            style="width:100%;height:420px;border:0;display:block"></iframe>
                    </div>
                </div>

                <div id="bloqueSinDocumento" class="text-center text-muted py-4" style="display:none">
                    <i class="fas fa-file-circle-plus" style="font-size:2rem;opacity:.4"></i>
                    <p class="mt-3 mb-0">Esta condición aún no tiene un PDF adjunto.</p>
                </div>

                <form id="formDocumentoCondicion" enctype="multipart/form-data" autocomplete="off">
                    @csrf
                    <div class="mb-0">
                        <label class="form-label fw-bold" for="archivo_pdf_condicion">
                            <span id="labelArchivoPdf">Seleccionar PDF</span>
                        </label>
                        <input type="file" id="archivo_pdf_condicion" name="archivo" class="form-control"
                            accept="application/pdf,.pdf">
                        <small class="text-muted">Solo PDF. Tamaño máximo: 10 MB.</small>
                    </div>

                    <div id="bloqueProgresoDocumento" style="display:none;margin-top:16px">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                            <span id="textoProgresoDocumento" style="font-size:.85rem;color:#475569;font-weight:600">
                                Subiendo archivo...
                            </span>
                            <span id="porcentajeProgresoDocumento"
                                style="font-size:.85rem;color:#1D4ED8;font-weight:700">0%</span>
                        </div>
                        <div class="progress" style="height:10px;border-radius:99px;background:#E2E8F0">
                            <div id="barraProgresoDocumento" class="progress-bar"
                                role="progressbar" style="width:0%;background:#2563EB;border-radius:99px"
                                aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times"></i> Cerrar
                </button>
                <button type="button" class="btn btn-primary" id="btnGuardarDocumentoCondicion">
                    <i class="fas fa-upload"></i> <span id="textoBtnGuardarDocumento">Subir PDF</span>
                </button>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        (function() {
            const URL_DOC = (id) => `${window.URL_CONDICIONES}/${id}/documento`;
            const URL_DOC_VER = (id) => `${window.URL_CONDICIONES}/${id}/documento/ver`;
            const $modal = $('#modalDocumentoCondicion');
            let tieneDocumento = false;

            $.ajaxSetup({
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content'),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            window.abrirModalDocumentoCondicion = function(condicionId) {
                resetModalDocumento();
                $('#documento_condicion_id').val(condicionId);
                bootstrap.Modal.getOrCreateInstance($modal[0]).show();

                Swal.fire({
                    title: 'Cargando...',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    didOpen: () => Swal.showLoading()
                });

                $.ajax({
                    url: URL_DOC(condicionId),
                    type: 'GET',
                    dataType: 'json',
                    success: function(res) {
                        Swal.close();
                        if (!res.success) {
                            mostrarToast('error', 'No fue posible cargar el documento.');
                            cerrarModalDocumento();
                            return;
                        }

                        const nombreCondicion = res.condicion?.nombre || 'Condición';
                        $('#modalDocumentoCondicionSubtitle').text(nombreCondicion);

                        if (res.documento) {
                            setearDocumentoActual(res.documento, condicionId);
                        } else {
                            setearModoSinDocumento();
                        }
                    },
                    error: function(xhr) {
                        Swal.close();
                        mostrarToast('error', xhr.responseJSON?.message || 'Error al consultar el documento.');
                        cerrarModalDocumento();
                    }
                });
            };

            function setearDocumentoActual(documento, condicionId) {
                tieneDocumento = true;
                $('#bloqueDocumentoActual').show();
                $('#bloqueSinDocumento').hide();
                $('#documentoNombreArchivo').text(documento.nombre_archivo || 'Documento.pdf');
                $('#documentoMetaInfo').text(
                    `${documento.numero_paginas} pág. · ${documento.tamano_mb} MB · ${documento.fecha_actualizacion || '—'}`
                );
                const urlVer = documento.url_ver || URL_DOC_VER(condicionId);
                $('#iframeDocumentoCondicion').attr('src', urlVer);
                $('#btnAbrirDocumentoNuevaPestana').attr('href', urlVer);
                $('#labelArchivoPdf').text('Reemplazar PDF');
                $('#textoBtnGuardarDocumento').text('Reemplazar PDF');
                $('#archivo_pdf_condicion').prop('required', false);
                $('#modalDocumentoCondicionTitle').text('Documento PDF');
            }

            function setearModoSinDocumento() {
                tieneDocumento = false;
                $('#bloqueDocumentoActual').hide();
                $('#bloqueSinDocumento').show();
                $('#iframeDocumentoCondicion').attr('src', '');
                $('#labelArchivoPdf').text('Seleccionar PDF');
                $('#textoBtnGuardarDocumento').text('Subir PDF');
                $('#archivo_pdf_condicion').prop('required', true);
                $('#modalDocumentoCondicionTitle').text('Subir documento PDF');
            }

            function resetModalDocumento() {
                tieneDocumento = false;
                $('#formDocumentoCondicion')[0].reset();
                $('#documento_condicion_id').val('');
                $('#bloqueDocumentoActual').hide();
                $('#bloqueSinDocumento').hide();
                $('#iframeDocumentoCondicion').attr('src', '');
                $('#documentoNombreArchivo').text('—');
                $('#documentoMetaInfo').text('—');
                ocultarProgresoDocumento();
            }

            function cerrarModalDocumento() {
                bootstrap.Modal.getInstance($modal[0])?.hide();
            }

            function mostrarProgresoDocumento(porcentaje, texto) {
                const pct = Math.max(0, Math.min(100, Math.round(porcentaje)));
                $('#bloqueProgresoDocumento').show();
                $('#barraProgresoDocumento')
                    .css('width', pct + '%')
                    .attr('aria-valuenow', pct);
                $('#porcentajeProgresoDocumento').text(pct + '%');
                if (texto) {
                    $('#textoProgresoDocumento').text(texto);
                }
            }

            function ocultarProgresoDocumento() {
                $('#bloqueProgresoDocumento').hide();
                $('#barraProgresoDocumento').css('width', '0%').attr('aria-valuenow', 0);
                $('#porcentajeProgresoDocumento').text('0%');
                $('#textoProgresoDocumento').text('Subiendo archivo...');
            }

            function setCargaDocumentoActiva(activa) {
                $('#btnGuardarDocumentoCondicion').prop('disabled', activa);
                $('#archivo_pdf_condicion').prop('disabled', activa);
                $('#btnEliminarDocumentoCondicion').prop('disabled', activa);
            }

            $('#btnGuardarDocumentoCondicion').on('click', function() {
                const condicionId = $('#documento_condicion_id').val();
                const archivo = $('#archivo_pdf_condicion')[0].files[0];

                if (!archivo) {
                    mostrarToast('info', tieneDocumento
                        ? 'Seleccione un PDF para reemplazar el actual.'
                        : 'Seleccione un archivo PDF.');
                    return;
                }

                if (archivo.type !== 'application/pdf' && !archivo.name.toLowerCase().endsWith('.pdf')) {
                    mostrarToast('error', 'El archivo debe ser un PDF.');
                    return;
                }

                const formData = new FormData();
                formData.append('archivo', archivo);
                formData.append('_token', $('meta[name="csrf-token"]').attr('content'));

                setCargaDocumentoActiva(true);
                mostrarProgresoDocumento(0, tieneDocumento ? 'Reemplazando archivo...' : 'Subiendo archivo...');

                $.ajax({
                    url: URL_DOC(condicionId),
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    dataType: 'json',
                    xhr: function() {
                        const xhr = $.ajaxSettings.xhr();
                        if (xhr.upload) {
                            xhr.upload.addEventListener('progress', function(e) {
                                if (!e.lengthComputable) return;
                                const pct = (e.loaded / e.total) * 100;
                                // Dejamos el 100% para cuando el servidor termine de procesar.
                                mostrarProgresoDocumento(
                                    Math.min(pct, 95),
                                    tieneDocumento ? 'Reemplazando archivo...' : 'Subiendo archivo...'
                                );
                            });
                        }
                        return xhr;
                    },
                    success: function(res) {
                        mostrarProgresoDocumento(100, 'Procesando documento...');

                        if (!res.success) {
                            ocultarProgresoDocumento();
                            setCargaDocumentoActiva(false);
                            mostrarToast('error', res.message || 'No fue posible guardar el documento.');
                            return;
                        }

                        setTimeout(function() {
                            ocultarProgresoDocumento();
                            setCargaDocumentoActiva(false);
                            mostrarToast('success', res.message);
                            setearDocumentoActual(res.documento, condicionId);
                            $('#archivo_pdf_condicion').val('');

                            if (typeof window.cargarTablaCondiciones === 'function') {
                                window.cargarTablaCondiciones();
                            }
                        }, 250);
                    },
                    error: function(xhr) {
                        ocultarProgresoDocumento();
                        setCargaDocumentoActiva(false);

                        if (xhr.status === 422) {
                            const errors = xhr.responseJSON?.errors || {};
                            const primero = Object.values(errors)[0];
                            mostrarToast('error', Array.isArray(primero) ? primero[0] : (xhr.responseJSON?.message || 'Verifique el archivo.'));
                            return;
                        }
                        mostrarToast('error', xhr.responseJSON?.message || 'Error al guardar el documento.');
                    }
                });
            });

            $('#btnEliminarDocumentoCondicion').on('click', async function() {
                const condicionId = $('#documento_condicion_id').val();

                const confirmacion = await Swal.fire({
                    title: '¿Eliminar documento?',
                    text: 'El PDF se eliminará de forma permanente.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#DC2626',
                    cancelButtonColor: '#94A3B8',
                });

                if (!confirmacion.isConfirmed) return;

                $.ajax({
                    url: URL_DOC(condicionId),
                    type: 'DELETE',
                    dataType: 'json',
                    success: function(res) {
                        mostrarToast('success', res.message);
                        setearModoSinDocumento();
                        $('#archivo_pdf_condicion').val('');

                        if (typeof window.cargarTablaCondiciones === 'function') {
                            window.cargarTablaCondiciones();
                        }
                    },
                    error: function(xhr) {
                        mostrarToast('error', xhr.responseJSON?.message || 'No fue posible eliminar el documento.');
                    }
                });
            });

            $modal.on('hidden.bs.modal', function() {
                $('#iframeDocumentoCondicion').attr('src', '');
            });
        })();
    </script>
@endpush
