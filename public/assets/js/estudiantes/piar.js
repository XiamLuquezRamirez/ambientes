let paso = 6;

const TOTAL = 7;

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
    btnSig.style.display    = paso === TOTAL ? 'none' : 'inline-block';
    btnGuardar.style.display = paso === TOTAL ? 'inline-block' : 'none';

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
    if (!validarPaso()) return;
    if (paso < TOTAL) { 
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
        }
    }
});

btnAnt.addEventListener('click', () => {
    if (paso > 1) { paso--; actualizarUI(); }
});


var atencion_medica_cuenta = 1;
var tratamientos_cuenta = 1;
var medicamentos_cuenta = 1;
var ajustes_cuenta = 1;
var firmas_docentes_cuenta = 1;
var actividades_cuenta = 1;

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
        const minHeight = textarea.scrollHeight;

        function resize() {
            textarea.style.height = 'auto';
            textarea.style.height = Math.max(textarea.scrollHeight, minHeight) + 'px';
        }

        textarea.addEventListener('input', resize);
        resize(); // Ajusta si ya tiene contenido al cargar la página
    });
}

autoGrowTextarea();

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
                    <tr><th class="d-flex justify-content-between align-items-center">Nombre Docente <button type="button" class="btn btn-danger btn-sm" onclick="eliminarFirmaDocente(${firmas_docentes_cuenta})"><i class="fas fa-trash"></i></button></th></tr>
                    <tr><td><input type="text" class="form-control" name="docente_nombre_ar[]"></td></tr>
                    <tr><th>Área</th></tr>
                    <tr><td><input type="text" class="form-control" name="area_ar[]"></td></tr>
                    <tr><th>Firma</th></tr>
                    <tr>
                        <td class="d-flex justify-content-between align-items-center gap-2">
                            <input onchange="previewFirma('input_firma_docente_' + ${firmas_docentes_cuenta}, 'img_firma_docente_' + ${firmas_docentes_cuenta})" id="input_firma_docente_${firmas_docentes_cuenta}" type="file" style="display: none;" class="form-control" name="docente_firma_ar[]" accept="image/*">
                            <button type="button" class="btn btn-primary btn-sm" onclick="agregarFirma('input_firma_docente_' + ${firmas_docentes_cuenta})"><i class="fas fa-plus"></i> Añadir firma</button>
                            <img id="img_firma_docente_${firmas_docentes_cuenta}" class="firma-img" src="{{ asset('assets/images/firma.png') }}" alt="Firma" class="img-fluid">
                        </td>
                    </tr>
                </thead>
            </table>
        </div>`
    );
}

function eliminarFirmaDocente(id) {
    document.getElementById('div_docente_' + id).remove();
    firmas_docentes_cuenta--;
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
            <td><input type="text" class="form-control" name="actividad_nombre_${actividades_cuenta}"></td>
            <td><input type="text" class="form-control" name="actividad_descripcion_${actividades_cuenta}"></td>
                <td>
                    <div class="d-flex justify-content-between align-items-center gap-2">
                        <div class="frecuencia-radio">
                            <input type="radio" name="actividad_frecuencia_${actividades_cuenta}" value="D">
                            <label class="form-check-label">D</label>
                        </div>
                        <div class="frecuencia-radio">
                            <input type="radio" name="actividad_frecuencia_${actividades_cuenta}" value="S">
                            <label class="form-check-label">S</label>
                        </div>
                        <div class="frecuencia-radio">
                            <input type="radio" name="actividad_frecuencia_${actividades_cuenta}" value="P">
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
}

function eliminarActividad(id) {
    document.getElementById('actividad_' + id).remove();
    actividades_cuenta--;
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