function seleccionarAmbiente(element, url_actual) {
    const ambienteId = element.getAttribute('data-id');
    const ambienteNombre = element.getAttribute('data-nombre');

    $.ajax({
        url: '/panel/ambientes/seleccionar',
        type: 'POST',
        data: {
            _token: document.getElementById('crf-token').value,
            ambiente_id: ambienteId,
            ambiente_nombre: ambienteNombre
        },
        success: function (response) {
            if (url_actual) {
                irAlaUrlPorAjax(url_actual);
            }
        },
        error: function (xhr, status, error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No fue posible seleccionar el ambiente.',
                confirmButtonText: 'Entendido'
            });
        }
    });
}

function seleccionarGradoGrupo(gradoId, grupoId) {
    $.ajax({
        url: '/panel/sesion/seleccionar-grado-grupo',
        type: 'POST',
        data: {
            _token: document.getElementById('crf-token').value,
            grado_id: gradoId,
            grupo_id: grupoId
        },
        error: function (xhr, status, error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No fue posible seleccionar el grado y grupo.',
                confirmButtonText: 'Entendido'
            });
        }
    });
}

function irAlaUrlPorAjax(url) {
    window.location.href = url;
}

function eliminarAmbienteSeleccionado() {
    $.ajax({
        url: '/panel/ambientes/eliminar',
        type: 'GET',
        success: function (response) {
            console.log(response);
        },
        error: function (xhr, status, error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No fue posible eliminar el ambiente seleccionado.',
                confirmButtonText: 'Entendido'
            });
        }
    });
}