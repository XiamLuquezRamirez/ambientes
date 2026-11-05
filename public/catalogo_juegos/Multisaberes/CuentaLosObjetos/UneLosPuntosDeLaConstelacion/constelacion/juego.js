/**
 * Motor Phaser del juego: escenario, estrellas, trazado, mapa de mundos.
 *
 * Expone una API pequeña a script.js (montar / jugarNivel / destruir) y guarda
 * dentro todo lo que es Phaser, para que la orquestación del shell no sepa de
 * sprites ni de tweens.
 */
(function (global) {
    "use strict";

    var T = global.ConstelacionTexturas;
    var V = global.ConstelacionValidador;
    var G = global.ConstelacionGenerador;
    var C = global.ConstelacionConexiones;
    var N = global.ConstelacionNiveles;
    var NAVE = global.ConstelacionNave;

    /**
     * Resolución base del escenario. Se decide una sola vez al montar, según
     * la forma de la pantalla: con FIT, un lienzo 16:9 metido en un móvil
     * vertical se reduce a una franja y las estrellas quedan por debajo del
     * tamaño mínimo para un dedo infantil. Un lienzo vertical en esa pantalla
     * aprovecha el alto y las deja grandes (spec §11).
     */
    var ANCHO = 1280;
    var ALTO = 720;

    /* Zona jugable y zonas de UI: se recalculan junto con la resolución. El
       generador las recibe, así que una estrella nunca cae bajo un control. */
    var AREA = null;
    var ZONAS_UI = null;

    function medirEscenario() {
        var w = global.innerWidth || 1280;
        var h = global.innerHeight || 720;
        var proporcion = w / h;

        if (proporcion < 0.85) {
            // Móvil o tablet en vertical: lienzo alto.
            ANCHO = 820;
            ALTO = 1280;
        } else if (proporcion < 1.25) {
            // Casi cuadrado (tablet vertical ancha).
            ANCHO = 1024;
            ALTO = 1000;
        } else {
            ANCHO = 1280;
            ALTO = 720;
        }
        recalcularZonas();
    }

    function recalcularZonas() {
        /* En vertical el HUD ocupa proporcionalmente más alto y los personajes
           se comen la franja de abajo: por eso los márgenes no son fijos.
           Medidos sobre el lienzo de 820x1280, el margen superior cubre la
           barra compacta y el inferior, las burbujas de Zeus y Zoe. */
        var margenSup = ALTO > ANCHO ? 240 : 148;
        var margenInf = ALTO > ANCHO ? 300 : 56;
        AREA = {
            x: 46,
            y: margenSup,
            ancho: ANCHO - 92,
            alto: ALTO - margenSup - margenInf
        };
        /* Zeus y Zoe se dibujan en HTML sobre el canvas, en las esquinas
           inferiores, y sus bocadillos suben bastante: sin vetar esas esquinas
           una estrella puede quedar detrás del diálogo y el niño no la ve. */
        var anchoPj = ALTO > ANCHO ? 300 : 360;
        var altoPj = ALTO > ANCHO ? 300 : 290;
        ZONAS_UI = [
            { x: 0, y: 0, ancho: ANCHO, alto: margenSup - 10 },
            { x: 0, y: ALTO - altoPj, ancho: anchoPj, alto: altoPj },
            { x: ANCHO - anchoPj, y: ALTO - altoPj, ancho: anchoPj, alto: altoPj }
        ];
    }

    recalcularZonas();

    /** Igual que en nave.js: el reloj de escena no es fiable con la intro 3D. */
    function tras(ms, fn) { return global.setTimeout(fn, ms); }

    /**
     * Vacía la cola de objetos interactivos de Phaser.
     *
     * Phaser encola lo que se hace interactivo y solo lo pasa a su lista de
     * detección en el siguiente paso del bucle. Al rehacer la escena (cambio
     * de nivel, mapa) los objetos nuevos nacen después de ese paso: quedan en
     * la cola mientras la lista conserva los anteriores, ya destruidos, y los
     * toques dejan de encontrar nada.
     */
    function sincronizarDeteccion() {
        if (!escena || !escena.input) return;
        if (typeof escena.input.preUpdate !== "function") return;
        try {
            escena.input.preUpdate();
        } catch (e) {
            /* Versión sin llamada directa: el bucle lo hará en su próximo
               paso. No hay nada que romper. */
        }
    }

    var escena = null;
    var juego = null;
    var cbs = {};
    var temporizadores = [];

    // --- estado de la partida en curso ---
    var nivelActual = null;
    var estado = null;
    var vistaEstrellas = [];   // {dato, sprite, texto, anillo}
    var lineas = null;         // Graphics de los tramos confirmados
    var trazo = null;          // Graphics del trazo que sigue el dedo
    var arrastrando = false;
    var desde = null;
    var nave = null;
    var fondoPiezas = [];
    var inicioMs = 0;
    var bloqueado = false;

    function limpiarTemporizadores() {
        temporizadores.forEach(function (t) { global.clearTimeout(t); });
        temporizadores = [];
    }

    function avisar(nombre, datos) {
        if (typeof cbs[nombre] === "function") cbs[nombre](datos);
    }

    // ------------------------------------------------------------------
    // Escenario
    // ------------------------------------------------------------------

    function pintarFondo(nivel) {
        fondoPiezas.forEach(function (p) { if (p && p.scene) p.destroy(); });
        fondoPiezas = [];

        /* Una textura por nivel, en vez de regenerar la misma clave.
           `generateTexture` sobre una clave existente obliga a destruirla, y
           Phaser libera su textura de GPU aunque queden sprites usándola
           (partículas, planetas del mapa, la nave): esos quedan con
           glTexture null y el siguiente render lanza
           "Cannot read properties of null (reading 'glTexture')", que mata el
           bucle y congela el juego. Con claves distintas nada se destruye en
           caliente. */
        var sufijo = "-n" + nivel.id;
        var kCielo = "cielo" + sufijo;
        var kNebA = "neb-a" + sufijo;
        var kNebB = "neb-b" + sufijo;

        if (!escena.textures.exists(kCielo)) {
            T.cielo(escena, kCielo, nivel.cielo.alto, nivel.cielo.bajo, ANCHO, ALTO);
        }
        if (!escena.textures.exists(kNebA)) T.nebulosa(escena, kNebA, nivel.nebulosa.a);
        if (!escena.textures.exists(kNebB)) T.nebulosa(escena, kNebB, nivel.nebulosa.b);
        if (!escena.textures.exists("polvo")) T.polvo(escena, "polvo");

        fondoPiezas.push(escena.add.image(ANCHO / 2, ALTO / 2, kCielo).setDepth(0));

        /* Con FIT quedan franjas fuera del lienzo: pintarlas del color bajo del
           cielo evita el marco negro y hace que el escenario parezca ocupar
           toda la pantalla. */
        if (escena.game && escena.game.canvas) {
            escena.game.canvas.style.background = nivel.cielo.bajo;
        }
        document.body.style.background = nivel.cielo.bajo;

        var na = escena.add.image(250, 210, kNebA).setDepth(1).setScale(1.5).setAlpha(0.85);
        var nb = escena.add.image(ANCHO - 210, ALTO - 170, kNebB).setDepth(1).setScale(1.3).setAlpha(0.75);
        fondoPiezas.push(na, nb);
        /* Deriva lenta: da sensación de espacio vivo sin distraer del trazado. */
        escena.tweens.add({ targets: na, x: 330, y: 260, duration: 14000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        escena.tweens.add({ targets: nb, x: ANCHO - 290, duration: 17000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

        // Polvo de estrellas de fondo, con titileo
        var i, e, x, y;
        for (i = 0; i < 150; i++) {
            x = Math.random() * ANCHO;
            y = Math.random() * ALTO;
            e = escena.add.image(x, y, "polvo")
                .setDepth(2)
                .setScale(0.5 + Math.random() * 1.2)
                .setAlpha(0.25 + Math.random() * 0.65);
            fondoPiezas.push(e);
            escena.tweens.add({
                targets: e,
                alpha: 0.12,
                duration: 900 + Math.random() * 2400,
                yoyo: true,
                repeat: -1,
                delay: Math.random() * 1800,
                ease: "Sine.easeInOut"
            });
        }
    }

    // ------------------------------------------------------------------
    // Estrellas y trazado
    // ------------------------------------------------------------------

    function limpiarNivel() {
        limpiarTemporizadores();
        if (nave) { nave.destruir(); nave = null; }
        /* Barrido por textura y no por el array: si un nivel se reinicia a
           media animación, los sprites viejos quedarían huérfanos robando
           los toques del niño. */
        if (escena) {
            ["estrella-off", "estrella-on", "anillo", "nave-cuerpo", "nave-panel", "nave-silueta"]
                .forEach(function (clave) {
                    escena.children.list.filter(function (o) {
                        return o.texture && o.texture.key === clave;
                    }).forEach(function (o) { o.destroy(); });
                });
            escena.children.list.filter(function (o) {
                return o.getData && o.getData("esNumeroEstrella");
            }).forEach(function (o) { o.destroy(); });
        }
        vistaEstrellas = [];
        if (lineas) { lineas.clear(); }
        if (trazo) { trazo.clear(); }
        arrastrando = false;
        desde = null;
        bloqueado = false;
    }

    function vistaDe(numero) {
        var i;
        for (i = 0; i < vistaEstrellas.length; i++) {
            if (vistaEstrellas[i].dato.n === numero) return vistaEstrellas[i];
        }
        return null;
    }

    /** Resalta la estrella que toca ahora con el anillo del radar. */
    function marcarObjetivo() {
        var toca = C.esperado(estado);
        vistaEstrellas.forEach(function (v) {
            var activa = v.dato.n === toca && !C.completo(estado);
            if (v.anillo) {
                v.anillo.setVisible(activa);
                if (activa && !v.anillo.getData("late")) {
                    v.anillo.setData("late", true);
                    escena.tweens.add({
                        targets: v.anillo,
                        scale: 1.22,
                        alpha: 0.35,
                        duration: 780,
                        yoyo: true,
                        repeat: -1,
                        ease: "Sine.easeInOut"
                    });
                }
            }
            /* El número de la siguiente estrella crece un poco: es la pista
               visual más fuerte para quien aún no lee bien los números. */
            if (v.texto) v.texto.setScale(activa ? 1.25 : 1);
        });
    }

    function redibujarLineas() {
        lineas.clear();
        var tramos = C.tramosHechos(estado);
        tramos.forEach(function (par) {
            if (!par[0] || !par[1]) return;
            // Trazo ancho translúcido debajo = resplandor de neón
            lineas.lineStyle(16, 0x22d3ee, 0.2);
            lineas.lineBetween(par[0].x, par[0].y, par[1].x, par[1].y);
            lineas.lineStyle(7, 0x38bdf8, 0.95);
            lineas.lineBetween(par[0].x, par[0].y, par[1].x, par[1].y);
            lineas.lineStyle(2.5, 0xe0f2fe, 1);
            lineas.lineBetween(par[0].x, par[0].y, par[1].x, par[1].y);
        });
    }

    function encenderEstrella(v) {
        v.sprite.setTexture("estrella-on");
        v.texto.setColor("#0c4a6e");
        escena.tweens.add({
            targets: v.sprite,
            scale: 1.35,
            duration: 180,
            yoyo: true,
            ease: "Quad.easeOut"
        });
        var chispas = escena.add.particles(v.dato.x, v.dato.y, "chispa", {
            speed: { min: 60, max: 210 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.9, end: 0 },
            lifespan: 520,
            quantity: 14,
            tint: [0xfef9c3, 0x7dd3fc, 0xffffff],
            blendMode: "ADD",
            emitting: false
        }).setDepth(12);
        chispas.explode(14);
        temporizadores.push(tras(900, function () { if (chispas.scene) chispas.destroy(); }));
    }

    /** Trazo fallido: se pone rojo, rebota y desaparece (spec §5). */
    function rechazarTrazo(xa, ya, xb, yb, numeroEsperado) {
        trazo.clear();
        var falso = escena.add.graphics().setDepth(11);
        falso.lineStyle(14, 0xef4444, 0.28);
        falso.lineBetween(xa, ya, xb, yb);
        falso.lineStyle(6, 0xf87171, 0.95);
        falso.lineBetween(xa, ya, xb, yb);
        escena.tweens.add({
            targets: falso,
            alpha: 0,
            duration: 520,
            ease: "Cubic.easeIn",
            onComplete: function () { if (falso.scene) falso.destroy(); }
        });
        /* Red de seguridad: si el nivel se reinicia o la escena se pausa a
           media animación, el onComplete puede no llegar y el trazo rojo se
           quedaría pegado sobre la constelación. */
        temporizadores.push(tras(900, function () {
            if (falso && falso.scene) falso.destroy();
        }));

        // Rebote elástico de la estrella correcta, para guiar la mirada
        var v = vistaDe(numeroEsperado);
        if (v) {
            escena.tweens.add({
                targets: [v.sprite, v.texto],
                scale: 1.45,
                duration: 230,
                yoyo: true,
                repeat: 1,
                ease: "Elastic.easeOut"
            });
        }
        // Aviso en el punto del error
        var cruz = escena.add.text(xb, yb, "✕", {
            fontFamily: "Arial, sans-serif", fontSize: "54px",
            fontStyle: "bold", color: "#f87171"
        }).setOrigin(0.5).setDepth(14);
        escena.tweens.add({
            targets: cruz,
            alpha: 0,
            y: yb - 46,
            duration: 720,
            onComplete: function () { if (cruz.scene) cruz.destroy(); }
        });
    }

    function crearEstrellas(nivel) {
        T.estrella(escena, "estrella-off", false);
        T.estrella(escena, "estrella-on", true);
        T.anillo(escena, "anillo");
        T.chispa(escena, "chispa");

        var gen = G.generar(nivel.estrellas, AREA, nivel.separacion, Math.random, ZONAS_UI);

        /* Comprobación en caliente: si por lo que sea la distribución no cumple
           las reglas, se vuelve a generar antes de que el niño la vea. */
        var revision = V.revisar(gen.estrellas, AREA, V.RADIO_TACTIL * 2, ZONAS_UI);
        if (!revision.ok) {
            gen = G.generar(nivel.estrellas, AREA, V.RADIO_TACTIL * 2.1, Math.random, ZONAS_UI);
        }

        estado = C.crearEstado(gen.estrellas);

        gen.estrellas.forEach(function (dato, i) {
            var sprite = escena.add.image(dato.x, dato.y, "estrella-off").setDepth(10);
            var aro = escena.add.image(dato.x, dato.y, "anillo").setDepth(9).setVisible(false);
            var texto = escena.add.text(dato.x, dato.y, String(dato.n), {
                fontFamily: "Arial, sans-serif",
                fontSize: "34px",
                fontStyle: "bold",
                color: "#f8fafc"
            }).setOrigin(0.5).setDepth(13);
            texto.setData("esNumeroEstrella", true);
            texto.setStroke("#0f172a", 5);

            /* Sin setInteractive a propósito: el toque se resuelve por
               distancia en iniciarTrazo(), con un radio generoso (RADIO_AGARRE)
               para que el dedo no tenga que apuntar fino. Registrar cada
               estrella en el sistema de detección de Phaser añadía un punto de
               fallo —su lista se quedaba con los sprites del nivel anterior y
               el juego dejaba de responder— sin aportar nada aquí. */
            sprite.setData("numero", dato.n);

            // Flotación suave, con desfase para que no respiren todas a la vez
            escena.tweens.add({
                targets: [sprite, texto, aro],
                y: dato.y - 7,
                duration: 1700 + i * 90,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });

            vistaEstrellas.push({ dato: dato, sprite: sprite, texto: texto, anillo: aro });
        });

        redibujarLineas();
        marcarObjetivo();

        /* Deja la lista de detección de Phaser al día tras destruir los
           sprites del nivel anterior. Las estrellas ya no dependen de ella
           (se resuelven por distancia), pero los planetas del mapa sí, y una
           lista con objetos muertos es una fuente de fallos silenciosos. */
        sincronizarDeteccion();

        return gen;
    }

    // ------------------------------------------------------------------
    // Interacción: puntero continuo (ratón y táctil)
    // ------------------------------------------------------------------

    function instalarPuntero() {
        /**
         * Inicio del trazo.
         *
         * Va en `pointerdown` global y resuelve la estrella por cercanía, no
         * en `gameobjectdown`: ese evento depende de la lista de detección de
         * Phaser, que al cambiar de nivel puede quedarse con los sprites del
         * nivel anterior y dejar el mundo entero sordo al toque. Mirando la
         * distancia al puntero, el juego responde siempre, haya o no acertado
         * Phaser a refrescar su lista.
         */
        function iniciarTrazo(puntero) {
            if (bloqueado || !estado) return;
            var sobre = C.estrellaEn(estado, puntero.worldX, puntero.worldY);
            if (!sobre) return;
            var numero = sobre.n;

            if (!C.puedeIniciar(estado, numero)) {
                /* Tocar una estrella que no toca todavía no es un error que
                   cuente: solo se recuerda cuál es la siguiente. */
                var v = vistaDe(C.esperado(estado));
                if (v) {
                    escena.tweens.add({
                        targets: [v.sprite, v.texto],
                        scale: 1.4, duration: 200, yoyo: true, repeat: 1, ease: "Elastic.easeOut"
                    });
                }
                avisar("fueraDeTurno", { esperado: C.esperado(estado) });
                return;
            }
            arrastrando = true;
            desde = C.estrellaDe(estado, numero);

            /* La estrella 1 se confirma al tocarla: es el arranque de la
               cadena y no tiene tramo anterior que dibujar. */
            if (estado.hechas === 0) {
                var res = C.soltarEn(estado, 1);
                if (res.estado !== "nada") {
                    var v1 = vistaDe(1);
                    if (v1) encenderEstrella(v1);
                    avisar("conexion", { numero: 1, hechas: estado.hechas, total: estado.estrellas.length });
                    marcarObjetivo();
                }
            }
        }

        escena.input.on("pointerdown", iniciarTrazo);

        escena.input.on("pointermove", function (puntero) {
            if (!arrastrando || !desde || bloqueado) return;
            trazo.clear();
            trazo.lineStyle(13, 0x7dd3fc, 0.3);
            trazo.lineBetween(desde.x, desde.y, puntero.worldX, puntero.worldY);
            trazo.lineStyle(5, 0xbae6fd, 0.9);
            trazo.lineBetween(desde.x, desde.y, puntero.worldX, puntero.worldY);
        });

        escena.input.on("pointerup", function (puntero) {
            if (!arrastrando || bloqueado) { trazo.clear(); return; }
            trazo.clear();

            /* `arrastrando` se mantiene encendido hasta terminar el nivel: una
               vez tocada la estrella 1 la cadena queda viva, de modo que el
               niño puede levantar el dedo entre estrella y estrella y seguir
               desde la última confirmada. Solo se apaga al completar. */

            var sobre = C.estrellaEn(estado, puntero.worldX, puntero.worldY);
            // Soltar en el vacío: no es error, se sigue desde donde estaba.
            if (!sobre) return;

            /* Soltar encima de la estrella de la que se parte es el final
               natural de un toque simple (tocar sin arrastrar, que es como
               juegan muchos niños). No es un intento fallido: se ignora. */
            if (desde && sobre.n === desde.n) return;

            var toca = C.esperado(estado);
            if (sobre.n !== toca) {
                estado.errores += 1;
                estado.intentos += 1;
                if (desde) rechazarTrazo(desde.x, desde.y, sobre.x, sobre.y, toca);
                avisar("error", { esperado: toca, recibido: sobre.n, errores: estado.errores });
                // El avance correcto se conserva (spec §5): no se toca `desde`.
                return;
            }

            var res = C.soltarEn(estado, sobre.n);
            var v = vistaDe(sobre.n);
            if (v) encenderEstrella(v);
            redibujarLineas();
            marcarObjetivo();
            avisar("conexion", {
                numero: sobre.n,
                hechas: estado.hechas,
                total: estado.estrellas.length
            });

            if (res.estado === "completo") {
                desde = null;
                arrastrando = false;
                bloqueado = true;
                celebrar();
            } else {
                // La cadena avanza: el próximo tramo nace de la recién unida.
                desde = sobre;
            }
        });
    }

    // ------------------------------------------------------------------
    // Victoria del nivel
    // ------------------------------------------------------------------

    function centroDe(estrellas) {
        var cx = 0, cy = 0, i;
        for (i = 0; i < estrellas.length; i++) { cx += estrellas[i].x; cy += estrellas[i].y; }
        return { x: cx / estrellas.length, y: cy / estrellas.length };
    }

    function celebrar() {
        var tiempoSeg = Math.round((Date.now() - inicioMs) / 1000);

        // 1. Iluminar toda la constelación
        vistaEstrellas.forEach(function (v, i) {
            temporizadores.push(tras(i * 60, function () {
                if (!v.sprite.scene) return;
                v.sprite.setTexture("estrella-on");
                escena.tweens.add({
                    targets: v.sprite, scale: 1.3, duration: 200, yoyo: true, ease: "Quad.easeOut"
                });
            }));
        });
        lineas.setAlpha(1);

        var c = centroDe(estado.estrellas);
        nave = NAVE.crear(escena, c.x, Math.min(c.y, ALTO - 220));

        avisar("completo", {
            nivel: nivelActual.id,
            errores: estado.errores,
            intentos: estado.intentos,
            tiempoSeg: tiempoSeg
        });

        temporizadores.push(tras(420, function () {
            if (!nave) return;
            nave.secuenciaVictoria(function () {
                avisar("naveDespego", { nivel: nivelActual.id });
            }, function (paso) {
                avisar("pasoNave", { paso: paso });
            });
        }));
    }

    // ------------------------------------------------------------------
    // Mapa de mundos (spec §8)
    // ------------------------------------------------------------------

    var mapaPiezas = [];

    function limpiarMapa() {
        mapaPiezas.forEach(function (p) { if (p && p.scene) p.destroy(); });
        mapaPiezas = [];
    }

    /**
     * Mapa espacial a pantalla completa, con ruta, planetas y la nave del
     * jugador. `onElegir(nivelId)` se dispara al tocar un mundo accesible.
     */
    /**
     * @param {object} progreso estado por nivel
     * @param {function} onElegir al tocar un planeta accesible
     * @param {number} [destacar] mundo recién abierto: la nave viaja hasta él
     * @param {number} [desde] mundo del que parte la nave
     */
    function mostrarMapa(progreso, onElegir, destacar, desde) {
        limpiarNivel();
        limpiarMapa();

        var niveles = N.NIVELES;
        T.candado(escena, "candado");
        T.chispa(escena, "chispa");

        var velo = escena.add.rectangle(ANCHO / 2, ALTO / 2, ANCHO, ALTO, 0x030616, 0.78).setDepth(50);
        mapaPiezas.push(velo);

        var titulo = escena.add.text(ANCHO / 2, 74, "MAPA ESTELAR", {
            fontFamily: "Arial, sans-serif", fontSize: "50px",
            fontStyle: "bold", color: "#e0f2fe"
        }).setOrigin(0.5).setDepth(53);
        titulo.setStroke("#0c4a6e", 8);
        mapaPiezas.push(titulo);

        /* Ruta en zigzag suave: los planetas no alineados se leen mejor como
           un viaje que una fila recta. En lienzo vertical la ruta baja en
           lugar de avanzar, que es lo que cabe en una pantalla alta. */
        var vertical = ALTO > ANCHO;
        var puntos = niveles.map(function (niv, i) {
            var t = i / (niveles.length - 1);
            if (vertical) {
                return {
                    x: ANCHO / 2 + (i % 2 === 0 ? -150 : 150),
                    y: 300 + t * (ALTO - 560),
                    nivel: niv
                };
            }
            return {
                x: 160 + t * (ANCHO - 320),
                y: ALTO / 2 + (i % 2 === 0 ? -72 : 86),
                nivel: niv
            };
        });

        // Ruta punteada entre planetas
        var ruta = escena.add.graphics().setDepth(51);
        mapaPiezas.push(ruta);
        var i, a, b, pasos, k, t, px, py;
        for (i = 0; i < puntos.length - 1; i++) {
            a = puntos[i];
            b = puntos[i + 1];
            var abierto = progreso.niveles[b.nivel.id] && progreso.niveles[b.nivel.id].desbloqueado;
            pasos = 18;
            for (k = 0; k < pasos; k++) {
                if (k % 2) continue;
                t = k / pasos;
                px = a.x + (b.x - a.x) * t;
                py = a.y + (b.y - a.y) * t;
                ruta.fillStyle(abierto ? 0x7dd3fc : 0x475569, abierto ? 0.9 : 0.45);
                ruta.fillCircle(px, py, 4.5);
            }
        }

        puntos.forEach(function (p) {
            var niv = p.nivel;
            var est = progreso.niveles[niv.id] || {};
            var clave = "planeta-" + niv.id;
            T.planeta(escena, clave, niv.planeta.color, 52);

            var img = escena.add.image(p.x, p.y, clave).setDepth(52);
            mapaPiezas.push(img);

            if (!est.desbloqueado) {
                img.setAlpha(0.4);
                var lock = escena.add.image(p.x, p.y, "candado").setDepth(54);
                mapaPiezas.push(lock);
            } else {
                escena.tweens.add({
                    targets: img, y: p.y - 10, duration: 2400,
                    yoyo: true, repeat: -1, ease: "Sine.easeInOut"
                });
                /* Sin onElegir el mapa es solo espectáculo (viaje automático):
                   los planetas no se marcan como pulsables para no invitar a
                   un toque que no haría nada. */
                if (typeof onElegir === "function") {
                    img.setInteractive({ useHandCursor: true });
                    img.on("pointerdown", function () { onElegir(niv.id); });
                }
            }

            if (est.completado) {
                var tick = escena.add.text(p.x + 38, p.y - 40, "★", {
                    fontFamily: "Arial, sans-serif", fontSize: "44px",
                    fontStyle: "bold", color: "#fbbf24"
                }).setOrigin(0.5).setDepth(55);
                tick.setStroke("#78350f", 6);
                mapaPiezas.push(tick);
            }

            var nombre = escena.add.text(p.x, p.y + 78, niv.planeta.nombre, {
                fontFamily: "Arial, sans-serif", fontSize: "25px",
                fontStyle: "bold", color: est.desbloqueado ? "#e0f2fe" : "#64748b"
            }).setOrigin(0.5).setDepth(53);
            nombre.setStroke("#0f172a", 5);
            mapaPiezas.push(nombre);

            var num = escena.add.text(p.x, p.y + 106, "Nivel " + niv.id, {
                fontFamily: "Arial, sans-serif", fontSize: "20px",
                color: est.desbloqueado ? "#7dd3fc" : "#475569"
            }).setOrigin(0.5).setDepth(53);
            mapaPiezas.push(num);
        });

        T.naveCuerpo(escena, "nave-cuerpo");

        function puntoDe(nivelId) {
            var hallado = null;
            puntos.forEach(function (p) { if (p.nivel.id === nivelId) hallado = p; });
            return hallado;
        }

        /* La nave parte del mundo que se acaba de completar; si no venimos de
           ninguno (primera apertura del mapa), se posa en el último accesible. */
        var origen = desde ? puntoDe(desde) : null;
        if (!origen) {
            var idx = 0;
            puntos.forEach(function (p, k) {
                if (progreso.niveles[p.nivel.id] && progreso.niveles[p.nivel.id].desbloqueado) idx = k;
            });
            origen = puntos[idx];
        }

        var naveMapa = escena.add.image(origen.x - 72, origen.y - 54, "nave-cuerpo")
            .setDepth(56).setScale(0.3).setAngle(28);
        mapaPiezas.push(naveMapa);

        var destino = destacar ? puntoDe(destacar) : null;

        if (!destino) {
            // Mapa en reposo: la nave solo flota sobre su planeta.
            escena.tweens.add({
                targets: naveMapa, y: naveMapa.y - 12, duration: 1500,
                yoyo: true, repeat: -1, ease: "Sine.easeInOut"
            });
            sincronizarDeteccion();   // los planetas deben ser pulsables ya
            return { ocultar: limpiarMapa };
        }

        /* Viaje al mundo recién abierto. La nave apunta hacia donde va y deja
           estela: es la transición entre niveles, no un adorno. */
        var estela = escena.add.particles(naveMapa.x, naveMapa.y, "chispa", {
            speedX: { min: -30, max: 30 },
            speedY: { min: -30, max: 30 },
            scale: { start: 0.55, end: 0 },
            alpha: { start: 0.75, end: 0 },
            lifespan: 700,
            frequency: 28,
            tint: [0x7dd3fc, 0xffffff, 0xfbbf24],
            blendMode: "ADD",
            emitting: true
        }).setDepth(55);
        mapaPiezas.push(estela);

        var dx = destino.x - origen.x;
        var dy = destino.y - origen.y;
        naveMapa.setAngle(Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90);

        var VIAJE_MS = 1700;
        escena.tweens.add({
            targets: [naveMapa, estela],
            x: destino.x - 72,
            y: destino.y - 54,
            duration: VIAJE_MS,
            ease: "Sine.easeInOut"
        });

        var brillo = escena.add.particles(destino.x, destino.y, "chispa", {
            speed: { min: 50, max: 190 },
            scale: { start: 0.8, end: 0 },
            lifespan: 900,
            quantity: 26,
            tint: [0xfbbf24, 0xffffff, 0x7dd3fc],
            blendMode: "ADD",
            emitting: false
        }).setDepth(57);
        mapaPiezas.push(brillo);

        /* Los pasos van por setTimeout y no por onComplete del tween: si la
           escena se pausa a medio viaje, el onComplete no llegaría y el juego
           se quedaría parado en el mapa para siempre. */
        temporizadores.push(tras(VIAJE_MS, function () {
            if (estela.scene) estela.stop();
            if (brillo.scene) brillo.explode(26);
            naveMapa.setAngle(28);
            if (naveMapa.scene) {
                escena.tweens.add({
                    targets: naveMapa, y: naveMapa.y - 12, duration: 1200,
                    yoyo: true, repeat: -1, ease: "Sine.easeInOut"
                });
            }
            avisar("naveLlego", { nivel: destacar });
        }));

        return { ocultar: limpiarMapa, duracionViaje: VIAJE_MS };
    }

    // ------------------------------------------------------------------
    // API
    // ------------------------------------------------------------------

    /** Arranca un nivel: fondo, estrellas nuevas y cronómetro. */
    function jugarNivel(nivelId) {
        var nivel = N.porId(nivelId);
        if (!nivel || !escena) return null;
        limpiarMapa();
        limpiarNivel();
        nivelActual = nivel;
        pintarFondo(nivel);
        var gen = crearEstrellas(nivel);
        inicioMs = Date.now();
        avisar("nivelListo", {
            nivel: nivel,
            estrellas: gen.estrellas.length,
            separacion: Math.round(gen.separacion)
        });
        return { nivel: nivel, estrellas: gen.estrellas };
    }

    function montar(contenedor, callbacks) {
        cbs = callbacks || {};
        var Host = global.PedniaPhaserHost;

        /* La forma del lienzo se fija al montar, antes de crear nada: cambiarla
           después obligaría a regenerar todas las texturas de fondo. */
        medirEscenario();

        var config = {
            type: global.Phaser.AUTO,
            parent: contenedor,
            width: ANCHO,
            height: ALTO,
            backgroundColor: "#04061a",
            /* FIT + CENTER_BOTH: el escenario se escala completo a cualquier
               pantalla sin recortar estrellas, y las coordenadas de juego
               siguen siendo las de diseño en móvil, tablet y escritorio. */
            scale: {
                mode: global.Phaser.Scale.FIT,
                autoCenter: global.Phaser.Scale.CENTER_BOTH,
                width: ANCHO,
                height: ALTO
            },
            /* Ratón y táctil explícitos: el bloque `input` REEMPLAZA la
               configuración por defecto, así que omitir `touch` lo deja en
               false y el juego queda muerto en tablet, que es su dispositivo
               natural. activePointers 1 porque se juega con un solo dedo. */
            input: {
                mouse: true,
                touch: true,
                activePointers: 1
            },
            scene: {
                create: function () {
                    escena = this;
                    lineas = this.add.graphics().setDepth(8);
                    trazo = this.add.graphics().setDepth(7);
                    instalarPuntero();
                    avisar("listo", {});
                }
            }
        };

        if (Host && typeof Host.crear === "function") {
            juego = Host.crear(config);
        } else {
            juego = new global.Phaser.Game(config);
        }
        return juego;
    }

    function destruir() {
        limpiarTemporizadores();
        limpiarNivel();
        limpiarMapa();
        fondoPiezas = [];
        if (juego && juego.destroy) juego.destroy(true);
        juego = null;
        escena = null;
        estado = null;
    }

    function datosEstado() {
        if (!estado) return null;
        return {
            hechas: estado.hechas,
            total: estado.estrellas.length,
            errores: estado.errores,
            esperado: C.esperado(estado),
            completo: C.completo(estado)
        };
    }

    /* ANCHO/ALTO/AREA se publican con getters: son variables que cambian al
       medir la pantalla, y copiarlas en el objeto las congelaría en el valor
       que tenían al cargar el archivo. */
    global.ConstelacionJuego = {
        get ANCHO() { return ANCHO; },
        get ALTO() { return ALTO; },
        get AREA() { return AREA; },
        get ZONAS_UI() { return ZONAS_UI; },
        montar: montar,
        jugarNivel: jugarNivel,
        mostrarMapa: mostrarMapa,
        datosEstado: datosEstado,
        destruir: destruir
    };
})(typeof window !== "undefined" ? window : globalThis);
