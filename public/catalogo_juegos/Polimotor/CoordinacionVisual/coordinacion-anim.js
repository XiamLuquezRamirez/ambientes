/**
 * coordinacion-anim.js — Capa de animación de "Coordinación visual" (GSAP 3).
 * Las partículas (Phaser 4) vienen de ../../shared/pednia-fx.js (PedniaFx).
 *
 * SOLO VISUAL. La lógica del juego vive en script.js y no se toca:
 *   - El canvas (#lienzo) y la imagen del aro (#aro-img) los MIDE la lógica
 *     (aNorm, metaFija/puntoRimDesdeDom, ajustarCanvas). Aquí nunca se anima su
 *     transform ni el de sus contenedores; en el canvas solo opacidad y en el aro
 *     solo `filter`, que no cambian medidas ni la detección de toques.
 *   - La pelota NO se mide: su posición es estado (pelota.x/y en %). Se anima con
 *     GSAP conservando el centrado del CSS (translate(-50%,-50%) → xPercent/yPercent).
 *
 * Trampas de GSAP evitadas (ver memoria del proyecto):
 *   - Sin `stagger`; tweens de un solo objetivo (killTweensOf fiable).
 *   - `clearProps` no se aplica con `yoyo` que termina en el inicio → limpiar en onComplete.
 */
