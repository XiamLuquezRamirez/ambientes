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
            destruir: destruir
        };
    }

    global.ConstelacionNave = { crear: crear };
})(typeof window !== "undefined" ? window : globalThis);
