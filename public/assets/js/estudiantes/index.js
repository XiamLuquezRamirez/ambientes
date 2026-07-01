/* ── Bootstrap Modal ─────────────────────────────────────────── */
const $modal = $('#modalRegistro');
const modalBS = new bootstrap.Modal($modal[0]);
var requiereApoyo = null;
var idEstudianteEditar = null;

$modal.on('hidden.bs.modal', function () {
    limpiarErroresModal();
    limpiarModal();
});

function abrirModal() {
    $('#modalRegistroLabel').text('Nuevo Estudiante');
    $('#modalRegistroSubtitle').text('Completa los datos para crear el estudiante');
    $('#btnCrearEstudiante').text('Crear Estudiante');
    tipoPost = 1;
    modalBS.show();
}

function cerrarModal() {
    modalBS.hide();
    setTimeout(() => {
        requiereApoyo = null;
        limpiarModal();
        vaciarPin();
    }, 1000);
}

function limpiarModal() {
    limpiarErroresModal();
    //borrar valores de los inputs
    $('#formCrearEstudiante input[type="text"]').val('');
    $('#formCrearEstudiante input[type="number"]').val('');
    $('#formCrearEstudiante input[type="date"]').val('');
    $('#formCrearEstudiante input[type="email"]').val('');
    $('#formCrearEstudiante select').val('');

    //borrar valores de la card purple
    $('.alert').removeClass('alert-selected');

    //resetear el preview del avatar
    $('#avatar').val('');
    $('#previewAvatar').attr('src', '/assets/images/avatar.png');
    $('#color_avatar').val('#ba79fb');

    //resetear el valor de la configuracion de pin
    pin = []

    bootstrap.Tab.getOrCreateInstance(
        $('a[href="#datos-personales"]')[0]
    ).show();

    //vaciar los municipios
    $('#municipio_id').empty();
    $('#municipio_id').append('<option value="">Seleccione</option>');

    //resetear el valor de otro tipo identificacion
    $('#otro_tipo_identificacion').val('');
    $('#otro_tipo_identificacion_container').hide();
}

/* ── Tabla AJAX ──────────────────────────────────────────────── */
async function cargarTabla(url) {
    const $contenedor = $('#contenedorTabla');
    const $cargando = $('#cargando-tabla');

    $contenedor.css('opacity', '.4');
    $cargando.show();

    const res = await ajaxRequest(url);

    $contenedor.css('opacity', '1');
    $cargando.hide();

    if (res.success) {
        $contenedor.html(res.html);
        history.pushState(null, '', url);
        const params = new URL(url).searchParams;
        const tieneFilros = params.has('buscar') || params.has('grado_id') || params.has('condicion_id') || params.has('estado');
        $('#btnLimpiar').css('display', tieneFilros ? 'inline-flex' : 'none');
    } else {
        mostrarToast('error', 'Error al cargar los datos');
    }
}

$(document).on('click', '.pag-btn[href]', function (e) {
    e.preventDefault();
    cargarTabla($(this).attr('href'));
});

/* ── Filtros ─────────────────────────────────────────────────── */
function aplicarFiltros() {
    const params = new URLSearchParams(new FormData($('#formBuscar')[0]));
    for (const [k, v] of [...params.entries()]) {
        if (!v) params.delete(k);
    }
    const url = params.toString() ? `${URL_ESTUDIANTES}?${params.toString()}` : URL_ESTUDIANTES;
    cargarTabla(url);
}

let debounceTimer;
$('#formBuscar input[name="buscar"]').on('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(aplicarFiltros, 400);
});

$('#btnLimpiar').on('click', async function (e) {
    e.preventDefault();
    $('#formBuscar')[0].reset();
    $('#grado_id').val('');
    $('#condicion_id').val('');
    $('#estado').val('');

    await cargarTabla(URL_ESTUDIANTES);
});

/* ── Errores inline en modal ─────────────────────────────────── */
function limpiarErroresModal() {
    $('#formCrearEstudiante .campo-error').remove();
    $('#formCrearEstudiante .is-invalid').removeClass('is-invalid');
}

