const pantalla = document.getElementById("victoria");
const confeti = document.getElementById("confeti");
const cajaFinal = document.getElementById("final");

const DURACION_CIERRE_CORTINAS_MS = 1500;

let confetiTimer = null;
let secuenciaTimer = null;

function usaFinal3d() {
    return !!(window.Final3d && typeof window.Final3d.ensure === "function");
}

function coloresConfeti() {
    return [
        "#F44336",
        "#FFC107",
        "#4CAF50",
        "#2196F3",
        "#E91E63",
        "#9C27B0",
        "#FF9800",
        "#00BCD4"
    ];
}

function crearPiezaConfeti() {
    if (!confeti) return;
    const colores = coloresConfeti();
    const pieza = document.createElement("span");
    pieza.style.left = Math.random() * 100 + "%";
    pieza.style.background = colores[Math.floor(Math.random() * colores.length)];
    const dur = 3 + Math.random() * 4;
    pieza.style.animationDuration = dur + "s";
    pieza.style.animationIterationCount = "1";
    pieza.style.animationDelay = "0s";
    pieza.style.transform = "rotate(" + Math.random() * 360 + "deg)";
    confeti.appendChild(pieza);
    setTimeout(function () {
        if (pieza.parentNode) pieza.parentNode.removeChild(pieza);
    }, dur * 1000 + 120);
}

function crearConfeti() {
    if (!confeti) return;
    confeti.innerHTML = "";
    for (let i = 0; i < 80; i++) {
        const colores = coloresConfeti();
        const pieza = document.createElement("span");
        pieza.style.left = Math.random() * 100 + "%";
        pieza.style.background = colores[Math.floor(Math.random() * colores.length)];
        pieza.style.animationDuration = 3 + Math.random() * 4 + "s";
        pieza.style.animationDelay = Math.random() * 2 + "s";
        pieza.style.transform = "rotate(" + Math.random() * 360 + "deg)";
        confeti.appendChild(pieza);
    }
}

function iniciarConfetiContinuo() {
    detenerConfetiContinuo();
    crearConfeti();
    confetiTimer = setInterval(function () {
        for (let i = 0; i < 6; i++) crearPiezaConfeti();
        if (confeti && confeti.childNodes.length > 220) {
            while (confeti.childNodes.length > 160) {
                confeti.removeChild(confeti.firstChild);
            }
        }
    }, 450);
}

function detenerConfetiContinuo() {
    if (confetiTimer) {
        clearInterval(confetiTimer);
        confetiTimer = null;
    }
}

function ocultarAccionesFinal() {
    const acciones = document.getElementById("final-acciones");
    if (acciones) acciones.classList.remove("visible");
}

function mostrarAccionesFinal() {
    const acciones = document.getElementById("final-acciones");
    if (acciones) acciones.classList.add("visible");
}

function limpiarClasesVictoria() {
    if (!pantalla) return;
    pantalla.classList.remove(
        "victoria-abierta",
        "victoria-fuera",
        "victoria-cerrando",
        "victoria-sin-transicion",
        "mostrar-personajes",
        "mostrar-excelente",
        "mostrar-trofeo",
        "mostrar-destellos",
        "mostrar-texto"
    );
    if (cajaFinal) cajaFinal.classList.remove("final-cerrando");
}

function revelarTrasCierre() {
    if (cajaFinal) cajaFinal.classList.remove("final-cerrando");
    const principal = document.getElementById("principal");
    if (principal) principal.style.display = "none";
    if (pantalla) {
        pantalla.classList.remove("victoria-cerrando", "victoria-fuera");
        void pantalla.offsetWidth;
    }
    iniciarVictoria();
}

/**
 * Cierra las cortinas sobre el juego y, al terminar, abre la victoria.
 * El contenedor #final debe estar visible antes de llamar esto.
 */
