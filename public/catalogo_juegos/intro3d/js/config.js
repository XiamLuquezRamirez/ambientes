window.INTRO_CONFIG = {
    // Píxeles hacia abajo. Mayor baja la nube de ese personaje. 0 la deja donde está.
    nubeBajar: {
        zeus: 55,
        zoe: 55
    },

    // Nombres de los tracks NLA del GLB nuevo. Cambia el string si quieres otro gesto.
    clips: {
        caminar: ["Caminar"],
        quieto: ["Quieto"],
        hablar: ["Hablar"],
        saludar: ["Saludar"]
    },

    personajes: [
        {
            id: "zeus",
            modelo: "models/nino.glb",
            // 1 = el GLB tal cual. Mayor crece, menor encoge.
            escala: 2.65,
            posicionY: -1,
            inicioX: -10.2,
            inicioZ: 0.15,
            finX: -1.35,
            finZ: 0.15,
            velocidad: 2.15,
            retraso: 0.15,
            mirarAlHablar: 0.42,
            mirarAlEscuchar: 1.12
        },
        {
            id: "zoe",
            modelo: "models/nina.glb",
            escala: 2.65,
            posicionY: -1,
            inicioX: 10.2,
            inicioZ: 0.4,
            finX: 1.4,
            finZ: 0.4,
            velocidad: 2.05,
            retraso: 0.28,
            mirarAlHablar: -0.42,
            mirarAlEscuchar: -1.12
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
