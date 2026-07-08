let paso = 1;
const TOTAL = 7;
var atencion_medica_cuenta = 1;
var tratamientos_cuenta = 1;
var medicamentos_cuenta = 1;
var ajustes_cuenta = 1;
var firmas_docentes_cuenta = 1;
var actividades_cuenta = 1;

var id_docente_firma = '';
var docentes = [];
var docentes_firma = [];

const panes      = document.querySelectorAll('.piar-pane');
const steps      = document.querySelectorAll('.piar-step');
const progress   = document.getElementById('piarProgress');
const btnAnt     = document.getElementById('btnAnterior');
const btnSig     = document.getElementById('btnSiguiente');
const btnGuardar = document.getElementById('btnGuardar');
const contador   = document.getElementById('contadorActual');

function actualizarUI() {
    panes.forEach(p => p.classList.toggle('active', +p.dataset.pane === paso));
    steps.forEach(s => {
        const n = +s.dataset.step;
        s.classList.remove('active', 'completed');
        if (n === paso) s.classList.add('active');
        else if (n < paso) s.classList.add('completed');
    });

    const pct = ((paso - 1) / (TOTAL)) * 100 ;
    progress.style.width = pct + '%';

    contador.textContent = paso;
    btnAnt.style.visibility = paso === 1 ? 'hidden' : 'visible';

    btnSig.innerHTML    = paso === TOTAL ? '<i class="fas fa-save"></i> Terminar y guardar' : '<i class="fas fa-arrow-right"></i> Siguiente';

    if (paso > TOTAL) {
        $('.piar-step-counter').hide();
        btnSig.style.display = 'none';
    } else {
        $('.piar-step-counter').show();
        btnSig.style.display = 'inline-block';
    }

    autoGrowTextarea();
}

function validarPaso() {
    const pane = document.querySelector(`.piar-pane[data-pane="${paso}"]`);
    const campos = pane.querySelectorAll('[required]');
    var error = true;

    campos.forEach(c => {
        if (c.type === 'radio') {
            const grupo = document.querySelectorAll(`input[type="radio"][name="${c.name}"]`);
            const seleccionado = [...grupo].some(radio => radio.checked);

            if (!seleccionado) {
                grupo.forEach(radio => radio.classList.add('is-invalid'));
                grupo[0].focus();
                error = false;
            } else {
                grupo.forEach(radio => radio.classList.remove('is-invalid'));
            }
            return;
        }else{
            if (!c.value.trim()) {
                c.focus();
                c.classList.add('is-invalid');
                error = false;
            }else{
                c.classList.remove('is-invalid');
            }
        }
    });

    return error;
}

btnSig.addEventListener('click', () => {
    if (paso <= TOTAL) { 
        switch (paso) {
            case 1:
                if (!validarPaso()) return;
                guardarPaso1();
                break;
            case 2:
                if (!validarPaso()) return;
                guardarPaso2();
                break;
            case 3:
                if (!validarPaso()) return;
                guardarPaso3();
                break;
            case 4:
                if (!validarPaso()) return;
                guardarPaso4();
                break;
            case 5:
                if (!validarPaso()) return;
                guardarPaso5();
                break;
            case 6:
                if (!validarPaso()) return;
                guardarPaso6();
                break;
            case 7:
                if (!validarPaso()) return;
                guardarPaso7();
                break;
        }
    }
});

btnAnt.addEventListener('click', () => {
    if (paso > 1) { paso--; actualizarUI(); autoGrowTextarea(); }
});


function agregarAtencionMedica() {
    atencion_medica_cuenta++;
    var value = $('select[name="atencion_medica"]').val();
    document.getElementById('atenciones_cuenta').insertAdjacentHTML('beforeend', 
        `<div class="col-md-12 row pt-3" id="div_atencion_medica_${atencion_medica_cuenta}">
            <div class="col-md-6">
                <label class="form-label">¿Cuál?</label>
                <input type="text" ${value == 'Si' ? 'required' : ''} class="form-control" name="atencion[${atencion_medica_cuenta-1}][cual]">
            </div>
            <div class="col-md-5">
                <label class="form-label">Frecuencia</label>
                <input type="text" ${value == 'Si' ? 'required' : ''} class="form-control" name="atencion[${atencion_medica_cuenta-1}][frecuencia]">
            </div>
            <div class="col-md-1 d-flex justify-content-center align-items-end">
                <button type="button" class="btn btn-danger" onclick="eliminarAtencionMedica(${atencion_medica_cuenta})">-</button>
            </div>
        </div>`
    );
}

function agregarTratamiento() {
    tratamientos_cuenta++;
    var value = $('select[name="tratamiento_integral"]').val();
    document.getElementById('tratamientos_cuenta').insertAdjacentHTML('beforeend', 
        `<div class="col-md-12 row pt-3" id="div_tratamiento_${tratamientos_cuenta}">
            <div class="col-md-6">
                <label class="form-label">¿Cuál?</label>
                <input type="text" ${value == 'Si' ? 'required' : ''} class="form-control" name="tratamiento[${tratamientos_cuenta-1}][cual]">
            </div>
            <div class="col-md-5">
                <label class="form-label">Frecuencia</label>
                <input type="text" ${value == 'Si' ? 'required' : ''} class="form-control" name="tratamiento[${tratamientos_cuenta-1}][frecuencia]">
            </div>
            <div class="col-md-1 d-flex justify-content-center align-items-end">
                <button type="button" class="btn btn-danger" onclick="eliminarTratamiento(${tratamientos_cuenta})">-</button>
            </div>
        </div>`
    );
}

