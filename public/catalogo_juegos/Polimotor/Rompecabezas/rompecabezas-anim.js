/**
 * rompecabezas-anim.js — Capa de animación del Rompecabezas del cuerpo.
 *
 *   GSAP 3   → animaciones de piezas, cuenta regresiva, encaje, errores, zoom y HUD.
 *   Phaser 4 → capa transparente de partículas (estrellas al encajar, celebración final).
 *
 * SOLO VISUAL. Este módulo no decide aciertos, no cambia estado del juego y no mueve
 * piezas del tablero:
 *   - Las partes de la silueta (.svg-parte) y #figura-svg se ubican con `transform`
 *     (script.js → armarSiluetaSvg). Aquí NUNCA se anima su transform: solo sus capas
 *     internas (.svg-parte-color / .svg-parte-gris), y siempre con clearProps al final.
 *   - Antes de medir el solape de una pieza arrastrada se neutraliza su transform
 *     (neutralizar), así el cálculo de acierto es idéntico al de siempre.
 * Si GSAP no está disponible, `activo` es false y script.js usa su comportamiento original.
 */
(function (global) {
    'use strict';

    var gsap = global.gsap || null;
    var doc = global.document;
    var reducido = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    // Con "reducir movimiento" del sistema se deja el juego exactamente como antes.
    var activo = !!gsap && !reducido;

    if (activo && doc.body) doc.body.classList.add('gsap-anim');

    // Las animaciones siguen el reloj real: en un equipo lento "saltan" fotogramas pero
    // terminan a tiempo, en sincronía con los tiempos de la lógica (setTimeout del juego).
    if (activo) gsap.ticker.lagSmoothing(0);

    var PALETA = ['#ffd54f', '#ff7043', '#4fc3f7', '#81c784', '#ba68c8', '#ffffff'];

    function animar() { return activo && !reducido; }

    function centro(rect) {
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    function rectUtil(el) {
        if (!el || !el.getBoundingClientRect) return null;
        var r = el.getBoundingClientRect();
        return (r.width > 1 && r.height > 1) ? r : null;
    }

    // Rect visible del destino: capa de color de la parte SVG, o la zona en modo imagen.
    function rectDestino(destino) {
        if (!destino) return null;
        if (destino.classList && destino.classList.contains('svg-parte')) {
            return rectUtil(destino.querySelector('.svg-parte-color')) || rectUtil(destino);
        }
        return rectUtil(destino);
    }

    function destinoPorId(id) {
        return doc.querySelector('#figura-svg .svg-parte[data-id="' + id + '"]')
            || doc.querySelector('.zona-drop[data-id="' + id + '"]');
    }

    function hayFichasEnBandeja() {
        return !!doc.querySelector('#bandeja .pieza');
    }

    // Escalonado con un tween INDIVIDUAL por elemento (delay propio) en vez de `stagger`:
    // GSAP no detiene del todo un tween con stagger vía killTweensOf (su línea interna
    // vuelve a pintar el estado inicial), y aquí la lógica puede interrumpir en cualquier
    // momento (el niño agarra una ficha, se vuelve a mostrar la figura…).
    // desdeCentro: el retardo crece desde el elemento central hacia los extremos.
    function escalonar(elems, cada, desdeCentro, crear) {
        var lista = Array.prototype.slice.call(elems || []);
        var mitad = (lista.length - 1) / 2;
        lista.forEach(function (el, i) {
            crear(el, (desdeCentro ? Math.abs(i - mitad) : i) * cada);
        });
    }

    // Detiene animaciones y devuelve los elementos a su estado original.
    // Las capas SVG (.svg-parte-color / -gris) nacen sin estilo inline → 'all' es seguro.
    // #lienzo y .pieza-colocada tienen estilo propio (aspect-ratio, left/top…) → solo
    // se limpian las propiedades que anima este módulo.
    //
    // Se mata ELEMENTO POR ELEMENTO: si a killTweensOf se le pasa una lista que no
    // coincide exactamente con los objetivos del tween, GSAP intenta quitar propiedad
    // por propiedad con una tabla que solo existe tras el primer render; un tween recién
    // creado sobrevive y luego pinta su estado inicial (p. ej. la silueta en opacity 0).
    function limpiar(targets, props) {
        if (!activo || !targets) return;
        var lista = (targets.length !== undefined && !targets.nodeType)
            ? Array.prototype.slice.call(targets)
            : [targets];
        lista.forEach(function (el) {
            if (!el) return;
            gsap.killTweensOf(el);
            gsap.set(el, { clearProps: props });
        });
    }

    function detener(elems) {
        (elems || []).forEach(function (el) { if (el) gsap.killTweensOf(el); });
    }

    // La lógica del juego mide la silueta (tamaño de fichas, solape al soltar).
    // Antes de que eso ocurra, nada de la figura puede quedar a medio animar, aunque el
    // navegador vaya lento (equipo modesto, app en segundo plano).
    function asentarGeometria() {
        if (!activo) return;
        limpiar(doc.getElementById('lienzo'), 'transform,opacity');
        limpiar(doc.querySelectorAll(
            '#figura-svg .svg-parte:not(.colocada) .svg-parte-color,' +
            '#figura-svg .svg-parte:not(.colocada) .svg-parte-gris'
        ), 'all');
    }

    // ------------------------------------------------------------------
    //  Phaser 4 — capa de partículas (transparente, sin input, se duerme)
    // ------------------------------------------------------------------
    var Fx = (function () {
        var Phaser = global.Phaser || null;
        var game = null;
        var escena = null;
        var promesa = null;
        var fallido = false;
        var emisores = {};
        var dormirTimer = null;

        function disponible() { return !!Phaser && !fallido && !reducido; }

        function dibujarEstrella(ctx, s, color) {
            var cx = s / 2, cy = s / 2, ext = s * 0.46, inn = s * 0.2;
            ctx.beginPath();
            for (var i = 0; i < 10; i++) {
                var r = i % 2 === 0 ? ext : inn;
                var a = -Math.PI / 2 + i * Math.PI / 5;
                ctx[i === 0 ? 'moveTo' : 'lineTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            ctx.lineWidth = s * 0.06;
            ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            ctx.stroke();
        }

        function dibujarConfeti(ctx, s, color) {
            ctx.fillStyle = color;
            ctx.fillRect(s * 0.2, s * 0.35, s * 0.6, s * 0.3);
        }

        function textura(tipo, color) {
            var key = 'rompe-' + tipo + '-' + color.replace('#', '');
            if (escena.textures.exists(key)) return key;
            var s = 32;
            var c = doc.createElement('canvas');
            c.width = s;
            c.height = s;
            var ctx = c.getContext('2d');
            if (tipo === 'estrella') dibujarEstrella(ctx, s, color);
            else dibujarConfeti(ctx, s, color);
            escena.textures.addCanvas(key, c);
            return key;
        }

        function emisor(tipo, color) {
            var key = textura(tipo, color);
            if (emisores[key]) return emisores[key];
            var cfg = tipo === 'estrella'
                ? {
                    speed: { min: 170, max: 430 },
                    angle: { min: 0, max: 360 },
                    lifespan: { min: 600, max: 1050 },
                    scale: { start: 0.95, end: 0 },
                    alpha: { start: 1, end: 0 },
                    rotate: { min: -180, max: 180 },
                    gravityY: 620,
                    emitting: false
                }
                : {
                    speed: { min: 140, max: 360 },
                    angle: { min: 65, max: 115 },
                    lifespan: { min: 1600, max: 2400 },
                    scale: { start: 1, end: 0.6 },
                    alpha: { start: 1, end: 0 },
                    rotate: { min: -360, max: 360 },
                    gravityY: 260,
                    emitting: false
                };
            emisores[key] = escena.add.particles(0, 0, key, cfg);
            return emisores[key];
        }

        function particulasVivas() {
            return Object.keys(emisores).some(function (k) {
                try { return emisores[k].getAliveParticleCount() > 0; } catch (e) { return false; }
            });
        }

        // El loop se duerme cuando no hay partículas (ahorra batería en tablets), pero solo
        // cuando ya no queda ninguna viva y tras un cuadro más: si no, el último cuadro con
        // estrellas quedaba pintado en equipos lentos.
        function intentarDormir() {
            if (particulasVivas()) {
                dormirTimer = setTimeout(intentarDormir, 400);
                return;
            }
            dormirTimer = setTimeout(function () {
                try { if (game && game.loop && !particulasVivas()) game.loop.sleep(); } catch (e) { /* noop */ }
            }, 300);
        }

        function despertar() {
            if (dormirTimer) clearTimeout(dormirTimer);
            try { if (game && game.loop) game.loop.wake(); } catch (e) { /* noop */ }
            dormirTimer = setTimeout(intentarDormir, 2800);
        }

        function asegurar() {
            if (promesa) return promesa;
            if (!disponible()) return Promise.resolve(null);
            promesa = new Promise(function (resolve) {
                var cont = doc.createElement('div');
                cont.id = 'rompe-fx';
                cont.setAttribute('aria-hidden', 'true');
                doc.body.appendChild(cont);
                var resuelto = false;
                function fin(valor) {
                    if (resuelto) return;
                    resuelto = true;
                    if (!valor) fallido = true;
                    resolve(valor);
                }
                try {
                    game = new Phaser.Game({
                        type: Phaser.AUTO,
                        parent: cont,
                        transparent: true,
                        width: global.innerWidth,
                        height: global.innerHeight,
                        banner: false,
                        audio: { noAudio: true },
                        input: { keyboard: false, mouse: false, touch: false, gamepad: false },
                        scale: { mode: Phaser.Scale.RESIZE },
                        scene: {
                            create: function () {
                                escena = this;
                                if (game && game.canvas) game.canvas.style.pointerEvents = 'none';
                                try { game.loop.sleep(); } catch (e) { /* noop */ }
                                fin(escena);
                            }
                        }
                    });
                } catch (e) {
                    fin(null);
                }
                // Si la escena no arranca a tiempo, se usa el respaldo DOM.
                setTimeout(function () { fin(escena); }, 4000);
            });
            return promesa;
        }

        function estallido(x, y, color, cantidad) {
            if (!disponible()) return false;
            asegurar().then(function (sc) {
                if (!sc) {
                    estallidoDom(x, y, color, cantidad);
                    return;
                }
                despertar();
                var n = cantidad || 16;
                emisor('estrella', color).explode(Math.ceil(n * 0.6), x, y);
                emisor('estrella', '#ffffff').explode(Math.floor(n * 0.4), x, y);
            });
            return true;
        }

        function celebracion(rect) {
            if (!disponible()) return false;
            asegurar().then(function (sc) {
                if (!sc) {
                    if (rect) {
                        var cc = centro(rect);
                        estallidoDom(cc.x, cc.y, '#ffd54f', 20);
                    }
                    return;
                }
                despertar();
                var w = global.innerWidth;
                for (var i = 0; i < 12; i++) {
                    emisor('confeti', PALETA[i % PALETA.length]).explode(7, Math.random() * w, -12);
                }
                if (rect) {
                    var c = centro(rect);
                    [0, 180, 360].forEach(function (ms, i) {
                        setTimeout(function () {
                            despertar();
                            emisor('estrella', PALETA[i]).explode(14, c.x + (i - 1) * rect.width * 0.35, c.y - rect.height * 0.15);
                        }, ms);
                    });
                }
            });
            return true;
        }

        return { asegurar: asegurar, estallido: estallido, celebracion: celebracion, disponible: disponible };
    })();

    // Respaldo DOM (sin Phaser): estrellitas con GSAP.
    function estallidoDom(x, y, color, cantidad) {
        if (!animar()) return;
        var n = cantidad || 12;
        for (var i = 0; i < n; i++) {
            var s = doc.createElement('span');
            s.className = 'rompe-chispa';
            s.style.left = x + 'px';
            s.style.top = y + 'px';
            s.style.background = i % 3 === 0 ? '#ffffff' : color;
            doc.body.appendChild(s);
            var ang = Math.random() * Math.PI * 2;
            var dist = 60 + Math.random() * 90;
            gsap.fromTo(s, { xPercent: -50, yPercent: -50, scale: 1, opacity: 1 }, {
                x: Math.cos(ang) * dist,
                y: Math.sin(ang) * dist + 30,
                scale: 0,
                rotation: Math.random() * 360,
                opacity: 0,
                duration: 0.7 + Math.random() * 0.3,
                ease: 'power2.out',
                onComplete: (function (el) { return function () { el.remove(); }; })(s)
            });
        }
    }

    // Anillo expansivo sobre la pieza encajada.
    function anillo(rect, color) {
        if (!animar() || !rect) return;
        var c = centro(rect);
        var d = Math.max(rect.width, rect.height) * 1.05;
        var a = doc.createElement('span');
        a.className = 'rompe-anillo';
        a.style.width = d + 'px';
        a.style.height = d + 'px';
        a.style.left = (c.x - d / 2) + 'px';
        a.style.top = (c.y - d / 2) + 'px';
        a.style.borderColor = color || '#ffd54f';
        doc.body.appendChild(a);
        gsap.fromTo(a, { scale: 0.35, opacity: 1 }, {
            scale: 1.5,
            opacity: 0,
            duration: 0.65,
            ease: 'power2.out',
            onComplete: function () { a.remove(); }
        });
    }

    // ------------------------------------------------------------------
    //  API pública (la llama script.js en puntos solo visuales)
    // ------------------------------------------------------------------
    var vuelos = {};       // id de pieza cuyo fantasma ya vuela al destino
    var ultimoProgreso = null;

    var RompeAnim = {
        activo: activo,

        // Arranca la capa de partículas en segundo plano (al armar el tablero).
        preparar: function () {
            asentarGeometria();
            if (Fx.disponible()) Fx.asegurar();
        },

        // Aparición de la figura al empezar la ronda (la opacidad no rebota: va aparte).
        revelarLienzo: function () {
            if (!animar()) return;
            var lienzo = doc.getElementById('lienzo');
            if (!lienzo) return;
            limpiar(lienzo, 'transform,opacity');
            gsap.fromTo(lienzo, { y: 26, scale: 0.92 }, {
                y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.5)', clearProps: 'transform'
            });
            gsap.fromTo(lienzo, { opacity: 0 }, {
                opacity: 1, duration: 0.4, ease: 'power1.out', clearProps: 'opacity'
            });
        },

        // Partes a color: se "arman" por piezas. Con fichas ya en la bandeja (ver de nuevo)
        // solo se anima la opacidad, para no alterar la geometría que usa el acierto.
        mostrarColor: function () {
            if (!animar()) return;
            var capas = doc.querySelectorAll('#figura-svg .svg-parte:not(.colocada) .svg-parte-color');
            if (!capas.length) return;
            limpiar(capas, 'all');
            if (hayFichasEnBandeja()) {
                escalonar(capas, 0.05, false, function (capa, delay) {
                    gsap.fromTo(capa, { opacity: 0 }, {
                        opacity: 1, duration: 0.35, delay: delay, ease: 'power1.out', clearProps: 'all'
                    });
                });
                return;
            }
            escalonar(capas, 0.08, true, function (capa, delay) {
                gsap.fromTo(capa, { scale: 0.35, transformOrigin: '50% 50%' }, {
                    scale: 1, duration: 0.55, delay: delay, ease: 'back.out(1.8)', clearProps: 'all'
                });
                gsap.fromTo(capa, { opacity: 0 }, {
                    opacity: 1, duration: 0.35, delay: delay, ease: 'power1.out'
                });
            });
        },

        // Vuelve la silueta. Primero se asienta la geometría (la lógica medirá enseguida)
        // y luego solo se anima la opacidad de la capa gris, que no cambia medidas.
        mostrarSombra: function () {
            if (!animar()) return;
            asentarGeometria();
            escalonar(doc.querySelectorAll('#figura-svg .svg-parte.sombra .svg-parte-gris'), 0.05, false, function (capa, delay) {
                gsap.fromTo(capa, { opacity: 0 }, {
                    opacity: 1, duration: 0.4, delay: delay, ease: 'power1.out', clearProps: 'all'
                });
            });
        },

        // Cuenta regresiva: etiqueta entra al inicio; cada número "salta".
        cuentaEtiqueta: function (cuenta) {
            if (!animar() || !cuenta) return;
            var lbl = cuenta.querySelector('.cuenta-label');
            if (!lbl) return;
            gsap.fromTo(lbl, { y: -24, opacity: 0, scale: 0.9 }, {
                y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)', clearProps: 'opacity,transform'
            });
        },

        cuentaTick: function (cuenta) {
            if (!animar() || !cuenta) return;
            var num = cuenta.querySelector('strong');
            if (!num) return;
            gsap.fromTo(num, { scale: 2.6, opacity: 0, rotation: -22, y: -18 }, {
                scale: 1, opacity: 1, rotation: 0, y: 0, duration: 0.55, ease: 'back.out(2.4)'
            });
        },

        // Fichas nuevas en la bandeja: caen con rebote, una tras otra.
        entradaFichas: function (fichas) {
            fichas = Array.prototype.slice.call(fichas || []);
            fichas.forEach(function (f) {
                f.classList.add('pieza-visible');
                f.classList.remove('pieza-entrada');
            });
            if (!animar() || !fichas.length) return;
            escalonar(fichas, 0.09, false, function (ficha, delay) {
                gsap.fromTo(ficha, { y: 46, scale: 0.5, rotation: gsap.utils.random(-16, 16) }, {
                    y: 0, scale: 1, rotation: 0, duration: 0.62, delay: delay, ease: 'back.out(1.8)', clearProps: 'transform'
                });
                gsap.fromTo(ficha, { opacity: 0 }, {
                    opacity: 1, duration: 0.3, delay: delay, ease: 'power1.out', clearProps: 'opacity'
                });
            });
        },

        // La demo del tutorial controla la ficha con su propio transform.
        liberar: function (el) {
            if (!activo || !el) return;
            gsap.killTweensOf(el);
            gsap.set(el, { clearProps: 'opacity,transform' });
        },

        // Selección en modo toque.
        seleccion: function (el) {
            if (!animar() || !el) return;
            gsap.killTweensOf(el);
            gsap.fromTo(el, { scale: 0.92 }, {
                scale: 1.04, duration: 0.35, ease: 'back.out(3)', clearProps: 'transform'
            });
        },

        // Inicio del arrastre: la pieza "se levanta".
        fantasmaInicio: function (f, ficha) {
            if (!activo || !f) return;
            if (ficha) {
                gsap.killTweensOf(ficha);
                gsap.set(ficha, { clearProps: 'opacity,transform' });
            }
            gsap.set(f, { clearProps: 'opacity,transform' });
            if (reducido) return;
            gsap.fromTo(f, { scale: 1 }, { scale: 1.1, duration: 0.18, ease: 'power2.out' });
            f.__rotar = gsap.quickTo(f, 'rotation', { duration: 0.35, ease: 'power3.out' });
            f.__ultX = null;
        },

        // Durante el arrastre: leve inclinación según la velocidad horizontal.
        fantasmaMover: function (f, x) {
            if (!animar() || !f || !f.__rotar) return;
            if (f.__ultX !== null) {
                var dx = x - f.__ultX;
                f.__rotar(Math.max(-14, Math.min(14, dx * 0.9)));
            }
            f.__ultX = x;
            if (f.__calma) f.__calma.kill();
            f.__calma = gsap.delayedCall(0.12, function () { if (f.__rotar) f.__rotar(0); });
        },

        // Antes de medir el solape: geometría original (sin escala ni giro).
        neutralizar: function (f) {
            if (!activo || !f) return;
            gsap.killTweensOf(f);
            if (f.__calma) f.__calma.kill();
            f.__rotar = null;
            gsap.set(f, { clearProps: 'transform' });
        },

        // Al soltar: el fantasma vuela al hueco correcto o regresa a la bandeja.
        // `f` ya no es el fantasma del juego (script.js lo soltó); aquí solo se anima y se borra.
        soltarFantasma: function (f, destino, origen) {
            if (!f) return;
            if (!animar()) { f.remove(); return; }
            gsap.killTweensOf(f);
            if (f.__calma) f.__calma.kill();
            var r0 = f.getBoundingClientRect();
            var idOrigen = origen && origen.dataset ? origen.dataset.id : null;

            if (destino) {
                var rd = rectDestino(destino);
                if (!rd) { f.remove(); return; }
                if (idOrigen) vuelos[idOrigen] = true;
                var esc = Math.max(0.5, Math.min(1.4, Math.min(rd.width / r0.width, rd.height / r0.height)));
                gsap.timeline({
                    onComplete: function () {
                        f.remove();
                        if (idOrigen) delete vuelos[idOrigen];
                    }
                })
                    .to(f, {
                        left: rd.left + rd.width / 2 - r0.width / 2,
                        top: rd.top + rd.height / 2 - r0.height / 2,
                        scale: esc,
                        rotation: 0,
                        duration: 0.24,
                        ease: 'power3.in'
                    })
                    .to(f, { opacity: 0, duration: 0.1 });
                return;
            }

            // Regreso a la bandeja.
            var ro = origen && origen.isConnected ? rectUtil(origen) : null;
            if (!ro) {
                gsap.to(f, { opacity: 0, scale: 0.6, duration: 0.2, onComplete: function () { f.remove(); } });
                return;
            }
            gsap.set(origen, { opacity: 0.35 });
            origen.__regresoHasta = Date.now() + 320;
            gsap.timeline({
                onComplete: function () {
                    f.remove();
                    if (origen.isConnected) gsap.to(origen, { opacity: 1, duration: 0.12, clearProps: 'opacity' });
                }
            })
                .to(f, {
                    left: ro.left + (ro.width - r0.width) / 2,
                    top: ro.top + (ro.height - r0.height) / 2,
                    rotation: 0,
                    scale: 1,
                    duration: 0.3,
                    ease: 'power2.inOut'
                });
        },

        // La ficha sale de la bandeja (script.js la borra a los 300 ms).
        // En modo toque no hubo fantasma: un clon vuela hasta el hueco.
        salidaFicha: function (ficha) {
            if (!animar() || !ficha) return;
            var id = ficha.dataset ? ficha.dataset.id : null;
            gsap.killTweensOf(ficha);
            if (id && !vuelos[id]) {
                var rf = rectUtil(ficha);
                var rd = rectDestino(destinoPorId(id));
                if (rf && rd) {
                    var clon = ficha.cloneNode(true);
                    clon.className = 'pieza-fantasma';
                    clon.style.left = rf.left + 'px';
                    clon.style.top = rf.top + 'px';
                    clon.style.width = rf.width + 'px';
                    clon.style.height = rf.height + 'px';
                    doc.body.appendChild(clon);
                    gsap.set(ficha, { opacity: 0 });
                    var esc = Math.max(0.5, Math.min(1.4, Math.min(rd.width / rf.width, rd.height / rf.height)));
                    gsap.timeline({ onComplete: function () { clon.remove(); } })
                        .to(clon, {
                            left: rd.left + rd.width / 2 - rf.width / 2,
                            top: rd.top + rd.height / 2 - rf.height / 2,
                            scale: esc,
                            duration: 0.26,
                            ease: 'power3.inOut'
                        })
                        .to(clon, { opacity: 0, duration: 0.1 });
                    return;
                }
            }
            gsap.to(ficha, {
                opacity: 0,
                scale: 0.35,
                rotation: gsap.utils.random(-25, 25),
                duration: 0.26,
                ease: 'back.in(1.6)'
            });
        },

        // Encaje correcto: la parte "rebota" en su lugar + anillo + estrellas.
        encaje: function (id, color) {
            var parte = doc.querySelector('#figura-svg .svg-parte[data-id="' + id + '"]');
            var capa = parte
                ? parte.querySelector('.svg-parte-color')
                : doc.querySelector('#piezas-colocadas .pieza-colocada:last-child');
            // Capa SVG: sin estilo propio → se limpia todo. .pieza-colocada (modo imagen)
            // lleva left/top/width/height inline → solo lo que anima este módulo.
            var props = parte ? 'all' : 'transform,filter';
            limpiar(capa, props);
            var rect = rectUtil(capa) || rectUtil(parte);
            var tono = color || '#ffd54f';

            if (animar() && capa) {
                gsap.fromTo(capa, {
                    scale: 1.28,
                    transformOrigin: '50% 50%',
                    filter: 'brightness(1.7)'
                }, {
                    scale: 1,
                    filter: 'brightness(1)',
                    duration: 0.6,
                    ease: 'elastic.out(1, 0.55)',
                    clearProps: props
                });
            }
            if (rect) {
                anillo(rect, tono);
                var c = centro(rect);
                if (!Fx.estallido(c.x, c.y, tono, 16)) estallidoDom(c.x, c.y, tono, 12);
            }
        },

        // Error: la ficha tiembla con un destello rojo (tras volver, si venía volando).
        error: function (el) {
            if (!el) return;
            if (!animar()) return;
            var espera = Math.max(0, (el.__regresoHasta || 0) - Date.now()) / 1000;
            // Se mata la animación de error anterior por referencia (puede estar aún en su
            // retardo) y se limpia lo que dejó, porque su onComplete ya no se ejecutará.
            if (el.__errorTl) {
                el.__errorTl.kill();
                el.__errorTl = null;
                gsap.set(el, { clearProps: 'transform,boxShadow' });
            }
            // GSAP no aplica clearProps a tweens con `keyframes` ni a los que terminan
            // con `yoyo` en su valor inicial → se limpia al completar la línea de tiempo.
            el.__errorTl = gsap.timeline({
                delay: espera,
                onComplete: function () {
                    el.__errorTl = null;
                    gsap.set(el, { clearProps: 'transform,boxShadow' });
                }
            })
                .to(el, {
                    keyframes: { x: [-14, 13, -9, 7, -3, 0] },
                    duration: 0.5,
                    ease: 'none'
                }, 0)
                .fromTo(el, { boxShadow: '0 0 0 0 rgba(229,57,53,0)' }, {
                    boxShadow: '0 0 0 6px rgba(229,57,53,0.85)',
                    duration: 0.16,
                    yoyo: true,
                    repeat: 3
                }, 0);
        },

        // Contador del HUD: salta cuando aumenta.
        progreso: function (el, hechas) {
            if (!el) return;
            var prev = ultimoProgreso;
            ultimoProgreso = hechas;
            if (!animar() || el.hidden || prev === null || hechas <= prev) return;
            gsap.fromTo(el, { scale: 1.45 }, {
                scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)', clearProps: 'transform'
            });
            var ic = el.querySelector('i');
            if (ic) gsap.fromTo(ic, { rotation: 0 }, { rotation: 360, duration: 0.5, ease: 'power2.out', clearProps: 'transform' });
        },

        reiniciarProgreso: function () { ultimoProgreso = null; },

        zoomAbrir: function (overlay) {
            if (!animar() || !overlay) return;
            var inner = overlay.querySelector('.pieza-zoom-inner');
            detener([overlay, inner]);
            gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2, clearProps: 'opacity' });
            if (inner) {
                gsap.fromTo(inner, { scale: 0.45, rotation: -8, opacity: 0 }, {
                    scale: 1, rotation: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.9)', clearProps: 'transform,opacity'
                });
            }
        },

        // Devuelve true si se encarga de ocultar el zoom al terminar la animación.
        zoomCerrar: function (overlay) {
            if (!animar() || !overlay || overlay.hidden) return false;
            var inner = overlay.querySelector('.pieza-zoom-inner');
            detener([overlay, inner]);
            gsap.to(inner || overlay, { scale: 0.6, opacity: 0, duration: 0.18, ease: 'power2.in' });
            gsap.to(overlay, {
                opacity: 0,
                duration: 0.2,
                onComplete: function () {
                    overlay.hidden = true;
                    gsap.set([overlay, inner], { clearProps: 'opacity,transform' });
                }
            });
            return true;
        },

        // Figura completa: salto de alegría + confeti (dentro de los 400 ms previos al final).
        celebrar: function () {
            var lienzo = doc.getElementById('lienzo');
            var rect = rectUtil(lienzo);
            if (animar() && lienzo) {
                // yoyo termina en el valor inicial: GSAP no aplica clearProps → onComplete.
                gsap.fromTo(lienzo, { scale: 1 }, {
                    scale: 1.07, duration: 0.17, yoyo: true, repeat: 1, ease: 'power2.out',
                    onComplete: function () { gsap.set(lienzo, { clearProps: 'transform' }); }
                });
            }
            if (!Fx.celebracion(rect) && rect) {
                var c = centro(rect);
                estallidoDom(c.x, c.y, '#ffd54f', 20);
            }
        }
    };

    global.RompeAnim = RompeAnim;
})(window);
