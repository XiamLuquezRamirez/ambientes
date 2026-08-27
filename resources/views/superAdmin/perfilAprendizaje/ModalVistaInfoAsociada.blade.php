{{-- Modal: asociar / editar nombre de vista de información --}}
<div class="modal fade modal-app" id="modalVistaInfoAsociada" tabindex="-1" data-bs-keyboard="false"
    aria-labelledby="modalVistaInfoAsociadaTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fas fa-file-code text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" style="font-size: 1.4rem;" id="modalVistaInfoAsociadaTitle">
                        Vista de información
                    </h5>
                    <p class="modal-subtitle mb-0" id="modalVistaInfoAsociadaSubtitle">
                        Indique el nombre de la vista Blade asociada.
                    </p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-4">
                <form id="formVistaInfoAsociada" autocomplete="off">
                    @csrf
                    <input type="hidden" id="vista_info_perfil_aprendizaje_id" value="">

                    <div class="mb-3">
                        <label class="form-label fw-bold" for="vista_info_asociada">Nombre de la vista</label>
                        <input type="text" id="vista_info_asociada" name="vista_info_asociada"
                            class="form-control" maxlength="100"
                            placeholder="perfiles-aprendizaje.info.ejemplo"
                            pattern="^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$">
                        <small class="text-muted">
                            Formato Laravel (ej: <code>perfiles-aprendizaje.info.ejemplo</code>).
                            Déjelo vacío para quitar la asociación.
                        </small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times"></i> Cerrar
                </button>
                <button type="button" class="btn btn-primary" id="btnGuardarVistaInfo">
                    <i class="fas fa-save"></i> Guardar
                </button>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        (function() {
            const URL_VISTA = (id) => `${window.URL_PERFILES_APRENDIZAJE}/${id}/vista-info`;
            const $modal = $('#modalVistaInfoAsociada');
            const $form = $('#formVistaInfoAsociada');

            window.abrirModalVistaInfoAsociada = function(perfilAprendizajeId, vistaActual = '', nombre = '') {
                $form[0].reset();
                $form.find('.is-invalid').removeClass('is-invalid');
                $form.find('.invalid-feedback').remove();

                $('#vista_info_perfil_aprendizaje_id').val(perfilAprendizajeId);
                $('#vista_info_asociada').val(vistaActual || '');
                $('#modalVistaInfoAsociadaSubtitle').text(
                    nombre
                        ? `Perfil de aprendizaje: ${nombre}`
                        : 'Indique el nombre de la vista Blade asociada.'
                );

                bootstrap.Modal.getOrCreateInstance($modal[0]).show();
            };

            function guardarVistaInfo() {
                const id = $('#vista_info_perfil_aprendizaje_id').val();
                const vista = ($('#vista_info_asociada').val() || '').trim();

               

                Swal.fire({
                    title: 'Guardando...',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    didOpen: () => Swal.showLoading()
                });

                $.ajax({
                    url: URL_VISTA(id),
                    type: 'PATCH',
                    data: {
                        vista_info_asociada: vista || null,
                        _token: $('meta[name="csrf-token"]').attr('content')
                    },
                    dataType: 'json',
                    success: function(res) {
                        Swal.close();
                        if (!res.success) {
                            mostrarToast('error', res.message || 'No fue posible guardar.');
                            return;
                        }
                        bootstrap.Modal.getInstance($modal[0])?.hide();
                        mostrarToast('success', res.message);
                        if (typeof window.cargarTablaPerfilesAprendizaje === 'function') {
                            window.cargarTablaPerfilesAprendizaje();
                        }
                    },
                    error: function(xhr) {
                        Swal.close();
                        const errors = xhr.responseJSON?.errors || {};
                        $form.find('.is-invalid').removeClass('is-invalid');
                        $form.find('.invalid-feedback').remove();

                        if (errors.vista_info_asociada) {
                            $('#vista_info_asociada').addClass('is-invalid').after(
                                `<div class="invalid-feedback d-block">${errors.vista_info_asociada[0]}</div>`
                            );
                        }

                        mostrarToast('error', xhr.responseJSON?.message || 'Error al guardar la vista.');
                    }
                });
            }

            $('#btnGuardarVistaInfo').on('click', guardarVistaInfo);
            $form.on('submit', function(e) {
                e.preventDefault();
                guardarVistaInfo();
            });
        })();
    </script>
@endpush
