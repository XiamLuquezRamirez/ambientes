<div class="modal fade" id="modalEditarEstudiante" tabindex="-1"
    data-bs-backdrop="static" data-bs-keyboard="false"
    aria-labelledby="modalEditarEstudianteLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i class="fas fa-user-graduate text-white"></i></div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalEditarEstudianteLabel">Editar Estudiante</h5>
                    <p class="modal-subtitle mb-0">Completa los datos para editar el estudiante</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="formEditarEstudiante" enctype="multipart/form-data">
                @csrf
                <div class="modal-body">
                    <ul class="nav nav-tabs">
                        <li class="nav-item">
                            <a class="nav-link active" data-bs-toggle="tab" href="#datos-personales"><i class="fas fa-user"></i> Datos Personales</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-bs-toggle="tab" href="#datos-atencion"><i class="fas fa-cog"></i> Ajuste en Proceso de Aprendizaje</a>
                        </li>
                    </ul>
                    <!-- Tab panes -->
                    <div class="tab-content" style="padding: 20px;">
                        <div class="tab-pane container active" id="datos-personales">
                            <div class="row">
                                <div class="col-md-12 mb-4">
                                    <div class="avatar-container">
                                        <img id="previewAvatar" src="{{ asset('assets/images/avatar.png') }}" alt="Avatar">
                                        <label for="avatar" class="avatar-overlay">
                                            <i class="fas fa-camera"></i>
                                            <small>Cambiar avatar</small>
                                        </label>
                                        <input type="file"  name="avatar"  id="avatar"  accept="image/*">
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label for="identificacion">Identificación</label>
                                        <input type="number" name="identificacion" id="identificacion" class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-8">
                                    <div class="form-group">
                                        <label for="nombre">Nombre</label>
                                        <input type="text" name="nombre" id="nombre" class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label for="grado_id_nuevo">Grado</label>
                                        <select name="grado_id_nuevo" id="grado_id_nuevo" class="form-control">
                                            <option value="">Seleccione</option>
                                            @foreach($grados as $g)
                                            <option value="{{ $g->id }}">{{ $g->nombre }}</option>
                                            @endforeach
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="form-group">
                                        <label for="edad">Color de avatar</label>
                                        <input type="color" value="#ba79fb" style="height: 44px;" name="color_avatar" id="color_avatar" class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-3">    
                                    <div class="form-group">
                                        <label for="fecha_nacimiento">Fecha de Nacimiento</label>
                                        <input type="date" name="fecha_nacimiento" id="fecha_nacimiento" class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-3">  
                                    <div class="form-group">
                                        <label for="sexo">Sexo</label>
                                        <select name="sexo" id="sexo" class="form-control">
                                            <option value="">Seleccione</option>
                                            <option value="masculino">Masculino</option>
                                            <option value="femenino">Femenino</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">    
                                    <div class="form-group">
                                        <label for="acudiente">Acudiente</label>
                                        <input type="text" name="acudiente" id="acudiente" class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-4">    
                                    <div class="form-group">
                                        <label for="telefono_acudiente">Teléfono del Acudiente</label>
                                        <input type="number" name="telefono_acudiente" id="telefono_acudiente" class="form-control">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="tab-pane container fade" id="datos-atencion">
                            <div class="row">
                                <div class="col-md-12 card-purple" name="requiere_apoyo">
                                    <p class="text-purple">
                                        <i class="fas fa-4x fa-brain mb-2"></i>
                                        <br>
                                        ¿El estudiante presenta caracteristicas o necesidades que requieran ajustes en su proceso de aprendizaje?
                                    </p>
                                    <div class="row">
                                        <div class="col-md-4">
                                            <div class="alert alert-success" id="alert-si-requiere-apoyo" onclick="seleccionarAlert('alert-si-requiere-apoyo')" role="alert">
                                                <i class="fas fa-2x fa-check"></i>
                                                <p>Si, el estudiante requiere apoyo educativo.</p>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="alert alert-warning" id="alert-en-proceso" onclick="seleccionarAlert('alert-en-proceso')" role="alert">
                                                <i class="fas fa-2x fa-search"></i>
                                                <p>En proceso de evaluación.</p>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="alert alert-danger" id="alert-no-requiere-apoyo" onclick="seleccionarAlert('alert-no-requiere-apoyo')" role="alert">
                                                <i class="fas fa-2x fa-times"></i>
                                                <p>No, el estudiante no requiere apoyo educativo.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn"
                        style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        onclick="cerrarModal('modalEditarEstudiante')">Cancelar</button>
                    <button type="submit" form="formEditarEstudiante" id="btnEditarEstudiante"
                        class="btn btn-primary">Editar Estudiante</button>
                </div>
            </form>
        </div>
    </div>
</div>