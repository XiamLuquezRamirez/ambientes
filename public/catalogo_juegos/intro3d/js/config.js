window.INTRO_CONFIG = {
    personajes: [
        {
            id: "zeus",
            modelo: "../../intro3d/models/nino.glb",
            escala: 0.85,
            posicionY: -1,
            inicioX: -10.2,
            inicioZ: 0.15,
            finX: -1.35,
            finZ: 0.15,
            velocidad: 2.15,
            retraso: 0.15,
            mirarAlHablar: 0.42,
            mirarAlEscuchar: 1.12,
            gestos: ["Wave", "Yes"],
            caminar: ["Walk", "Walking", "Run"],
            idle: ["Idle", "Standing"]
        },
        {
            id: "zoe",
            modelo: "../../intro3d/models/nina.glb",
            escala: 0.85,
            posicionY: -1,
            inicioX: 10.2,
            inicioZ: 0.4,
            finX: 1.4,
            finZ: 0.4,
            velocidad: 2.05,
            retraso: 0.28,
            mirarAlHablar: -0.42,
            mirarAlEscuchar: -0.42,
            gestos: ["Wave", "Yes"],
            caminar: ["Walk", "Walking", "Run"],
            idle: ["Idle", "Standing"]
        }
    ],

    dialogo: {
        mostrar: true,
        velocidadTexto: 28,
        pausaAlTerminar: 900,
        colores: {
            zeus: "#f0c14d",
            zoe: "#8ec5ff"
        }
    },

    victoria: {
        titulo: "¡Listo!",
        subtitulo: "Toca el botón para empezar el juego"
    }
};