(function (global) {
    'use strict';

    var gsap = global.gsap || null;
    var doc = global.document;
    var reducido = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var activo = !!gsap && !reducido;
    var Fx = global.PedniaFx || null;

    if (activo) {
        doc.body.classList.add('gsap-anim');
        // Reloj real: si el equipo va lento, las animaciones saltan cuadros pero terminan
        // a tiempo, en sincronía con los setTimeout del juego.
        gsap.ticker.lagSmoothing(0);
    }

    function fx() { return (Fx && Fx.activo) ? Fx : null; }

    // Sonidos que dependen del momento exacto de la animación (red, regreso, botes).
    // Los del juego (agarrar, acierto, error…) los dispara script.js.
    function snd() {
        var A = global.PedniaAudio;
        return (A && A.activo && A.tieneTema()) ? A : null;
    }

    function centro(rect) {
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    function rectUtil(el) {
        if (!el || !el.getBoundingClientRect) return null;
        var r = el.getBoundingClientRect();
        return (r.width > 1 && r.height > 1) ? r : null;
    }

    // ---------------- Pelota: centrado, rodado y estados ----------------

    // El CSS centra la pelota con translate(-50%,-50%). GSAP lo reproduce con
    // xPercent/yPercent (x/y en 0 para que no lea ese translate como píxeles).
    function centrar(el) {
        if (el.__coordCentrada) return;
        el.__coordCentrada = true;
        gsap.set(el, { x: 0, y: 0, xPercent: -50, yPercent: -50 });
    }

    var giro = 0;
    var ultPos = null;
    var tamWrap = null;

    function tamanoWrap(el) {
        if (!tamWrap) {
            var p = el.parentNode;
            tamWrap = { w: (p && p.clientWidth) || 1000, h: (p && p.clientHeight) || 700 };
        }
        return tamWrap;
    }
    global.addEventListener('resize', function () { tamWrap = null; });

    var halo = null;        // pulso "tócame" (filter, repeat infinito)
    var haloDelay = null;
    var alertaOn = false;   // brillo rojo al salirse de la línea

    function detenerHalo(el) {
        if (haloDelay) { haloDelay.kill(); haloDelay = null; }
        if (halo) {
            halo.kill();
            halo = null;
            if (el && !alertaOn) gsap.set(el, { clearProps: 'filter' });
        }
    }

    function quitarAlerta(el) {
        if (!alertaOn) return;
        alertaOn = false;
        gsap.killTweensOf(el, 'filter');
        gsap.set(el, { clearProps: 'filter' });
    }

    // ---------------- Enceste: pelota → aro2.gif sin cortes ----------------

    // Pelota del primer cuadro de images/aro2.gif (500×1200): centro (241, 218) y
    // diámetro ~150 px. El resto del cuadro es idéntico a aro.gif.
    var GIF_BOLA = { x: 241 / 500, y: 218 / 1200, d: 150 / 500 };
    var vuelo = null;

    // Centro de la pelota en CADA cuadro de aro2.gif (270 cuadros × 20 ms, px del GIF
    // 500×1200), medido sobre el archivo. Dentro de la red (117–129) se interpoló.
    // La pelota gira 720° en sentido horario entre el cuadro 0 y el 264 y luego reposa.
    var GIF_X = [241,241,241,242,242,242,242,242,242,242,243,243,243,243,243,243,244,244,244,244,244,244,244,244,244,244,244,244,244,244,244,244,244,244,243,243,243,243,243,243,243,243,242,242,242,242,242,242,242,242,241,241,241,240,240,240,240,240,240,240,240,240,240,240,240,240,240,239,239,239,239,239,239,239,239,239,239,239,239,239,239,239,240,240,240,240,240,239,239,241,241,241,241,241,242,242,242,242,242,242,242,244,244,244,244,244,245,245,246,246,246,246,246,247,247,248,248,248,248,248,249,249,249,249,250,250,250,250,250,250,250,250,250,250,250,250,250,250,249,249,248,248,248,247,246,244,243,243,242,242,241,240,241,242,242,242,243,243,244,244,244,244,245,245,246,246,246,246,246,246,246,246,246,246,246,246,246,246,246,245,244,244,244,243,242,242,241,241,240,240,239,238,238,238,237,236,236,236,235,234,234,234,233,232,232,232,231,230,230,230,230,231,231,231,231,232,232,232,232,232,232,233,233,233,234,234,234,234,235,235,235,236,236,236,236,237,237,238,238,238,238,238,238,239,239,239,239,240,240,240,240,240,240,240,240,241,241,241,241,242,242,242,242,242,242,242,242,242,242,242];
    var GIF_Y = [219,219,220,220,220,220,221,222,222,223,224,224,225,226,226,227,228,229,230,231,232,233,234,236,236,237,238,238,240,240,241,244,248,250,251,252,254,256,258,260,261,263,265,267,269,271,274,275,278,280,282,284,286,289,292,294,296,299,302,304,307,310,313,316,319,322,325,328,331,334,338,341,344,348,352,356,359,363,367,371,376,380,384,392,394,398,402,406,412,416,422,427,432,438,444,450,455,461,468,474,480,487,494,500,508,515,522,530,538,546,554,562,570,579,588,597,607,619,630,642,653,665,676,688,700,711,723,734,746,757,769,783,798,814,829,846,863,881,900,920,940,962,986,1011,1038,1070,1108,1110,1118,1126,1140,1135,1122,1108,1094,1080,1067,1054,1040,1028,1016,1004,992,982,971,961,952,943,934,927,920,913,907,901,896,891,887,883,880,888,896,904,911,918,926,932,940,947,955,962,970,978,986,994,1002,1010,1018,1027,1036,1045,1054,1064,1074,1084,1094,1104,1116,1126,1122,1118,1112,1107,1102,1096,1092,1086,1081,1076,1070,1066,1061,1056,1051,1046,1042,1038,1034,1030,1026,1022,1019,1016,1013,1010,1008,1006,1005,1004,1004,1008,1012,1017,1022,1026,1030,1035,1040,1044,1048,1053,1058,1062,1067,1072,1076,1081,1086,1090,1095,1100,1104,1109,1114,1119,1119,1119,1119,1119,1119,1119];
    var GIF_SUELO = 1126;      // centro de la pelota al tocar el piso
    var GIF_GRAVEDAD = 1670;   // px del GIF / s², medida en sus botes
    var gifInicio = null;      // performance.now() del primer cuadro visible del GIF
    var rodada = null;         // pelota que vuelve botando del aro a la salida

    // Reproductor propio de aro2.gif, cuadro a cuadro (ImageDecoder) en un canvas
    // encima del aro. Así se sabe SIEMPRE qué cuadro se está viendo (un <img> animado
    // puede ir más lento que su reloj en equipos cargados) y el relevo es exacto.
    // Sin ImageDecoder se usa el <img> del juego y se estima el cuadro por tiempo.
    var gifDec = null;         // { dec, n, lienzo, ctx } cuando está listo
    var reproduccion = null;   // { t0, frame, ocupado }

    function prepararGif(conjunto) {
        if (gifDec !== null || !conjunto || !('ImageDecoder' in global) || !global.fetch) return;
        var img = conjunto.querySelector('#aro-enceste');
        var src = img && (img.currentSrc || img.src);
        if (!src) return;
        gifDec = false; // cargando
        global.fetch(src).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
            var dec = new global.ImageDecoder({ data: buf, type: 'image/gif' });
            return dec.tracks.ready.then(function () {
                var lienzo = doc.createElement('canvas');
                lienzo.width = 500;
                lienzo.height = 1200;
                lienzo.className = 'aro-img coord-gif-lienzo';
                lienzo.setAttribute('aria-hidden', 'true');
                conjunto.appendChild(lienzo);
                gifDec = { dec: dec, n: dec.tracks.selectedTrack.frameCount, lienzo: lienzo, ctx: lienzo.getContext('2d') };
            });
        }).catch(function () { gifDec = null; });
    }

    function avanzarGif() {
        var r = reproduccion;
        if (!r || r.ocupado || !gifDec) return;
        var objetivo = Math.min(gifDec.n - 1, Math.floor((global.performance.now() - r.t0) / 20));
        if (objetivo <= r.frame) {
            // Al final queda la pelota quieta en el piso (no vuelve a empezar).
            if (r.frame >= gifDec.n - 1) gsap.ticker.remove(avanzarGif);
            return;
        }
        r.ocupado = true;
        gifDec.dec.decode({ frameIndex: objetivo }).then(function (res) {
            if (reproduccion === r) {
                gifDec.ctx.clearRect(0, 0, 500, 1200);
                gifDec.ctx.drawImage(res.image, 0, 0);
                r.frame = objetivo;
            }
            res.image.close();
            r.ocupado = false;
        }, function () { r.ocupado = false; });
    }

    function detenerReproductor() {
        if (!reproduccion) return;
        reproduccion = null;
        gsap.ticker.remove(avanzarGif);
        if (gifDec && gifDec.lienzo) {
            gifDec.lienzo.classList.remove('is-on');
            if (gifDec.lienzo.parentNode) gifDec.lienzo.parentNode.classList.remove('coord-gif-espera');
        }
    }

    function puntoPelotaGif(conjunto, meta) {
        var img = conjunto && conjunto.querySelector('#aro-img');
        var r = rectUtil(img);
        if (r) {
            return { x: r.left + r.width * GIF_BOLA.x, y: r.top + r.height * GIF_BOLA.y, d: r.width * GIF_BOLA.d };
        }
        return meta ? { x: meta.x, y: meta.y, d: 40 } : null;
    }

    function limpiarVuelo() {
        if (!vuelo) return;
        if (vuelo.tl) vuelo.tl.kill();
        if (vuelo.clon) vuelo.clon.remove();
        if (vuelo.conjunto) vuelo.conjunto.classList.remove('coord-gif-espera');
        if (vuelo.el) vuelo.el.style.visibility = '';
        vuelo = null;
    }

    function celebrarEnceste(v) {
        var conjunto = v.conjunto;
        // Misma caja: el aro normal (si el reproductor propio está encima) o el <img> del GIF.
        var r = conjunto && (rectUtil(conjunto.querySelector('#aro-img')) || rectUtil(conjunto.querySelector('#aro-enceste')));
        // Aro de aro2.gif: ~ (0.5, 0.25) del cuadro.
        var p = r ? { x: r.left + r.width * 0.5, y: r.top + r.height * 0.25 } : v.meta;
        if (snd()) snd().evento('enRed');
        if (p && fx()) {
            fx().estallido(p.x, p.y, '#ffd54f', 18);
            fx().anillo({ left: p.x - 45, top: p.y - 45, width: 90, height: 90 }, '#ffd54f');
        }
        if (conjunto) {
            gsap.killTweensOf(conjunto);
            gsap.fromTo(conjunto, { filter: 'brightness(1.45)' }, {
                filter: 'brightness(1)',
                duration: 0.9,
                ease: 'power2.out',
                onComplete: function () { gsap.set(conjunto, { clearProps: 'filter' }); }
            });
        }
    }

    // Reproductor propio: pinta el cuadro 0 y, en el mismo cuadro de pantalla, retira la
    // pelota animada. El <img> del juego sigue oculto (clase coord-gif-espera).
    function reproducirGif(v) {
        gifDec.dec.decode({ frameIndex: 0 }).then(function (res) {
            global.requestAnimationFrame(function () {
                if (vuelo !== v) { res.image.close(); return; }
                gifDec.ctx.clearRect(0, 0, 500, 1200);
                gifDec.ctx.drawImage(res.image, 0, 0);
                res.image.close();
                gifDec.lienzo.classList.add('is-on');
                if (v.clon) { v.clon.remove(); v.clon = null; }
                if (v.el) v.el.style.visibility = '';
                vuelo = null;
                reproduccion = { t0: global.performance.now(), frame: 0, ocupado: false };
                gsap.ticker.add(avanzarGif);
                gsap.delayedCall(0.85, function () { celebrarEnceste(v); });
            });
        }, function () {
            // Si el decodificador falla, se usa el <img> del juego.
            gifDec = null;
            v.arrancando = false;
            arrancarGif(v);
        });
    }

    // Reinicia el GIF desde su primer cuadro y, cuando está decodificado, cambia la
    // pelota animada por el GIF en un solo cuadro.
    function arrancarGif(v) {
        if (v.arrancando || !v.gif) return;
        v.arrancando = true;
        if (gifDec) {
            reproducirGif(v);
            return;
        }
        var img = v.gif.img;
        try {
            img.removeAttribute('src');
            // eslint-disable-next-line no-unused-expressions
            img.offsetWidth;
        } catch (e) { /* noop */ }
        img.src = v.gif.src;
        var hecho = false;
        function cambiar() {
            if (hecho || vuelo !== v) return;
            hecho = true;
            global.requestAnimationFrame(function () {
                if (vuelo !== v) return;
                gifInicio = global.performance.now();
                if (v.conjunto) v.conjunto.classList.remove('coord-gif-espera');
                if (v.clon) { v.clon.remove(); v.clon = null; }
                if (v.el) v.el.style.visibility = '';
                vuelo = null;
                // Estrellas cuando la pelota del GIF cruza el aro (~cuadro 45 de 270).
                gsap.delayedCall(0.85, function () { celebrarEnceste(v); });
            });
        }
        if (img.decode) img.decode().then(cambiar, cambiar);
        global.setTimeout(cambiar, 300);
    }

    // ---------------- Cambio de recorrido: aro2.gif → salida, sin cortes ----------------

    function terminarRodada(invitar) {
        if (!rodada) return;
        var r = rodada;
        rodada = null;
        gsap.ticker.remove(r.tick);
        if (r.clon) r.clon.remove();
        // La pelota real toma el relevo con el mismo giro de la copia.
        giro = ((r.rot % 360) + 360) % 360;
        gsap.set(r.el, { rotation: giro, scale: 1 });
        r.el.style.visibility = '';
        if (invitar) CoordAnim.invitar(r.el);
    }

    /**
     * La lógica acaba de ocultar el GIF y poner la pelota en la salida del nuevo
     * recorrido. En ese mismo cuadro aparece una copia EXACTAMENTE donde iba la pelota
     * del GIF (posición, tamaño, giro y velocidad según el cuadro que tocaba) y sigue
     * botando con la misma gravedad hasta posarse en la salida, donde la real la releva.
     */
    function rodarDesdeGif(el, conjunto, esDemo) {
        var inicio = gifInicio;
        gifInicio = null;
        // Cuadro que se está viendo: exacto con el reproductor propio; estimado por
        // tiempo si el GIF lo anima el navegador.
        var f = reproduccion ? reproduccion.frame
            : (inicio != null ? Math.floor((global.performance.now() - inicio) / 20) % 270 : -1);
        detenerReproductor();
        if (f < 0 || !el || !conjunto) return false;
        var aro = rectUtil(conjunto.querySelector('#aro-img'));
        var cont = el.offsetParent;
        var rp = rectUtil(el);
        if (!aro || !cont || !rp) return false;
        var rc = cont.getBoundingClientRect();
        var s = aro.width / 500;
        var ox = aro.left - rc.left;
        var oy = aro.top - rc.top;
        var fa = Math.max(0, f - 1);
        var fb = Math.min(269, f + 1);
        var x0 = ox + GIF_X[f] * s;
        var y0 = oy + GIF_Y[f] * s;
        var vy0 = f >= 263 ? 0 : (GIF_Y[fb] - GIF_Y[fa]) / ((fb - fa) * 0.02) * s;
        var d0 = 150 * s;
        var rot0 = Math.min(f, 264) * 720 / 264;
        var w0 = f < 264 ? (720 / 264) * 50 : 0;     // °/s del GIF
        var g = GIF_GRAVEDAD * s;
        var yF = oy + GIF_SUELO * s;

        var pT = centro(rp);
        var xT = pT.x - rc.left;
        var yT = pT.y - rc.top;
        var dT = el.offsetWidth || d0 / 2;

        // Tramo A: sigue su caída/subida actual hasta tocar el piso del GIF.
        var c = y0 - yF;
        var tA = 0;
        var vin = Math.max(0, vy0);
        if (!(c >= 0 && vy0 >= 0)) {
            var disc = vy0 * vy0 - 2 * g * c;
            if (disc >= 0) {
                tA = (-vy0 + Math.sqrt(disc)) / g;
                vin = vy0 + g * tA;
            }
        }
        // Dos botes que la llevan a la salida (el segundo más bajo).
        var h1 = Math.max(35, Math.min(60, 0.5 * vin * vin / (2 * g)));
        var h2 = Math.max(16, h1 * 0.38);
        var tB = 2 * Math.sqrt(2 * h1 / g);
        var tC = 2 * Math.sqrt(2 * h2 / g);
        var T = tA + tB + tC;

        el.style.visibility = 'hidden';
        var clon = el.cloneNode(true);
        clon.removeAttribute('id');
        clon.removeAttribute('hidden');
        clon.className = 'coord-pelota-vuelo';
        clon.style.cssText = '';
        cont.appendChild(clon);

        var r = { el: el, clon: clon, rot: rot0, esDemo: esDemo };
        var prevT = 0;
        var empezo = global.performance.now();

        function suave(u) { return 0.5 - 0.5 * Math.cos(Math.PI * u); }

        function pintar(t) {
            var u = Math.min(1, t / T);
            var x = x0 + (xT - x0) * suave(u);
            var y;
            if (t < tA) {
                y = y0 + vy0 * t + 0.5 * g * t * t;
            } else {
                var tb = t - tA;
                var base = yF + (yT - yF) * Math.min(1, tb / (tB + tC));
                var v;
                if (tb < tB) {
                    v = tb / tB;
                    y = base - h1 * 4 * v * (1 - v);
                } else {
                    v = Math.min(1, (tb - tB) / tC);
                    y = base - h2 * 4 * v * (1 - v);
                }
            }
            var d = d0 + (dT - d0) * suave(u);
            // Giro: del giro del GIF al de rodar según el avance horizontal.
            var dt = t - prevT;
            prevT = t;
            var vx = (xT - x0) * 0.5 * Math.PI * Math.sin(Math.PI * u) / T;
            var wRodar = (vx / (d / 2)) * 180 / Math.PI;
            r.rot += (w0 + (wRodar - w0) * Math.min(1, u * 2)) * dt;
            clon.style.left = (x - d / 2) + 'px';
            clon.style.top = (y - d / 2) + 'px';
            clon.style.width = d + 'px';
            clon.style.height = d + 'px';
            clon.style.transform = 'rotate(' + r.rot + 'deg)';
        }

        // Cada vez que toca el piso suena un bote (más suave en cada uno).
        var botes = [];
        if (tA > 0.03) botes.push([tA, 0.9]);
        botes.push([tA + tB, 0.65], [T, 0.4]);

        r.tick = function () {
            var t = (global.performance.now() - empezo) / 1000;
            while (botes.length && botes[0][0] <= t) {
                var b = botes.shift();
                if (snd()) snd().efecto('bote', { vol: b[1], variar: 0.5 });
            }
            if (t >= T) {
                pintar(T);
                terminarRodada(!esDemo);
                return;
            }
            pintar(t);
        };
        pintar(0);
        rodada = r;
        gsap.ticker.add(r.tick);
        return true;
    }

    var CoordAnim = {
        activo: activo,

        // Cada vez que el juego coloca la pelota (arrastre, toque, demo): la pelota rueda.
        pelotaMovida: function (el, x, y) {
            if (!activo || !el) return;
            centrar(el);
            // Si el niño mueve la pelota mientras aún vuelve botando, la real toma el relevo ya.
            if (rodada && ultPos && (Math.abs(x - ultPos.x) > 0.01 || Math.abs(y - ultPos.y) > 0.01)) {
                terminarRodada(false);
            }
            if (ultPos) {
                var t = tamanoWrap(el);
                var dx = (x - ultPos.x) / 100 * t.w;
                var dy = (y - ultPos.y) / 100 * t.h;
                var d = Math.sqrt(dx * dx + dy * dy);
                var diam = el.offsetWidth || 40;
                // Saltos grandes son reinicios (vuelta al inicio): no ruedan.
                if (d > 0.01 && d < diam * 3) {
                    var signo = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 1 : -1) : (dy >= 0 ? 1 : -1);
                    giro = (giro + signo * (d / (diam / 2)) * (180 / Math.PI)) % 360;
                    gsap.set(el, { rotation: giro });
                }
            }
            ultPos = { x: x, y: y };
        },

        // Nuevo recorrido: el camino aparece y la pelota llega a la salida. Si viene de un
        // enceste, es la misma pelota del GIF que sigue botando hasta la salida; si no
        // (primer recorrido), cae botando en el inicio.
        nuevoRecorrido: function (canvas, el, esDemo) {
            if (!activo) return;
            if (fx()) fx().preparar();
            var conjunto = doc.getElementById('aro-conjunto');
            prepararGif(conjunto);
            limpiarVuelo();
            terminarRodada(false);
            ultPos = null;
            if (canvas) {
                gsap.killTweensOf(canvas);
                gsap.fromTo(canvas, { opacity: 0 }, {
                    opacity: 1, duration: 0.5, ease: 'power1.out', clearProps: 'opacity'
                });
            }
            if (!el) { detenerReproductor(); return; }
            // ¿La pelota ya se veía en pantalla? (p. ej. al aparecer el juego tras la intro)
            var yaVisible = !el.hidden && el.style.visibility !== 'hidden' &&
                !!rectUtil(el) && Number(gsap.getProperty(el, 'scale')) > 0.5;
            centrar(el);
            detenerHalo(el);
            quitarAlerta(el);
            gsap.killTweensOf(el, 'x,y,scale');
            gsap.set(el, { x: 0, y: 0, scale: 1 });
            if (rodarDesdeGif(el, conjunto, esDemo)) return;
            if (yaVisible) {
                // No desaparece: da un saltito en su sitio.
                gsap.fromTo(el, { y: 0 }, {
                    y: -26, duration: 0.22, delay: 0.1, ease: 'power2.out', yoyo: true, repeat: 1,
                    onComplete: function () { if (snd()) snd().efecto('bote', { vol: 0.45 }); }
                });
            } else {
                gsap.fromTo(el, { scale: 0, y: -46 }, {
                    scale: 1, y: 0, duration: 0.65, delay: 0.15, ease: 'back.out(2.2)'
                });
                gsap.delayedCall(0.45, function () { if (snd()) snd().efecto('bote', { vol: 0.55 }); });
            }
            if (!esDemo) {
                haloDelay = gsap.delayedCall(0.9, function () {
                    haloDelay = null;
                    CoordAnim.invitar(el);
                });
            }
        },

        // Pulso de brillo "¡tócame!" mientras el niño no ha agarrado la pelota.
        invitar: function (el) {
            if (!activo || !el) return;
            detenerHalo(el);
            quitarAlerta(el);
            halo = gsap.fromTo(el, { filter: 'drop-shadow(0 0 0px rgba(255,213,79,0))' }, {
                filter: 'drop-shadow(0 0 16px rgba(255,213,79,1))',
                duration: 0.8,
                yoyo: true,
                repeat: -1,
                ease: 'sine.inOut'
            });
        },

        // Agarrar / soltar: la pelota se "levanta" y vuelve con rebote.
        agarrar: function (el) {
            if (!activo || !el) return;
            terminarRodada(false);
            centrar(el);
            detenerHalo(el);
            gsap.to(el, { scale: 1.18, duration: 0.15, ease: 'back.out(3)', overwrite: 'auto' });
        },

        soltar: function (el) {
            if (!activo || !el) return;
            gsap.to(el, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
        },

        // Aviso de "te estás saliendo": brillo rojo en la pelota; la primera vez tiembla el texto.
        alerta: function (el, on, enunciadoPrimeraVez) {
            if (!activo || !el) return;
            if (on) {
                if (!alertaOn) {
                    alertaOn = true;
                    detenerHalo(el);
                    gsap.to(el, {
                        filter: 'drop-shadow(0 0 14px rgba(229,57,53,1))', duration: 0.15, overwrite: 'auto'
                    });
                }
                if (enunciadoPrimeraVez) {
                    gsap.killTweensOf(enunciadoPrimeraVez);
                    gsap.fromTo(enunciadoPrimeraVez, { x: 0 }, {
                        x: -10,
                        duration: 0.06,
                        yoyo: true,
                        repeat: 5,
                        ease: 'sine.inOut',
                        onComplete: function () { gsap.set(enunciadoPrimeraVez, { clearProps: 'transform' }); }
                    });
                }
                return;
            }
            if (!alertaOn) return;
            alertaOn = false;
            gsap.to(el, {
                filter: 'drop-shadow(0 0 0px rgba(229,57,53,0))',
                duration: 0.2,
                overwrite: 'auto',
                onComplete: function () { if (!alertaOn) gsap.set(el, { clearProps: 'filter' }); }
            });
        },

        // Fallo: se recuerda dónde estaba la pelota antes de que la lógica la devuelva
        // al último punto válido…
        antesDeRegreso: function (el) {
            if (!activo || !el) return;
            var r = rectUtil(el);
            el.__regresoDesde = r ? centro(r) : null;
        },

        // …y, ya reposicionada por la lógica, se la ve volar de vuelta desde ahí.
        regreso: function (el) {
            if (!activo || !el) return;
            var desde = el.__regresoDesde;
            el.__regresoDesde = null;
            centrar(el);
            detenerHalo(el);
            quitarAlerta(el);
            if (fx() && desde) {
                fx().anillo({ left: desde.x - 30, top: desde.y - 30, width: 60, height: 60 }, '#e53935');
            }
            // La lógica actualiza el DOM en el siguiente cuadro (programarRedibujo).
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    var r = rectUtil(el);
                    gsap.killTweensOf(el, 'x,y,scale');
                    if (!desde || !r) {
                        gsap.to(el, { scale: 1, x: 0, y: 0, duration: 0.2 });
                        return;
                    }
                    var ahora = centro(r);
                    if (snd()) snd().evento('regreso');
                    gsap.fromTo(el, { x: desde.x - ahora.x, y: desde.y - ahora.y }, {
                        x: 0, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.4)'
                    });
                });
            });
        },

        // Enceste en una sola pelota: la pelota del juego vuela en arco y se posa EXACTAMENTE
        // donde está la pelota del primer cuadro de aro2.gif (mismo centro y tamaño). Solo
        // entonces arranca el GIF y se cambia en el mismo cuadro, así nunca hay dos pelotas
        // ni un instante sin pelota. `meta` = punto del aro en pantalla (respaldo).
        enceste: function (el, meta, aroConjunto) {
            if (!activo || !el) return;
            detenerHalo(el);
            quitarAlerta(el);
            limpiarVuelo();
            var cont = el.offsetParent;
            var r = rectUtil(el);
            if (!r || !cont || el.hidden) {
                if (meta && fx()) fx().estallido(meta.x, meta.y, '#ffd54f', 18);
                return;
            }
            var rc = cont.getBoundingClientRect();
            // Centro real (no el rect: si la pelota está girada su caja es más grande).
            var escala = Number(gsap.getProperty(el, 'scale')) || 1;
            var d0 = (el.offsetWidth || r.width) * escala;
            var c0 = centro(r);

            var destino = puntoPelotaGif(aroConjunto, meta);
            if (!destino) return;

            var clon = el.cloneNode(true);
            clon.removeAttribute('id');
            clon.removeAttribute('hidden');
            clon.className = 'coord-pelota-vuelo';
            clon.style.cssText = '';
            cont.appendChild(clon);
            var giroIni = Number(gsap.getProperty(el, 'rotation')) || 0;
            gsap.set(clon, {
                left: c0.x - rc.left - d0 / 2,
                top: c0.y - rc.top - d0 / 2,
                width: d0,
                height: d0,
                rotation: giroIni
            });
            // La real desaparece en este mismo cuadro (la lógica la oculta en el siguiente).
            el.style.visibility = 'hidden';

            var d1 = destino.d;
            var x1 = destino.x - rc.left - d1 / 2;
            var y1 = destino.y - rc.top - d1 / 2;
            var yIni = c0.y - rc.top - d0 / 2;
            var arco = Math.max(50, Math.abs((c0.x - rc.left) - x1) * 0.22);
            var yCima = Math.min(yIni, y1) - arco;
            // Termina "derecha" (múltiplo de 360) como la pelota del GIF.
            var giroFin = Math.ceil((giroIni + 300) / 360) * 360;

            vuelo = { el: el, clon: clon, conjunto: aroConjunto, llego: false, gif: null, meta: meta };
            var esteVuelo = vuelo;
            vuelo.tl = gsap.timeline({
                onComplete: function () {
                    if (vuelo !== esteVuelo) return;
                    esteVuelo.llego = true;
                    // Exito normal: el GIF ya fue pedido → cambiar ahora.
                    // Demo: la pelota se queda posada en el aro hasta que se pida.
                    if (esteVuelo.gif) arrancarGif(esteVuelo);
                }
            })
                .to(clon, { left: x1, width: d1, height: d1, duration: 0.42, ease: 'power1.inOut' }, 0)
                .to(clon, { top: yCima, duration: 0.21, ease: 'power2.out' }, 0)
                .to(clon, { top: y1, duration: 0.21, ease: 'power2.in' }, 0.21)
                .to(clon, { rotation: giroFin, duration: 0.42, ease: 'power1.out' }, 0);
        },

        // La lógica acaba de pedir el GIF del enceste (mostrarAroEnceste). Si hay una
        // pelota volando/posada, el aro normal sigue a la vista y el GIF espera oculto
        // hasta que la pelota esté en su sitio.
        gifEnceste: function (aroImg, aroGif) {
            if (!activo || !vuelo || !aroGif) return;
            vuelo.gif = { img: aroGif, src: aroGif.getAttribute('src') };
            if (vuelo.conjunto) vuelo.conjunto.classList.add('coord-gif-espera');
            if (vuelo.llego) arrancarGif(vuelo);
        },

        // Contador del HUD: salta cuando cambia el recorrido.
        progreso: function (el) {
            if (!activo || !el) return;
            var txt = el.textContent;
            var prev = el.__coordPrev;
            el.__coordPrev = txt;
            if (prev === undefined || prev === txt || el.hidden) return;
            gsap.killTweensOf(el);
            gsap.fromTo(el, { scale: 1.4 }, {
                scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)', clearProps: 'transform'
            });
        },

        // Fin del juego: confeti y estrellas sobre el escenario.
        celebrar: function (el, wrap) {
            if (!activo) return;
            if (el) {
                detenerHalo(el);
                quitarAlerta(el);
            }
            if (fx()) fx().celebracion(rectUtil(wrap));
        }
    };

    global.CoordAnim = CoordAnim;
})(window);