function mostrarErroresModal(errors) {
    limpiarErroresModal();
    $.each(errors, function (campo, mensajes) {
        const $input = $(`#formCrearEstudiante [name="${campo}"]`);
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
    
    $('#formCrearEstudiante .is-invalid').first().focus();
}

/* ── Crear docente (AJAX) ────────────────────────────────────── */
$('#formCrearEstudiante').on('submit', function (e) {
    limpiarErroresModal();
    e.preventDefault();
    const $btn = $('#btnCrearEstudiante');
    $btn.prop('disabled', true).text('Guardando…');

    const formData = new FormData(this);
    const datos = Object.fromEntries(formData.entries());

    if (tipoPost === 1) {
        guardarEstudiante(datos);
    } else if (tipoPost === 2) {
        editarEstudiante(datos);
    }
});

async function guardarEstudiante(datos) {
    const formData = new FormData();

    // Datos normales
    Object.keys(datos).forEach(key => {
        formData.append(key, datos[key]);
    });

    
    // Archivo
    const foto = $('#avatar')[0].files[0];
    if (foto) {
        formData.append('avatar', foto);
    }

    // requerimiento de apoyo
    if (requiereApoyo != null) {
        formData.append('requiere_apoyo', requiereApoyo);
    }

    // PIN
    pin.forEach((item, index) => {
        Object.entries(item).forEach(([key, value]) => {
            formData.append(`configuracion_pin[${index}][${key}]`, value);
        });
    });

    $.ajax({
        url: URL_ESTUDIANTES,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        dataType: 'json',
        success: async function (res) {
            Swal.close();
            if (res.success) {
                await cargarTabla(location.href);
                if (res.requiere_apoyo) {
                    Swal.fire({
                        title: res.message,
                        text: 'El estudiante requiere apoyo en el proceso de aprendizaje, haga click en el botón para dilligencoiar el PIAR.',
                        icon: 'info',
                        confirmButtonText: 'Dilligenciar PIAR',
                        confirmButtonColor: '#2045a3',
                        showCancelButton: true,
                        cancelButtonText: 'En Otro Momento',
                        cancelButtonColor: '#94A3B8',
                        iconColor: '#F59E0B',
                    }).then(async function (result) {
                        if (result.isConfirmed) {
                            cerrarModal();
                            Swal.close();
                            window.location.href = `${URL_ESTUDIANTES}/diligenciar-piar/${res.id_estudiante_creado}`;
                        } else {
                            setTimeout(() => {
                                Swal.close();
                                cerrarModal();
                            }, 1000);
                        }
                    });
                } else {
                    mostrarToast('success', res.message);
                    setTimeout(() => {
                        cerrarModal();
                    }, 1000);
                }
            } else {
                mostrarToast('error', res.message);
            }
        },
        error: function (xhr) {
            Swal.close();
            if (xhr.responseJSON.message.includes('validation.')) {
                mostrarToast('error', 'Verifique los datos ingresados');
            } else {
                mostrarToast('error', "Error al crear el estudiante");
            }

            mostrarErroresModal(xhr.responseJSON.errors);
        },
        complete: function () {
            $('#btnCrearEstudiante').prop('disabled', false).text('Crear Estudiante');
        }
    });
}

/* ── Filtros ─────────────────────────────────────────────────── */
$('#grado_id').on('change', async function () {
    aplicarFiltros();
});

$('#condicion_id').on('change', async function () {
    aplicarFiltros();
});

$('#estado').on('change', async function () {
    aplicarFiltros();
});

function seleccionarAlert(id) {
    //borrar la clase alert-selected de todos los alert
    $('.alert').removeClass('alert-selected');
    //agregar la clase alert-selected al alert seleccionado
    $(`#${id}`).addClass('alert-selected');

    if (id === 'alert-si-requiere-apoyo') {
        requiereApoyo = "si";
    } else if (id === 'alert-en-proceso') {
        requiereApoyo = "en_proceso";
    } else if (id === 'alert-no-requiere-apoyo') {
        requiereApoyo = "no";
    }
}

/* previsualizar avatar */
$('#avatar').on('change', function () {
    const file = $(this)[0].files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        $('#previewAvatar').attr('src', e.target.result);
    }
    reader.readAsDataURL(file);
});

function mostrarOtroTipoIdentificacion() {
    const tipoIdentificacion = $('#tipo_identificacion').val();
    if (tipoIdentificacion == 'Otro') {
        $('#otro_tipo_identificacion_container').show();
    } else {
        $('#otro_tipo_identificacion_container').hide();
    }
}

/* editar estudiante */
function abrirModalEditarEstudiante(id) {
    tipoPost = 2;
    idEstudianteEditar = id;
    $('#modalRegistroLabel').text('Editar Estudiante');
    $('#modalRegistroSubtitle').text('Completa los datos para editar el estudiante');
    $('#btnCrearEstudiante').text('Editar Estudiante');
    cargarDatosEstudiante();
    modalBS.show();
}

async function cargarDatosEstudiante() {
    const res = await $.ajax({
        url: `${URL_ESTUDIANTES}/${idEstudianteEditar}`,
        type: 'GET',
        dataType: 'json',
        success: function (res) {
            if (res.success) {
               mapearDatosEstudiante(res.data);
            } else {
                mostrarToast('error', res.message);
            }
        },
        error: function (xhr) {
            mostrarToast('error', 'Error al cargar los datos del estudiante');
        },
    });
}

async function mapearDatosEstudiante(datos) {
    $('#tipo_identificacion').val(datos.tipo_identificacion);
    if (datos.tipo_identificacion == 'Otro') {
        $('#otro_tipo_identificacion_container').show();
        $('#otro_tipo_identificacion').val(datos.otro_tipo_identificacion);
    } else {
        $('#otro_tipo_identificacion_container').hide();
    }
    $('#identificacion').val(datos.identificacion);
    $('#nombre').val(datos.nombre);
    $('#apellido').val(datos.apellido);
    $('#grado_id_nuevo').val(datos.grado_id);
    $('#color_avatar').val(datos.color_avatar);
    $('#fecha_nacimiento').val(datos.fecha_nacimiento);
    $('#sexo').val(datos.sexo);
    $('#acudiente').val(datos.acudiente);
    $('#telefono_acudiente').val(datos.telefono_acudiente);

    if (datos.requiere_apoyo == "si") {
        $('#alert-si-requiere-apoyo').addClass('alert-selected');
        requiereApoyo = "si"; 
    } else if (datos.requiere_apoyo == "en_proceso") {
        $('#alert-en-proceso').addClass('alert-selected');
        requiereApoyo = "en_proceso";
    } else if (datos.requiere_apoyo == "no") {
        $('#alert-no-requiere-apoyo').addClass('alert-selected');
        requiereApoyo = "no";
    }

    //previsualizar avatar
    if (datos.avatar) {
        $('#previewAvatar').attr('src', `/storage/${datos.avatar}`);
    } 

    if (datos.configuracion_pin) {
        mapearDatosPin(datos.configuracion_pin);
    }

    $('#lugar_nacimiento').val(datos.lugar_nacimiento);
    $('#barrio_vereda').val(datos.barrio_vereda);
    $('#direccion').val(datos.direccion);
    $('#telefono').val(datos.telefono);
    $('#email').val(datos.email);

    $('#departamento_id').val(datos.departamento_id);

    if (datos.departamento_id) {
        cargarMunicipios().then(() => {
            $('#municipio_id').val(datos.municipio_id);
        });
    }
}


async function cargarMunicipios() {
    const departamento = $('#departamento_id').val();
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${URL_ESTUDIANTES}/cargar-municipios/${departamento}`,
            type: 'GET',
            dataType: 'json',
            success: function (res) {
                $('#municipio_id').empty();
                $('#municipio_id').append('<option value="">Seleccione</option>');

                res.forEach(municipio => {
                    $('#municipio_id').append(
                        `<option value="${municipio.id}">${municipio.descripcion}</option>`
                    );
                });

                resolve(); // <- importante
            },
            error: function (xhr) {
                mostrarToast('error', 'Error al cargar los municipios');
                reject(xhr); // <- importante
            }
        });
    });
}


function editarEstudiante(datos) {
    const formData = new FormData();

    // Datos normales
    Object.keys(datos).forEach(key => {
        formData.append(key, datos[key]);
    });

    
    // requerimiento de apoyo
    if (requiereApoyo != null) {
        formData.append('requiere_apoyo', requiereApoyo);
    }
    
    // Archivo
    const foto = $('#avatar')[0].files[0];
    if (foto) {
        formData.append('avatar', foto);
    }

    // PIN
    pin.forEach((item, index) => {
        Object.entries(item).forEach(([key, value]) => {
            formData.append(`configuracion_pin[${index}][${key}]`, value);
        });
    });

    $.ajax({
        url: `${URL_ESTUDIANTES}/editar/${idEstudianteEditar}`,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        dataType: 'json',
        success: async function (res) {
            Swal.close();
            if (res.success) {
                await cargarTabla(location.href);
                if (res.success) {
                    mostrarToast('success', res.message);
                    setTimeout(() => {
                        cerrarModal();
                    }, 1000);
                } else {
                    mostrarToast('error', res.message);
                }
            }
        },
        error: function (xhr) {
            Swal.close();
            if (xhr.responseJSON.message.includes('validation.')) {
                mostrarToast('error', 'Verifique los datos ingresados');
            } else {
                mostrarToast('error', "Error al editar el estudiante");
            }

            mostrarErroresModal(xhr.responseJSON.errors);
        },
        complete: function () {
            $('#btnCrearEstudiante').prop('disabled', false).text('Editar Estudiante');
        }
    });
}

/* ── Eliminar estudiante ────────────────────────────────────── */

async function confirmarEliminacionEstudiante(id, nombreEstudiante) {
    Swal.fire({
        title: '¿Eliminar estudiante?',
        html: `<strong>${nombreEstudiante}</strong> será eliminado permanentemente.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#DC2626',
        cancelButtonColor: '#94A3B8',
        iconColor: '#F59E0B',
    }).then(async function (result) {
        if (result.isConfirmed) {
            await eliminarEstudiante(id);
        }
    });
}

