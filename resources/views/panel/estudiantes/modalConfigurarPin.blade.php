<div class="modal fade modal-app" id="modalConfigurarPin" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false"
    aria-labelledby="modalConfigurarPinLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i class="fas fa-key text-white"></i></div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalConfigurarPinLabel">Configurar PIN</h5>
                </div>
                <div class="bg-warning text-black py-1 px-3 rounded-pill text-center" style="width: fit-content;">
                    <h5 class="mb-0"><i class="fas fa-user-graduate text-black"></i> Estudiante: <span id="nombreEstudiante"></span></h5>
                </div>
                <button type="button" class="btn-close" onclick="cerrarModalConfigurarPin()" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
               
                <div class="row">
                    <div class="col-md-12" id="configuracion_pin_docente">
                        <form id="formConfigurarPin">
                            @csrf
                            @include('admin.estudiantes.plantillaPin')
                        </form>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="cerrarModalConfigurarPin()">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="guardarConfigurarPin()">Guardar</button>
            </div>
        </div>
    </div>
</div>