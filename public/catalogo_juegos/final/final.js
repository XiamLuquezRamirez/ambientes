const pantalla = document.getElementById("victoria");
const confeti = document.getElementById("confeti");

let confetiTimer = null;

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
        // Evitar acumulación excesiva
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

function iniciarVictoria() {
    if (!pantalla) return;
    detenerConfetiContinuo();
    pantalla.classList.remove(
        "victoria-abierta",
        "mostrar-personajes",
        "mostrar-excelente",
        "mostrar-trofeo",
        "mostrar-destellos",
        "mostrar-texto"
    );

    void pantalla.offsetWidth;
    iniciarConfetiContinuo();

    setTimeout(function () {
        pantalla.classList.add("victoria-abierta");
    }, 300);

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
        $("#final-acciones").addClass("visible");
    }, 3700);
}

window.iniciarVictoria = iniciarVictoria;
window.detenerConfetiContinuo = detenerConfetiContinuo;

if (document.body && document.body.getAttribute("data-final-demo") === "1") {
    setTimeout(function () {
        iniciarVictoria();
    }, 800);
}