function agregarMedicamento() {
    medicamentos_cuenta++;
    var value = $('select[name="consume_medicamentos"]').val();
    document.getElementById('medicamentos_cuenta').insertAdjacentHTML('beforeend', 
        `<div class="col-md-12 row pt-3" id="div_medicamento_${medicamentos_cuenta}">
            <div class="col-md-4">
                <label class="form-label">¿Cuál?</label>
                <input type="text" ${value == 'Si' ? 'required' : ''} class="form-control" name="medicamento[${medicamentos_cuenta-1}][cual]">
            </div>
            <div class="col-md-4">
                <label class="form-label">Frecuencia</label>
                <input type="text" ${value == 'Si' ? 'required' : ''} class="form-control" name="medicamento[${medicamentos_cuenta-1}][frecuencia]">
            </div>
            <div class="col-md-3">
                <label class="form-label">Horario</label>
                <input type="text" ${value == 'Si' ? 'required' : ''} class="form-control" name="medicamento[${medicamentos_cuenta-1}][horario]">
            </div>
            <div class="col-md-1 d-flex justify-content-center align-items-end">
                <button type="button" class="btn btn-danger" onclick="eliminarMedicamento(${medicamentos_cuenta})">-</button>
            </div>
        </div>`
    );
}

function eliminarAtencionMedica(id) {
    document.getElementById('div_atencion_medica_' + id).remove();
}

function eliminarTratamiento(id) {
    document.getElementById('div_tratamiento_' + id).remove();
}

function eliminarMedicamento(id) {
    document.getElementById('div_medicamento_' + id).remove();
}

function mostrarMotivo(select) {
    const valor = select.value;
    if (valor === 'Si') {
        $('#div_motivo_si_vinculado').show();
        $('#div_motivo_no_vinculado').hide();

        $('input[name="instituciones_anteriores"]').prop('required', true);
        $('input[name="motivo_no_vinculado"]').prop('required', false);
        $('input[name="instituciones_anteriores"]').removeClass('is-invalid');
        $('input[name="motivo_no_vinculado"]').removeClass('is-invalid');
    } else {
        $('#div_motivo_si_vinculado').hide();
        $('#div_motivo_no_vinculado').show();

        $('input[name="instituciones_anteriores"]').prop('required', false);
        $('input[name="motivo_no_vinculado"]').prop('required', true);
        $('input[name="instituciones_anteriores"]').removeClass('is-invalid');
        $('input[name="motivo_no_vinculado"]').removeClass('is-invalid');
    }
}

/* Auto grow textarea */
function autoGrowTextarea() {
    document.querySelectorAll('.auto-grow').forEach(textarea => {        
        function resize() {
            textarea.style.height = '40px';
            textarea.style.height = textarea.scrollHeight + 'px';
        }

        textarea.addEventListener('input', resize);
        textarea.autoResize = resize;
        resize(); // Ajusta si ya tiene contenido al cargar la página
    });
}


function agregarAjuste() {
    ajustes_cuenta++;
    document.getElementById('ajustes_container').insertAdjacentHTML('beforeend', 
        `<tr id="ajuste_${ajustes_cuenta}">
            <td>
                <input type="text" class="form-control" name="ajuste_razonable[${ajustes_cuenta-1}][area]" required>
            </td>
            <td>
                <textarea rows="3" class="form-control auto-grow" name="ajuste_razonable[${ajustes_cuenta-1}][barrera]" required></textarea>
            </td>
            <td>
                <textarea rows="3" class="form-control auto-grow" name="ajuste_razonable[${ajustes_cuenta-1}][tipo]" required></textarea>
            </td>
            <td>
                <textarea rows="3" class="form-control auto-grow" name="ajuste_razonable[${ajustes_cuenta-1}][apoyo]" required></textarea>
            </td>
            <td>
                <textarea rows="3" class="form-control auto-grow" name="ajuste_razonable[${ajustes_cuenta-1}][descripcion]" required></textarea>
            </td>
            <td style="position: relative;">
                <button  type="button" class="btn btn-danger btn-eliminar-ajuste btn-sm" onclick="eliminarAjuste(${ajustes_cuenta})">-</button>
                <textarea rows="3" class="form-control auto-grow" name="ajuste_razonable[${ajustes_cuenta-1}][seguimiento]" required></textarea>
            </td>
        </tr>`
    );

    autoGrowTextarea();
}

function eliminarAjuste(id) {
    document.getElementById('ajuste_' + id).remove();
}

function agregarFirmaDocente() {
    firmas_docentes_cuenta++;
    document.getElementById('div_docentes').insertAdjacentHTML('beforeend', 
        `<div class="col-md-4 pt-3" id="div_docente_${firmas_docentes_cuenta}">
            <table class="table table-bordered piar-valoracion-table mb-0">
                <thead>
                    <tr><th class="d-flex justify-content-between align-items-center gap-2">Nombre Docente <button type="button" class="btn btn-danger btn-sm" onclick="eliminarFirmaDocente(${firmas_docentes_cuenta})">-</button></th></tr>
                    <tr>
                        <td>
                            <div class="d-flex justify-content-between align-items-center gap-2">
                                <input type="hidden" name="docente_firma[${firmas_docentes_cuenta-1}][id]" id="docente_firma_id_${firmas_docentes_cuenta}" value="">
                                <input type="text" readonly class="form-control" name="docente_firma[${firmas_docentes_cuenta-1}][nombre]" id="docente_firma_nombre_${firmas_docentes_cuenta}" required>
                                <button type="button" class="btn btn-primary btn-sm" onclick="buscarDocente(${firmas_docentes_cuenta})"><i class="fas fa-search"></i> Buscar</button>
                            </div>
                        </td>
                    </tr>
                    <tr><th>Área</th></tr>
                    <tr><td><input type="text" class="form-control" name="docente_firma[${firmas_docentes_cuenta-1}][area]" id="docente_firma_area_${firmas_docentes_cuenta}" required></td></tr>
                    <tr><th>Firma</th></tr>
                    <tr>
                        <td class="d-flex justify-content-between align-items-center gap-2">
                            <img id="img_firma_docente_${firmas_docentes_cuenta}" class="firma-img" src="/assets/images/firma.png" alt="Firma" class="img-fluid">
                        </td>
                    </tr>
                </thead>
            </table>
        </div>`
    );
}

