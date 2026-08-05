{{-- Modal: muestra el contenido de la vista asociada al perfil de aprendizaje --}}
<div class="modal fade" id="modalVerInfoPerfilAprendizaje" tabindex="-1" data-bs-keyboard="false"
    aria-labelledby="modalVerInfoPerfilAprendizajeTitle" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fas fa-circle-info text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" style="font-size: 1.4rem;" id="modalVerInfoPerfilAprendizajeTitle">
                        Información del perfil de aprendizaje
                    </h5>
                    <p class="modal-subtitle mb-0" id="modalVerInfoPerfilAprendizajeSubtitle">—</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-4">
                <div id="contenidoVistaInfoPerfilAprendizaje">
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-spinner fa-spin"></i> Cargando...
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

@push('scripts')
    <script>
        (function() {
            const URL_VISTA = (id) => `${window.URL_PERFILES_APRENDIZAJE}/${id}/vista-info`;
            const $modal = $('#modalVerInfoPerfilAprendizaje');

            window.abrirModalVerInfoPerfilAprendizaje = function(perfilAprendizajeId) {
                $('#modalVerInfoPerfilAprendizajeSubtitle').text('—');
                $('#contenidoVistaInfoPerfilAprendizaje').html(
                    '<div class="text-center text-muted py-4"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>'
                );
                bootstrap.Modal.getOrCreateInstance($modal[0]).show();

                $.ajax({
                    url: URL_VISTA(perfilAprendizajeId),
                    type: 'GET',
                    dataType: 'json',
                    success: function(res) {
                        if (!res.success) {
                            $('#contenidoVistaInfoPerfilAprendizaje').html(
                                `<div class="alert alert-warning mb-0">${res.message || 'No disponible.'}</div>`
                            );
                            return;
                        }

                        const c = res.perfil_aprendizaje || {};
                        $('#modalVerInfoPerfilAprendizajeSubtitle').text(
                            `${c.nombre || ''} (${c.codigo || ''}) · ${c.vista_info_asociada || ''}`
                        );
                        $('#contenidoVistaInfoPerfilAprendizaje').html(res.html || '');
                    },
                    error: function(xhr) {
                        $('#contenidoVistaInfoPerfilAprendizaje').html(
                            `<div class="alert alert-danger mb-0">${xhr.responseJSON?.message || 'Error al cargar la información.'}</div>`
                        );
                    }
                });
            };

            $modal.on('hidden.bs.modal', function() {
                $('#contenidoVistaInfoPerfilAprendizaje').empty();
            });
        })();
    </script>
@endpush
