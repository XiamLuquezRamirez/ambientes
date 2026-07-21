$("#grado_id_nuevo_docente").on("change", function() {
    var grado_id = $(this).val();
    grado_id == '' ? grado_id = 0 : grado_id = grado_id;
    $.ajax({
        url: "/panel/grupos/grados/docente/" + grado_id,
        type: "GET",
        success: function(response) {
            if (response.data.length > 0) {
                mapearGrupos(response.data);
            } else {
                $("#grupo_id_nuevo").html("<option value=''>No hay grupos disponibles</option>");
            }
        }
    });
});

function mapearGrupos(grupos) { 
    var html = "<option value=''>Seleccione</option>";
    for (var i = 0; i < grupos.length; i++) {
        html += "<option value='" + grupos[i].id + "'>" + grupos[i].nombre + " Año Lectivo: " + grupos[i].anio_lectivo + "</option>";
    }
    $("#grupo_id_nuevo").html(html);

    $("#grupo_id_nuevo").val('').trigger('change');
    ambientesSeleccionados = [];
}

$("#grupo_id_nuevo").on("change", function() {
    var grado_id = $("#grado_id_nuevo_docente").val();
    var grupo_id = $(this).val() == '' ? 0 : $(this).val();
    $.ajax({
        url: "/panel/grupos/ambientes-disponibles/" + grado_id + "/" + grupo_id,
        type: "GET",
        success: function(response) {
            mapearAmbientes(response.ambientes, response.disponible);
        }
    });
});

function mapearAmbientes(ambientes, disponible) {
    if(ambientes.length > 0) {
        var clase = "";
        var claseInactivo = "";
        var colorBorde = generarColoresBordeBackgroundAzar();

        if(disponible == 0) {
            clase = "badge-stat bs-gris";
            claseInactivo = "item-ambiente-inactivo";
            colorBorde = "#212529";
        } else if(disponible > 0 && disponible < 5) {
            clase = "badge-stat bs-amarillo";
        } else {
            clase = "badge-stat bs-verde";
        }
    
        var html = "<div style='position: absolute; top: -60px; right: 0px; width: auto;'><span class='" + clase + "'><i class='fa-solid fa-users'></i> Cupos disponibles: " + disponible + "</span></div>";
        for (var i = 0; i < ambientes.length; i++) {
            html += "<div class='col-md-4'>";
                html += "<div class='item-ambiente " + claseInactivo + "' id='item-ambiente-" + ambientes[i].id + "' style='border-color: " + colorBorde +"' onclick='seleccionarAmbienteCrearEstudiante(" + ambientes[i].id + ")'>";
                    html += "<div class='d-flex align-items-center gap-2' style='margin-bottom: 10px;'>";
                        html += "<div class='item-ambiente-icon' style='background-color: " + colorBorde + "'>" + ambientes[i].icono + "</div>";
                        html += "<label style='margin-bottom: 0; font-size: 20px; font-weight: bold; color: " + colorBorde + "'>Ambiente " + ambientes[i].nombre + "</label>";
                    html += "</div>";
                html += "</div>";
            html += "</div>";
        }
    } else {
        html = "<div class='col-md-12 p-4 text-center'><h4 class='text-center'>No hay ambientes disponibles</h4></div>";
    }

    $("#contenedor-ambientes-disponibles").empty();
    $("#contenedor-ambientes-disponibles").html(html);
}

function generarColoresBordeBackgroundAzar() {
    var colores = ["#007bff", "#0056b3", "#003d80", "#002650", "#001325" ];
    // mismos colores  de arriba peroal 60% de transparencia
    var indiceColor = Math.floor(Math.random()*colores.length);
    return colores[indiceColor];
}

function seleccionarAmbienteCrearEstudiante(id) {
    if($("#item-ambiente-" + id).hasClass("item-ambiente-seleccionado")) {
        $("#item-ambiente-" + id).removeClass("item-ambiente-seleccionado");
        ambientesSeleccionados = ambientesSeleccionados.filter(ambiente => ambiente !== id);
    } else {
        $("#item-ambiente-" + id).addClass("item-ambiente-seleccionado");
        ambientesSeleccionados.push(id);
    } 
}

function abrirModalConfigurarPin(id, nombre) {
    idEstudianteConfigurarPin = id;
    $("#nombreEstudiante").text(nombre);
    $("#modalConfigurarPin").modal("show");
}

function abrirModalVerPinEstudiante(figura1, figura2, figura3, colorfigura1, colorfigura2, colorfigura3) {
  $("#modalConfigurarPin").modal("show");
}


function cerrarModalConfigurarPin() {
    idEstudianteConfigurarPin = 0;
    $("#modalConfigurarPin").modal("hide");
    pin = [];
    vaciarPin();
}

function guardarConfigurarPin() {
    if(idEstudianteConfigurarPin == 0) {
        mostrarToast("error", "Debe seleccionar un estudiante");
        return;
    }

    if(pin.length == 0) {
        mostrarToast("error", "Debe seleccionar tres figuras para configurar el PIN");
        return;
    }

    const formData = new FormData($("#formConfigurarPin")[0]);
    formData.append('id', idEstudianteConfigurarPin);
    
    pin.forEach((item, index) => {
        Object.entries(item).forEach(([key, value]) => {
            formData.append(`configuracion_pin[${index}][${key}]`, value);
        });
    });


    $.ajax({
        url: `${URL_ESTUDIANTES}/configurar-pin`,
        type: "POST",
        data: formData,
        success: async function(response) {
            if(response.success) {
                mostrarToast("success", response.message);
                cerrarModalConfigurarPin();
                await cargarTabla(location.href);
            } else {
                mostrarToast("error", response.message);
            }
        },
        error: function(xhr) {
            mostrarToast("error", xhr.responseJSON.message);
        }
    });
}

function cambiarEstadoEstudianteAmbiente(idAmbiente, idEstudiante, nombreAmbiente, element) { 
    var texto = $(element).is(':checked') ? 'activar' : 'desactivar';
    Swal.fire({
        title: '¿Estás seguro ' + texto + ' al estudiante del ambiente ' + nombreAmbiente + '?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
    }) .then((result) => {
        if (result.isConfirmed) {
            confirmarCambiarEstadoEstudianteAmbiente(idAmbiente, idEstudiante, element);
        }else{
            $(element).prop('checked', !$(element).prop('checked'));
        }
    });
}   

function confirmarCambiarEstadoEstudianteAmbiente(idAmbiente, idEstudiante, element) { 
    var CSRF_TOKEN = $("input[name='csrf_token']").val();
    $.ajax({
        url: `${URL_ESTUDIANTES}/cambiar-estado-ambiente-estudiante`,
        type: "POST",
        data: {
            _token: CSRF_TOKEN,
            idAmbiente: idAmbiente,
            idEstudiante: idEstudiante,
            activo: $(element).is(':checked') ? 1 : 0
        },
        success: function(response) {
            if(response.success) {
                mostrarToast(response.tipo_alerta, response.message);
            } else {
                mostrarToast("error", response.message);
            }
        },
        error: function(xhr) {
            // volver el checkbox a su estado anterior
            $(element).prop('checked', !$(element).prop('checked'));
            mostrarToast("error", xhr.responseJSON.message);
        }
    });
}   