function eliminarFirmaDocente(id) {
    var id_docente_eliminar = parseInt($(`#div_docente_${id} #docente_firma_id_${id}`).val());
    docentes_firma = docentes_firma.filter(id => id != id_docente_eliminar);
    $(`#div_docente_${id}`).remove();
    console.log(docentes_firma);
}

function agregarFirma(id_input) {
    const input = document.getElementById(id_input);
    input.click();
}

function previewFirma(id_input, id_img) {
    const input = document.getElementById(id_input);
    const img = document.getElementById(id_img);
    img.src = URL.createObjectURL(input.files[0]);
}

function agregarActividad() {
    actividades_cuenta++;
    document.getElementById('actividades_container').insertAdjacentHTML('beforeend', 
        `<tr id="actividad_${actividades_cuenta}">
            <td><textarea rows="3" class="form-control auto-grow" name="actividad[${actividades_cuenta-1}][nombre]" required></textarea></td>
            <td><textarea rows="3" class="form-control auto-grow" name="actividad[${actividades_cuenta-1}][descripcion]" required></textarea></td>
                <td>
                    <div class="d-flex justify-content-between align-items-center gap-2">
                        <div class="frecuencia-radio">
                            <input type="radio" class="form-check-input" name="actividad[${actividades_cuenta-1}][frecuencia]" value="D" required>
                            <label class="form-check-label">D</label>
                        </div>
                        <div class="frecuencia-radio">
                            <input type="radio" class="form-check-input" name="actividad[${actividades_cuenta-1}][frecuencia]" value="S" required>
                            <label class="form-check-label">S</label>
                        </div>
                        <div class="frecuencia-radio">
                            <input type="radio" class="form-check-input" name="actividad[${actividades_cuenta-1}][frecuencia]" value="P" required>
                            <label class="form-check-label">P</label>
                        </div>
                    </div>
                </div>
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-danger btn-sm" onclick="eliminarActividad(${actividades_cuenta})">-</button>
            </td>
        </tr>`
    );

    autoGrowTextarea();
}

function eliminarActividad(id) {
    document.getElementById('actividad_' + id).remove();
}

function colocarRequired(id, select) {
    const value = $(select).val();
    if (value == 'Si') {
        $(`#${id}`).prop('required', true);
        $(`#${id}`).removeClass('is-invalid');
    } else {
        $(`#${id}`).prop('required', false);
        $(`#${id}`).removeClass('is-invalid');
    }
}

function colocarRequiredVariable(id, select) {
    const value = $(select).val();
    // inputs que estan dentro de un div con id mandado
    
    const inputs = $(`#${id} input`);
    inputs.each(function() {
        if (value == 'Si') {
            $(this).prop('required', true);
            $(this).removeClass('is-invalid');
        } else {
            $(this).prop('required', false);
            $(this).removeClass('is-invalid');
        }
    });
}

function guardarPaso1() {
    var formulario = new FormData($('#form-paso-1')[0]);
    var url = URL_PIAR + '/guardar-paso/1';
    guardarDatos(formulario, url, 'form-paso-1');
}

function guardarPaso2() {
    var formulario = new FormData($('#form-paso-2')[0]);
    var url = URL_PIAR + '/guardar-paso/2';
    guardarDatos(formulario, url, 'form-paso-2');
}

function guardarPaso3() {
    var formulario = new FormData($('#form-paso-3')[0]);
    var url = URL_PIAR + '/guardar-paso/3';
    guardarDatos(formulario, url, 'form-paso-3');
}

function guardarPaso4() {
    var formulario = new FormData($('#form-paso-4')[0]);
    var url = URL_PIAR + '/guardar-paso/4';
    guardarDatos(formulario, url, 'form-paso-4');
}

function guardarPaso5() {
    var formulario = new FormData($('#form-paso-5')[0]);
    var url = URL_PIAR + '/guardar-paso/5';
    guardarDatos(formulario, url, 'form-paso-5');
}

function guardarPaso6() {
    var formulario = new FormData($('#form-paso-6')[0]);
    var url = URL_PIAR + '/guardar-paso/6';
    guardarDatos(formulario, url, 'form-paso-6');
}

function guardarPaso7() {
    var formulario = new FormData($('#form-paso-7')[0]);
    var url = URL_PIAR + '/guardar-paso/7';
    guardarDatos(formulario, url, 'form-paso-7');
}

function guardarDatos(datos, url, form) {
    var bandera = false;
    $.ajax({
        url: url,
        type: 'POST',
        data: datos,
        processData: false,
        contentType: false,
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                mostrarToast('success', response.message);
                bandera = true;
            } else {
                mostrarToast('error', response.message);
                bandera = false;
            }
        },
        error: function(xhr, status, error) {
            mostrarToast('error', 'Error al guardar los datos.');
            mostrarErroresModal(xhr.responseJSON.errors, form);
            bandera = false;
        },
        complete: function() {
            if (bandera) {
                paso++;
                actualizarUI();
                autoGrowTextarea();
            }
        }
    });
}

function limpiarErroresModal(id_form) {
    $(`#${id_form} .campo-error`).remove();
    $(`#${id_form} .is-invalid`).removeClass('is-invalid');
}

