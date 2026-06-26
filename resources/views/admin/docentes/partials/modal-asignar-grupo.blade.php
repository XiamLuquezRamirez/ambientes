<div class="modal fade" id="modalAsignarInfo" tabindex="-1" data-bs-keyboard="false" aria-labelledby="modalAsignarInfoLabel"
    aria-hidden="false">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i class="fas fa-user-graduate text-white"></i></div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalAsignarInfoLabel">Asignar grupo</h5>
                    <p class="modal-subtitle mb-0">Agrega una carga docente para el año actual</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar">
                </button>
            </div>

            <div class="modal-body">
                <form id="formAsignarInfo" method="POST">
                    @csrf
                    <input type="hidden" name="id" id="asignar_docente_id">
                    @php $docentes = $docentes ?? []; @endphp
                    @if (count($docentes))
                        <div class="row">
                            <div class="col-md-12">
                                <div class="mb-3">
                                    <strong class="form-label">Docente</strong>
                                    <select name="docente_id" id="asignar_docente_id_select" class="form-control">
                                        <option value="">— Selecciona un docente —</option>
                                        @foreach ($docentes as $docente)
                                            <option value="{{ $docente->id }}">
                                                {{ $docente->user->nombre }} {{ $docente->user->apellido }}
                                            </option>
                                        @endforeach
                                    </select>
                                </div>
                            </div>
                        </div>
                    @endif
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <strong>Nombre</strong>
                                <div id="asignar_nombre" class="form-control">-</div>
                            </div>
                        </div>

                        <div class="col-md-6">
                            <div class="mb-3">
                                <strong class="form-label">Ambiente</strong>
                                <select name="ambiente_id" id="asignar_ambiente_id" class="form-control">
                                    <option value="">— Selecciona un ambiente —</option>
                                    @foreach ($ambientes as $a)
                                        <option value="{{ $a->id }}">
                                            {{ $a->icono }} {{ $a->nombre }}
                                        </option>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <strong class="form-label">Grado</strong>
                                <select name="grado_id" id="asignar_grado_id" class="form-control">
                                    <option value="">— Selecciona un grado —</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <strong class="form-label">Año lectivo</strong>
                                <input type="number" name="anio_lectivo" id="asignar_anio_lectivo" class="form-control"
                                    value="{{ date('Y') }}" readonly>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <strong class="form-label">Grupos</strong>
                                <select name="grupo_id" id="asignar_grupos_id" class="form-control">
                                    <option value="">— Selecciona un grupo —</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-12">
                            <div class="mb-3 asignaciones-actuales">
                                <strong>Grupos asignados en {{ date('Y') }}</strong>
                                <div id="asignaciones_actuales_docente"
                                    style="color:#64748B;font-size:.86rem;margin-top:8px">
                                    Sin asignaciones para este año.
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    onclick="cerrarModalAsignarInfo()"><i class="fa-solid fa-xmark"></i> Cancelar</button>
                <button type="submit" form="formAsignarInfo" id="btnAsignarInfo" class="btn btn-primary"><i
                        class="fa-solid fa-floppy-disk"></i> Guardar asignación</button>
            </div>
        </div>
    </div>
</div>
