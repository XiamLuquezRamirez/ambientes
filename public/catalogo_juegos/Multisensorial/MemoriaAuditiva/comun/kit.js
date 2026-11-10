/**
 * MemoriaKit — piezas compartidas por los motores propios de Memoria auditiva.
 * NO es un motor: cada juego trae su mundo y su gesto en su carpeta (burbuja.js, canasta.js…).
 * Aquí vive lo que es igual en los 10: la lógica de memoria (niveles por tipo de reto, reproducir
 * las secuencias con las opciones ocultas, validar), la bocina, las estrellas, el presentador 3D,
 * la celebración, la fiesta final con insignia y las ayudas de animación.
 *
 * Reutiliza piezas de otras temáticas (sin copiarlas): EncuentraLaPareja/comun/base.js (crearMotor),
 * AsociaSonidoEImagen/comun/kit.js (pintores y ruidos: global.AsociaKit), vida.js (ambiente vivo)
 * y personajes3d.js (Zeus/Zoe en 3D).
 *
 *   MemoriaKit.crear({ id, fondo, escena: {
 *       armar(reubicar)            dibuja el mundo (y lo reubica al cambiar el tamaño)
 *       prepararNivel(i, nv)       deja la escena lista, con las opciones ocultas
 *       alSonar(id, k, vuelta)     opcional: qué pasa en el mundo mientras suena cada sonido (sin delatarlo)
 *       alSegundaVuelta()          opcional: entre la primera y la segunda reproducción
 *       mostrarOpciones(nv)        aparecen las opciones y empieza el gesto del niño
 *       alTocar/alMover/alSoltar(p), paso(t, dt), escenaFinal(), mostrarPista(cancelada)
 *   } })
 *
 * El juego llama this.elegir(id) (una respuesta) o this.marcar(id) (varias); el kit valida y llama
 * al juego: alAcertar(ids) / alFallar(id) / alMarcar(id, bien). Luego this.seguir() pasa de nivel.
 */