function mostrarErroresModal(errors, id_form) {
    limpiarErroresModal(id_form);
    $.each(errors, function (campo, mensajes) {
        const $input = $(`#${id_form} [name="${campo}"]`);
        if (!$input.length) return;
        $input.addClass('is-invalid');

        var mensaje = '';
        switch (mensajes[0]) {
            case 'validation.unique':
                mensaje = 'Ya existe un registro con este valor';
                break;
            case 'validation.email':
                mensaje = 'El correo electrónico no es válido';
                break;
            case 'validation.integer':
                mensaje = 'El valor debe ser un número entero';
                break;
            case 'validation.string':
                mensaje = 'El valor debe ser una cadena de texto';
                break;
            case 'validation.numeric':
                mensaje = 'El valor debe ser un número';
                break;
            case 'validation.required':
                mensaje = 'Este campo es requerido';
                break;
            default:
                mensaje = 'Este campo es requerido';
                break;
        }

        $('<div>', { class: 'campo-error', text: mensaje }).insertAfter($input);
    });
    $(`#${id_form} .is-invalid`).first().focus();
}

function buscarDocente(id) {
    id_docente_firma = id;
    $('#modal_buscar_docente').modal('show');
    buscarDocentePiar('primeros_10');
}

let debounceTimer;

$('#form-buscar-docente input[name="nombre"]').on('input', function () {
    clearTimeout(debounceTimer);
    var texto = $(this).val();
    debounceTimer = setTimeout(() => {
        if(texto == " " || texto == ""){
            texto = 'primeros_10';
        }
        buscarDocentePiar(texto);
    }, 400);
});

function buscarDocentePiar(texto) {
    $.ajax({
        url: URL_PIAR + '/buscar-docente/' + texto,
        type: 'GET',
        dataType: 'json',
        success: function(response) {
           if(response.success){
                var html = '';
                docentes = response.data;
                response.data.forEach(function(docente){
                    if(docente.firma_url != '' && docente.firma_url != null) {
                        var url_firma = '/storage/' + docente.firma_url;
                    } else {
                        var url_firma = '/assets/images/firma.png';
                    }

                    html += '<tr>';
                    html += '<td>' + docente.nombre + '</td>';
                    html += '<td>' + docente.apellido + '</td>';
                    html += '<td>' + docente.email + '</td>';
                    html += '<td><img src="' + url_firma + '" alt="Firma" class="img-fluid" style="width: 100px; height: 50px; object-fit: contain;"></td>';
                    html += '<td class="text-center"><button type="button" class="btn btn-primary btn-sm" onclick="seleccionarDocente(' + docente.id + ')">Seleccionar</button></td>';
                    html += '</tr>';
                });
                $('#tabla_docentes').html(html);
           }
        },
        error: function(xhr, status, error) {
            mostrarToast('error', 'Error al buscar el docente.');
        }
    });
}

function seleccionarDocente(id_docente) {
    var docente = docentes.find(docente => docente.id == id_docente);

    if(docente.firma_url == '' || docente.firma_url == null) {
        mostrarToast('error', 'El docente seleccionado no tiene firma, deberá firmar manualmente en la sección de ajuste razonable despues de generar el pdf del PIAR.');
    }

    if(id_docente_firma == 'orientador') {
        $('#docente_orientador_nombre').val(docente.nombre + ' ' + docente.apellido);
        $('#docente_orientador_id').val(docente.id);
        colocarFirma('docente_orientador_firma', docente.firma_url);
    } else if(id_docente_firma == 'apoyo_pedagogico') {
        $('#docente_apoyo_pedagogico_nombre').val(docente.nombre + ' ' + docente.apellido);
        $('#docente_apoyo_pedagogico_id').val(docente.id);
        colocarFirma('docente_apoyo_pedagogico_firma', docente.firma_url);
    } else if(id_docente_firma == 'coordinador_pedagogico') {
        $('#docente_coordinador_pedagogico_nombre').val(docente.nombre + ' ' + docente.apellido);
        $('#docente_coordinador_pedagogico_id').val(docente.id);
        colocarFirma('docente_coordinador_pedagogico_firma', docente.firma_url);
    } else {
        if(docentes_firma.includes(id_docente)) {
            mostrarToast('error', 'El docente ya ha sido seleccionado.');
            return;
        }

        // verificar si se esta editando el docente que firma en esta casilla
        var id_docente_firma_actual = parseInt($(`#docente_firma_id_${id_docente_firma}`).val());
        if(id_docente_firma_actual != '') {
            docentes_firma = docentes_firma.filter(id => id != id_docente_firma_actual);
        }

        colocarFirma('img_firma_docente_' + id_docente_firma, docente.firma_url);
        $('#docente_firma_nombre_' + id_docente_firma).val(docente.nombre + ' ' + docente.apellido);
        $('#docente_firma_id_' + id_docente_firma).val(docente.id);
        docentes_firma.push(id_docente);
        console.log(docentes_firma);
    }
    
    cerrarModalBuscarDocente();
}

function colocarFirma(id_img, url_firma) {
    if(url_firma != null && url_firma != '') {
        $('#' + id_img).attr('src', '/storage/' + url_firma);
    } else {
        $('#' + id_img).attr('src', '/assets/images/firma.png');
    }
}

function cerrarModalBuscarDocente() {
    $('#modal_buscar_docente').modal('hide');
    $('#form-buscar-docente input[name="nombre"]').val('');
}

