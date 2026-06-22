<div class="modal fade" id="modalVerAccesos" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false"
    aria-labelledby="modalVerAccesosLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalVerAccesosLabel"> Historial de accesos</h5>
            </div>
        </div>
        <div class="modal-body">
            <div class="table-container">

                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Hora</th>
                            <th>IP</th>
                        </tr>
                    </thead>

                    <tbody>

                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        const modalBSVerAccesos = new bootstrap.Modal(document.getElementById('modalVerAccesos'));

        document.getElementById('modalVerAccesos').addEventListener('hidden.bs.modal', function() {
            limpiarErroresModal();
        });

        function abrirModalVerAccesos(id) {
            modalBSVerAccesos.show();
        }
    </script>
@endpush
