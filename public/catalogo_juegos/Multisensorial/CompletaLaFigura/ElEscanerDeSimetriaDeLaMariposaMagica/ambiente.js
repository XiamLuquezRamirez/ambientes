/**
 * CompletaFiguraAmbiente — capa visual con Phaser detrás del juego.
 *
 * Dibuja el taller (fondo) y el panel de control que hace de mesa de trabajo,
 * y expone los efectos que script.js dispara: el barrido del escáner y el
 * veredicto (verde/rojo) de la prueba de simetría. No toca la lógica ni el DOM
 * del juego: si Phaser falla, el juego sigue con el fondo CSS de siempre.
 */
(function (global) {
    "use strict";

    const IMG = "img/";
    const ASSETS = {
        fondo: IMG + "fondo.svg",
        panel: IMG + "panel_mesa.svg"
    };

    /** Margen de la pantalla oscura dentro del panel, en tanto por uno. */
    const PANTALLA = { x: 0.068, y: 0.182, w: 0.822, h: 0.624 };

    let juego = null;
    let escena = null;
    let activo = false;

    function reducirMovimiento() {
        return global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    /** Caja de la mesa de piezas en píxeles de pantalla. */
    function cajaMesa() {
        const mesa = document.getElementById("mesa");
        if (!mesa) return null;
        const r = mesa.getBoundingClientRect();
        return r.height > 20 ? r : null;
    }

    /* ── Escena de ambiente ───────────────────────────────────── */

    function crearEscena() {
        return class Ambiente extends Phaser.Scene {
            constructor() {
                super("ambiente");
            }

            preload() {
                const self = this;
                Object.keys(ASSETS).forEach(function (k) {
                    self.load.svg(k, ASSETS[k], { scale: 2 });
                });
            }

            create() {
                escena = this;
                const W = this.scale.width;
                const H = this.scale.height;

                /* Taller de fondo, recortado para cubrir la pantalla. */
                this.fondo = this.add.image(W / 2, H / 2, "fondo").setDepth(0);

                /* El panel de control es la mesa: las tarjetas se apoyan en él. */
                this.panel = this.add.image(0, 0, "panel").setDepth(1);

                /* Luz que recorre el panel mientras mide la pieza. */
                this.barrido = this.add.rectangle(0, 0, 8, 10, 0x9ee7ff, 0.5)
                    .setDepth(2).setVisible(false);

                /* Tinte del veredicto: verde si encaja, rojo si no. */
                this.luz = this.add.rectangle(0, 0, 10, 10, 0x51cf66, 0)
                    .setDepth(2).setVisible(false);

                this.redimensionar(W, H);
                this.scale.on("resize", function (tam) {
                    this.redimensionar(tam.width, tam.height);
                }, this);

                activo = true;
                global.dispatchEvent(new CustomEvent("ambiente-listo"));
            }

            /** Coloca el fondo y estira el panel sobre la mesa de piezas. */
            redimensionar(W, H) {
                if (!W || !H || !this.fondo) return;

                this.fondo
                    .setPosition(W / 2, H / 2)
                    .setScale(Math.max(W / this.fondo.width, H / this.fondo.height));

                /* El panel es la mesa: ocupa su ancho y su alto completos. */
                const m = cajaMesa();
                const ancho = m ? m.width : W;
                const alto = m ? m.height : Math.min(H * 0.26, 200);
                const x = m ? m.left + m.width / 2 : W / 2;
                const y = m ? m.top + m.height / 2 : H - alto / 2;

                this.panel.setPosition(x, y).setDisplaySize(ancho, alto);

                /* La luz y el barrido viven dentro de la pantalla del panel. */
                const px = x - ancho / 2 + ancho * PANTALLA.x;
                const py = y - alto / 2 + alto * PANTALLA.y;
                this.pantalla = {
                    x: px + ancho * PANTALLA.w / 2,
                    y: py + alto * PANTALLA.h / 2,
                    w: ancho * PANTALLA.w,
                    h: alto * PANTALLA.h
                };

                this.luz.setPosition(this.pantalla.x, this.pantalla.y)
                    .setSize(this.pantalla.w, this.pantalla.h);
                this.barrido.setSize(Math.max(8, this.pantalla.w * 0.035), this.pantalla.h);
            }
        };
    }

    /* ── API que script.js puede llamar (todo opcional) ───────── */

    const api = {
        /** Arranca el canvas de ambiente detrás del juego. */
        iniciar: function () {
            if (juego || typeof Phaser === "undefined") return false;
            let host = document.getElementById("ambiente-fondo");
            if (!host) {
                host = document.createElement("div");
                host.id = "ambiente-fondo";
                host.setAttribute("aria-hidden", "true");
                document.body.insertBefore(host, document.body.firstChild);
            }
            try {
                juego = new Phaser.Game({
                    type: Phaser.AUTO,
                    parent: host,
                    transparent: false,
                    scale: {
                        mode: Phaser.Scale.RESIZE,
                        width: "100%",
                        height: "100%"
                    },
                    scene: crearEscena(),
                    audio: { noAudio: true },
                    banner: false
                });
            } catch (e) {
                return false;
            }
            document.body.classList.add("con-ambiente");
            return true;
        },

        /** Luz que recorre el panel mientras se mide la pieza. */
        escanear: function () {
            if (!escena || !escena.barrido || !escena.pantalla || reducirMovimiento()) return;
            const b = escena.barrido;
            const p = escena.pantalla;
            b.setVisible(true).setPosition(p.x - p.w / 2, p.y);
            escena.tweens.add({
                targets: b,
                x: p.x + p.w / 2,
                duration: 950,
                ease: "Sine.easeInOut",
                onComplete: function () { b.setVisible(false); }
            });
        },

        /** Destello verde (encaja) o rojo (no encaja) en el panel. */
        veredicto: function (ok) {
            if (!escena || !escena.luz) return;
            const l = escena.luz;
            l.setFillStyle(ok ? 0x51cf66 : 0xff6b6b).setVisible(true).setAlpha(0);
            escena.tweens.add({
                targets: l,
                alpha: { from: 0, to: ok ? 0.34 : 0.3 },
                duration: 260,
                yoyo: true,
                repeat: ok ? 1 : 2,
                onComplete: function () { l.setVisible(false).setAlpha(0); }
            });
        },

        /** Recoloca el taller cuando el juego recalcula su escala. */
        recolocar: function () {
            if (escena) escena.redimensionar(escena.scale.width, escena.scale.height);
        },

        activo: function () { return activo; },

        destruir: function () {
            if (!juego) return;
            try { juego.destroy(true); } catch (e) { /* noop */ }
            juego = null;
            escena = null;
            activo = false;
            document.body.classList.remove("con-ambiente");
        }
    };

    global.CompletaFiguraAmbiente = api;
})(typeof window !== "undefined" ? window : this);
