window.INTRO_CONFIG = {
    // Aula GLB — tunear aquí sin tocar three-scene.js
    aula: {
        // Panel en pantalla + log en consola para ajustar cámara/posición/rotación.
        // false en producción (los niños no deben verlo).
        controlesManuales: false,

        rotacionX: 0,
        rotacionY: 0,
        rotacionZ: 0,
        posicion: { x: 0.4, y: 0, z: 0 },
        zoom: 1.45,
        camaraPosicion: { x: 0, y: 0.6, z: -5.3 },
        lookPosicion: { x: 0, y: 0, z: 0 },

        // Autofit: null = escala automática al anchoObjetivo. Número = escala fija.
        escala: null,
        anchoObjetivo: 24,
        pisoY: -1,


        // El GLB ya trae luces (KHR_lights_punctual) con intensidades enormes de Blender.
        // escala: multiplica esas luces. Si sale blanco, bajá (0.0002–0.001).
        lucesModelo: {
            escala: 0.00155
        },

        // Relleno de escena (bajo: la luz fuerte viene del modelo).
        iluminacion: {
            exposicion: 0.9,
            ambiente: { color: "#ffffff", intensidad: 0.18 },
            hemisferio: {
                cielo: "#fff6e8",
                suelo: "#dfe6d8",
                intensidad: 0.35
            },
            key: {
                color: "#fff2d8",
                intensidad: 0.25,
                posicion: { x: 4, y: 9, z: 7 }
            },
            fill: {
                color: "#dfeaff",
                intensidad: 0.2,
                posicion: { x: -6, y: 4, z: 5 }
            }
        },

        // Vacío: las luces vienen del GLB. No hace falta bombillos manuales.
        bombillos: []
    },

    // Píxeles hacia abajo. Mayor baja la nube de ese personaje. 0 la deja donde está.
    nubeBajar: {
        zeus: 15,
        zoe: 15
    },

    // Nombres de los tracks NLA del GLB nuevo. Cambia el string si quieres otro gesto.
    clips: {
        caminar: ["Caminar"],
        quieto: ["Quieto"],
        hablar: ["Hablar"],
        saludar: ["Saludar"]
    },

    // Zeus/Zoe: inicio en pasillo lateral → fin en el centro del aula.
    personajes: [
        {
            id: "zeus",
            modelo: "models/nino.glb",
            // 1 = el GLB tal cual. Mayor crece, menor encoge.
            escala: 2.15,
            // Altura (Y): subí/bajá a mano si flota o se hunde en el piso.
            posicionY: -0.9,
            // Profundidad (Z): se suma a inicioZ y finZ. +z acerca a la cámara.
            posicionZ: -1.8,
            inicioX: -11.5,
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
            escala: 2.15,
            // Altura (Y): subí/bajá a mano si flota o se hunde en el piso.
            posicionY: -0.9,
            // Profundidad (Z): se suma a inicioZ y finZ. +z acerca a la cámara.
            posicionZ: -2.2,
            inicioX: 11.5,
            inicioZ: 1.4,
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