var piar = null;
$(document).ready(function() {
    var id_estudiante = $('#id_estudiante_piar').val();
    verificarSiComenzo(id_estudiante).then(function(data) {
        if (data.comenzo) {
            paso = parseInt(data.piar.paso);
            piar = data.piar;
            switch (paso) {
                case 2:
                    mapearPaso1();
                    break;
                case 3:
                    mapearPaso1();
                    mapearPaso2();
                    break;
                case 4:
                    mapearPaso1();
                    mapearPaso2();
                    mapearPaso3();
                    break;
                case 5:
                    mapearPaso1();
                    mapearPaso2();
                    mapearPaso3();
                    mapearPaso4();
                    break;
                case 6:
                    mapearPaso1();
                    mapearPaso2();
                    mapearPaso3();
                    mapearPaso4();
                    mapearPaso5();
                    break;
                case 7:
                    mapearPaso1();
                    mapearPaso2();
                    mapearPaso3();
                    mapearPaso4();
                    mapearPaso5();
                    mapearPaso6();
                    break;
                case 8:
                    mapearPaso1();
                    mapearPaso2();
                    mapearPaso3();
                    mapearPaso4();
                    mapearPaso5();
                    mapearPaso6();
                    mapearPaso7();
                    break;
            }
        } else {
            paso = 1;
        }
        actualizarUI();
    }).catch(function(error) {
        paso = 1;
        //actualizarUI();
    });
});

async function verificarSiComenzo(id_estudiante) {
    return new Promise(async (resolve) => {
        var response = await fetch(URL_PIAR + '/verificar-si-comenzo/' + id_estudiante);
        var data = await response.json();
        if (data.success) {
            resolve({comenzo: true, piar: data.data});
        } else {
            resolve({comenzo: false, piar: null});
        }
    });
}

function mapearPaso1() {
    setValueSelect('#form-paso-1 select[name="vinculado"]', piar.datos_generales.vinculado);
    setValueSelect('#form-paso-1 select[name="victima"]', piar.datos_generales.victima);
    setValueSelect('#form-paso-1 select[name="registro_victima"]', piar.datos_generales.registro_victima);
    setValueSelect('#form-paso-1 select[name="centro_proteccion"]', piar.datos_generales.centro_proteccion);
    setValueInput('#form-paso-1 input[name="cual_centro_proteccion"]', piar.datos_generales.cual_centro_proteccion);
    setValueSelect('#form-paso-1 select[name="grupo_etnico"]', piar.datos_generales.grupo_etnico);
    setValueInput('#form-paso-1 input[name="cual_etnico"]', piar.datos_generales.cual_etnico);
    setValueInput('#form-paso-1 textarea[name="capacidades"]', piar.datos_generales.capacidades);
    setValueInput('#form-paso-1 textarea[name="gustos"]', piar.datos_generales.gustos);
    setValueInput('#form-paso-1 textarea[name="expectativas_estudiante"]', piar.datos_generales.expectativas_estudiante);
    setValueInput('#form-paso-1 textarea[name="expectativas_familia"]', piar.datos_generales.expectativas_familia);
    setValueInput('#form-paso-1 textarea[name="redes_apoyo"]', piar.datos_generales.redes_apoyo);
    setValueInput('#form-paso-1 textarea[name="otras"]', piar.datos_generales.otras);
}

function mapearPaso2() {
    setValueSelect('#form-paso-2 select[name="afiliado_salud"]', piar.entorno_salud.afiliado_salud);
    setValueSelect('#form-paso-2 select[name="regimen"]', piar.entorno_salud.regimen);
    setValueInput('#form-paso-2 input[name="eps"]', piar.entorno_salud.eps);
    setValueInput('#form-paso-2 input[name="lugar_emergencia"]', piar.entorno_salud.lugar_emergencia);
    setValueSelect('#form-paso-2 select[name="diagnostico_medico"]', piar.entorno_salud.diagnostico_medico);
    setValueSelect('#form-paso-2 select[name="cual_diagnostico"]', piar.entorno_salud.cual_diagnostico);
    setValueSelect('#form-paso-2 select[name="atencion_medica"]', piar.entorno_salud.atencion_medica);
    setValueSelect('#form-paso-2 select[name="consume_medicamentos"]', piar.entorno_salud.consume_medicamentos);
    setValueSelect('#form-paso-2 select[name="tratamiento_integral"]', piar.entorno_salud.tratamiento_integral);

    var index_atencion_medica = 0;
    piar.entorno_salud.atenciones_medicas.forEach(function(atencion_medica) {
        if(index_atencion_medica > 0) {
            agregarAtencionMedica();
        }
        //setear valor de una vez
        setValueInput('#form-paso-2 input[name="atencion['+index_atencion_medica+'][cual]"]', atencion_medica.cual);
        setValueInput('#form-paso-2 input[name="atencion['+index_atencion_medica+'][frecuencia]"]', atencion_medica.frecuencia);
        index_atencion_medica++;
    });

    var index_tratamiento = 0;
    piar.entorno_salud.tratamientos.forEach(function(tratamiento) {
        if(index_tratamiento > 0) {
            agregarTratamiento();
        }
        setValueInput('#form-paso-2 input[name="tratamiento['+index_tratamiento+'][cual]"]', tratamiento.cual);
        setValueInput('#form-paso-2 input[name="tratamiento['+index_tratamiento+'][frecuencia]"]', tratamiento.frecuencia);
        index_tratamiento++;
    });

    var index_medicamento = 0;
    piar.entorno_salud.medicamentos.forEach(function(medicamento) {
        if(index_medicamento > 0) {
            agregarMedicamento();
        }
        setValueInput('#form-paso-2 input[name="medicamento['+index_medicamento+'][cual]"]', medicamento.cual);
        setValueInput('#form-paso-2 input[name="medicamento['+index_medicamento+'][frecuencia]"]', medicamento.frecuencia);
        setValueInput('#form-paso-2 input[name="medicamento['+index_medicamento+'][horario]"]', medicamento.horario);
        index_medicamento++;
    });

    setValueSelect('#form-paso-2 select[name="ayudas_tecnicas"]', piar.entorno_salud.ayudas_tecnicas);
    setValueInput('#form-paso-2 textarea[name="cuales_ayudas"]', piar.entorno_salud.cuales_ayudas);
}

