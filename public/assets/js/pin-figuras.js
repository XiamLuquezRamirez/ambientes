const seleccion = [];

function actualizarIndicadores() {
    for (let i = 0; i < 3; i++) {
        const ind = document.getElementById('ind-' + i);
        if (seleccion[i]) {
            ind.classList.add('activo');
            ind.textContent = FIGURAS_SIMBOLOS[seleccion[i]] || '';
        } else {
            ind.classList.remove('activo');
            ind.textContent = '';
        }
    }
}

function seleccionarFigura(figura) {
    if (seleccion.length >= 3) return;
    seleccion.push(figura);
    actualizarIndicadores();
    if (seleccion.length === 3) {
        enviarPin();
    }
}

function borrarUltima() {
    seleccion.pop();
    actualizarIndicadores();
}

async function enviarPin() {
    const body = {
        figura_1: seleccion[0],
        figura_2: seleccion[1],
        figura_3: seleccion[2],
        _token: CSRF,
    };

    try {
        const resp = await fetch(RUTA_VERIFICAR, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await resp.json();

        if (data.ok) {
            document.getElementById('overlay-exito').style.display = 'flex';
            setTimeout(() => { window.location.href = data.redirect; }, 1000);
        } else {
            mostrarError();
        }
    } catch {
        mostrarError();
    }
}

function mostrarError() {
    const inds = document.getElementById('indicadores');
    inds.classList.remove('shake');
    void inds.offsetWidth;
    inds.classList.add('shake');
    seleccion.length = 0;
    setTimeout(() => {
        actualizarIndicadores();
        inds.classList.remove('shake');
    }, 500);
}
