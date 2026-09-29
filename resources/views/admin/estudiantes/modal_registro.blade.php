@push('styles')
    <style>
        .content-ambientes-disponibles {
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 5px;
            border: 1px solid #e2e8f0;
            margin: 10px;
            margin-bottom: 20px;
        }

        .item-ambiente {
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 5px;
            border-top: 3px solid;
            box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }

        .item-ambiente-inactivo {
            background-color:rgb(139, 139, 139) !important;
            border-color:rgb(41, 41, 41) !important;
            pointer-events: none !important;
            opacity: 0.8 !important;
            cursor: not-allowed !important;
        }

        .item-ambiente:hover {
           background-color:rgb(187, 221, 255);
           cursor: pointer;
           transform: scale(1.05);
        }

        .item-ambiente-icon {
            width: 50px;
            height: 50px;
            border-radius: 10px;
            color: #fff;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 20px;
        }

        .bs-gris {
            background-color: #6c757d;
            color: #212529;
            font-size: 14px !important;
            font-weight: bold !important;
            padding: 5px 10px !important;
            border: 1px solid #212529;
        }

        .bs-amarillo {
            background-color: #ffc107;
            color: #7a5c08;
            font-size: 14px !important;
            font-weight: bold !important;
            padding: 5px 10px !important;
            border: 1px solid #7a5c08;
        }

        .bs-verde {
            background-color: #28a745;
            color: #144e21;
            font-size: 14px !important;
            font-weight: bold !important;
            padding: 5px 10px !important;
            border: 1px solid #144e21;
        }

        .item-ambiente-seleccionado {
            background-color: #28a745;
            color:rgb(255, 255, 255);
            border-color: #144e21 !important;
        }

        .item-ambiente-seleccionado:hover {
            background-color: #28a745 !important;
            color:rgb(255, 255, 255) !important;
            border-color: #144e21 !important;
        }

        .item-ambiente-seleccionado label {
            color:rgb(255, 255, 255) !important;
        }

        .content-ambientes-disponibles.is-invalid {
            border: 1px solid #dc3545 !important;
        }

        .avatar-color-picker {
            --silla-azul: #0494FC;
            --silla-verde: #18BC54;
            --silla-naranja: #FCB400;
            --silla-morado: #4C007C;
            --silla-rosa: #F8349C;
            --silla-cian: #1CC8FC;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
            min-height: 42px;
            margin: 0;
            padding: 8px;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            justify-content: space-between;
        }

        .avatar-color-option {
            width: 64px;
            height: 30px;
            border-radius: 11px;
            border: 2px solid #fff;
            background: var(--avatar-swatch, #cbd5e1);
            box-shadow: 0 0 0 1px #cbd5e1;
            cursor: pointer;
            padding: 0;
            transition: transform .12s ease, box-shadow .12s ease;
        }

        .avatar-color-option:hover {
            transform: scale(1.08);
        }

        .avatar-color-option.is-selected,
        .avatar-color-option[aria-checked="true"] {
            box-shadow: 0 0 0 2px #fff, 0 0 0 4px #1e293b;
            transform: scale(1.08);
        }

        .form-group:has(#color_avatar.is-invalid) .avatar-color-picker {
            box-shadow: 0 0 0 2px rgba(220, 38, 38, .2);
            border-radius: 8px;
            padding: 4px;
        }
    </style>
@endpush
<div class="modal fade modal-app" id="modalRegistro" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false"
    aria-labelledby="modalRegistroLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i class="fas fa-user-graduate text-white"></i></div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalRegistroLabel">Nuevo Estudiante</h5>
                    <p class="modal-subtitle mb-0" id="modalRegistroSubtitle">Completa los datos para crear el
                        estudiante</p>
                </div>
                <button type="button" class="btn-close" onclick="cerrarModal()" aria-label="Cerrar">

                </button>
            </div>
            <form id="formCrearEstudiante" enctype="multipart/form-data">
                @csrf
                <div class="modal-body">
                    <ul class="nav nav-tabs">
                        <li class="nav-item">
                            <a class="nav-link active" data-bs-toggle="tab" href="#datos-personales"><i
                                    class="fas fa-user"></i> Datos Personales</a>
                        </li>
                        <li class="nav-item" id="tab-atencion">
                            <a class="nav-link" data-bs-toggle="tab" href="#datos-atencion"><i class="fas fa-cog"></i>
                                Ajuste en Proceso de Aprendizaje</a>
                        </li>
                        <li class="nav-item" id="tab-pin">
                            <a class="nav-link" data-bs-toggle="tab" href="#configuracion_pin"><i
                                    class="fas fa-key"></i> Configuración de PIN</a>
                        </li>
                    </ul>
                    <!-- Tab panes -->
                    <div class="tab-content" style="padding: 20px;">
                        <div class="tab-pane container active" id="datos-personales">
                            <div class="row">
                                <div class="col-md-12 mb-4">
                                    <div class="avatar-container">
                                        <img id="previewAvatar" src="{{ asset('assets/images/avatar.png') }}"
                                            alt="Avatar">
                                        <label for="avatar" class="avatar-overlay">
                                            <i class="fas fa-camera"></i>
                                            <small>Cambiar avatar</small>
                                        </label>
                                        <input type="file" name="avatar" id="avatar" accept="image/*">
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label for="nombre">Tipo identificación</label>
                                        <select onchange="mostrarOtroTipoIdentificacion()" name="tipo_identificacion"
                                            id="tipo_identificacion" class="form-control">
                                            <option value="">Seleccione</option>
                                            <option value="TI">TI</option>
                                            <option value="CC">CC</option>
                                            <option value="RC">RC</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-4" id="otro_tipo_identificacion_container" style="display: none;">
                                    <div class="form-group">
                                        <label for="identificacion">Otro tipo de identificación</label>
                                        <input type="text" name="otro_tipo_identificacion"
                                            id="otro_tipo_identificacion" class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-8">
                                    <div class="form-group">
                                        <label for="identificacion">Identificación</label>
                                        <input type="number" name="identificacion" id="identificacion"
                                            class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="nombre">Nombres</label>
                                        <input type="text" name="nombre" id="nombre" class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="apellido">Apellidos</label>
                                        <input type="text" name="apellido" id="apellido" class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-12" id="ambiente-grado-grupo-container-docente"
                                    style="display: none;">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="form-group">
                                                <label for="grado_id_nuevo_docente">Grado</label>
                                                <select name="grado_id_nuevo_docente" id="grado_id_nuevo_docente"
                                                    class="form-control">
                                                    <option value="">Seleccione</option>
                                                    @foreach ($grados as $g)
                                                        <option value="{{ $g->id }}">{{ $g->nombre }}</option>
                                                    @endforeach
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="form-group">
                                                <label for="grupo_id_nuevo">Grupo</label>
                                                <select name="grupo_id_nuevo" id="grupo_id_nuevo"
                                                    class="form-control">
                                                    <option value="">Seleccione</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-12 content-ambientes-disponibles" name="ambientes_ids">
                                            <div class="form-group">
                                                <label for="ambientes_disponibles">Ambientes disponibles para el grado y grupo seleccionado</label>
                                                <p class="text-muted small">por favor seleccione uno o varios ambientes</label>
                                                <div id="contenedor-ambientes-disponibles" style="position: relative;" class="row">
                                                    <div class="col-md-12 p-4 text-center"><h4 class="text-center">No hay ambientes disponibles</h4></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3" id="grado-container-admin" style="display: none;">
                                    <div class="form-group">
                                        <label for="grado_id_nuevo">Grado</label>
                                        <select name="grado_id_nuevo" id="grado_id_nuevo" class="form-control">
                                            <option value="">Seleccione</option>
                                            @foreach ($grados as $g)
                                                <option value="{{ $g->id }}">{{ $g->nombre }}</option>
                                            @endforeach
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label for="fecha_nacimiento">Fecha de Nacimiento</label>
                                        <input type="date" name="fecha_nacimiento" id="fecha_nacimiento"
                                            class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-5">
                                    <div class="form-group">
                                        <label for="lugar_nacimiento">Lugar de Nacimiento</label>
                                        <input type="text" name="lugar_nacimiento" id="lugar_nacimiento"
                                            class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-group">
                                        <label for="departamento">Departamento</label>
                                        <select onchange="cargarMunicipios()" name="departamento_id"
                                            id="departamento_id" class="form-control">
                                            <option value="">Seleccione</option>
                                            @foreach ($departamentos as $d)
                                                <option value="{{ $d->codigo }}">{{ $d->descripcion }}</option>
                                            @endforeach
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-group">
                                        <label for="municipio">Municipio</label>
                                        <select name="municipio_id" id="municipio_id" class="form-control">
                                            <option value="">Seleccione</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="barrio_vereda">Barrio/Vereda</label>
                                        <input type="text" name="barrio_vereda" id="barrio_vereda"
                                            class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label id="color_avatar_label">Color de avatar</label>
                                        @php
                                            $coloresAvatar = [
                                                ['nombre' => 'Azul', 'var' => '--silla-azul', 'hex' => '#0494FC'],
                                                ['nombre' => 'Verde', 'var' => '--silla-verde', 'hex' => '#18BC54'],
                                                ['nombre' => 'Naranja', 'var' => '--silla-naranja', 'hex' => '#FCB400'],
                                                ['nombre' => 'Morado', 'var' => '--silla-morado', 'hex' => '#4C007C'],
                                                ['nombre' => 'Rosa', 'var' => '--silla-rosa', 'hex' => '#F8349C'],
                                                ['nombre' => 'Cian', 'var' => '--silla-cian', 'hex' => '#1CC8FC'],
                                            ];
                                        @endphp
                                        <div class="avatar-color-picker" id="avatar_color_picker" role="radiogroup"
                                            aria-labelledby="color_avatar_label">
                                            @foreach ($coloresAvatar as $colorAvatar)
                                                <button type="button"
                                                    class="avatar-color-option {{ $loop->first ? 'is-selected' : '' }}"
                                                    data-color="{{ $colorAvatar['hex'] }}"
                                                    style="--avatar-swatch: var({{ $colorAvatar['var'] }})"
                                                    role="radio"
                                                    aria-checked="{{ $loop->first ? 'true' : 'false' }}"
                                                    aria-label="{{ $colorAvatar['nombre'] }}"
                                                    title="{{ $colorAvatar['nombre'] }}"></button>
                                            @endforeach
                                        </div>
                                        <input type="hidden" name="color_avatar" id="color_avatar" value="#0494FC">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="direccion">Dirección</label>
                                        <input type="text" name="direccion" id="direccion" class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="telefono">Teléfono</label>
                                        <input type="text" name="telefono" id="telefono" class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="email">Email</label>
                                        <input type="email" name="email" id="email" class="form-control">
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
                                <div class="col-md-5">
                                    <div class="form-group">
                                        <label for="acudiente">Acudiente</label>
                                        <input type="text" name="acudiente" id="acudiente" class="form-control">
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label for="telefono_acudiente">Teléfono del Acudiente</label>
                                        <input type="number" name="telefono_acudiente" id="telefono_acudiente"
                                            class="form-control">
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
                                        ¿El estudiante presenta caracteristicas o necesidades que requieran ajustes en
                                        su proceso de aprendizaje?
                                    </p>
                                    <div class="row">
                                        <div class="col-md-4">
                                            <div class="alert alert-success" id="alert-si-requiere-apoyo"
                                                onclick="seleccionarAlert('alert-si-requiere-apoyo')" role="alert">
                                                <i class="fas fa-2x fa-check"></i>
                                                <p>Si, el estudiante requiere apoyo educativo.</p>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="alert alert-warning" id="alert-en-proceso"
                                                onclick="seleccionarAlert('alert-en-proceso')" role="alert">
                                                <i class="fas fa-2x fa-search"></i>
                                                <p>En proceso de evaluación.</p>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="alert alert-danger" id="alert-no-requiere-apoyo"
                                                onclick="seleccionarAlert('alert-no-requiere-apoyo')" role="alert">
                                                <i class="fas fa-2x fa-times"></i>
                                                <p>No, el estudiante no requiere apoyo educativo.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="tab-pane container fade" id="configuracion_pin">
                            @include('admin.estudiantes.plantillaPin')
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn"
                        style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        onclick="cerrarModal()">Cancelar</button>
                    <button type="submit" form="formCrearEstudiante" id="btnCrearEstudiante"
                        class="btn btn-primary">Crear Estudiante</button>
                </div>
            </form>
        </div>
    </div>
</div>
