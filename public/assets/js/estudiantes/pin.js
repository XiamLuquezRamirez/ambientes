var item_actual = 0;
function agregarFigura(icon, color) {
    if (item_actual == 3) {
        return;
    }
    pin.push({ icon, color });  
    mapPin();
    item_actual++;
}

function mapPin() {
    for (let i = 1; i <= 3; i++) {
        $(`#pin-item-${i}`)
        .html('')
        .removeClass('pin-item-active');
    }

    pin.forEach((item, index) => {
       $(`#pin-item-${index + 1}`)
       .html(`<i class="${item.icon}" style="color: ${item.color};"></i>`)
       .addClass('pin-item-active');
    });
}

function borrarFigura() {
    if (item_actual == 0) {
        return;
    }
    item_actual--;
    pin.pop();
    mapPin();
}

function vaciarPin() {
    for (let i = 1; i <= 3; i++) {
        $(`#pin-item-${i}`)
        .html('')
        .removeClass('pin-item-active');
    }

    item_actual = 0;
}


function mapearDatosPin(datos) {
    pin = [];
   
    pin.push({ icon: datos.figura_1, color: datos.color_figura_1 });
    pin.push({ icon: datos.figura_2, color: datos.color_figura_2 });
    pin.push({ icon: datos.figura_3, color: datos.color_figura_3 });
    item_actual = 3;
    
    mapPin();
}