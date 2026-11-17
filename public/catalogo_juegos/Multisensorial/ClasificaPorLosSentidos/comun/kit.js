/**
 * SentidosKit — piezas comunes de los motores de «Clasifica por los sentidos».
 * NO es un motor: cada juego trae su mundo y su gesto (arbol.js, rio.js, escoba.js, portero.js,
 * ascensor.js, tuberias.js). Aquí vive lo igual en los 6: los 4 niveles (el reto del documento en
 * uno de los niveles 1-3), el flujo continuo de objetos (sacar), la validación (clasificar), las
 * voces de acierto y de error, lo que "hace" cada sentido (propiedad), la demo y la fiesta final.
 *
 * Reutiliza la base de MemoriaAuditiva/comun/kit.js (MemoriaKit.BASE: estrellas, presentador 3D,
 * cartel, insignia, crearCosa, saltarA, motes…) y, a través de ella, base.js de Pareja, vida.js y
 * personajes3d.js de Asocia. Los órganos vivos (ojo, oreja, nariz, lengua, mano) son PedniaOrganos.
 *
 *   SentidosKit.crear({ id, fondo, escena: {
 *       armar(reubicar)          dibuja el mundo (y lo reubica al cambiar el tamaño)
 *       prepararNivel(i, nv)     deja la escena lista para el nivel (sin objetos todavía)
 *       arrancar(nv)             empieza a llegar objetos (el mundo llama this.sacar())
 *       alTocar/alMover/alSoltar(p), paso(t, dt)
 *       alAcertar(id, destino, p) / alFallar(id, destino, p)
 *       alTerminarNivel(i, nv), demoPaso(), mostrarPista(cancelada), escenaFinal(), estadoExtra()
 *   } })
 *
 * El mundo llama this.clasificar(id, sentido, punto) → Promise<boolean>.
 */