function mapearPaso3() {
    setValueInput('#form-paso-3 input[name="nombre_madre"]', piar.entorno_hogar.nombre_madre);
    setValueInput('#form-paso-3 input[name="ocupacion_madre"]', piar.entorno_hogar.ocupacion_madre);
    setValueSelect('#form-paso-3 select[name="nivel_madre"]', piar.entorno_hogar.nivel_madre);
    setValueInput('#form-paso-3 input[name="nombre_padre"]', piar.entorno_hogar.nombre_padre);
    setValueInput('#form-paso-3 input[name="ocupacion_padre"]', piar.entorno_hogar.ocupacion_padre);
    setValueSelect('#form-paso-3 select[name="nivel_padre"]', piar.entorno_hogar.nivel_padre);
    setValueInput('#form-paso-3 input[name="nombre_cuidador"]', piar.entorno_hogar.nombre_cuidador);
    setValueSelect('#form-paso-3 select[name="nivel_cuidador"]', piar.entorno_hogar.nivel_cuidador);
    setValueInput('#form-paso-3 input[name="telefono_cuidador"]', piar.entorno_hogar.telefono_cuidador);
    setValueInput('#form-paso-3 input[name="parentesco_cuidador"]', piar.entorno_hogar.parentesco_cuidador);
    setValueInput('#form-paso-3 input[name="correo_cuidador"]', piar.entorno_hogar.correo_cuidador);
    setValueInput('#form-paso-3 input[name="numero_hermanos"]', piar.entorno_hogar.numero_hermanos);
    setValueInput('#form-paso-3 input[name="lugar_ocupa"]', piar.entorno_hogar.lugar_ocupa);
    setValueInput('#form-paso-3 textarea[name="apoyo_crianza"]', piar.entorno_hogar.apoyo_crianza);
    setValueInput('#form-paso-3 textarea[name="personas_con_quien_vive"]', piar.entorno_hogar.personas_con_quien_vive);
}

function mapearPaso4() {
    setValueSelect('#form-paso-4 select[name="vinculado_otra_institucion"]', piar.entorno_educativo.vinculado_otra_institucion);
    setValueInput('#form-paso-4 input[name="instituciones_anteriores"]', piar.entorno_educativo.instituciones_anteriores);
    setValueInput('#form-paso-4 input[name="motivo_no_vinculado"]', piar.entorno_educativo.motivo_no_vinculado);
    setValueSelect('#form-paso-4 select[name="ultimo_grado"]', piar.entorno_educativo.ultimo_grado);
    setValueSelect('#form-paso-4 select[name="estado_ultimo_grado"]', piar.entorno_educativo.estado_ultimo_grado);
    setValueInput('#form-paso-4 textarea[name="observaciones_estado"]', piar.entorno_educativo.observaciones_estado);
    setValueSelect('#form-paso-4 select[name="recibe_informe_pedagogico"]', piar.entorno_educativo.recibe_informe_pedagogico);
    setValueInput('#form-paso-4 input[name="institucion_informe"]', piar.entorno_educativo.institucion_informe);
    setValueSelect('#form-paso-4 select[name="programas_complementarios"]', piar.entorno_educativo.programas_complementarios);
    setValueInput('#form-paso-4 input[name="cuales_programas"]', piar.entorno_educativo.cuales_programas);
}

