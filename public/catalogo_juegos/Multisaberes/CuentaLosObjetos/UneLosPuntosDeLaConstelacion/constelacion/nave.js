/**
 * Nave espacial: objeto visual propio con su secuencia de victoria (spec §7).
 *
 * Es un conjunto de sprites reales (casco, dos paneles solares, llama de
 * partículas, estela) animados con tweens, no una imagen que aparece y se va.
 */
(function (global) {
    "use strict";

    var T = global.ConstelacionTexturas;

    /**
     * Los pasos de la secuencia se encadenan con setTimeout y no con
     * scene.time.delayedCall: cuando el canvas convive con la intro 3D el reloj
     * de la escena puede quedarse parado y los pasos no llegarían a ejecutarse.
     */
    function tras(ms, fn) { return global.setTimeout(fn, ms); }

    /**
     * @param {Phaser.Scene} scene
     * @param {number} x centro de la nave
     * @param {number} y
     * @returns {object} controlador de la nave
     */
    function crear(scene, x, y) {
        var piezas = [];
        var temporizadores = [];

        T.naveCuerpo(scene, "nave-cuerpo");
        T.panelSolar(scene, "nave-panel");
        T.naveSilueta(scene, "nave-silueta");
        T.chispa(scene, "chispa");

        var silueta = scene.add.image(x, y, "nave-silueta").setDepth(4).setAlpha(0).setScale(1.04);
        var cuerpo = scene.add.image(x, y, "nave-cuerpo").setDepth(6).setAlpha(0).setScale(0.6);

        /* Los paneles nacen plegados (escala X 0) contra el casco y se abren
           hacia fuera: el origen en el borde interior hace que crezcan en la
           dirección correcta sin recolocarlos. */
        var panelIzq = scene.add.image(x - 40, y - 6, "nave-panel")
            .setDepth(5).setOrigin(1, 0.5).setScale(0, 1).setAlpha(0);
        var panelDer = scene.add.image(x + 40, y - 6, "nave-panel")
            .setDepth(5).setOrigin(0, 0.5).setScale(0, 1).setAlpha(0);

        var llama = scene.add.particles(x, y + 118, "chispa", {
            speedY: { min: 150, max: 330 },
            speedX: { min: -42, max: 42 },
            scale: { start: 0.85, end: 0 },
            alpha: { start: 0.95, end: 0 },
            lifespan: { min: 230, max: 460 },
            frequency: 18,
            tint: [0xfff7ae, 0xfbbf24, 0xf97316, 0xef4444],
            blendMode: "ADD",
            emitting: false
        }).setDepth(5);

        var estela = scene.add.particles(x, y + 60, "chispa", {
            speedY: { min: -40, max: 40 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 900,
            frequency: 26,
            tint: [0x7dd3fc, 0xffffff],
            blendMode: "ADD",
            emitting: false
        }).setDepth(3);

        piezas.push(silueta, cuerpo, panelIzq, panelDer, llama, estela);

        function onda(cx, cy, color) {
            var aro = scene.add.circle(cx, cy, 24);
            aro.setStrokeStyle(7, color == null ? 0x7dd3fc : color, 0.95);
            aro.setDepth(3);
            piezas.push(aro);
            scene.tweens.add({
                targets: aro,
                radius: 520,
                alpha: 0,
                duration: 1100,
                ease: "Cubic.easeOut",
                onComplete: function () { if (aro.scene) aro.destroy(); }
            });
            return aro;
        }

        /**
         * Secuencia completa de victoria. `pasos` recibe avisos para que la
         * escena sincronice sonido y diálogos sin conocer los tiempos.
         * @param {function} alTerminar
         * @param {function} [pasos] (nombre) => void
         */
        function secuenciaVictoria(alTerminar, pasos) {
            var avisar = typeof pasos === "function" ? pasos : function () {};

            // 1. Onda de energía desde el centro de la constelación
            avisar("onda");
            onda(x, y, 0x7dd3fc);

            // 2. Revelar la silueta
            temporizadores.push(tras(260, function () {
                if (!silueta.scene) return;
                avisar("silueta");
                scene.tweens.add({ targets: silueta, alpha: 0.75, duration: 420, ease: "Sine.easeOut" });
            }));

            // 3. Aparecer la nave de verdad
            temporizadores.push(tras(760, function () {
                if (!cuerpo.scene) return;
                avisar("aparece");
                scene.tweens.add({ targets: silueta, alpha: 0, duration: 420 });
                scene.tweens.add({
                    targets: cuerpo,
                    alpha: 1,
                    scale: 1,
                    duration: 620,
                    ease: "Back.easeOut"
                });
            }));

            // 4. Desplegar paneles solares
            temporizadores.push(tras(1420, function () {
                if (!panelIzq.scene) return;
                avisar("paneles");
                [panelIzq, panelDer].forEach(function (p) {
                    p.setAlpha(1);
                    scene.tweens.add({ targets: p, scaleX: 1, duration: 520, ease: "Back.easeOut" });
                });
            }));

            // 5. Encender motores
            temporizadores.push(tras(2000, function () {
                if (!llama.scene) return;
                avisar("motores");
                llama.start();
                scene.tweens.add({
                    targets: cuerpo,
                    y: y - 10,
                    duration: 260,
                    yoyo: true,
                    repeat: 2,
                    ease: "Sine.easeInOut"
                });
            }));

            // 6. Despegue vertical con estela
            temporizadores.push(tras(2800, function () {
                if (!cuerpo.scene) return;
                avisar("despegue");
                estela.start();
                onda(x, y + 90, 0xfbbf24);
                /* Todas las piezas suben en un solo tween para que la llama y
                   los paneles no se descuelguen del casco. */
                var vuela = [cuerpo, panelIzq, panelDer, llama, estela];
                scene.tweens.add({
                    targets: vuela,
                    y: "-=980",
                    duration: 2100,
                    ease: "Cubic.easeIn"
                });
                scene.tweens.add({
                    targets: [cuerpo, panelIzq, panelDer],
                    scale: 0.45,
                    duration: 2100,
                    ease: "Sine.easeIn"
                });
            }));

            // 7. Fin: apagar emisores y avisar
            temporizadores.push(tras(4900, function () {
                if (llama.scene) llama.stop();
                if (estela.scene) estela.stop();
                avisar("fin");
                if (typeof alTerminar === "function") alTerminar();
            }));
        }

        /**
         * Cierre de la partida: la nave se queda en cuadro, pasan los mundos
         * y aterriza en una base. Las cortinas las abre quien recibe alTerminar.
         */
        function viajeFinal(alTerminar, pasos, entorno) {
            var avisar = typeof pasos === "function" ? pasos : function () {};
            entorno = entorno || {};
            var ancho = entorno.ancho || 1280;
            var alto = entorno.alto || 720;
            var niveles = entorno.niveles || [];
            var estrellas = entorno.estrellas || [];
            var vuela = [cuerpo, panelIzq, panelDer, llama, estela];
            var crucero = null;
            var avisado = false;
            var base = null;

            function fin() {
                if (avisado) return;
                avisado = true;
                if (crucero) { global.clearInterval(crucero); crucero = null; }
                if (llama.scene) llama.stop();
                if (estela.scene) estela.stop();
                if (global.document && global.document.body) {
                    global.document.body.classList.remove("viaje-final");
                }
                avisar("fin");
                if (typeof alTerminar === "function") alTerminar();
            }

            function mover(dx, dy) {
                vuela.forEach(function (p) {
                    if (!p || !p.scene) return;
                    p.x += dx;
                    p.y += dy;
                });
            }

            avisar("onda");
            onda(x, y, 0x7dd3fc);

            temporizadores.push(tras(260, function () {
                if (!silueta.scene) return;
                avisar("silueta");
                scene.tweens.add({ targets: silueta, alpha: 0.75, duration: 420, ease: "Sine.easeOut" });
            }));

            temporizadores.push(tras(760, function () {
                if (!cuerpo.scene) return;
                avisar("aparece");
                scene.tweens.add({ targets: silueta, alpha: 0, duration: 420 });
                scene.tweens.add({
                    targets: cuerpo, alpha: 1, scale: 1, duration: 620, ease: "Back.easeOut"
                });
            }));

            temporizadores.push(tras(1420, function () {
                if (!panelIzq.scene) return;
                avisar("paneles");
                [panelIzq, panelDer].forEach(function (p) {
                    p.setAlpha(1);
                    scene.tweens.add({ targets: p, scaleX: 1, duration: 520, ease: "Back.easeOut" });
                });
            }));

            temporizadores.push(tras(2000, function () {
                if (!llama.scene) return;
                avisar("motores");
                llama.start();
            }));

            temporizadores.push(tras(2500, function () {
                if (!cuerpo.scene) return;
                avisar("despegue");
                estela.start();
                if (global.document && global.document.body) {
                    global.document.body.classList.add("viaje-final");
                }
                if (typeof entorno.ocultarPuzzle === "function") entorno.ocultarPuzzle();

                var espacio = scene.add.rectangle(ancho / 2, alto / 2, ancho, alto, 0x020617)
                    .setDepth(0.5);
                piezas.push(espacio);

                var dx = ancho * 0.5 - cuerpo.x;
                var dy = alto * 0.4 - cuerpo.y;
                scene.tweens.add({
                    targets: vuela,
                    x: "+=" + dx,
                    y: "+=" + dy,
                    duration: 700,
                    ease: "Sine.easeOut"
                });

                estrellas.forEach(function (e) {
                    if (!e || !e.scene) return;
                    scene.tweens.killTweensOf(e);
                    e.setScale(e.scaleX, 4.2);
                    e.setAlpha(0.95);
                    e.__vel = 10 + Math.random() * 14;
                });

                temporizadores.push(tras(720, function () {
                    if (!cuerpo.scene) return;
                    var t0 = Date.now();
                    var wobblePrevio = 0;
                    crucero = global.setInterval(function () {
                        if (!cuerpo.scene) return;
                        var wobble = Math.sin((Date.now() - t0) / 260) * 7;
                        mover(0, wobble - wobblePrevio);
                        wobblePrevio = wobble;
                        estrellas.forEach(function (e) {
                            if (!e.scene) return;
                            e.y += e.__vel || 12;
                            if (e.y > alto + 20) {
                                e.y = -20;
                                e.x = Math.random() * ancho;
                            }
                        });
                    }, 16);
                }));

                var n = niveles.length;
                var i;
                for (i = 0; i < n; i++) {
                    (function (indice) {
                        temporizadores.push(tras(400 + indice * 1050, function () {
                            if (!scene.sys) return;
                            var niv = niveles[indice];
                            var clave = "planeta-viaje-" + (niv.id || indice);
                            T.planeta(scene, clave, (niv.planeta && niv.planeta.color) || "#38bdf8", 52);
                            var izquierda = indice % 2 === 0;
                            var x0 = izquierda ? ancho * 0.18 : ancho * 0.82;
                            var planeta = scene.add.image(x0, -120, clave).setDepth(8).setScale(0.45);
                            piezas.push(planeta);
                            scene.tweens.add({
                                targets: planeta,
                                y: alto + 160,
                                x: x0 + (izquierda ? ancho * 0.08 : -ancho * 0.08),
                                scale: 2.2,
                                duration: 1400,
                                ease: "Linear",
                                onComplete: function () { if (planeta.scene) planeta.destroy(); }
                            });
                        }));
                    })(i);
                }

                temporizadores.push(tras(400 + n * 1050, aterrizar));
            }));

            function aterrizar() {
                if (avisado || !cuerpo.scene) { fin(); return; }
                if (crucero) { global.clearInterval(crucero); crucero = null; }
                estrellas.forEach(function (e) {
                    if (!e || !e.scene) return;
                    scene.tweens.killTweensOf(e);
                    e.setScale(e.scaleX);
                    e.setAlpha(0.35 + Math.random() * 0.5);
                });

                texBase(scene);
                if (base && base.scene) base.destroy();
                var baseY = alto - 36;
                base = scene.add.image(ancho / 2, alto + 180, "base-constelacion").setDepth(4);
                piezas.push(base);
                scene.tweens.add({
                    targets: base, y: baseY, duration: 780, ease: "Cubic.easeOut"
                });

                /* La tobera queda sobre el aro de la base. */
                var destinoY = baseY - 168;
                var dx = ancho / 2 - cuerpo.x;
                var dy = destinoY - cuerpo.y;
                scene.tweens.add({
                    targets: vuela,
                    x: "+=" + dx,
                    y: "+=" + dy,
                    duration: 900,
                    ease: "Cubic.easeOut"
                });

                temporizadores.push(tras(940, function () {
                    if (!cuerpo.scene) { fin(); return; }
                    if (llama.scene) llama.stop();
                    if (estela.scene) estela.stop();
                    scene.cameras.main.shake(180, 0.004);
                    var polvo = scene.add.particles(ancho / 2, baseY - 20, "chispa", {
                        speed: { min: 40, max: 150 },
                        angle: { min: 200, max: 340 },
                        scale: { start: 0.7, end: 0 },
                        lifespan: 480,
                        tint: [0xe2e8f0, 0x67e8f9],
                        alpha: { start: 0.75, end: 0 },
                        emitting: false
                    }).setDepth(7);
                    piezas.push(polvo);
                    polvo.explode(16);
                    temporizadores.push(tras(520, fin));
                }));
            }

            /* Si la escena se pausa, las cortinas igual llegan. */
            temporizadores.push(tras(14000, fin));
        }

        function texBase(scene) {
            if (scene.textures.exists("base-constelacion")) return;
            var W = 640, H = 220;
            var g = scene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0x1e293b, 1);
            g.fillRoundedRect(36, 40, 78, 150, 12);
            g.fillRoundedRect(W - 114, 40, 78, 150, 12);
            g.fillStyle(0x22d3ee, 0.95);
            g.fillRoundedRect(50, 56, 50, 16, 4);
            g.fillRoundedRect(W - 100, 56, 50, 16, 4);
            g.fillStyle(0xfbbf24, 1);
            g.fillCircle(75, 100, 5);
            g.fillCircle(W - 75, 100, 5);
            g.fillStyle(0x0f172a, 1);
            g.fillEllipse(W / 2, 58, 460, 64);
            g.fillStyle(0x334155, 1);
            g.fillEllipse(W / 2, 50, 390, 46);
            g.lineStyle(5, 0x22d3ee, 0.95);
            g.strokeEllipse(W / 2, 46, 250, 30);
            g.fillStyle(0x475569, 1);
            g.fillRect(W / 2 - 16, 74, 12, 130);
            g.fillRect(W / 2 + 4, 74, 12, 130);
            g.generateTexture("base-constelacion", W, H);
            g.destroy();
        }

        function destruir() {
            temporizadores.forEach(function (t) { global.clearTimeout(t); });
            temporizadores = [];
            piezas.forEach(function (p) {
                if (p && p.scene) {
                    if (p.stop) p.stop();
                    p.destroy();
                }
            });
            piezas = [];
        }

        return {
            cuerpo: cuerpo,
            onda: onda,
            secuenciaVictoria: secuenciaVictoria,
            viajeFinal: viajeFinal,
            destruir: destruir
        };
    }

    global.ConstelacionNave = { crear: crear };
})(typeof window !== "undefined" ? window : globalThis);