async function eliminarEstudiante(id) {
    const res = await $.ajax({
        url: `${URL_ESTUDIANTES}/eliminar/${id}`,
        type: 'GET',
        dataType: 'json',
        beforeSend: function () {
            Swal.fire({
                title: 'Eliminando estudiante...',
                text: 'Espere un momento mientras se elimina el estudiante.',
                icon: 'info',
                showCancelButton: false,
                showConfirmButton: false,
            });
        },
        success: async function (res) {
            if (res.success) {
                await cargarTabla(location.href);
                mostrarToast('success', res.message);
            } else {
                mostrarToast('error', res.message);
            }
        },
        error: function (xhr) {
            mostrarToast('error', 'Error al eliminar el estudiante');
        },
    });
}

/* ── Cambiar estado de estudiante ────────────────────────────── */
async function cambiarEstadoEstudiante(id, input) {
    const estado = input.checked ? 1 : 0;
    await $.ajax({
        url: `${URL_ESTUDIANTES}/cambiar-estado/${id}/${estado}`,
        type: 'GET',
        dataType: 'json',
        beforeSend: function () {
            Swal.fire({
                title: 'Cambiando estado de estudiante...',
                text: 'Espere un momento mientras se cambia el estado del estudiante.',
                icon: 'info',
                showCancelButton: false,
                showConfirmButton: false,
            });
        },
        success: async function (res) {
            if (res.success) {
                await cargarTabla(location.href);
                mostrarToast('success', res.message);
            } else {
                mostrarToast('error', res.message);
            }
        },
        error: function (xhr) {
            mostrarToast('error', 'Error al cambiar el estado del estudiante');
        },
        complete: function () {
            Swal.close();
        }
    });
}