function mapearPaso5() {
    setValueRadio('vp_mov_apoyo_sistema', piar.valoracion_pedagogica.vp_mov_apoyo_sistema);
    setValueInput('#form-paso-5 textarea[name="vp_mov_apoyo_sistema_obs"]', piar.valoracion_pedagogica.vp_mov_apoyo_sistema_obs); 
    setValueRadio('vp_mov_ajustes_espacio', piar.valoracion_pedagogica.vp_mov_ajustes_espacio);
    setValueInput('#form-paso-5 textarea[name="vp_mov_ajustes_espacio_obs"]', piar.valoracion_pedagogica.vp_mov_ajustes_espacio_obs);
    setValueRadio('vp_mov_ajustes_movilidad', piar.valoracion_pedagogica.vp_mov_ajustes_movilidad);
    setValueInput('#form-paso-5 textarea[name="vp_mov_ajustes_movilidad_obs"]', piar.valoracion_pedagogica.vp_mov_ajustes_movilidad_obs);
    setValueRadio('vp_mov_motricidad_fina', piar.valoracion_pedagogica.vp_mov_motricidad_fina);
    setValueInput('#form-paso-5 textarea[name="vp_mov_motricidad_fina_obs"]', piar.valoracion_pedagogica.vp_mov_motricidad_fina_obs);
    setValueRadio('vp_mov_adaptacion_agarrar', piar.valoracion_pedagogica.vp_mov_adaptacion_agarrar);
    setValueInput('#form-paso-5 textarea[name="vp_mov_adaptacion_agarrar_obs"]', piar.valoracion_pedagogica.vp_mov_adaptacion_agarrar_obs);
    setValueRadio('vp_mov_intensidad', piar.valoracion_pedagogica.vp_mov_intensidad);
    setValueRadio('vp_com_apoyo_sistema', piar.valoracion_pedagogica.vp_com_apoyo_sistema);
    setValueInput('#form-paso-5 textarea[name="vp_com_apoyo_sistema_obs"]', piar.valoracion_pedagogica.vp_com_apoyo_sistema_obs);
    setValueRadio('vp_com_aditamentos', piar.valoracion_pedagogica.vp_com_aditamentos);
    setValueInput('#form-paso-5 textarea[name="vp_com_aditamentos_obs"]', piar.valoracion_pedagogica.vp_com_aditamentos_obs);
    setValueRadio('vp_com_ajustes', piar.valoracion_pedagogica.vp_com_ajustes);
    setValueInput('#form-paso-5 textarea[name="vp_com_ajustes_obs"]', piar.valoracion_pedagogica.vp_com_ajustes_obs);
    setValueRadio('vp_com_intensidad', piar.valoracion_pedagogica.vp_com_intensidad);
    setValueRadio('vp_info_apoyo_sistema', piar.valoracion_pedagogica.vp_info_apoyo_sistema);
    setValueInput('#form-paso-5 textarea[name="vp_info_apoyo_sistema_obs"]', piar.valoracion_pedagogica.vp_info_apoyo_sistema_obs);
    setValueRadio('vp_info_ajustes', piar.valoracion_pedagogica.vp_info_ajustes);
    setValueInput('#form-paso-5 textarea[name="vp_info_ajustes_obs"]', piar.valoracion_pedagogica.vp_info_ajustes_obs);
    setValueRadio('vp_info_intensidad', piar.valoracion_pedagogica.vp_info_intensidad);
    setValueRadio('vp_soc_apoyo_regulacion', piar.valoracion_pedagogica.vp_soc_apoyo_regulacion);
    setValueInput('#form-paso-5 textarea[name="vp_soc_apoyo_regulacion_obs"]', piar.valoracion_pedagogica.vp_soc_apoyo_regulacion_obs);
    setValueRadio('vp_soc_ajustes_interaccion', piar.valoracion_pedagogica.vp_soc_ajustes_interaccion);
    setValueInput('#form-paso-5 textarea[name="vp_soc_ajustes_interaccion_obs"]', piar.valoracion_pedagogica.vp_soc_ajustes_interaccion_obs);
    setValueRadio('vp_soc_intensidad', piar.valoracion_pedagogica.vp_soc_intensidad);
    setValueRadio('vp_acad_ajustes_permanencia', piar.valoracion_pedagogica.vp_acad_ajustes_permanencia);
    setValueInput('#form-paso-5 textarea[name="vp_acad_ajustes_permanencia_obs"]', piar.valoracion_pedagogica.vp_acad_ajustes_permanencia_obs);
    setValueRadio('vp_acad_ajustes_tiempos', piar.valoracion_pedagogica.vp_acad_ajustes_tiempos);
    setValueInput('#form-paso-5 textarea[name="vp_acad_ajustes_tiempos_obs"]', piar.valoracion_pedagogica.vp_acad_ajustes_tiempos_obs);
    setValueRadio('vp_acad_intensidad', piar.valoracion_pedagogica.vp_acad_intensidad);
    setValueInput('#form-paso-5 textarea[name="vp_observaciones"]', piar.valoracion_pedagogica.vp_observaciones);

    for(var i = 1; i <= 18; i++) {
        setValueRadio('cle_' + i, piar.valoracion_pedagogica["cle_" + i]);
        setValueInput('#form-paso-5 textarea[name="cle_'+i+'_obs"]', piar.valoracion_pedagogica["cle_" + i + "_obs"]);
    }
    setValueInput('#form-paso-5 textarea[name="cle_observaciones"]', piar.valoracion_pedagogica.cle_observaciones);

    for(var i = 1; i <= 19; i++) {
        setValueRadio('clm_' + i, piar.valoracion_pedagogica["clm_" + i]);
        setValueInput('#form-paso-5 textarea[name="clm_'+i+'_obs"]', piar.valoracion_pedagogica["clm_" + i + "_obs"]);
    }

    setValueInput('#form-paso-5 input[name="clm_5_desde"]', piar.valoracion_pedagogica.clm_5_desde);
    setValueInput('#form-paso-5 input[name="clm_5_hasta"]', piar.valoracion_pedagogica.clm_5_hasta);
    setValueInput('#form-paso-5 textarea[name="clm_observaciones"]', piar.valoracion_pedagogica.clm_observaciones);
    
    for(var i = 1; i <= 7; i++) {
        setValueRadio('dba_mem_' + i, piar.valoracion_pedagogica["dba_mem_" + i]);
        setValueInput('#form-paso-5 textarea[name="dba_mem_'+i+'_obs"]', piar.valoracion_pedagogica["dba_mem_" + i + "_obs"]);
    }

    for(var i = 1; i <= 4; i++) {
        setValueRadio('dba_ate_' + i, piar.valoracion_pedagogica["dba_ate_" + i]);
        setValueInput('#form-paso-5 textarea[name="dba_ate_'+i+'_obs"]', piar.valoracion_pedagogica["dba_ate_" + i + "_obs"]);
    }

    setValueInput('#form-paso-5 input[name="dba_ate_4_tiempo"]', piar.valoracion_pedagogica.dba_ate_4_tiempo);

    for(var i = 1; i <= 5; i++) {
        setValueRadio('dba_per_' + i, piar.valoracion_pedagogica["dba_per_" + i]);
        setValueInput('#form-paso-5 textarea[name="dba_per_'+i+'_obs"]', piar.valoracion_pedagogica["dba_per_" + i + "_obs"]);
    }

    for(var i = 1; i <= 6; i++) {
        setValueRadio('dba_fe_' + i, piar.valoracion_pedagogica["dba_fe_" + i]);
        setValueInput('#form-paso-5 textarea[name="dba_fe_'+i+'_obs"]', piar.valoracion_pedagogica["dba_fe_" + i + "_obs"]);
    }

    for(var i = 1; i <= 10; i++) {
        setValueRadio('dba_lc_' + i, piar.valoracion_pedagogica["dba_lc_" + i]);
        setValueInput('#form-paso-5 textarea[name="dba_lc_'+i+'_obs"]', piar.valoracion_pedagogica["dba_lc_" + i + "_obs"]);
    }

    setValueInput('#form-paso-5 textarea[name="habilidades_destrezas"]', piar.valoracion_pedagogica.habilidades_destrezas);
    setValueInput('#form-paso-5 textarea[name="estrategias_acciones"]', piar.valoracion_pedagogica.estrategias_acciones);
}