(function (global) {
    'use strict';

    var MK = global.MemoriaKit;
    var B = global.PedniaParejaBase;
    var Ut = B.util;
    var A = global.PedniaArte;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var mezclar = Ut.mezclar;

    var ORGANO = { vista: 'ojo', oido: 'oreja', olfato: 'nariz', gusto: 'lengua', tacto: 'mano' };
    var NOMBRE = { vista: 'VISTA', oido: 'OÍDO', olfato: 'OLFATO', gusto: 'GUSTO', tacto: 'TACTO' };
    var DEL = { vista: 'de la VISTA', oido: 'del OÍDO', olfato: 'del OLFATO', gusto: 'del GUSTO', tacto: 'del TACTO' };
    var COLOR = { vista: 0x4dabf7, oido: 0xfcc419, olfato: 0xcc5de8, gusto: 0xff922b, tacto: 0x51cf66 };
    /** Cómo se percibe cada sentido (para las frases que se arman solas). */
    var COMO = {
        vista: 'se mira con los ojos', oido: 'se escucha con los oídos', olfato: 'se huele con la nariz',
        gusto: 'se saborea con la boca', tacto: 'se siente con las manos'
    };

    var FRASES_NIVEL = [
        null,
        { voz: 'zeus', texto: '¡Muy bien! Ahora llegan más cosas.' },
        { voz: 'zoe', texto: '¡Más rápido! Fíjate bien en cada una.' },
        { voz: 'zeus', texto: '¡Último nivel! ¡Tú puedes!' }
    ];
    var FRASES_ACIERTO = ['¡Muy bien!', '¡Eso es!', '¡Excelente!', '¡Sí señor!'];

    /** Dificultad de los 4 niveles. meta: aciertos para pasar; vis: objetos a la vez; vel: ritmo. */
    var DIF34 = [{ meta: 2, vis: 3, vel: 1 }, { meta: 3, vis: 3, vel: 1.2 }, { meta: 3, vis: 4, vel: 1.45 }, { meta: 4, vis: 4, vel: 1.7 }];
    var DIF56 = [{ meta: 4, vis: 1, vel: 1 }, { meta: 5, vis: 2, vel: 1.2 }, { meta: 6, vis: 2, vel: 1.45 }, { meta: 7, vis: 3, vel: 1.7 }];

    function mayus(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
    function elegirDe(lista) { return lista[(Math.random() * lista.length) | 0]; }

    var S = {
        preload: function () {
            var self = this;
            var els = this.config.elementos || {};
            Object.keys(els).forEach(function (id) {
                var src = els[id].img;
                if (!src || self.textures.exists('el_' + id)) return;
                if (/\.svg$/i.test(src)) self.load.svg('el_' + id, src, { width: 320, height: 320 });
                else self.load.image('el_' + id, src);
            });
            var ins = this.nivel && this.nivel.insignia && this.nivel.insignia.img;
            if (ins && !self.textures.exists('insignia_cfg')) self.load.svg('insignia_cfg', ins, { width: 420, height: 420 });
            if (!self.textures.exists('pa:estrella@256')) self.load.svg('pa:estrella@256', '../../AsociaSonidoEImagen/comun/estrella.svg', { width: 256, height: 256 });
            if (this.precargar) this.precargar();
        },

        tocaBocina: function () { return false; },

        /* ── Piezas de escenario comunes ── */

        limpiarEscenario: function () {
            this.organos = [];
            return MK.BASE.limpiarEscenario.call(this);
        },

        /** Órgano vivo del sentido (ojo, oreja, nariz, lengua, mano) que respira y reacciona. */
        organoNuevo: function (keep, s, x, y, r, depth) {
            var o = global.PedniaOrganos.crear(this, ORGANO[s], x, y, r, { color: COLOR[s], burbuja: false, id: s });
            o.cont.setDepth(depth || 41);
            keep(o.cont);
            (this.organos = this.organos || []).push(o);
            return o;
        },

        organoDe: function (s) { return (this.organos || []).filter(function (o) { return o.id === s && o.cont.active; })[0]; },

        /** Canasta tejida con el órgano del sentido asomando; los objetos entran por `boca`. */
        canasta: function (keep, s, x, y, w) {
            var h = w * 0.62;
            var col = COLOR[s] || 0xffffff;
            var atras = keep(this.add.graphics().setDepth(40));
            atras.fillStyle(0x000000, 0.16);
            atras.fillEllipse(x, y + h * 0.52, w * 1.08, h * 0.2);
            atras.lineStyle(Math.max(6, w * 0.05), 0xa9743b, 1);
            atras.beginPath(); atras.arc(x, y - h * 0.1, w * 0.4, Math.PI, 0); atras.strokePath();
            var organo = this.organoNuevo(keep, s, x, y - h * 0.34, w * 0.3, 41);
            var f = keep(this.add.graphics().setDepth(42));
            var a = { x: x - w / 2, y: y - h * 0.2 }, b = { x: x + w / 2, y: y - h * 0.2 };
            var c = { x: x + w * 0.4, y: y + h / 2 }, d = { x: x - w * 0.4, y: y + h / 2 };
            f.fillStyle(0xd9a05b, 1);
            f.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
            f.fillTriangle(a.x, a.y, c.x, c.y, d.x, d.y);
            f.lineStyle(3, 0xa9743b, 0.8);
            for (var i = 1; i < 6; i++) f.lineBetween(a.x + (b.x - a.x) * i / 6, a.y, d.x + (c.x - d.x) * i / 6, d.y);
            for (var j = 1; j < 4; j++) f.lineBetween(a.x + (d.x - a.x) * j / 4, a.y + (d.y - a.y) * j / 4, b.x + (c.x - b.x) * j / 4, b.y + (c.y - b.y) * j / 4);
            f.fillStyle(col, 1);
            f.fillRoundedRect(x - w * 0.54, y - h * 0.29, w * 1.08, h * 0.15, h * 0.07);
            f.fillStyle(0xffffff, 0.3);
            f.fillRoundedRect(x - w * 0.5, y - h * 0.27, w * 0.7, h * 0.04, h * 0.02);
            return { x: x, y: y, w: w, h: h, boca: { x: x, y: y - h * 0.18 }, organo: organo, s: s };
        },

        /** El objeto salta a la canasta, se achica y desaparece dentro. */
        entrarCanasta: async function (a, c) {
            if (!a || !a.cont || !a.cont.active) return;
            a.cont.setDepth(41.5);
            await this.saltarA(a.cont, c.boca.x, c.boca.y, { ms: 560, alto: 110, esc: 0.42 });
            if (!a.cont.active) return;
            if (c.organo && c.organo.reaccion) c.organo.reaccion('acierto');
            await tw(this, { targets: a.cont, alpha: 0, scale: 0.2, duration: 160 });
            if (a.cont.active) a.cont.destroy();
        },

        /** Tubo de ensayo: capa de cristal y líquido (0..1) del color del sentido; t = {x, y, w, h} (centro). */
        pintarTubo: function (g, s, t, frac, sel) {
            var x = t.x - t.w / 2, y = t.y - t.h / 2, r = t.h / 2;
            g.fillStyle(0xffffff, 0.6);
            g.fillRoundedRect(x, y, t.w, t.h, r);
            if (frac > 0) {
                var x0 = x + t.h * 0.95, ancho = Math.max(t.h * 0.5, (x + t.w - 8 - x0) * Math.min(1, frac));
                g.fillStyle(COLOR[s] || 0x4dabf7, 0.9);
                g.fillRoundedRect(x0, y + 7, ancho, t.h - 14, Math.max(4, r - 7));
            }
            g.lineStyle(sel ? 9 : 5, sel ? 0xffd43b : (COLOR[s] || 0xffffff), 1);
            g.strokeRoundedRect(x, y, t.w, t.h, r);
            g.fillStyle(0xffffff, 0.45);
            g.fillRoundedRect(x + t.h * 0.95, y + 10, t.w - t.h * 1.1, t.h * 0.1, t.h * 0.05);
        },

        /** Fondo de laboratorio: pared de azulejos, ventana y piso. yPiso = donde empieza el suelo. */
        fondoLab: function (keep, yPiso, colorPared) {
            var L = this.L;
            var g = keep(this.add.graphics().setDepth(0));
            g.fillStyle(colorPared || 0xd0ebff, 1); g.fillRect(0, 0, L.W, yPiso);
            g.lineStyle(2, 0xffffff, 0.55);
            for (var x = 0; x < L.W; x += 70) g.lineBetween(x, 0, x, yPiso);
            for (var y = 0; y < yPiso; y += 70) g.lineBetween(0, y, L.W, y);
            g.fillStyle(0xadb5bd, 1); g.fillRect(0, yPiso, L.W, L.H - yPiso);
            g.fillStyle(0xced4da, 1);
            for (var i = 0; i < L.W; i += 120) g.fillRect(i, yPiso + 10, 60, L.H - yPiso);
            g.fillStyle(0x868e96, 1); g.fillRect(0, yPiso, L.W, 8);
            return g;
        },

        /** Aparecen los objetos de la partida en `lugares` celebrando (propiedad + saltitos + órgano). */
        celebrarObjetos: async function (ids, lugares, tam) {
            var self = this;
            var cosas = ids.map(function (id, i) {
                var a = self.crearCosa(id, lugares[i].x, lugares[i].y, tam, { depth: 60 });
                a.cont.setScale(0);
                return a;
            });
            for (var i = 0; i < cosas.length; i++) {
                if (!this.sigue()) return cosas;
                var a = cosas[i];
                tw(this, { targets: a.cont, scale: 1, duration: 320, ease: 'Back.easeOut' });
                this.propiedad(a.id, { x: a.cont.x, y: a.cont.y }, { etiqueta: false });
                var o = this.organoDe(this.sentidoDe(a.id));
                if (o) o.reaccion('acierto');
                a.saltito(0.25, 2);
                await esperar(this, 700);
            }
            return cosas;
        },

        hojasCaen: function (x, y, n) {
            for (var i = 0; i < n; i++) {
                var h = this.add.rectangle(x + (Math.random() - 0.5) * 80, y, 12, 7, [0x51cf66, 0x2f9e44, 0x8ce99a][i % 3]).setDepth(75);
                h.angle = Math.random() * 360;
                this.tweens.add({
                    targets: h, y: y + 110 + Math.random() * 90, x: h.x + (Math.random() - 0.5) * 120, angle: h.angle + 240,
                    alpha: { from: 1, to: 0 }, duration: 900 + Math.random() * 400, ease: 'Sine.easeIn',
                    onComplete: function () { h.destroy(); }
                });
            }
        },

        /** Espera a que se cumpla una condición (o el tiempo máximo). */
        hasta: async function (cond, max) {
            var t0 = this.time.now;
            while (!cond() && this.sigue() && this.time.now - t0 < (max || 3000)) await esperar(this, 100);
        },

        /** HUD: 4 estrellas de nivel arriba al centro + presentador 3D (L.pres o null). */
        montarHud: function (keep) {
            var L = this.L;
            this.estrellas = [];
            var tam = Math.max(28, Math.min(38, Math.round(L.H * 0.05)));
            var ancho = 4 * tam + 3 * 10;
            var x0 = Math.round((L.W - ancho) / 2);
            var y0 = 14;
            keep(this.add.rectangle(x0 + ancho / 2, y0 + tam / 2, ancho + 28, tam + 18, 0x12263f, 0.6).setStrokeStyle(3, 0xffffff, 0.5).setDepth(79));
            for (var i = 0; i < 4; i++) {
                var e = keep(this.add.image(x0 + i * (tam + 10) + tam / 2, y0 + tam / 2, A.textura(this, 'estrella', 64)).setDisplaySize(tam, tam).setDepth(80));
                if (i >= this.nivelActual) e.setTint(0x8a8f98).setAlpha(0.55);
                this.estrellas.push(e);
            }
            this.montarPresentador();
        },

        /* ── Datos ── */

        el: function (id) { return (this.config.elementos || {})[id] || { nombre: id }; },
        sentidoDe: function (id) { return this.el(id).sentido; },
        nombreDe: function (id) { return this.el(id).nombre || id; },
        organo: function (s) { return ORGANO[s] || 'ojo'; },
        colorDe: function (s) { return COLOR[s] || 0xffffff; },
        tubos: function () { return (this.reto.tubos || []).slice(); },

        /** Ids que pueden salir en la partida (con textura y sin marca soloOficial). */
        poolBase: function () {
            var self = this;
            var els = this.config.elementos || {};
            var pool = Object.keys(els).filter(function (id) { return els[id].sentido && !els[id].soloOficial && self.textures.exists('el_' + id); });
            if (this.filtrarPool) pool = this.filtrarPool(pool);
            return pool;
        },

        /* ── Niveles ── */

        planNiveles: function () {
            var self = this;
            var r = this.reto;
            var tubos = this.tubos();
            var pool = this.poolBase();
            var difs = r.dificultad || (tubos.length === 1 ? DIF34 : DIF56);
            var plan = difs.map(function (d) {
                var nv = { tubos: tubos, meta: d.meta, vis: d.vis, vel: d.vel, cola: [], hechos: 0 };
                if (tubos.length === 1) {
                    nv.buenos = pool.filter(function (id) { return self.sentidoDe(id) === tubos[0]; });
                    nv.malos = pool.filter(function (id) { return self.sentidoDe(id) !== tubos[0]; });
                } else {
                    nv.porTubo = {};
                    tubos.forEach(function (t) { nv.porTubo[t] = pool.filter(function (id) { return self.sentidoDe(id) === t; }); });
                    nv.cuenta = {};
                    tubos.forEach(function (t) { nv.cuenta[t] = 0; });
                }
                return nv;
            });
            // El reto del documento va en uno de los niveles 1-3 (distinto de la partida anterior).
            var claveLS = 'sentidos_oficial_' + (global.location && global.location.pathname);
            var antes = -1;
            try { antes = +global.localStorage.getItem(claveLS); } catch (e) { /* sin almacenamiento */ }
            var pos;
            for (var k = 0; k < 6; k++) { pos = (Math.random() * 3) | 0; if (pos !== antes) break; }
            try { global.localStorage.setItem(claveLS, String(pos)); } catch (e) { /* sin almacenamiento */ }
            var oficiales = r.opciones || (r.piezas || []).map(function (p) { return p.id; });
            if (oficiales.length) {
                var nv = plan[pos];
                nv.oficial = true;
                nv.cola = mezclar(oficiales);
                if (tubos.length === 1) {
                    nv.meta = Math.max(nv.meta, oficiales.filter(function (id) { return self.sentidoDe(id) === tubos[0]; }).length);
                    nv.vis = Math.max(nv.vis, Math.min(oficiales.length, 4));
                } else {
                    nv.meta = Math.max(nv.meta, oficiales.length);
                }
            }
            return plan;
        },

        /**
         * El siguiente objeto que llega. visibles: ids que ya están en escena (para no repetirlos).
         * 3-4: siempre hay al menos uno del sentido de la canasta. 5-6: se reparten entre los tubos.
         */
        sacar: function (visibles) {
            var nv = this.nv;
            if (!nv) return null;
            visibles = visibles || [];
            if (nv.cola && nv.cola.length) return nv.cola.shift();
            var libres = function (l) {
                var f = l.filter(function (id) { return visibles.indexOf(id) < 0 && id !== nv.ultimo; });
                return f.length ? f : l;
            };
            var id;
            var self = this;
            if (nv.tubos.length === 1) {
                var s = nv.tubos[0];
                var hayBueno = visibles.some(function (v) { return self.sentidoDe(v) === s; });
                var lista = (!hayBueno || Math.random() < 0.4) ? nv.buenos : nv.malos;
                id = elegirDe(libres(lista.length ? lista : nv.buenos));
            } else {
                // el tubo con menos objetos hasta ahora tiene más chance (que se usen todos)
                var t = nv.tubos.slice().sort(function (a, b) { return (nv.cuenta[a] - nv.cuenta[b]) + (Math.random() - 0.5) * 1.5; })[0];
                if (!nv.porTubo[t].length) t = nv.tubos.filter(function (x) { return nv.porTubo[x].length; })[0];
                nv.cuenta[t] += 1;
                id = elegirDe(libres(nv.porTubo[t]));
            }
            nv.ultimo = id;
            return id;
        },

        jugarNivel: async function (i, nv) {
            var self = this;
            this.nv = nv;
            this.aciertosNivel = 0;
            this.erroresNivel = 0;
            this.ayuda = false;
            this.fase = 'preparando';
            if (i > 0) await this.cartel(i + 1);
            if (this.prepararNivel) await this.prepararNivel(i, nv);
            if (!this.sigue()) return;
            if (i === 0) {
                await this.ctx.decir(this.reto.presentacion, { minMs: 900 });
                if (this.reto.pregunta && this.sigue()) await this.ctx.decir(this.reto.pregunta, { minMs: 700 });
            } else if (FRASES_NIVEL[i]) {
                this.ctx.decir(FRASES_NIVEL[i], { minMs: 600 });
            }
            if (!this.sigue()) return;
            var hecho = new Promise(function (r) { self.resolverNivel = r; });
            this.fase = 'jugar';
            this.t0Nivel = this.time.now;
            if (this.arrancar) await this.arrancar(nv);
            this.pista.reiniciar();
            await hecho;
            this.resolverNivel = null;
            this.pista.parar();
            this.fase = 'entre';
            if (this.alTerminarNivel) await this.alTerminarNivel(i, nv);
        },

        /** Lo que se busca ahora (para pistas y ayudas): en 3-4, los del sentido de la canasta. */
        esCorrecto: function (id, destino) { return !!id && this.sentidoDe(id) === destino; },

        /* ── Voces (sin cortar el juego: nunca bloquean el flujo) ── */

        hablar: function (linea, prioridad) {
            if (!linea || !linea.texto || (this.nv && this.nv.demo)) return;
            var ahora = this.time.now;
            if (!prioridad && ahora < (this.vozHasta || 0)) return;
            this.vozHasta = ahora + Math.min(6000, 1400 + linea.texto.length * 55);
            this.ctx.decir(linea, { minMs: 600 });
        },

        lineaAcierto: function (id, destino) {
            var r = this.reto;
            var nv = this.nv || {};
            if (nv.oficial && !nv.dichoOficial && r.acierto && r.acierto.texto) {
                var ofi = r.opciones ? [r.correcto] : null;
                if (!ofi || ofi.indexOf(id) >= 0) {
                    // en 5-6 la frase del documento («Clasificaste…») va cuando se termina el nivel oficial
                    if (r.opciones || this.aciertosNivel >= nv.meta) { nv.dichoOficial = true; return { linea: r.acierto, prio: true }; }
                }
            }
            if (this.aciertosNivel % 2 === 0 && this.aciertosNivel < nv.meta) return null;   // no hablar en cada acierto
            var frase = FRASES_ACIERTO[(this.nivelActual + this.aciertosNivel) % FRASES_ACIERTO.length] + ' ' + mayus(this.nombreDe(id)) + ' ' + (COMO[destino] || '') + '.';
            return { linea: { voz: this.aciertosNivel % 2 ? 'zoe' : 'zeus', texto: frase }, prio: false };
        },

        lineaError: function (id, destino) {
            var r = this.reto;
            var real = this.sentidoDe(id);
            var doc = (r.errores || []).filter(function (e) { return (e.objetos || []).indexOf(id) >= 0; })[0];
            if (doc && doc.texto) return doc;
            if (this.tubos().length === 1) {
                return { voz: 'zeus', texto: '¡' + mayus(this.nombreDe(id)) + ' ' + (COMO[real] || '') + '! Busca lo que ' + (COMO[destino] || '') + '.' };
            }
            if (r.errorOtro && Math.random() < 0.3) return r.errorOtro;
            return { voz: 'zeus', texto: '¡' + mayus(this.nombreDe(id)) + ' ' + (COMO[real] || '') + '! Va en el tubo ' + (DEL[real] || '') + '.' };
        },

        /* ── Clasificar ── */

        clasificar: async function (id, destino, punto) {
            if (this.fase !== 'jugar') return false;
            this.pista.reiniciar();
            var p = punto || { x: this.L.W / 2, y: this.L.H / 2 };
            var nv = this.nv;
            if (this.esCorrecto(id, destino)) {
                this.aciertosNivel += 1;
                nv.hechos = (nv.hechos || 0) + 1;
                if (!nv.demo) (this.reunidos = this.reunidos || []).push({ id: id, destino: destino });
                this.reaccion('Celebrar', 2000);
                MK.efecto(this, 'recompensa');
                Ut.estallido(this, p.x, p.y, { n: 12, tex: 'estrella', tam: 26, dist: 140, sinTinte: true, depth: 85 });
                if (this.vidaAmb && this.vidaAmb.reaccionar) this.vidaAmb.reaccionar('acierto', p);
                this.propiedad(id, p);
                var la = this.lineaAcierto(id, destino);
                if (la) this.hablar(la.linea, la.prio);
                if (this.alAcertar) await this.alAcertar(id, destino, p);
                if (nv.demo) return true;
                if (this.aciertosNivel >= nv.meta && this.fase === 'jugar') {
                    this.fase = 'premio';
                    if (this.alCompletar) await this.alCompletar(nv);
                    await esperar(this, 700);
                    var t0 = this.time.now;
                    while (this.time.now < (this.vozHasta || 0) - 800 && this.time.now - t0 < 4000 && this.sigue()) await esperar(this, 150);
                    if (this.resolverNivel) this.resolverNivel();
                }
                return true;
            }
            this.errores += 1;
            this.erroresNivel += 1;
            this.reaccion('Decir_no', 1500);
            MK.efecto(this, 'suave');
            this.propiedad(id, p);
            if (this.vidaAmb && this.vidaAmb.reaccionar) this.vidaAmb.reaccionar('error', p);
            if (!nv.demo) this.hablar(this.lineaError(id, destino), this.time.now - (this.ultimoError || -99999) > 5000);
            this.ultimoError = this.time.now;
            if (this.alFallar) await this.alFallar(id, destino, p);
            if (this.erroresNivel >= 3) this.ayuda = true;
            return false;
        },

        /**
         * Lo que "hace" cada objeto según su sentido, en (x, y): el tambor suena, el sol brilla,
         * el perfume suelta aroma, el helado dice ñam, la lija raspa. Así el niño aprende sin castigo.
         */
        propiedad: function (id, p, o) {
            o = o || {};
            var s = this.sentidoDe(id);
            var e = this.el(id);
            var self = this;
            var d = o.depth || 72;
            if (s === 'oido') {
                if (this.ctx.sonido) this.ctx.sonido(id, { breve: true });
                Ut.notas(this, p.x, p.y - 20, 4);
            } else if (s === 'vista') {
                MK.efecto(this, 'brillo');
                Ut.estallido(this, p.x, p.y, { n: 10, tex: 'chispa', tam: 30, dist: 110, depth: d, colores: [0xfff3bf, 0xffd43b, 0x74c0fc, 0xffffff] });
                var halo = this.add.circle(p.x, p.y, 40, 0xfff9db, 0.7).setDepth(d - 1);
                tw(this, { targets: halo, scale: 2.6, alpha: 0, duration: 650 }).then(function () { halo.destroy(); });
            } else if (s === 'olfato') {
                MK.efecto(this, 'aroma');
                Ut.aroma(this, p.x, p.y - 10, { n: 6, color: 0xcc5de8, tam: 34, alto: 120, depth: d });
            } else if (s === 'gusto') {
                MK.efecto(this, 'nam');
                Ut.estallido(this, p.x, p.y - 10, { n: 6, tex: 'corazon', tam: 26, dist: 90, depth: d, angulo: -Math.PI / 2, abanico: 1.6 });
            } else if (s === 'tacto') {
                var aspero = e.efecto === 'rasposo';
                MK.efecto(this, aspero ? 'rasposo' : 'suavecito');
                var g = this.add.graphics().setDepth(d);
                var k = { t: 0 };
                tw(this, {
                    targets: k, t: 1, duration: 700,
                    onUpdate: function () {
                        g.clear();
                        for (var i = 0; i < 3; i++) {
                            var f = (k.t + i * 0.25) % 1;
                            g.lineStyle(4, aspero ? 0x8d6e63 : 0x63e6be, 1 - f);
                            if (aspero) {
                                g.beginPath();
                                var r = 30 + f * 60;
                                for (var a = 0; a <= 24; a++) {
                                    var ang = a / 24 * Math.PI * 2;
                                    var rr = r + (a % 2 ? 6 : -6);
                                    if (a === 0) g.moveTo(p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr);
                                    else g.lineTo(p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr);
                                }
                                g.strokePath();
                            } else g.strokeCircle(p.x, p.y, 30 + f * 60);
                        }
                    }
                }).then(function () { g.destroy(); });
            }
            if (o.etiqueta === false) return;
            // el órgano del sentido aparece un instante sobre el objeto (sin texto: para no lectores)
            var ic = this.add.image(p.x + 46, p.y - 46, A.textura(this, ORGANO[s] === 'lengua' ? 'boca' : (ORGANO[s] || 'ojo'), 96)).setDisplaySize(10, 10).setDepth(d + 1);
            var fondo = this.add.circle(p.x + 46, p.y - 46, 8, 0xffffff, 0.95).setStrokeStyle(3, COLOR[s] || 0xffffff).setDepth(d);
            tw(self, { targets: [ic], displayWidth: 46, displayHeight: 46, duration: 220, ease: 'Back.easeOut' });
            tw(self, { targets: [fondo], radius: 30, duration: 220, ease: 'Back.easeOut' })
                .then(function () { return esperar(self, 800); })
                .then(function () { return tw(self, { targets: [ic, fondo], alpha: 0, duration: 260 }); })
                .then(function () { ic.destroy(); fondo.destroy(); });
        },

        /* ── Demostración: mismo mundo y gesto, con los objetos de config.demo ── */

        nivelDemo: function () {
            var d = this.config.demo || {};
            var ids = (d.ids || []).filter(function (x) { return !!x; });
            var tubos = this.tubos();
            var self = this;
            var buenos = ids.filter(function (id) { return tubos.indexOf(self.sentidoDe(id)) >= 0; });
            return { demo: true, tubos: tubos, meta: 99, vis: ids.length, vel: 0.6, cola: ids.slice(), buenos: buenos, malos: [], porTubo: {}, cuenta: {}, hechos: 0 };
        },

        demo: async function () {
            var ctx = this.ctx;
            var t = ctx.textos || {};
            var self = this;
            var sigue = function () { return self.sigue() && ctx.vivo() && ctx.enDemo(); };
            this.fase = 'demo';
            await ctx.decir({ voz: 'zeus', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 1400 });
            if (!sigue()) return this.salirDemo();
            var nv = this.nivelDemo();
            this.nv = nv;
            this.aciertosNivel = 0;
            this.erroresNivel = 0;
            if (this.prepararNivel) await this.prepararNivel(-1, nv);
            if (!sigue()) return this.salirDemo();
            this.fase = 'jugar';
            if (this.arrancar) await this.arrancar(nv);
            this.pista.parar();
            await esperar(this, 500);
            var pasos = this.demoPaso ? this.demoPaso() : null;
            if (pasos && !Array.isArray(pasos)) pasos = [pasos];
            for (var i = 0; pasos && i < pasos.length; i++) {
                var p = typeof pasos[i] === 'function' ? pasos[i]() : pasos[i];
                if (!p || !sigue()) break;
                var o = { punto: p.desde, holdMs: p.mantener || 300 };
                if (p.hasta) o.arrastre = { dx: p.hasta.x - p.desde.x, dy: p.hasta.y - p.desde.y, durMs: p.durMs || 900 };
                await ctx.mano(o);
                if (!sigue()) break;
                await p.hacer();
                await esperar(this, 300);
            }
            this.pista.parar();
            if (!sigue()) return this.salirDemo();
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se clasifica!' }, { estado: 'acierto', minMs: 1000 });
            this.fase = 'entre';
            if (this.alTerminarNivel) await this.alTerminarNivel(-1, nv);
            if (sigue()) await ctx.decir({ voz: 'zeus', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 900 });
            this.salirDemo();
        },

        salirDemo: function () {
            if (this.ctx.quitarMano) this.ctx.quitarMano();
            this.fase = 'intro';
            this.nv = null;
            this.errores = 0;
            this.arrastrando = null;
            this.pista.parar();
            this.reunidos = [];
            if (this.alSalirDemo) this.alSalirDemo();
        },

        /** Los objetos reunidos en la partida, sin repetir (para la escena final). */
        reunidosUnicos: function (max) {
            var vistos = {};
            return (this.reunidos || []).filter(function (r) {
                if (vistos[r.id]) return false;
                vistos[r.id] = 1;
                return true;
            }).slice(0, max || 99);
        },

        /** Mano que lleva de a hasta b (pista con ayuda). */
        manoDe: function (cancelada, a, b, extra) {
            var self = this;
            var o = { punto: a, holdMs: 200, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } };
            if (b) o.arrastre = { dx: b.x - a.x, dy: b.y - a.y, durMs: 900 };
            if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
            return this.ctx.mano(o);
        },

        estado: function () {
            var nv = this.nv || {};
            var e = {
                fase: this.fase, nivel: this.nivelActual, tubos: nv.tubos, meta: nv.meta, oficial: !!nv.oficial,
                aciertos: this.aciertosNivel || 0, errores: this.errores, demo: !!nv.demo
            };
            if (this.estadoExtra) e.extra = this.estadoExtra();
            return e;
        }
    };

    /** Frases que se arman solas (para pedir la voz con tiempo): aciertos y errores de cada objeto. */
    function frases(config, nivel) {
        var out = [];
        var els = config.elementos || {};
        var reto = (nivel.retos || [])[0] || {};
        var tubos = reto.tubos || [];
        Object.keys(els).forEach(function (id) {
            var e = els[id];
            if (!e.sentido) return;
            var N = mayus(e.nombre || id);
            if (tubos.indexOf(e.sentido) >= 0) {
                FRASES_ACIERTO.forEach(function (f) { out.push({ texto: f + ' ' + N + ' ' + COMO[e.sentido] + '.', personaje: 'zoe' }); });
            }
            if (tubos.length === 1) out.push({ texto: '¡' + N + ' ' + COMO[e.sentido] + '! Busca lo que ' + COMO[tubos[0]] + '.', personaje: 'zeus' });
            else out.push({ texto: '¡' + N + ' ' + COMO[e.sentido] + '! Va en el tubo ' + DEL[e.sentido] + '.', personaje: 'zeus' });
        });
        FRASES_NIVEL.forEach(function (l) { if (l) out.push({ texto: l.texto, personaje: l.voz }); });
        return out;
    }

    function crear(def) {
        var esc = {};
        Object.keys(MK.BASE).forEach(function (k) { esc[k] = MK.BASE[k]; });
        Object.keys(S).forEach(function (k) { esc[k] = S[k]; });
        Object.keys(def.escena).forEach(function (k) {
            if (k === 'create' || k === 'update' || k === 'preload') return;
            esc[k] = def.escena[k];
        });
        var pasoMundo = def.escena.paso;
        esc.paso2 = function (t, dt) {
            (this.organos || []).forEach(function (o) { if (o.cont && o.cont.active) o.actualizar(t); });
            if (pasoMundo) pasoMundo.call(this, t, dt);
        };
        var b = 'body.modo-' + def.id;
        var css = b + ' #opciones,' + b + ' .centro,' + b + ' .pj{display:none !important}' +
            b + ' .cabecera{position:fixed;top:10px;left:12px;width:min(440px,44vw);padding:0;z-index:8;pointer-events:none}' +
            b + ' .dialogo{min-height:0;padding:4px 14px 4px 4px;border-width:3px}' +
            b + ' .enunciado{font-size:clamp(16px,2.2vh,22px);line-height:1.25;margin:0}' +
            b + ' .dialogo-avatar{width:46px;height:46px}';
        return B.crearMotor({ id: def.id, fondo: def.fondo || '#a5d8ff', css: css, escena: esc });
    }

    global.SentidosKit = {
        crear: crear, frases: frases,
        ORGANO: ORGANO, NOMBRE: NOMBRE, DEL: DEL, COLOR: COLOR, COMO: COMO,
        ruido: MK.ruido, tono: MK.tono, efecto: MK.efecto
    };
})(typeof window !== 'undefined' ? window : this);