function iniciarSecuenciaVictoria() {
    if (!pantalla) return;
    if (secuenciaTimer) {
        clearTimeout(secuenciaTimer);
        secuenciaTimer = null;
    }

    detenerConfetiContinuo();
    if (confeti) confeti.innerHTML = "";
    ocultarAccionesFinal();
    limpiarClasesVictoria();

    if (cajaFinal) cajaFinal.classList.add("final-cerrando");

    if (usaFinal3d()) {
        document.body.classList.add("final-3d-activa");
        if (typeof window.__intro3dDispose === "function") {
            try { window.__intro3dDispose(); } catch (e) { /* noop */ }
        }
        // Precarga personajes 3D; cortinas y fondo siguen siendo 2D.
        window.Final3d.ensure().catch(function (e) {
            console.warn("[final] Final3d falló, personajes 2D", e);
            document.body.classList.remove("final-3d-activa");
        });
        iniciarSecuenciaVictoria2d();
        return;
    }

    iniciarSecuenciaVictoria2d();
}

function iniciarSecuenciaVictoria2d() {
    if (!pantalla) return;

    if (cajaFinal) cajaFinal.classList.add("final-cerrando");
    pantalla.classList.add("victoria-cerrando", "victoria-sin-transicion", "victoria-fuera");
    void pantalla.offsetWidth;

    requestAnimationFrame(function () {
        pantalla.classList.remove("victoria-sin-transicion");
        void pantalla.offsetWidth;
        pantalla.classList.remove("victoria-fuera");
    });

    secuenciaTimer = setTimeout(function () {
        secuenciaTimer = null;
        revelarTrasCierre();
    }, DURACION_CIERRE_CORTINAS_MS);
}

/** Abre cortinas y corre la animación de victoria (asume cortinas cerradas). */
function iniciarVictoria() {
    if (!pantalla) return;
    pantalla.classList.remove("victoria-cerrando", "victoria-sin-transicion", "victoria-fuera");
    if (cajaFinal) cajaFinal.classList.remove("final-cerrando");

    iniciarConfetiContinuo();

    if (usaFinal3d()) {
        const lanzarPersonajes3d = function () {
            window.Final3d.abrirVictoria().catch(function () { /* noop */ });
        };
        if (window.Final3d.listo()) {
            lanzarPersonajes3d();
        } else {
            window.Final3d.ensure().then(lanzarPersonajes3d).catch(function (e) {
                console.warn("[final] Final3d no listo", e);
                document.body.classList.remove("final-3d-activa");
                pantalla.classList.add("mostrar-personajes");
            });
        }

        setTimeout(function () {
            pantalla.classList.add("victoria-abierta");
        }, 60);

        setTimeout(function () {
            pantalla.classList.add("mostrar-excelente");
            pantalla.classList.add("mostrar-destellos");
        }, 1500);

        setTimeout(function () {
            pantalla.classList.add("mostrar-trofeo");
        }, 3000);

        setTimeout(function () {
            pantalla.classList.add("mostrar-texto");
        }, 3400);

        setTimeout(function () {
            mostrarAccionesFinal();
        }, 3700);
        return;
    }

    setTimeout(function () {
        pantalla.classList.add("victoria-abierta");
    }, 60);

    setTimeout(function () {
        pantalla.classList.add("mostrar-personajes");
        pantalla.classList.add("mostrar-excelente");
        pantalla.classList.add("mostrar-destellos");
    }, 1500);

    setTimeout(function () {
        pantalla.classList.add("mostrar-trofeo");
    }, 3000);

    setTimeout(function () {
        pantalla.classList.add("mostrar-texto");
    }, 3400);

    setTimeout(function () {
        mostrarAccionesFinal();
    }, 3700);
}

window.iniciarSecuenciaVictoria = iniciarSecuenciaVictoria;
window.iniciarVictoria = iniciarVictoria;
window.detenerConfetiContinuo = detenerConfetiContinuo;

if (document.body && document.body.getAttribute("data-final-demo") === "1") {
    setTimeout(function () {
        if (cajaFinal) {
            cajaFinal.hidden = false;
            cajaFinal.style.display = "block";
        }
        iniciarSecuenciaVictoria();
    }, 400);
}