function mapearPaso6() {
    var index_item = 0;
    piar.ajuste_razonable.items.forEach(function(item) {
        if(index_item > 0) {
            agregarAjuste();
        }
        setValueInput('#form-paso-6 input[name="ajuste_razonable['+index_item+'][area]"]', item.area);
        setValueInput('#form-paso-6 textarea[name="ajuste_razonable['+index_item+'][barrera]"]', item.barrera);
        setValueInput('#form-paso-6 textarea[name="ajuste_razonable['+index_item+'][tipo]"]', item.tipo);
        setValueInput('#form-paso-6 textarea[name="ajuste_razonable['+index_item+'][apoyo]"]', item.apoyo);
        setValueInput('#form-paso-6 textarea[name="ajuste_razonable['+index_item+'][descripcion]"]', item.descripcion);
        setValueInput('#form-paso-6 textarea[name="ajuste_razonable['+index_item+'][seguimiento]"]', item.seguimiento);
        index_item++;
    });

    var index_docente = 0;
    piar.ajuste_razonable.docentes_firma.forEach(function(docente) {
        if(index_docente > 0) {
            agregarFirmaDocente();
        }
        setValueInput('#form-paso-6 input[name="docente_firma['+index_docente+'][id]"]', docente.id_docente);
        setValueInput('#form-paso-6 input[name="docente_firma['+index_docente+'][nombre]"]', docente.docente.user.nombre + ' ' + docente.docente.user.apellido);
        setValueInput('#form-paso-6 input[name="docente_firma['+index_docente+'][area]"]', docente.area);

        setValueImg('img_firma_docente_' + (index_docente+1), docente.docente.firma_url);

        docentes_firma.push(docente.id_docente);
        index_docente++;
    });

    // docente orientador 
    setValueInput('#form-paso-6 input[name="docente_orientador_id"]', piar.ajuste_razonable.docente_orientador.id);
    setValueInput('#form-paso-6 input[name="docente_orientador_nombre"]', piar.ajuste_razonable.docente_orientador.user.nombre + ' ' + piar.ajuste_razonable.docente_orientador.user.apellido);
    setValueInput('#form-paso-6 input[name="docente_orientador_area"]', piar.ajuste_razonable.docente_orientador_area);
    setValueImg('docente_orientador_firma', piar.ajuste_razonable.docente_orientador.firma_url);

    // docente apoyo pedagógico
    setValueInput('#form-paso-6 input[name="docente_apoyo_pedagogico_id"]', piar.ajuste_razonable.docente_apoyo_pedagogico.id);
    setValueInput('#form-paso-6 input[name="docente_apoyo_pedagogico_nombre"]', piar.ajuste_razonable.docente_apoyo_pedagogico.user.nombre + ' ' + piar.ajuste_razonable.docente_apoyo_pedagogico.user.apellido);
    setValueInput('#form-paso-6 input[name="docente_apoyo_pedagogico_area"]', piar.ajuste_razonable.docente_apoyo_pedagogico_area);
    setValueImg('docente_apoyo_pedagogico_firma', piar.ajuste_razonable.docente_apoyo_pedagogico.firma_url);

    // docente coordinador pedagógico
    setValueInput('#form-paso-6 input[name="docente_coordinador_pedagogico_id"]', piar.ajuste_razonable.docente_coordinador_pedagogico.id);
    setValueInput('#form-paso-6 input[name="docente_coordinador_pedagogico_nombre"]', piar.ajuste_razonable.docente_coordinador_pedagogico.user.nombre + ' ' + piar.ajuste_razonable.docente_coordinador_pedagogico.user.apellido);
    setValueInput('#form-paso-6 input[name="docente_coordinador_pedagogico_area"]', piar.ajuste_razonable.docente_coordinador_pedagogico_area);
    setValueImg('docente_coordinador_pedagogico_firma', piar.ajuste_razonable.docente_coordinador_pedagogico.firma_url);
}

function mapearPaso7() {
    $('#form-paso-7 textarea[name="compromisos"]').val(piar.acta_compromiso.compromisos);

    var index_actividad = 0;
    piar.acta_compromiso.actividades.forEach(function(actividad) {
        if(index_actividad > 0) {
            agregarActividad();
        }
        setValueInput('#form-paso-7 textarea[name="actividad['+index_actividad+'][nombre]"]', actividad.nombre);
        setValueInput('#form-paso-7 textarea[name="actividad['+index_actividad+'][descripcion]"]', actividad.descripcion);
        setValueRadio('actividad['+index_actividad+'][frecuencia]', actividad.frecuencia);
        index_actividad++;
    });
}

function setValueSelect(name_select, value) {
    $(name_select).val(value).trigger('change');
}

function setValueRadio(name_radio, value) {
    $(`input[name="${name_radio}"][value="${value}"]`)
    .prop('checked', true)
    .trigger('change');
}

function setValueInput(name_input, value) {
    $(name_input).val(value);
}

function setValueImg(id_img, url_img) {
    if(url_img) {
        $('#' + id_img).attr('src', '/storage/' + url_img);
    } else {
        $('#' + id_img).attr('src', '/assets/images/firma.png');
    }
}