(function (global) {
    'use strict';

    var B = global.PedniaParejaBase;
    var Ut = B.util;
    var A = global.PedniaArte;
    var P = global.AsociaKit;           // pintores y ruidos (AsociaSonidoEImagen/comun/kit.js)
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var mezclar = Ut.mezclar;
    var rnd = Ut.rnd;

    function efecto(scene, n) { if (scene.ctx && scene.ctx.efecto) scene.ctx.efecto(n); }

    var FRASES_ACIERTO = [
        { voz: 'zoe', texto: '¡Muy bien! Lo recordaste' },
        { voz: 'zeus', texto: '¡Qué buena memoria!' },
        { voz: 'zoe', texto: '¡Exacto!' },
        { voz: 'zeus', texto: '¡Lo guardaste en tu memoria!' }
    ];

    /* ── Generación de niveles: el reto del documento en uno de los niveles 1-3; lo demás al azar ── */

    function sinVecinosIguales(seq) {
        for (var i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) return false;
        return true;
    }

    /** Arma un nivel de un tipo con n sonidos, eligiendo del catálogo (pool). */
    function generar(tipo, pool, d, mayor) {
        var p = mezclar(pool);
        var tomar = function (n) { return p.splice(0, n); };
        var nv = { tipo: tipo };
        if (tipo === 'elegir') {
            var x = tomar(1)[0];
            nv.reproducciones = [[x]];
            nv.opciones = mezclar([x].concat(tomar(d.opciones - 1)));
            nv.correctas = [x];
        } else if (tipo === 'varios') {
            var oidos = tomar(d.k);
            nv.reproducciones = [mezclar(oidos)];
            nv.opciones = mezclar(oidos.concat(tomar(d.opciones - d.k)));
            nv.correctas = oidos;
        } else if (tipo === 'repetido') {
            var distintos = tomar(d.n - 1);
            var rep = distintos[0];
            var seq;
            for (var k = 0; k < 30; k++) { seq = mezclar(distintos.concat([rep])); if (sinVecinosIguales(seq)) break; }
            nv.reproducciones = [seq];
            nv.opciones = mezclar(distintos.concat(tomar(d.extra || 1)));
            nv.correctas = [rep];
        } else if (tipo === 'desaparecio') {
            var primera = tomar(d.n);
            var falta = primera[(Math.random() * primera.length) | 0];
            nv.reproducciones = [primera, primera.filter(function (q) { return q !== falta; })];
            nv.opciones = mezclar(primera.slice());
            nv.correctas = [falta];
        } else if (tipo === 'cambio') {
            var antes = tomar(d.n);
            var nuevo = tomar(1)[0];
            var iCambio = (Math.random() * antes.length) | 0;
            var despues = antes.slice();
            despues[iCambio] = nuevo;
            nv.reproducciones = [antes, despues];
            nv.opciones = mezclar(antes.concat([nuevo]));
            nv.correctas = [antes[iCambio]];   // el que cambió (el de antes); el nuevo también vale
            nv.cambio = { antes: antes[iCambio], despues: nuevo };
        } else if (tipo === 'desafio') {
            var s5 = tomar(d.n);
            nv.reproducciones = [s5];
            nv.opciones = mezclar(s5.concat(tomar(d.extra)));
            nv.correctas = s5.slice();
        }
        return nv;
    }

    /** Dificultad de cada nivel según el tipo y la edad. */
    var DIF = {
        elegir: [{ opciones: 3 }, { opciones: 3 }, { opciones: 4 }, { opciones: 4 }],
        varios34: [{ k: 2, opciones: 3 }, { k: 2, opciones: 4 }, { k: 2, opciones: 4 }, { k: 3, opciones: 5 }],
        varios56: [{ k: 3, opciones: 5 }, { k: 3, opciones: 5 }, { k: 4, opciones: 6 }, { k: 4, opciones: 6 }],
        repetido34: [{ n: 3 }, { n: 3 }, { n: 4 }, { n: 4 }],
        repetido56: [{ n: 4 }, { n: 4 }, { n: 5 }, { n: 5 }],
        desaparecio34: [{ n: 3 }, { n: 3 }, { n: 4 }, { n: 4 }],
        desaparecio56: [{ n: 4 }, { n: 4 }, { n: 5 }, { n: 5 }],
        cambio: [{ n: 3 }, { n: 3 }, { n: 4 }, { n: 4 }],
        desafio: [{ n: 3, extra: 2 }, { n: 4, extra: 2 }, { n: 5, extra: 1 }, { n: 5, extra: 2 }]
    };

    /** Nivel que reproduce el reto del documento tal cual (sus sonidos y sus opciones). */
    function nivelOficial(r) {
        var nv = { tipo: r.tipo, reproducciones: r.reproducciones.map(function (s) { return s.slice(); }), opciones: mezclar(r.opciones.slice()), oficial: true, preguntas: r.preguntas };
        var a = r.reproducciones[0], b = r.reproducciones[1];
        if (r.tipo === 'elegir') nv.correctas = [a[0]];
        else if (r.tipo === 'varios' || r.tipo === 'desafio') nv.correctas = a.slice();
        else if (r.tipo === 'repetido') nv.correctas = a.filter(function (x, i) { return a.indexOf(x) !== i; }).slice(0, 1);
        else if (r.tipo === 'desaparecio') nv.correctas = a.filter(function (x) { return b.indexOf(x) < 0; });
        else if (r.tipo === 'cambio') {
            var i = a.findIndex(function (x, k) { return b[k] !== x; });
            nv.correctas = [a[i]];
            nv.cambio = { antes: a[i], despues: b[i] };
        }
        return nv;
    }

    /* ── Métodos comunes de escena ── */

    var BASE = {
        preload: function () {
            var self = this;
            var els = this.config.elementos || {};
            Object.keys(els).forEach(function (id) {
                var src = els[id].img;
                if (!src || self.textures.exists('el_' + id)) return;
                if (/\.svg$/i.test(src)) self.load.svg('el_' + id, src, { width: 320, height: 320 });
                else self.load.image('el_' + id, src);
            });
            ['insignia_logro', 'insignia_guardian'].forEach(function (k) {
                if (!self.textures.exists(k)) self.load.svg(k, 'img/' + k + '.svg', { width: 420, height: 420 });
            });
            if (this.precargar) this.precargar();
        },

        create: function () {
            var self = this;
            this.mayor = String(this.nivel.id) === '5';
            this.fase = 'intro';
            this.errores = 0;
            this.nivelActual = 0;
            this.marcadas = [];
            this.paso = 0;
            this.coleccion = [];
            if (Ut.reducido()) this.cameras.main.shake = function () { return this; };
            if (this.iniciar) this.iniciar();
            this.armar(false);
            this.input.on('pointerdown', function (p) {
                P.actx();
                if (self.ctx.enDemo && self.ctx.enDemo()) return;
                if (self.fase === 'jugar' && self.tocaBocina(p)) { self.repetir(); return; }
                if (self.alTocar) self.alTocar(p);
                if (self.vidaAmb && !self.ocupadoPorJuego()) self.vidaAmb.tocar(p);
            });
            this.input.on('pointermove', function (p) {
                if (self.ctx.enDemo && self.ctx.enDemo()) return;
                if (self.alMover) self.alMover(p);
            });
            var soltar = function (p) {
                if (self.ctx.enDemo && self.ctx.enDemo()) return;
                if (self.alSoltar) self.alSoltar(p);
            };
            this.input.on('pointerup', soltar);
            this.input.on('pointerupoutside', soltar);
            this.scale.on('resize', function () {
                if (self.timerResize) self.timerResize.remove();
                self.timerResize = self.time.delayedCall(220, function () { self.armar(true); });
            });
            this.pista = Ut.crearPista(this, 9000, function (cancelada) { return self.mostrarPista ? self.mostrarPista(cancelada) : self.pistaBocina(cancelada); });
        },

        ocupadoPorJuego: function () { return !!this.arrastrando; },

        sigue: function () { return !!(this.sys && this.sys.isActive && this.sys.isActive()); },

        montarVida: function (keep) {
            this.vidaAmb = global.AsociaVida ? global.AsociaVida.montar(this, keep) : null;
            return this.vidaAmb;
        },

        limpiarEscenario: function () {
            var self = this;
            (this.estaticos || []).forEach(function (o) { if (o && o.destroy) o.destroy(); });
            this.estaticos = [];
            return function (o) { self.estaticos.push(o); return o; };
        },

        /** HUD: bocina + 4 estrellas de nivel + presentador 3D. Necesita this.L.bocina {x,y,r} y L.pres o null. */
        montarHud: function (keep) {
            var L = this.L;
            var b = keep(this.add.container(L.bocina.x, L.bocina.y).setDepth(80));
            var halo = this.add.circle(0, 0, L.bocina.r * 1.25, 0xffffff, 0.35);
            var plato = this.add.circle(0, 0, L.bocina.r, 0x7950f2).setStrokeStyle(5, 0xffffff);
            var luz = this.add.circle(-L.bocina.r * 0.3, -L.bocina.r * 0.35, L.bocina.r * 0.35, 0xffffff, 0.3);
            var oreja = this.add.graphics();
            var r = L.bocina.r;
            oreja.lineStyle(Math.max(3, r * 0.12), 0xffffff, 1);
            oreja.beginPath(); oreja.arc(r * 0.02, -r * 0.08, r * 0.38, Math.PI * 1.05, Math.PI * 2.25); oreja.strokePath();
            oreja.beginPath(); oreja.arc(r * 0.04, -r * 0.08, r * 0.18, Math.PI * 1.1, Math.PI * 2.1); oreja.strokePath();
            oreja.lineBetween(r * 0.22, r * 0.2, r * 0.02, r * 0.45);
            b.add([halo, plato, luz, oreja]);
            b.halo = halo;
            this.bocina = b;
            this.ondasG = keep(this.add.graphics().setDepth(79));
            this.estrellas = [];
            var tam = Math.max(20, r * 0.6);
            for (var i = 0; i < 4; i++) {
                var e = keep(this.add.image(L.bocina.x + r + 24 + i * (tam + 6), L.bocina.y, A.textura(this, 'estrella', 64)).setDisplaySize(tam, tam).setDepth(80));
                if (i >= this.nivelActual) e.setTint(0x8a8f98).setAlpha(0.55);
                this.estrellas.push(e);
            }
            this.montarPresentador();
        },

        montarPresentador: function () {
            var Pr = this.L.pres;
            var falso = { clip: function () {}, visible: function () {}, ubicar: function () {}, falso: true };
            if (!global.AsociaPj3D || !Pr) {
                if (this.pres && !this.pres.falso) this.pres.visible(false);
                if (!this.pres) this.pres = falso;
                return;
            }
            if (!this.pres || this.pres.falso) {
                this.pres = global.AsociaPj3D.crear(Pr.modelo || (this.mayor ? 'nino' : 'nina'), { alto: Pr.alto, clip: 'Saludar', giro: Pr.giro != null ? Pr.giro : -0.5 });
                this.reaccion('Saludar', 2600);
            }
            this.pres.visible(true);
            this.pres.ubicar(Pr.x, Pr.piso - Pr.alto / 2);
        },

        reaccion: function (clip, ms) {
            var self = this;
            if (!this.pres) return;
            this.pres.clip(clip);
            if (this.presTimer) this.presTimer.remove();
            this.presTimer = this.time.delayedCall(ms || 1800, function () {
                if (self.pres) self.pres.clip(self.fase === 'fin' ? 'Bailar' : 'Quieto');
            });
        },

        tocaBocina: function (p) {
            var b = this.L.bocina;
            return Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.3;
        },

        /* ── Sonido ── */

        /** Suena el sonido de un elemento (su estímulo), con la bocina latiendo si o.bocina !== false. */
        sonar: function (id, o) {
            var self = this;
            o = o || {};
            this.sonando = true;
            if (o.bocina !== false && this.bocina) {
                this.tweens.killTweensOf(this.bocina);
                this.bocina.setScale(1);
                this.tweens.add({ targets: this.bocina, scale: 1.12, duration: 160, yoyo: true, repeat: 3 });
                this.ondas = this.time.now;
            }
            return Promise.resolve(this.ctx.sonido ? this.ctx.sonido(id, o) : null).then(function () { self.sonando = false; self.ondas = 0; });
        },

        /** Reproduce una o dos secuencias del nivel. Las opciones están ocultas mientras suena. */
        presentar: async function () {
            var nv = this.nv;
            this.fase = 'escuchando';
            this.pista.parar();
            for (var v = 0; v < nv.reproducciones.length; v++) {
                if (v === 1) {
                    if (this.alSegundaVuelta) await this.alSegundaVuelta();
                    else await esperar(this, 900);
                }
                var seq = nv.reproducciones[v];
                for (var k = 0; k < seq.length; k++) {
                    if (!this.sigue()) return;
                    if (this.alSonar) this.alSonar(seq[k], k, v);
                    await this.sonar(seq[k], { breve: seq.length > 2 });
                    await esperar(this, seq.length > 2 ? 380 : 500);
                }
                if (this.alTerminarVuelta) await this.alTerminarVuelta(v);
            }
        },

        /** El niño toca la bocina: vuelve a escuchar todo (sin castigo). */
        repetir: async function () {
            if (this.fase !== 'jugar' || this.sonando) return;
            efecto(this, 'pop');
            this.pista.parar();
            var antes = this.fase;
            if (this.alReescuchar) this.alReescuchar(true);
            await this.presentar();
            if (!this.sigue()) return;
            this.fase = antes;
            if (this.alReescuchar) this.alReescuchar(false);
            this.pista.reiniciar();
        },

        pistaBocina: function () {
            if (!this.bocina) return Promise.resolve();
            this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
            return esperar(this, 900);
        },

        /* ── Niveles ── */

        planNiveles: function () {
            var r = this.reto;
            var demo = ((this.config.demo || {}).opciones || []);
            var self = this;
            var pool = Object.keys(this.config.elementos || {}).filter(function (id) {
                return demo.indexOf(id) < 0 && self.textures.exists('el_' + id);
            });
            // Cada mundo puede limitar qué elementos tienen sentido en él (en la granja, animales).
            if (this.filtrarPool) pool = this.filtrarPool(pool);
            var clave = r.tipo === 'varios' || r.tipo === 'repetido' || r.tipo === 'desaparecio' ? r.tipo + (this.mayor ? '56' : '34') : r.tipo;
            var difs = DIF[clave] || DIF.elegir;
            var plan = difs.map(function (d) { return generar(r.tipo, pool, d, self.mayor); });
            // El reto del documento va en uno de los niveles 1-3 (al azar, distinto de la partida anterior).
            var claveLS = 'memoria_oficial_' + (global.location && global.location.pathname);
            var antes = -1;
            try { antes = +global.localStorage.getItem(claveLS); } catch (e) { /* sin almacenamiento */ }
            var pos;
            for (var k = 0; k < 6; k++) { pos = (Math.random() * 3) | 0; if (pos !== antes) break; }
            try { global.localStorage.setItem(claveLS, String(pos)); } catch (e) { /* sin almacenamiento */ }
            if (r.reproducciones && r.opciones) plan[pos] = nivelOficial(r);
            plan.forEach(function (nv, i) {
                nv.preguntas = nv.preguntas || r.preguntas;
                nv.meta = nv.tipo === 'desafio' ? 3 : 1;
            });
            return plan;
        },

        jugar: async function () {
            var plan = this.planNiveles();
            this.plan = plan;
            this.nivelActual = 0;
            this.errores = 0;
            for (var i = 0; i < plan.length; i++) {
                if (!this.sigue() || !this.ctx.vivo()) return;
                await this.jugarNivel(i, plan[i]);
                if (!this.sigue() || !this.ctx.vivo()) return;
                this.nivelActual = i + 1;
                await this.ganarEstrella(i);
            }
        },

        jugarNivel: async function (i, nv) {
            var self = this;
            this.nv = nv;
            this.marcadas = [];
            this.paso = 0;
            this.erroresNivel = 0;
            this.ayuda = false;
            this.fase = 'preparando';
            if (i > 0) await this.cartel(i + 1);
            if (this.prepararNivel) await this.prepararNivel(i, nv);
            if (!this.sigue()) return;
            await esperar(this, 400);
            await this.presentar();
            if (!this.sigue()) return;
            var hecho = new Promise(function (r) { self.resolverNivel = r; });
            if (this.mostrarOpciones) await this.mostrarOpciones(nv);
            this.fase = 'jugar';
            await this.preguntar();
            this.pista.reiniciar();
            await hecho;
            this.pista.parar();
            this.fase = 'entre';
            if (this.alTerminarNivel) await this.alTerminarNivel(i, nv);
        },

        /** La pregunta del paso actual (en el gran desafío hay tres). */
        preguntar: function () {
            var nv = this.nv;
            var pr = (nv.preguntas || [])[this.paso];
            if (!pr && nv.tipo === 'varios') pr = { voz: 'zoe', texto: nv.correctas.length === 2 ? '¿Cuáles dos escuchaste?' : '¿Cuáles escuchaste?' };
            if (!pr) return Promise.resolve();
            return this.ctx.decir(pr, { minMs: 700 });
        },

        /** Lo que hay que encontrar en el paso actual. */
        respuestas: function () {
            var nv = this.nv;
            if (nv.tipo === 'desafio') {
                if (this.paso === 1) return [nv.reproducciones[0][0]];
                if (this.paso === 2) { var s = nv.reproducciones[0]; return [s[s.length - 1]]; }
                return nv.correctas;
            }
            if (nv.tipo === 'cambio') return [nv.cambio.antes, nv.cambio.despues];
            return nv.correctas;
        },

        /** Cuántas respuestas hay que juntar en el paso actual. */
        cuantas: function () {
            var nv = this.nv;
            if (nv.tipo === 'varios' || (nv.tipo === 'desafio' && this.paso === 0)) return nv.correctas.length;
            return 1;
        },

        /** El niño eligió una respuesta (tipos de una sola). */
        elegir: async function (id, punto) {
            if (this.fase !== 'jugar') return;
            this.pista.reiniciar();
            if (this.respuestas().indexOf(id) >= 0) {
                this.fase = 'premio';
                await this.acertar([id], punto);
                return true;
            }
            await this.fallar(id, punto);
            return false;
        },

        /** El niño marcó uno (tipos de varios). Devuelve 'bien' | 'mal' | 'listo' | 'repetido'. */
        marcar: async function (id, punto) {
            if (this.fase !== 'jugar') return 'mal';
            this.pista.reiniciar();
            if (this.marcadas.indexOf(id) >= 0) return 'repetido';
            if (this.respuestas().indexOf(id) < 0) { await this.fallar(id, punto); return 'mal'; }
            this.marcadas.push(id);
            P.tono({ f: 700 + this.marcadas.length * 120, dur: 0.08, vol: 0.05 });
            this.sonar(id, { breve: true, bocina: false });
            if (this.marcadas.length < this.cuantas()) return 'bien';
            this.fase = 'premio';
            await this.acertar(this.marcadas.slice(), punto);
            return 'listo';
        },

        /** Acierto: efectos comunes, voz y (en el desafío) paso siguiente o fin de nivel. */
        acertar: async function (ids, punto) {
            var nv = this.nv;
            var L = this.L;
            this.reaccion('Celebrar', 2400);
            efecto(this, 'recompensa');
            this.cameras.main.shake(140, 0.003);
            var p = punto || { x: L.W / 2, y: L.H / 2 };
            Ut.estallido(this, p.x, p.y, { n: 14, tex: 'estrella', tam: 28, dist: 160, sinTinte: true, depth: 85 });
            if (this.vidaAmb && this.vidaAmb.reaccionar) this.vidaAmb.reaccionar('acierto', p);
            if (this.alAcertar) await this.alAcertar(ids, p);
            if (!this.sigue()) return;
            if (nv.demo) return;   // en el ejemplo la frase la dice la demo («¡Así se recuerda un sonido!»)
            var ac = this.reto.acierto || {};
            var linea = nv.oficial && ac.texto && (nv.tipo !== 'desafio' || this.paso === 2) ? { voz: ac.voz || 'zoe', texto: ac.texto } : FRASES_ACIERTO[(this.nivelActual + this.paso) % FRASES_ACIERTO.length];
            await this.ctx.decir(linea, { estado: 'acierto', minMs: 900 });
            if (!this.sigue()) return;
            if (nv.tipo === 'desafio' && this.paso < 2) {
                this.paso += 1;
                this.marcadas = [];
                if (this.alPaso) await this.alPaso(this.paso);
                this.fase = 'jugar';
                await this.preguntar();
                this.pista.reiniciar();
                return;
            }
            if (this.resolverNivel) this.resolverNivel();
        },

        /** Error sin castigo: el elegido suena con su propio sonido y se invita a escuchar otra vez. */
        fallar: async function (id, punto) {
            this.errores += 1;
            this.erroresNivel += 1;
            this.reaccion('Decir_no', 1500);
            efecto(this, 'suave');
            this.sonar(id, { breve: true, bocina: false });
            if (this.vidaAmb && this.vidaAmb.reaccionar && punto) this.vidaAmb.reaccionar('error', punto);
            if (this.alFallar) await this.alFallar(id, punto);
            if (this.time.now - (this.ultimoReclamo || -99999) > 7000) {
                this.ultimoReclamo = this.time.now;
                var e = this.reto.error || {};
                this.ctx.decir({ voz: e.voz || 'zeus', texto: e.texto || '¡Escucha otra vez!' }, { minMs: 900 });
            }
            if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.15, duration: 200, yoyo: true, repeat: 2 });
            if (this.erroresNivel >= 3) this.ayuda = true;
        },

        cartel: async function (n) {
            var L = this.L;
            var c = this.add.container(L.W / 2, L.H * 0.5).setDepth(95).setScale(0.3).setAlpha(0);
            var tam = Math.min(90, L.W / 7);
            for (var i = 0; i < n; i++) c.add(this.add.image((i - (n - 1) / 2) * (tam * 1.05), 0, A.textura(this, 'estrella', 128)).setDisplaySize(tam, tam));
            efecto(this, 'magia');
            await tw(this, { targets: c, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });
            await esperar(this, 700);
            await tw(this, { targets: c, scale: 0.4, alpha: 0, duration: 260 });
            c.destroy();
        },

        ganarEstrella: async function (i) {
            var e = this.estrellas && this.estrellas[i];
            if (!e) return;
            var L = this.L;
            efecto(this, 'chispas');
            var v = this.add.image(L.W / 2, L.H / 2, A.textura(this, 'estrella', 128)).setDisplaySize(110, 110).setDepth(95);
            await tw(this, { targets: v, x: e.x, y: e.y, displayWidth: e.displayWidth, displayHeight: e.displayHeight, duration: 650, ease: 'Cubic.easeIn' });
            v.destroy();
            e.clearTint().setAlpha(1);
            this.tweens.add({ targets: e, scale: e.scale * 1.4, duration: 160, yoyo: true });
        },

        /* ── Demostración del tutorial: mismo mundo, mismo gesto, con el ejemplo del config ── */

        /** Nivel de ejemplo del tipo del juego, con los elementos de config.demo (gallo / maracas). */
        nivelDemo: function () {
            var d = this.config.demo || {};
            var ops = (d.opciones || ['gallo', 'maracas']).slice(0, 2);
            var x = d.sonido && ops.indexOf(d.sonido) >= 0 ? d.sonido : ops[0];
            var y = ops.filter(function (q) { return q !== x; })[0] || ops[1];
            var tipo = this.reto.tipo;
            var nv = { demo: true, tipo: tipo, opciones: Ut.mezclar([x, y]), correctas: [x], preguntas: [] };
            if (tipo === 'repetido') nv.reproducciones = [[x, y, x]];
            else if (tipo === 'desaparecio') nv.reproducciones = [[x, y], [y]];
            else if (tipo === 'cambio') {
                var self = this;
                var z = Object.keys(this.config.elementos || {}).filter(function (q) { return q !== x && q !== y && self.textures.exists('el_' + q); })[0];
                nv.reproducciones = [[y, x], [y, z]];
                nv.opciones = [y, x, z];
                nv.cambio = { antes: x, despues: z };
            } else {
                nv.reproducciones = [[x]];
                if (tipo === 'desafio') nv.tipo = 'varios';   // en el ejemplo solo la primera cerradura
            }
            return nv;
        },

        demo: async function () {
            var ctx = this.ctx;
            var t = ctx.textos || {};
            var self = this;
            var sigue = function () { return self.sigue() && ctx.vivo() && ctx.enDemo(); };
            this.fase = 'demo';
            await ctx.decir({ voz: 'zeus', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 1600 });
            if (!sigue()) return this.salirDemo();
            var nv = this.nivelDemo();
            this.nv = nv;
            this.marcadas = [];
            this.paso = 0;
            this.erroresNivel = 0;
            if (this.prepararNivel) await this.prepararNivel(-1, nv);
            if (!sigue()) return this.salirDemo();
            await this.presentar();
            if (!sigue()) return this.salirDemo();
            if (this.mostrarOpciones) await this.mostrarOpciones(nv);
            this.fase = 'jugar';
            this.pista.parar();
            var pasos = this.demoPaso ? this.demoPaso() : null;
            if (pasos && !Array.isArray(pasos)) pasos = [pasos];
            for (var i = 0; pasos && i < pasos.length; i++) {
                var p = typeof pasos[i] === 'function' ? pasos[i]() : pasos[i];
                if (!p || !sigue()) break;
                var o = { punto: p.desde, holdMs: p.mantener || 300 };
                if (p.hasta) o.arrastre = { dx: p.hasta.x - p.desde.x, dy: p.hasta.y - p.desde.y, durMs: 900 };
                await ctx.mano(o);
                if (!sigue()) break;
                await p.hacer();
            }
            this.pista.parar();
            if (!sigue()) return this.salirDemo();
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se recuerda un sonido!' }, { estado: 'acierto', minMs: 1200 });
            if (this.alTerminarNivel) await this.alTerminarNivel(-1, nv);
            if (sigue()) await ctx.decir({ voz: 'zeus', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1000 });
            this.salirDemo();
        },

        /** Paso de demo para los mundos de arrastrar: la mano lleva `a` hasta `hasta` y se suelta como el niño. */
        pasoArrastre: function (a, hasta) {
            var self = this;
            if (!a || !hasta) return null;
            return {
                desde: { x: a.cont.x, y: a.cont.y }, hasta: hasta,
                hacer: async function () {
                    self.arrastrando = { a: a, dx: 0, dy: 0 };
                    a.cont.setDepth(70);
                    await tw(self, { targets: a.cont, x: hasta.x, y: hasta.y, duration: 350 });
                    await self.alSoltar();
                }
            };
        },

        /** La opción correcta (del paso actual) entre las cosas de una lista. */
        correctaDe: function (lista) {
            var r = this.respuestas();
            return (lista || []).filter(function (a) { return a && a.cont && a.cont.active && !a.usada && r.indexOf(a.id) >= 0; })[0];
        },

        /** Deja todo como antes del ejemplo (lo del ejemplo no cuenta para la fiesta final). */
        salirDemo: function () {
            if (this.ctx.quitarMano) this.ctx.quitarMano();
            this.fase = 'intro';
            this.nv = null;
            this.marcadas = [];
            this.paso = 0;
            this.errores = 0;
            this.arrastrando = null;
            this.pista.parar();
            if (this.reunidos) this.reunidos = [];
        },

        /* ── Fiesta final: escena propia del juego + insignia ── */

        fiestaFinal: async function () {
            this.fase = 'fin';
            this.pista.parar();
            this.reaccion('Celebrar', 60000);
            if (this.escenaFinal) await this.escenaFinal();
            if (!this.sigue()) return;
            await this.insignia();
            if (!this.sigue()) return;
            efecto(this, 'victoria');
            Ut.confeti(this, 90);
            this.reaccion('Bailar', 60000);
            await esperar(this, 1500);
            if (global.AsociaPj3D && global.AsociaPj3D.capa) global.AsociaPj3D.capa(false);
        },

        /** La insignia del documento («Logro» 3-4 / «Guardián de la memoria auditiva» 5-6) baja girando. */
        insignia: async function () {
            var L = this.L;
            var k = this.mayor ? 'insignia_guardian' : 'insignia_logro';
            if (!this.textures.exists(k)) return;
            var tam = Math.min(L.W, L.H) * 0.42;
            var brillo = this.add.circle(L.W / 2, L.H * 0.45, tam * 0.75, 0xfff3bf, 0).setDepth(96);
            var img = this.add.image(L.W / 2, -tam, k).setDisplaySize(tam, tam).setDepth(97);
            efecto(this, 'magia');
            await tw(this, { targets: img, y: L.H * 0.45, angle: 360, duration: 900, ease: 'Back.easeOut' });
            this.tweens.add({ targets: brillo, fillAlpha: 0.55, scale: 1.2, duration: 500, yoyo: true, repeat: 1 });
            Ut.estallido(this, L.W / 2, L.H * 0.45, { n: 20, tex: 'estrella', tam: 30, dist: tam, sinTinte: true, depth: 98 });
            await esperar(this, 1600);
        },

        /* ── Ayudas para los mundos ── */

        /** Imagen de un elemento (textura el_<id>) en un contenedor con sombra; a.tam = lado. */
        crearCosa: function (id, x, y, tam, o) {
            o = o || {};
            var c = this.add.container(x, y).setDepth(o.depth || 20);
            var sombra = this.add.ellipse(0, tam * 0.46, tam * 0.7, tam * 0.14, 0x000000, o.sinSombra ? 0 : 0.18);
            var img = this.add.image(0, 0, 'el_' + id);
            var k = tam / Math.max(img.width, img.height);
            img.setScale(k);
            c.add([sombra, img]);
            var a = { id: id, cont: c, img: img, sombra: sombra, tam: tam };
            var self = this;
            a.saltito = function (alto, veces) {
                return tw(self, { targets: img, y: -tam * (alto || 0.15), duration: 160, yoyo: true, repeat: (veces || 1) - 1, ease: 'Quad.easeOut' });
            };
            a.sacudir = function () {
                return tw(self, { targets: img, angle: { from: -10, to: 10 }, duration: 70, yoyo: true, repeat: 3, onComplete: function () { img.angle = 0; } });
            };
            a.latir = function () {
                return tw(self, { targets: img, scale: k * 1.15, duration: 180, yoyo: true, ease: 'Quad.easeOut' });
            };
            a.destruir = function () { c.destroy(); };
            return a;
        },

        /** La cosa de la lista más cercana a (x, y) dentro del radio (por defecto 0.6 de su tamaño). */
        cosaEn: function (lista, x, y, radio) {
            var mejor = null, dmin = Infinity;
            (lista || []).forEach(function (a) {
                if (!a || !a.cont || !a.cont.active || a.usada) return;
                var d = Math.hypot(x - a.cont.x, y - a.cont.y);
                if (d < (radio || a.tam * 0.6) && d < dmin) { dmin = d; mejor = a; }
            });
            return mejor;
        },

        /** Arrastrar: tomar(p, lista) al tocar, llevar(p) al mover, soltar() al levantar el dedo. */
        tomar: function (p, lista) {
            var a = this.cosaEn(lista, p.x, p.y);
            if (!a) return null;
            this.arrastrando = { a: a, dx: a.cont.x - p.x, dy: a.cont.y - p.y };
            this.tweens.killTweensOf(a.cont);
            a.cont.setDepth(70);
            this.tweens.add({ targets: a.cont, scale: 1.12, duration: 100 });
            P.tono({ f: 760, dur: 0.05, vol: 0.04 });
            this.pista.reiniciar();
            return a;
        },
        llevar: function (p) {
            var r = this.arrastrando;
            if (!r) return null;
            r.a.cont.setPosition(p.x + r.dx, p.y + r.dy);
            return r.a;
        },
        soltar: function () {
            var r = this.arrastrando;
            this.arrastrando = null;
            if (!r) return null;
            this.tweens.add({ targets: r.a.cont, scale: 1, duration: 100 });
            return r.a;
        },
        /** Vuelve a su lugar (a.casa {x, y}); con rebote si fue un error. */
        aCasa: function (a, rebote) {
            if (!a || !a.casa) return Promise.resolve();
            if (rebote) P.tono({ f: 300, f2: 180, dur: 0.16, vol: 0.05 });
            var self = this;
            return tw(this, { targets: a.cont, x: a.casa.x, y: a.casa.y, duration: rebote ? 600 : 380, ease: rebote ? 'Bounce.easeOut' : 'Sine.easeOut' }).then(function () { a.cont.setDepth(a.prof || 30); });
        },

        /** Muestra opciones como cosas en fila: aparecen saltando. Devuelve la lista. */
        filaDeCosas: async function (ids, lugares, tam, o) {
            var self = this;
            o = o || {};
            var cosas = ids.map(function (id, i) {
                var a = self.crearCosa(id, lugares[i].x, lugares[i].y + 40, tam, { depth: o.depth || 30 });
                a.casa = { x: lugares[i].x, y: lugares[i].y };
                a.prof = o.depth || 30;
                a.cont.setAlpha(0);
                return a;
            });
            await Promise.all(cosas.map(function (a, i) {
                return esperar(self, i * 110).then(function () {
                    P.ruido({ f: 1600, q: 1, dur: 0.06, vol: 0.05 });
                    return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 340, ease: 'Back.easeOut' });
                });
            }));
            return cosas;
        },

        /** Se van las cosas de la lista (bajan y se desvanecen) y se destruyen. */
        retirar: function (lista) {
            var self = this;
            return Promise.all((lista || []).map(function (a, i) {
                if (!a || !a.cont || !a.cont.active) return null;
                return esperar(self, i * 60).then(function () { return tw(self, { targets: a.cont, alpha: 0, y: a.cont.y + 30, duration: 240 }); }).then(function () { a.destruir(); });
            }));
        },

        /** Pista común: con ayuda, la mano lleva una respuesta correcta desde la lista hasta el destino. */
        pistaArrastre: function (cancelada, lista, destino) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var no = function () { return cancelada() || self.fase !== 'jugar' || !!self.arrastrando; };
            var resp = this.respuestas();
            var ok = (lista || []).filter(function (a) { return a.cont && a.cont.active && !a.usada && resp.indexOf(a.id) >= 0 && self.marcadas.indexOf(a.id) < 0; })[0];
            if (!ok || !this.ayuda) {
                if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
                return esperar(this, 900);
            }
            return this.ctx.mano({ punto: { x: ok.cont.x, y: ok.cont.y }, holdMs: 200, arrastre: { dx: destino.x - ok.cont.x, dy: destino.y - ok.cont.y, durMs: 900 }, cancelado: no });
        },

        /** Lleva un objeto en arco hasta (x, y); o.alto = cuánto sube, o.esc = escala final. */
        saltarA: function (obj, x, y, o) {
            o = o || {};
            var x0 = obj.x, y0 = obj.y, e0 = obj.scale;
            var cima = Math.min(y0, y) - (o.alto != null ? o.alto : 80);
            var k = { t: 0 };
            return tw(this, {
                targets: k, t: 1, duration: o.ms || 600, ease: o.ease || 'Sine.easeInOut',
                onUpdate: function () {
                    var t = k.t;
                    obj.x = x0 + (x - x0) * t;
                    obj.y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cima + t * t * y;
                    if (o.esc != null) obj.setScale(e0 + (o.esc - e0) * t);
                }
            });
        },

        estado: function () {
            var nv = this.nv || {};
            var e = {
                fase: this.fase, nivel: this.nivelActual, tipo: nv.tipo, oficial: !!nv.oficial,
                reproducciones: nv.reproducciones, opciones: nv.opciones, respuestas: this.nv ? this.respuestas() : null,
                cuantas: this.nv ? this.cuantas() : 0, paso: this.paso, marcadas: this.marcadas.slice(),
                errores: this.errores, sonando: !!this.sonando
            };
            if (this.estadoExtra) e.extra = this.estadoExtra();
            return e;
        },

        update: function (time, delta) {
            var L = this.L;
            if (!L) return;
            var g = this.ondasG;
            if (g) {
                g.clear();
                if (this.ondas && L.bocina) {
                    var b = L.bocina;
                    for (var k = 0; k < 3; k++) {
                        var f = ((time - this.ondas) / 900 + k / 3) % 1;
                        g.lineStyle(4, 0xffffff, 0.75 * (1 - f));
                        g.strokeCircle(b.x, b.y, b.r * (1.1 + f * 0.9));
                    }
                }
            }
            if (this.bocina && this.bocina.halo) this.bocina.halo.setScale(1 + Math.sin(time / 380) * 0.06);
            if (this.vidaAmb) this.vidaAmb.actualizar(time, delta);
            if (this.paso2) this.paso2(time, delta);
        }
    };

    function crear(def) {
        var esc = {};
        Object.keys(BASE).forEach(function (k) { esc[k] = BASE[k]; });
        Object.keys(def.escena).forEach(function (k) {
            if (k === 'create' || k === 'update' || k === 'preload') return;
            esc[k] = def.escena[k];
        });
        if (def.escena.paso) esc.paso2 = def.escena.paso;
        var css = 'body.modo-' + def.id + ' #opciones,body.modo-' + def.id + ' .centro{display:none !important}';
        return B.crearMotor({ id: def.id, fondo: def.fondo || '#a5d8ff', css: css, escena: esc });
    }

    var ANIMALES = ['perro', 'pollito', 'caballo', 'vaca', 'burro', 'elefante', 'pato', 'leon', 'rana', 'pajaro', 'gato', 'gallo'];

    global.MemoriaKit = {
        crear: crear,
        ANIMALES: ANIMALES,
        generar: generar, nivelOficial: nivelOficial,
        ruido: P.ruido, tono: P.tono, actx: P.actx,
        textura: P.textura, rr: P.rr, grano: P.grano, madera: P.madera, pared: P.pared, piso: P.piso, ventana: P.ventana, sombra: P.sombra,
        efecto: efecto
    };
})(typeof window !== 'undefined' ? window : this);
