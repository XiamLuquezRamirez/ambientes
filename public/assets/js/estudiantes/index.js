/* ── Bootstrap Modal ─────────────────────────────────────────── */
const $modal = $('#modalRegistro');
const modalBS = new bootstrap.Modal($modal[0]);
var requiereApoyo = null;

$modal.on('hidden.bs.modal', function () {
    limpiarErroresModal();
    limpiarModal();
});

function abrirModal() {
    modalBS.show();
}

function cerrarModal() {
    modalBS.hide();
    requiereApoyo = null;
    limpiarModal();
}

function limpiarModal() {
    limpiarErroresModal();
    //borrar valores de los inputs
    $('#formCrearEstudiante input[type="text"]').val('');
    $('#formCrearEstudiante input[type="number"]').val('');
    $('#formCrearEstudiante input[type="date"]').val('');
    $('#formCrearEstudiante select').val('');

    //borrar valores de la card purple
    $('.alert').removeClass('alert-selected');

    //resetear el preview del avatar
    $('#avatar').val('');
    $('#previewAvatar').attr('src', '/assets/images/avatar.png');
    $('#color_avatar').val('#ba79fb');

    bootstrap.Tab.getOrCreateInstance(
        $('a[href="#datos-personales"]')[0]
    ).show();
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
        $('<div>', { class: 'campo-error', text: 'Este campo es requerido' }).insertAfter($input);
    });
    $('#formCrearEstudiante .is-invalid').first().focus();
}

/* ── Crear docente (AJAX) ────────────────────────────────────── */
$('#formCrearEstudiante').on('submit', function (e) {
    e.preventDefault();
    const $btn = $('#btnCrearEstudiante');
    $btn.prop('disabled', true).text('Guardando…');

    const formData = new FormData(this);
    const datos = Object.fromEntries(formData.entries());
    guardarEstudiante(datos);
});

async function guardarEstudiante(datos) {

    const formData = new FormData();

    // Datos normales
    Object.keys(datos).forEach(key => {
        formData.append(key, datos[key]);
    });

    if (requiereApoyo !== null) {
        formData.append('requiere_apoyo', requiereApoyo);
    }

    // Archivo
    const foto = $('#avatar')[0].files[0];
    if (foto) {
        formData.append('avatar', foto);
    }

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
                            window.location.href = `${URL_ESTUDIANTES}/dilligenciar-pinar?id=${res.id_estudiante_creado}`;
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
            mostrarToast('error', 'Error al crear el estudiante');
            mostrarErroresModal(xhr.responseJSON.errors);
        },
        complete: function () {
            $('#btnCrearEstudiante').prop('disabled', false).text('Crear Estudiante');
        }
    });
}

/* ── Eliminar docente (AJAX) ─────────────────────────────────── */
$(document).on('click', '.btn-eliminar', async function () {
    const $btn = $(this);
    const id = $btn.data('id');
    const nombre = $btn.data('nombre');

    const confirmacion = await Swal.fire({
        title: '¿Eliminar estudiante?',
        text: `"${nombre}" será eliminado permanentemente.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#DC2626',
        cancelButtonColor: '#94A3B8',
        iconColor: '#F59E0B',
    });

    if (!confirmacion.isConfirmed) return;

    const res = await ajaxRequest(`${URL_ESTUDIANTES}/${id}`, 'DELETE');

    if (res.success) {
        const $fila = $(`#fila-${id}`);
        if ($fila.length) {
            $fila.css({ transition: 'opacity .25s', opacity: '0' });
            setTimeout(() => {
                $fila.remove();
                if (!$('#contenedorTabla tbody tr[id^="fila-"]').length) {
                    cargarTabla(URL_ESTUDIANTES);
                }
            }, 250);
        }
        mostrarToast('success', res.message);
    } else {
        mostrarToast('error', res.message || 'Error al eliminar');
    }
});

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