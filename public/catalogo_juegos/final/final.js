const pantalla = document.getElementById("victoria");
const confeti = document.getElementById("confeti");

function crearConfeti() {
    confeti.innerHTML = "";
    const colores = [
        "#F44336",
        "#FFC107",
        "#4CAF50",
        "#2196F3",
        "#E91E63",
        "#9C27B0",
        "#FF9800",
        "#00BCD4"
    ];

    for (let i = 0; i < 100; i++) {
        const pieza = document.createElement("span");
        pieza.style.left = Math.random() * 100 + "%";
        pieza.style.background =  colores[Math.floor(Math.random() * colores.length)];
        pieza.style.animationDuration =  (3 + Math.random() * 4) + "s";
        pieza.style.animationDelay =  (Math.random() * 2) + "s";
        pieza.style.transform = `rotate(${Math.random() * 360}deg)`;
        confeti.appendChild(pieza);
    }
}

function iniciarVictoria() {
    pantalla.classList.remove(
        "victoria-abierta",
        "mostrar-personajes",
        "mostrar-trofeo",
        "mostrar-destellos"
    );

    void pantalla.offsetWidth;
    crearConfeti();
    setTimeout(() => {

        pantalla.classList.add(
            "victoria-abierta"
        );

    }, 300);

    setTimeout(() => {
        pantalla.classList.add(
            "mostrar-personajes"
        );
    }, 1500);

    setTimeout(() => {
        pantalla.classList.add(
            "mostrar-excelente"
        );
    }, 1500);

    setTimeout(() => {

        pantalla.classList.add(
            "mostrar-trofeo"
        );

    }, 3000);

    setTimeout(() => {

        pantalla.classList.add(
            "mostrar-destellos"
        );

    }, 1500);
}

setTimeout(() => {
    iniciarVictoria();
}, 2000);