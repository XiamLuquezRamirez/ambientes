/**
 * ReglasPuzle — decisiones puras de "El Puzle Geométrico 3D" (sin DOM, sin Phaser, sin audio).
 *
 * Cada nivel es una construcción definida en config.json: una lista de posiciones (`piezas`) con
 * la forma que aceptan, su lugar en la cuadrícula 3D (pos = esquina x, y, z), su orientación (0-3,
 * de 90 en 90 grados) y su capa. La bandeja trae una pieza por posición. Dos piezas de la misma
 * forma son equivalentes: cualquiera de las dos sirve en cualquiera de sus posiciones.
 *
 * Orden de abajo hacia arriba: solo se habilitan las posiciones de la capa más baja que aún tiene
 * huecos (y cuyas dependencias explícitas, si las hay, ya están puestas).
 */
(function (global) {
    "use strict";

    var TIPOS = ["caja", "prisma", "cilindro", "cono", "piramide"];
    var EPS = 1e-6;

    function num(v, porDefecto) {
        var n = Number(v);
        return isFinite(n) && n > 0 ? n : porDefecto;
    }

    function niveles(cfg) { return (cfg && cfg.nivelesJuego) || []; }
    function nivel(cfg, i) { return niveles(cfg)[i] || null; }
    function forma(cfg, clave) { return (cfg && cfg.formas && cfg.formas[clave]) || null; }

    // ------------------------------------------------------------------ formas y orientación

    /** Ángulo en grados dentro de 0..359. */
    function normalizar(g) {
        var n = Math.round(Number(g) || 0) % 360;
        return n < 0 ? n + 360 : n;
    }

    /** Giro de un paso (dir -1 izquierda, +1 derecha). */
    function girar(rot, dir, paso) {
        return normalizar((Number(rot) || 0) + (dir < 0 ? -1 : 1) * num(paso, 90));
    }

    /**
     * Cuántas orientaciones distintas tiene la forma al girarla sobre el piso:
     * 1 = se ve igual de todos lados (cubo, cilindro, cono, pirámide cuadrada, caja de base cuadrada),
     * 2 = acostada hacia un lado o hacia el otro (caja alargada, prisma triangular).
     */
    function simetria(f) {
        if (!f) return 1;
        if (f.tipo === "prisma") return 2;
        if (f.tipo === "caja") return Math.abs(f.w - f.d) < EPS ? 1 : 2;
        return 1;
    }

    /** ¿La forma necesita girarse alguna vez? */
    function girable(f) { return simetria(f) > 1; }

    /** Índice 0-3 de un ángulo en grados. */
    function indice(rot) { return Math.round(normalizar(rot) / 90) % 4; }

    /** ¿La pieza girada `rot` grados coincide con la orientación `orient` (0-3) de la posición? */
    function orientacionOk(f, rot, orient) {
        var s = simetria(f);
        if (s === 1) return true;
        return ((indice(rot) - (orient | 0)) % 2 + 2) % 2 === 0;
    }

    /** Medidas de la caja que ocupa la forma con la orientación dada (0-3). */
    function medidas(f, orient) {
        var impar = ((orient | 0) % 2 + 2) % 2 === 1;
        return { w: impar ? f.d : f.w, d: impar ? f.w : f.d, h: f.h };
    }

    /** Caja (x0..x1, y0..y1, z0..z1) que ocupa una posición. */
    function caja(pos, f, orient) {
        var m = medidas(f, orient);
        var p = pos || [0, 0, 0];
        return { x0: p[0], y0: p[1], z0: p[2], x1: p[0] + m.w, y1: p[1] + m.d, z1: p[2] + m.h };
    }

    function solapan(a, b, margen) {
        var e = margen == null ? 0.02 : margen;
        return a.x0 < b.x1 - e && b.x0 < a.x1 - e && a.y0 < b.y1 - e && b.y0 < a.y1 - e && a.z0 < b.z1 - e && b.z0 < a.z1 - e;
    }

    function pisanJuntas(a, b) {
        return a.x0 < b.x1 - 0.02 && b.x0 < a.x1 - 0.02 && a.y0 < b.y1 - 0.02 && b.y0 < a.y1 - 0.02;
    }

    // ------------------------------------------------------------------ posiciones del nivel

    /**
     * Posiciones del nivel i, con la forma ya resuelta. `variante.alternativas` puede cambiar la
     * forma de una posición por otra de su lista `alternativas` (misma caja, otro sólido).
     */
    function piezasNivel(cfg, i, variante) {
        var n = nivel(cfg, i);
        if (!n) return [];
        // construcción generada al azar para esta partida (si la hay); si no, la del config
        var gen = variante && variante.construcciones && variante.construcciones[n.clave || n.id];
        var formasGen = (variante && variante.formas) || {};
        var alt = gen ? {} : ((variante && variante.alternativas && variante.alternativas[n.clave || n.id]) || {});
        return ((gen && gen.piezas) || n.piezas || []).map(function (p, k) {
            var clave = alt[p.id] && (p.alternativas || []).indexOf(alt[p.id]) >= 0 ? alt[p.id] : p.forma;
            var f = formasGen[clave] || forma(cfg, clave);
            if (!f) return null;
            return {
                id: p.id,
                forma: clave,
                def: f,
                pos: (p.pos || [0, 0, 0]).slice(),
                orient: (p.orient | 0) % 4,
                capa: p.capa | 0,
                orden: k,
                nombre: p.nombre || f.nombre,
                voz: f.voz || f.nombre,
                pista: p.pista || "",
                depende: (p.depende || []).slice(),
                incrustada: !!p.incrustada,
                caja: caja(p.pos, f, p.orient)
            };
        }).filter(Boolean);
    }

    /** Capas del nivel, de abajo hacia arriba. */
    function capas(lista) {
        var vistas = [];
        (lista || []).forEach(function (p) { if (vistas.indexOf(p.capa) < 0) vistas.push(p.capa); });
        return vistas.sort(function (a, b) { return a - b; });
    }

    /** La capa más baja que todavía tiene posiciones vacías (null si la construcción está completa). */
    function capaActual(lista, colocadas) {
        var c = colocadas || {};
        var pend = (lista || []).filter(function (p) { return !c[p.id]; });
        if (!pend.length) return null;
        return Math.min.apply(null, pend.map(function (p) { return p.capa; }));
    }

    /** ¿Esta posición se puede llenar ahora? (capa actual y dependencias puestas). */
    function habilitada(p, lista, colocadas) {
        var c = colocadas || {};
        if (!p || c[p.id]) return false;
        if (p.capa !== capaActual(lista, c)) return false;
        return (p.depende || []).every(function (id) { return !!c[id]; });
    }

    function habilitadas(lista, colocadas) {
        return (lista || []).filter(function (p) { return habilitada(p, lista, colocadas); });
    }

    /**
     * Posición que la guía fantasma muestra: si hay una forma seleccionada y alguna posición
     * habilitada la acepta, esa; si no, la primera habilitada según el orden del nivel.
     */
    function siguiente(lista, colocadas, formaSel) {
        var hab = habilitadas(lista, colocadas);
        if (!hab.length) return null;
        if (formaSel) {
            var propia = hab.filter(function (p) { return p.forma === formaSel; })[0];
            if (propia) return propia;
        }
        return hab[0];
    }

    /**
     * ¿Al llenar `id` quedó completa su capa? Devuelve el número de capa o null.
     */
    function capaCompletada(id, lista, colocadas) {
        var p = (lista || []).filter(function (x) { return x.id === id; })[0];
        if (!p) return null;
        var misma = lista.filter(function (x) { return x.capa === p.capa; });
        return misma.every(function (x) { return !!colocadas[x.id]; }) ? p.capa : null;
    }

    /** Altura alcanzada (z más alto de lo colocado, en unidades de la cuadrícula). */
    function altura(lista, colocadas) {
        var h = 0;
        (lista || []).forEach(function (p) { if (colocadas[p.id]) h = Math.max(h, p.caja.z1); });
        return h;
    }

    function completo(colocadas, lista) {
        return (lista || []).length > 0 && lista.every(function (p) { return !!(colocadas || {})[p.id]; });
    }

    // ------------------------------------------------------------------ soltar

    /**
     * datos.forma      forma de la pieza soltada
     * datos.def        definición de la forma
     * datos.rot        orientación actual de la pieza (grados)
     * datos.destinos   [{ id, forma, orient, distancia, ocupado, habilitada }]
     * datos.radio      radio de acierto
     * datos.radioCasi  radio del "casi"
     *
     * 1. Entre las posiciones dentro del radio, la más cercana de su misma forma, vacía y habilitada:
     *      girada → orientacion · si no → correcto.
     * 2. Si no, la posición más cercana dentro del radio:
     *      ocupada → ocupado · otra forma → otraForma · su forma pero sin habilitar → orden.
     * 3. Una posición habilitada de su forma dentro del "casi" → casi.
     * 4. Si no, fuera.
     */
    function evaluar(datos) {
        var d = datos || {};
        var radio = num(d.radio, 70);
        var radioCasi = Math.max(radio, num(d.radioCasi, 165));
        var lista = (d.destinos || []).filter(function (m) { return m && isFinite(m.distancia); })
            .slice().sort(function (a, b) { return a.distancia - b.distancia; });
        var dentro = lista.filter(function (m) { return m.distancia <= radio; });
        var suya = dentro.filter(function (m) { return m.forma === d.forma && !m.ocupado && m.habilitada; })[0];
        if (suya) {
            if (!orientacionOk(d.def, d.rot, suya.orient)) return { acierto: false, motivo: "orientacion", destino: suya.id };
            return { acierto: true, motivo: "correcto", destino: suya.id };
        }
        var cerca = dentro[0];
        if (cerca) {
            if (cerca.ocupado) return { acierto: false, motivo: "ocupado", destino: cerca.id };
            if (cerca.forma !== d.forma) return { acierto: false, motivo: "otraForma", destino: cerca.id };
            return { acierto: false, motivo: "orden", destino: cerca.id };
        }
        var casi = lista.filter(function (m) { return m.forma === d.forma && !m.ocupado && m.habilitada && m.distancia <= radioCasi; })[0];
        if (casi) return { acierto: false, motivo: "casi", destino: casi.id };
        return { acierto: false, motivo: "fuera", destino: null };
    }

    /**
     * Posición habilitada de su forma a la que la pieza se acerca mientras se arrastra:
     * { id, fuerza 0..1, distancia, orientacionOk }. Lejos o sin posición posible, null.
     */
    function cercano(datos, radioCerca) {
        var r = num(radioCerca, 230);
        var d = datos || {};
        var m = (d.destinos || []).filter(function (x) { return x.forma === d.forma && !x.ocupado && x.habilitada && x.distancia <= r; })
            .sort(function (a, b) { return a.distancia - b.distancia; })[0];
        if (!m) return null;
        return {
            id: m.id,
            fuerza: Math.max(0, Math.min(1, 1 - m.distancia / r)),
            distancia: m.distancia,
            orientacionOk: orientacionOk(d.def, d.rot, m.orient)
        };
    }

    /**
     * Atracción suave hacia la guía: fracción del camino que se corre la pieza. Solo con la forma
     * correcta y bien girada; nunca llega a 0.6 (no se encaja sola mientras se arrastra).
     */
    function iman(distancia, radioIman, fuerza, orientacionBien) {
        if (orientacionBien === false) return 0;
        var r = num(radioIman, 110);
        var f = Math.max(0, Math.min(0.6, Number(fuerza) || 0.3));
        if (!(distancia < r)) return 0;
        var u = 1 - distancia / r;
        return f * u * u * (3 - 2 * u);
    }

    // ------------------------------------------------------------------ dibujo en profundidad

    /**
     * Orden de pintado de cajas (de atrás hacia adelante) para la vista isométrica, donde x, y y z
     * crecientes se acercan al que mira. items: [{ id, caja, orden }]. Devuelve los ids ordenados.
     */
    function ordenPintado(items) {
        var l = (items || []).slice();
        function antes(a, b) {
            var A = a.caja, B = b.caja;
            var junta = pisanJuntas(A, B);
            if (junta && A.z1 <= B.z0 + 0.05) return true;
            if (junta && B.z1 <= A.z0 + 0.05) return false;
            if (A.x1 <= B.x0 + 0.02) return true;
            if (B.x1 <= A.x0 + 0.02) return false;
            if (A.y1 <= B.y0 + 0.02) return true;
            if (B.y1 <= A.y0 + 0.02) return false;
            if (A.z1 <= B.z0 + 0.05) return true;
            if (B.z1 <= A.z0 + 0.05) return false;
            return (a.orden || 0) < (b.orden || 0);
        }
        var out = [];
        var restantes = l.slice();
        var guardia = 0;
        while (restantes.length && guardia++ < 400) {
            var elegido = -1;
            for (var i = 0; i < restantes.length && elegido < 0; i++) {
                var libre = true;
                for (var k = 0; k < restantes.length; k++) {
                    if (k !== i && antes(restantes[k], restantes[i])) { libre = false; break; }
                }
                if (libre) elegido = i;
            }
            if (elegido < 0) {
                // ciclo (cajas que se cruzan): la más baja y la que se pone primero
                restantes.sort(function (a, b) { return a.caja.z0 - b.caja.z0 || (a.orden || 0) - (b.orden || 0); });
                elegido = 0;
            }
            out.push(restantes[elegido].id);
            restantes.splice(elegido, 1);
        }
        return out;
    }

    // ------------------------------------------------------------------ azar controlado

    function barajar(lista, rnd) {
        var r = typeof rnd === "function" ? rnd : Math.random;
        var a = (lista || []).slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(r() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function elegir(lista, rnd) {
        var r = typeof rnd === "function" ? rnd : Math.random;
        if (!lista || !lista.length) return null;
        return lista[Math.min(lista.length - 1, Math.floor(r() * lista.length))];
    }

    /** Compartimento de la bandeja de cada pieza: uno por pieza, sin repetir. */
    function repartir(ids, nHuecos, rnd) {
        var total = Math.max(nHuecos | 0, ids.length);
        var huecos = barajar(Array.apply(null, { length: total }).map(function (_, i) { return i; }), rnd);
        var out = {};
        ids.forEach(function (id, i) { out[id] = huecos[i]; });
        return out;
    }

    /**
     * Orientación con la que llega cada pieza a la bandeja (grados). `rotadas` piezas girables
     * llegan atravesadas (90° de diferencia con su posición); las de `rotarPrimero` van primero.
     * Las demás llegan como su posición (o media vuelta, que se ve igual).
     */
    function orientacionesIniciales(lista, n, rnd) {
        var r = typeof rnd === "function" ? rnd : Math.random;
        var out = {};
        (lista || []).forEach(function (p) {
            out[p.id] = girable(p.def) ? ((p.orient + (r() < 0.5 ? 0 : 2)) % 4) * 90 : elegir([0, 90, 180, 270], r);
        });
        var cuantas = Math.max(0, (n && n.rotadas) | 0);
        if (!cuantas || !n || !n.giro) return out;
        var girables = lista.filter(function (p) { return girable(p.def); }).map(function (p) { return p.id; });
        var primero = ((n && n.rotarPrimero) || []).filter(function (id) { return girables.indexOf(id) >= 0; });
        var resto = barajar(girables.filter(function (id) { return primero.indexOf(id) < 0; }), r);
        primero.concat(resto).slice(0, cuantas).forEach(function (id) {
            var p = lista.filter(function (x) { return x.id === id; })[0];
            out[id] = ((p.orient + (r() < 0.5 ? 1 : 3)) % 4) * 90;
        });
        return out;
    }

    /**
     * Apariencia de la partida (se sortea al cargar y vale para los cuatro niveles): paleta de los
     * bloques, decoración de cada forma, cielo, estación, árboles, techos y las formas alternativas
     * de las posiciones que tienen (`alternativas`). Las posiciones no cambian.
     */
    function sortearVariante(cfg, rnd) {
        var r = typeof rnd === "function" ? rnd : Math.random;
        var v = (cfg && cfg.variantes) || {};
        var paleta = elegir(v.paletas, r) || { id: "caramelo", colores: ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#9775fa"] };
        var colores = barajar(paleta.colores, r);
        var claves = Object.keys((cfg && cfg.formas) || {});
        var colorDe = {}, decoDe = {};
        claves.forEach(function (k, i) {
            colorDe[k] = colores[i % colores.length];
            decoDe[k] = elegir(v.decoraciones, r) || "liso";
        });
        // figuras nuevas en cada partida; dentro de un nivel, cada forma con un color distinto
        var gen = generarConstrucciones(cfg, r);
        niveles(cfg).forEach(function (n) {
            var c = gen.construcciones[n.clave || n.id];
            if (!c) return;
            var propios = barajar(paleta.colores, r);
            var vistas = [];
            c.piezas.forEach(function (p) { if (vistas.indexOf(p.forma) < 0) vistas.push(p.forma); });
            vistas.forEach(function (k, i) {
                colorDe[k] = propios[i % propios.length];
                decoDe[k] = elegir(v.decoraciones, r) || "liso";
            });
        });
        var alternativas = {};
        niveles(cfg).forEach(function (n) {
            var a = {};
            (n.piezas || []).forEach(function (p) {
                if (p.alternativas && p.alternativas.length) a[p.id] = elegir(p.alternativas, r);
            });
            alternativas[n.clave || n.id] = a;
        });
        return {
            paleta: paleta.id,
            color: colorDe,
            deco: decoDe,
            cielo: elegir(v.cielos, r) || { id: "manana", arriba: "#7fd3ff", abajo: "#e3f6ff", monte: "#9ad4a8", monte2: "#c4e8c2", pasto: "#8fd16a", pasto2: "#6fbf4f" },
            estacion: elegir(v.estaciones, r) || { id: "naranja", marco: "#ff922b", oscuro: "#c25e0a", luz: "#ffe066" },
            arbol: elegir(v.arboles, r) || "#51cf66",
            techo: elegir(v.techos, r) || "#ff6b6b",
            semilla: Math.floor(r() * 1e9),
            alternativas: alternativas,
            construcciones: gen.construcciones,
            formas: gen.formas
        };
    }

    // ------------------------------------------------------------------ construcciones al azar

    /*
     * Cada partida arma figuras nuevas para que el niño no repita siempre lo mismo. Se respeta la
     * familia de cada nivel (pirámide, torre, castillo, templo: el mundo reacciona a ellas) y su
     * cantidad de piezas (5, 6, 9, 11), pero cambian las medidas, el orden de los bloques, las
     * formas de remate y hacia dónde apuntan las piezas largas. Toda figura generada pasa por
     * validarLista; si alguna fallara, el nivel usa la figura fija del config.
     */

    function r2(v) { return Math.round(v * 100) / 100; }

    /** Valor al azar entre a y b en pasos de s. */
    function paso(r, a, b, s) {
        var n = Math.round((b - a) / s);
        return r2(a + s * Math.min(n, Math.floor(r() * (n + 1))));
    }

    function Obra(r, clave) { this.r = r; this.clave = clave; this.formas = {}; this.piezas = []; this.porId = {}; }

    /** Clave de forma propia del nivel (el nombre «grande/pequeño» depende de las demás del nivel). */
    Obra.prototype.forma = function (tipo, w, d, h) {
        w = r2(w); d = r2(d); h = r2(h);
        var k = "g-" + this.clave + "-" + tipo + "-" + w + "x" + d + "x" + h;
        if (!this.formas[k]) this.formas[k] = { tipo: tipo, w: w, d: d, h: h };
        return k;
    };

    /** Pone la forma k con su huella centrada en (cx, cy) y la base en z. */
    Obra.prototype.centrada = function (id, k, cx, cy, z, orient, capa, extra) {
        var m = medidas(this.formas[k], orient);
        return this.en(id, k, [cx - m.w / 2, cy - m.d / 2, z], orient, capa, extra);
    };

    Obra.prototype.en = function (id, k, pos, orient, capa, extra) {
        var p = { id: id, forma: k, pos: pos.map(r2), orient: orient | 0, capa: capa };
        Object.keys(extra || {}).forEach(function (c) { p[c] = extra[c]; });
        this.piezas.push(p);
        this.porId[id] = p;
        return p;
    };

    /** Altura del techo de una pieza ya puesta. */
    Obra.prototype.tope = function (p) { return r2(p.pos[2] + this.formas[p.forma].h); };

    // nombres para la voz: el tipo de sólido y, si hay varios del mismo, su tamaño
    function nombreDe(f) {
        if (f.tipo === "prisma") return { n: "prisma triangular" };
        if (f.tipo === "piramide") return { n: "pirámide", fem: true };
        if (f.tipo === "cono") return { n: "cono" };
        if (f.tipo === "cilindro") return { n: "cilindro" };
        if (Math.abs(f.w - f.d) < EPS) {
            if (Math.abs(f.h - f.w) <= f.w * 0.3) return { n: "cubo" };
            return f.h < f.w ? { n: "bloque cuadrado" } : { n: "prisma alto" };
        }
        return { n: "prisma rectangular" };
    }

    var TAMANOS = {
        2: [["grande", "grande"], ["pequeño", "pequeña"]],
        3: [["grande", "grande"], ["mediano", "mediana"], ["pequeño", "pequeña"]],
        4: [["más grande", "más grande"], ["grande", "grande"], ["mediano", "mediana"], ["pequeño", "pequeña"]],
        5: [["más grande", "más grande"], ["grande", "grande"], ["mediano", "mediana"], ["pequeño", "pequeña"], ["más pequeño", "más pequeña"]]
    };

    /** Pone nombre y voz a cada forma de la obra («el cubo grande», «la pirámide»). */
    function nombrar(obra) {
        var grupos = {};
        Object.keys(obra.formas).forEach(function (k) {
            var b = nombreDe(obra.formas[k]);
            (grupos[b.n] = grupos[b.n] || []).push(k);
        });
        Object.keys(grupos).forEach(function (n) {
            var ks = grupos[n].sort(function (a, b) {
                var fa = obra.formas[a], fb = obra.formas[b];
                return fb.w * fb.d * fb.h - fa.w * fa.d * fa.h;
            });
            var tam = TAMANOS[Math.min(5, ks.length)];
            ks.forEach(function (k, i) {
                var f = obra.formas[k];
                var b = nombreDe(f);
                var adj = tam ? tam[Math.min(i, tam.length - 1)][b.fem ? 1 : 0] : "";
                var texto = n + (adj ? " " + adj : "");
                f.nombre = texto.charAt(0).toUpperCase() + texto.slice(1);
                f.voz = (b.fem ? "la " : "el ") + texto;
            });
        });
    }

    /** Escribe la pista de cada pieza: {V} su voz con mayúscula, {v} su voz, {s} la de la pieza de abajo. */
    function pistas(obra) {
        var voz = function (id) { var p = obra.porId[id]; return p ? obra.formas[p.forma].voz : ""; };
        obra.piezas.forEach(function (p) {
            var v = voz(p.id);
            var V = v.charAt(0).toUpperCase() + v.slice(1);
            p.nombre = obra.formas[p.forma].nombre;
            p.pista = String(p.pista || "").replace(/\{V\}/g, V).replace(/\{v\}/g, v).replace(/\{s\}/g, voz(p.sobre))
                .replace(/\bde el\b/g, "del").replace(/\ba el\b/g, "al");
        });
    }

    var FAMILIAS = {
        /** 5 piezas apiladas de mayor a menor y una punta; sin giros (todo se ve igual de cada lado). */
        piramide: function (o) {
            var r = o.r;
            var w0 = paso(r, 2.8, 3.2, 0.2);
            var w1 = r2(w0 - paso(r, 0.6, 0.8, 0.1));
            var w2 = r2(w1 - paso(r, 0.5, 0.7, 0.1));
            var w3 = r2(Math.max(0.9, w2 - paso(r, 0.4, 0.6, 0.1)));
            var c = w0 / 2;
            var base = o.centrada("base", o.forma("caja", w0, w0, paso(r, 0.6, 0.9, 0.1)), c, c, 0, 0, 0,
                { pista: "¡{V} es la base! Va abajo de todo." });
            var inf = o.centrada("inferior", o.forma("caja", w1, w1, paso(r, 0.6, 0.9, 0.1)), c, c, o.tope(base), 0, 1,
                { sobre: "base", pista: "¡Ahora {v}, encima de {s}!" });
            // el tercer piso a veces es un cubo
            var h2 = r() < 0.35 ? w2 : paso(r, 0.6, 0.8, 0.1);
            var med = o.centrada("intermedio", o.forma("caja", w2, w2, h2), c, c, o.tope(inf), 0, 2,
                { sobre: "inferior", pista: "¡Sigue {v}! Cada vez más chiquitos hacia arriba." });
            var cuarto = r() < 0.4 ? o.forma("cilindro", w3, w3, paso(r, 0.9, 1.2, 0.1)) : o.forma("caja", w3, w3, w3);
            var sup = o.centrada("superior", cuarto, c, c, o.tope(med), 0, 3,
                { sobre: "intermedio", pista: "¡{V} va casi en la punta, encima de {s}!" });
            var wp = r2(Math.min(w3, 1.1));
            o.centrada("cuspide", o.forma(r() < 0.5 ? "piramide" : "cono", wp, wp, paso(r, 1.0, 1.3, 0.1)), c, c, o.tope(sup), 0, 4,
                { sobre: "superior", pista: "¡{V} va hasta arriba, en la cúspide!" });
        },

        /** 6 piezas en una torre: cubo de base, dos prismas largos que se cruzan y un remate. */
        torre: function (o) {
            var r = o.r;
            var B = paso(r, 1.8, 2.2, 0.2);
            var c = B / 2;
            var cubos = {
                m: function () { var w = paso(r, 1.4, 1.6, 0.1); return o.forma("caja", w, w, r2(w - paso(r, 0, 0.2, 0.1))); },
                s: function () { var w = paso(r, 1.0, 1.2, 0.1); return o.forma("caja", w, w, w); },
                cil: function () { var w = paso(r, 1.1, 1.3, 0.1); return o.forma("cilindro", w, w, paso(r, 0.9, 1.3, 0.1)); }
            };
            var barra = o.forma("caja", paso(r, 2.2, 2.8, 0.2), paso(r, 0.9, 1.1, 0.1), paso(r, 0.5, 0.7, 0.1));
            var patrones = [["m", "b", "b", "s"], ["b", "b", "m", "s"], ["m", "b", "b", "cil"], ["cil", "b", "b", "s"], ["m", "cil", "b", "b"]];
            var patron = elegir(patrones, r);
            var prev = o.centrada("cubo-base", o.forma("caja", B, B, r2(B - paso(r, 0, 0.4, 0.2))), c, c, 0, 0, 0,
                { pista: "¡{V} es la base de la torre!" });
            var orientA = r() < 0.5 ? 0 : 1;
            var barras = 0;
            var ids = { m: "cubo-soporte", s: "superior", cil: "cilindro" };
            patron.forEach(function (t, i) {
                var p;
                if (t === "b") {
                    barras += 1;
                    p = o.centrada(barras === 1 ? "prisma-a" : "prisma-b", barra, c, c, o.tope(prev), barras === 1 ? orientA : 1 - orientA, i + 1, barras === 1 ?
                        { sobre: prev.id, pista: "¡{V} va acostado encima de {s}! Fíjate hacia dónde apunta la guía." } :
                        { sobre: prev.id, pista: "¡El otro prisma largo se cruza! Gíralo para que apunte hacia el otro lado." });
                } else {
                    p = o.centrada(ids[t], cubos[t](), c, c, o.tope(prev), 0, i + 1, { sobre: prev.id, pista: "¡{V} va encima de {s}!" });
                }
                prev = p;
            });
            var fp = o.formas[prev.forma];
            var wr = r2(Math.min(1.2, prev.id.indexOf("prisma") === 0 ? 1.2 : fp.w));
            var tipos = prev.id === "cilindro" ? ["piramide", "cono"] : ["prisma", "piramide", "cono"];
            var tipo = elegir(tipos, r);
            o.centrada("remate", o.forma(tipo, wr, wr, paso(r, 0.9, 1.2, 0.1)), c, c, o.tope(prev), tipo === "prisma" && r() < 0.5 ? 1 : 0, 5,
                { sobre: prev.id, pista: "¡{V} es el remate! Va arriba de todo." });
        },

        /** 9 piezas: base de tres bloques, muros y dos torres cilíndricas, y dos cubiertas. */
        castillo: function (o) {
            var r = o.r;
            var C = r() < 0.5 ? 2 : 3, D = 2;
            var hb = paso(r, 1.0, 1.2, 0.2);
            var hm = paso(r, 0.6, 0.8, 0.2);
            o.en("centro", o.forma("caja", C, D, hb), [1, 0, 0], 0, 0, { pista: "¡{V} va en el centro de la base!" });
            var lado = o.forma("caja", D, 1, hb);
            o.en("lado-izq", lado, [0, 0, 0], 1, 0, { pista: "¡{V} va a la izquierda de la base! Gira la pieza como la guía." });
            o.en("lado-der", lado, [C + 1, 0, 0], 1, 0, { pista: "¡{V} va a la derecha de la base!" });
            if (r() < 0.5) {
                var muroFB = o.forma("caja", C, 1, hm);
                o.en("muro-atras", muroFB, [1, 0, hb], 0, 1, { sobre: "centro", pista: "¡{V} va encima de {s}, atrás!" });
                o.en("muro-frente", muroFB, [1, 1, hb], 0, 1, { sobre: "centro", pista: "¡{V} va adelante, junto al primero!" });
            } else {
                var muroLR = o.forma("caja", D, C / 2, hm);
                o.en("muro-izq", muroLR, [1, 0, hb], 1, 1, { sobre: "centro", pista: "¡{V} va encima de {s}, a la izquierda!" });
                o.en("muro-der", muroLR, [1 + C / 2, 0, hb], 1, 1, { sobre: "centro", pista: "¡{V} va a la derecha, junto al primero!" });
            }
            var wt = paso(r, 0.8, 1.0, 0.1);
            var torre = o.forma("cilindro", wt, wt, paso(r, 1.6, 2.4, 0.2));
            o.centrada("torre-izq", torre, 0.5, D / 2, hb, 0, 1, { sobre: "lado-izq", pista: "¡{V} es la torre de la izquierda!" });
            o.centrada("torre-der", torre, C + 1.5, D / 2, hb, 0, 1, { sobre: "lado-der", pista: "¡{V} es la torre de la derecha!" });
            var hr = paso(r, 0.7, 1.0, 0.1), z = r2(hb + hm);
            if (r() < 0.5) {
                var cubLR = o.forma("prisma", D, C / 2, hr);
                o.en("cubierta-izq", cubLR, [1, 0, z], 1, 2, { pista: "¡{V} cubre el lado izquierdo de los muros!" });
                o.en("cubierta-der", cubLR, [1 + C / 2, 0, z], 1, 2, { pista: "¡{V} cubre el lado derecho de los muros!" });
            } else {
                var cubFB = o.forma("prisma", C, 1, hr);
                o.en("cubierta-izq", cubFB, [1, 0, z], 0, 2, { pista: "¡{V} cubre los muros de atrás!" });
                o.en("cubierta-der", cubFB, [1, 1, z], 0, 2, { pista: "¡{V} cubre los muros de adelante!" });
            }
        },

        /** 11 piezas: tres bases, tres soportes, dos columnas, el prisma superior, la cubierta y la cúspide. */
        templo: function (o) {
            var r = o.r;
            var C = r() < 0.5 ? 2 : 3, T = C + 2;
            var hb = paso(r, 0.6, 0.8, 0.1), hs = paso(r, 0.5, 0.7, 0.1);
            o.en("base-centro", o.forma("caja", C, 3, hb), [1, 0, 0], 0, 0, { pista: "¡{V} va en el centro, abajo de todo!" });
            var ala = o.forma("caja", 3, 1, hb);
            o.en("base-izq", ala, [0, 0, 0], 1, 0, { pista: "¡{V} va a la izquierda! Gira la pieza como la guía." });
            o.en("base-der", ala, [C + 1, 0, 0], 1, 0, { pista: "¡{V} va a la derecha!" });
            o.en("soporte-centro", o.forma("caja", C, 2, hs), [1, 0.5, hb], 0, 1, { sobre: "base-centro", pista: "¡{V} va en el centro, encima de {s}!" });
            var sop = o.forma("caja", 2, 0.8, hs);
            o.en("soporte-izq", sop, [0.2, 0.5, hb], 1, 1, { sobre: "base-izq", pista: "¡{V} va a la izquierda, encima de {s}!" });
            o.en("soporte-der", sop, [C + 1, 0.5, hb], 1, 1, { sobre: "base-der", pista: "¡{V} va a la derecha, encima de {s}!" });
            var wc = paso(r, 0.6, 0.7, 0.1), hc = paso(r, 1.4, 1.9, 0.1);
            var col = o.forma(r() < 0.65 ? "cilindro" : "caja", wc, wc, hc);
            var zc = r2(hb + hs);
            o.centrada("columna-izq", col, 0.6, 1.5, zc, 0, 2, { sobre: "soporte-izq", pista: "¡{V} va de pie a la izquierda!" });
            o.centrada("columna-der", col, C + 1.4, 1.5, zc, 0, 2, { sobre: "soporte-der", pista: "¡{V} va de pie a la derecha!" });
            var zd = r2(zc + hc), hd = paso(r, 0.4, 0.6, 0.1);
            o.en("dintel", o.forma("caja", T - 0.4, 1, hd), [0.2, 1, zd], 0, 3, { pista: "¡{V} va acostado encima de las dos columnas!" });
            var zf = r2(zd + hd), hf = paso(r, 0.8, 1.0, 0.1);
            o.en("fronton", o.forma("prisma", T - 0.4, 1, hf), [0.2, 1, zf], 0, 4, { sobre: "dintel", pista: "¡{V} es el techo! Va encima de {s}." });
            o.centrada("cuspide", o.forma(r() < 0.5 ? "piramide" : "cono", 0.7, 0.7, paso(r, 0.8, 0.9, 0.1)), T / 2, 1.5, r2(zf + hf * 0.36), 0, 5,
                { incrustada: true, sobre: "fronton", pista: "¡{V} corona el templo, arriba de todo!" });
        },

        // ---------------- grado 1 (5 piezas, sin giros: todo se ve igual por cada lado)

        /** Faro: base, dos cilindros cada vez más angostos, la lámpara (cubo) y el techo puntiagudo. */
        faro: function (o) {
            var r = o.r;
            var B = paso(r, 2.4, 2.8, 0.2), c = B / 2;
            var base = o.centrada("base", o.forma("caja", B, B, paso(r, 0.5, 0.7, 0.1)), c, c, 0, 0, 0, { pista: "¡{V} es la base del faro! Va abajo de todo." });
            var w1 = r2(B - paso(r, 0.7, 0.9, 0.1));
            var t1 = o.centrada("torre-baja", o.forma("cilindro", w1, w1, paso(r, 1.0, 1.4, 0.2)), c, c, o.tope(base), 0, 1, { sobre: "base", pista: "¡{V} va encima de {s}!" });
            var w2 = r2(w1 - paso(r, 0.3, 0.5, 0.1));
            var t2 = o.centrada("torre-alta", o.forma("cilindro", w2, w2, paso(r, 1.0, 1.4, 0.2)), c, c, o.tope(t1), 0, 2, { sobre: "torre-baja", pista: "¡{V} va encima de {s}! El faro crece." });
            var w3 = r2(Math.max(0.8, w2 - paso(r, 0.2, 0.4, 0.1)));
            var luz = o.centrada("lampara", o.forma("caja", w3, w3, w3), c, c, o.tope(t2), 0, 3, { sobre: "torre-alta", pista: "¡{V} es la lámpara del faro, encima de {s}!" });
            var wt = r2(w3 + 0.1);
            o.centrada("techo", o.forma(r() < 0.5 ? "cono" : "piramide", wt, wt, paso(r, 0.8, 1.1, 0.1)), c, c, o.tope(luz), 0, 4, { sobre: "lampara", pista: "¡{V} es el techo del faro, arriba de todo!" });
        },

        /** Pastel: plato, tres pisos redondos cada vez más chicos y la vela. */
        pastel: function (o) {
            var r = o.r;
            var P = paso(r, 3.0, 3.2, 0.2), c = P / 2;
            var plato = o.centrada("plato", o.forma("cilindro", P, P, paso(r, 0.3, 0.4, 0.1)), c, c, 0, 0, 0, { pista: "¡{V} es el plato del pastel! Va abajo de todo." });
            var anchos = [paso(r, 2.4, 2.6, 0.1), paso(r, 1.7, 1.9, 0.1), paso(r, 1.0, 1.2, 0.1)];
            var ids = ["piso-1", "piso-2", "piso-3"], prev = plato;
            anchos.forEach(function (w, i) {
                prev = o.centrada(ids[i], o.forma("cilindro", w, w, paso(r, 0.7, 1.0, 0.1)), c, c, o.tope(prev), 0, i + 1,
                    { sobre: prev.id, pista: i === 0 ? "¡{V} es el primer piso del pastel, encima de {s}!" : "¡{V} va encima de {s}! Cada piso es más chiquito." });
            });
            var vela = r() < 0.5 ? o.forma("cilindro", 0.4, 0.4, paso(r, 0.9, 1.1, 0.1)) : o.forma("cono", 0.6, 0.6, paso(r, 0.8, 1.0, 0.1));
            o.centrada("vela", vela, c, c, o.tope(prev), 0, 4, { sobre: prev.id, pista: "¡{V} es la vela! Va arriba de todo." });
        },

        /** Robot: pies, cuerpo, cuello, cabeza y antena. */
        robot: function (o) {
            var r = o.r;
            var B = paso(r, 2.0, 2.4, 0.2), c = B / 2;
            var pies = o.centrada("pies", o.forma("caja", B, B, paso(r, 0.4, 0.5, 0.1)), c, c, 0, 0, 0, { pista: "¡{V} son los pies del robot! Van abajo de todo." });
            var wc = paso(r, 1.6, 1.8, 0.1);
            var cuerpo = o.centrada("cuerpo", o.forma("caja", wc, wc, wc), c, c, o.tope(pies), 0, 1, { sobre: "pies", pista: "¡{V} es el cuerpo del robot, encima de {s}!" });
            var wn = paso(r, 0.6, 0.8, 0.1);
            var cuello = o.centrada("cuello", o.forma("cilindro", wn, wn, paso(r, 0.3, 0.5, 0.1)), c, c, o.tope(cuerpo), 0, 2, { sobre: "cuerpo", pista: "¡{V} es el cuello del robot!" });
            var wh = paso(r, 1.0, 1.2, 0.1);
            var cabeza = o.centrada("cabeza", o.forma("caja", wh, wh, wh), c, c, o.tope(cuello), 0, 3, { sobre: "cuello", pista: "¡{V} es la cabeza del robot, encima de {s}!" });
            o.centrada("antena", o.forma(r() < 0.5 ? "cono" : "piramide", 0.5, 0.5, paso(r, 0.6, 0.8, 0.1)), c, c, o.tope(cabeza), 0, 4, { sobre: "cabeza", pista: "¡{V} es la antena! Va arriba de todo." });
        },

        // ---------------- grado 2 (6 piezas, con piezas largas para girar)

        /** Puente: dos pilares, dos columnas, la viga que los une y el techito. */
        puente: function (o) {
            var r = o.r;
            var wc = paso(r, 1.0, 1.2, 0.1), g = paso(r, 2.0, 2.6, 0.2), cy = 0.6;
            var cubo = o.forma("caja", wc, wc, wc);
            var x1 = wc / 2, x2 = wc + g + wc / 2;
            o.centrada("pilar-izq", cubo, x1, cy, 0, 0, 0, { pista: "¡{V} es el pilar de la izquierda!" });
            o.centrada("pilar-der", cubo, x2, cy, 0, 0, 0, { pista: "¡{V} es el pilar de la derecha!" });
            var wl = paso(r, 0.7, 0.8, 0.1), col = o.forma("cilindro", wl, wl, paso(r, 1.0, 1.4, 0.2));
            var c1 = o.centrada("columna-izq", col, x1, cy, r2(wc), 0, 1, { sobre: "pilar-izq", pista: "¡{V} va de pie encima de {s}!" });
            o.centrada("columna-der", col, x2, cy, r2(wc), 0, 1, { sobre: "pilar-der", pista: "¡{V} va de pie encima de {s}!" });
            var L = r2(2 * wc + g);
            var viga = o.centrada("viga", o.forma("caja", L, 1, paso(r, 0.4, 0.5, 0.1)), L / 2, cy, o.tope(c1), 0, 2, { pista: "¡{V} va acostado encima de las dos columnas! Fíjate hacia dónde apunta la guía." });
            o.centrada("techo", o.forma("prisma", paso(r, 1.6, 2.2, 0.2), 1, paso(r, 0.7, 0.9, 0.1)), L / 2, cy, o.tope(viga), 0, 3, { sobre: "viga", pista: "¡{V} es el techito del puente, encima de {s}!" });
        },

        /** Casita: base, dos paredes, el techo plano, el tejado y la chimenea. */
        casita: function (o) {
            var r = o.r;
            var W = paso(r, 2.8, 3.2, 0.2), D = paso(r, 2.0, 2.2, 0.2);
            var base = o.en("base", o.forma("caja", W, D, 0.4), [0, 0, 0], 0, 0, { pista: "¡{V} es el piso de la casita! Va abajo de todo." });
            var wp = paso(r, 1.0, 1.2, 0.1), pared = o.forma("caja", wp, wp, wp);
            o.centrada("pared-izq", pared, 0.15 + wp / 2, D / 2, o.tope(base), 0, 1, { sobre: "base", pista: "¡{V} es la pared de la izquierda!" });
            var p2 = o.centrada("pared-der", pared, W - 0.15 - wp / 2, D / 2, o.tope(base), 0, 1, { sobre: "base", pista: "¡{V} es la pared de la derecha!" });
            var losa = o.centrada("losa", o.forma("caja", r2(W - 0.2), r2(D - 0.4), 0.3), W / 2, D / 2, o.tope(p2), 0, 2, { pista: "¡{V} va acostado encima de las dos paredes!" });
            var ht = paso(r, 0.8, 1.0, 0.1);
            o.centrada("tejado", o.forma("prisma", r2(W - 0.2), r2(D - 0.4), ht), W / 2, D / 2, o.tope(losa), 0, 3, { sobre: "losa", pista: "¡{V} es el tejado! Va encima de {s}." });
            o.centrada("chimenea", o.forma(r() < 0.5 ? "cilindro" : "caja", 0.5, 0.5, 0.7), W / 2, D / 2, r2(o.tope(losa) + ht * 0.4), 0, 4,
                { incrustada: true, sobre: "tejado", pista: "¡{V} es la chimenea, arriba de todo!" });
        },

        /** Molino: base, cuerpo redondo, cabina, dos aspas que se cruzan y el techo. */
        molino: function (o) {
            var r = o.r;
            var B = paso(r, 1.8, 2.2, 0.2), c = B / 2;
            var prev = o.centrada("base", o.forma("caja", B, B, paso(r, 0.8, 1.0, 0.1)), c, c, 0, 0, 0, { pista: "¡{V} es la base del molino!" });
            var wc = paso(r, 1.3, 1.5, 0.1);
            prev = o.centrada("cuerpo", o.forma("cilindro", wc, wc, paso(r, 1.4, 1.8, 0.2)), c, c, o.tope(prev), 0, 1, { sobre: "base", pista: "¡{V} es el cuerpo del molino, encima de {s}!" });
            var wk = paso(r, 1.0, 1.2, 0.1);
            prev = o.centrada("cabina", o.forma("caja", wk, wk, wk), c, c, o.tope(prev), 0, 2, { sobre: "cuerpo", pista: "¡{V} va encima de {s}!" });
            var aspa = o.forma("caja", paso(r, 2.6, 3.0, 0.2), paso(r, 0.5, 0.6, 0.1), paso(r, 0.3, 0.4, 0.1));
            var oa = r() < 0.5 ? 0 : 1;
            prev = o.centrada("aspa-a", aspa, c, c, o.tope(prev), oa, 3, { sobre: "cabina", pista: "¡{V} es un aspa del molino! Fíjate hacia dónde apunta la guía." });
            prev = o.centrada("aspa-b", aspa, c, c, o.tope(prev), 1 - oa, 4, { pista: "¡La otra aspa se cruza! Gírala para que apunte hacia el otro lado." });
            o.centrada("techo", o.forma(r() < 0.5 ? "cono" : "piramide", wk, wk, paso(r, 0.8, 1.0, 0.1)), c, c, o.tope(prev), 0, 5, { pista: "¡{V} es el techo del molino, arriba de todo!" });
        },

        // ---------------- grado 3 (9 piezas)

        /** Fortaleza: base, cuatro torres en las esquinas, dos murallas y dos puntas. */
        fortaleza: function (o) {
            var r = o.r;
            var W = paso(r, 3.0, 3.4, 0.2), D = paso(r, 2.4, 2.8, 0.2);
            var base = o.en("base", o.forma("caja", W, D, paso(r, 0.6, 0.8, 0.1)), [0, 0, 0], 0, 0, { pista: "¡{V} es la base de la fortaleza! Va abajo de todo." });
            var torre = o.forma("cilindro", 0.9, 0.9, paso(r, 1.2, 1.6, 0.2)), z = o.tope(base);
            var t = o.centrada("torre-1", torre, 0.5, 0.5, z, 0, 1, { sobre: "base", pista: "¡{V} es una torre de la esquina de atrás!" });
            o.centrada("torre-2", torre, W - 0.5, 0.5, z, 0, 1, { sobre: "base", pista: "¡{V} es la otra torre de atrás!" });
            o.centrada("torre-3", torre, 0.5, D - 0.5, z, 0, 1, { sobre: "base", pista: "¡{V} es una torre de adelante!" });
            o.centrada("torre-4", torre, W - 0.5, D - 0.5, z, 0, 1, { sobre: "base", pista: "¡{V} es la otra torre de adelante!" });
            var muralla = o.forma("caja", W, 0.9, paso(r, 0.4, 0.5, 0.1)), zm = o.tope(t);
            var m1 = o.en("muralla-atras", muralla, [0, 0.05, zm], 0, 2, { pista: "¡{V} une las torres de atrás! Va acostado encima de ellas." });
            o.en("muralla-frente", muralla, [0, r2(D - 0.95), zm], 0, 2, { pista: "¡{V} une las torres de adelante!" });
            var punta = o.forma(r() < 0.5 ? "piramide" : "cono", 0.9, 0.9, paso(r, 0.8, 1.0, 0.1)), zp = o.tope(m1);
            o.centrada("punta-atras", punta, W / 2, 0.5, zp, 0, 3, { sobre: "muralla-atras", pista: "¡{V} va en el centro de la muralla de atrás!" });
            o.centrada("punta-frente", punta, W / 2, D - 0.5, zp, 0, 3, { sobre: "muralla-frente", pista: "¡{V} va en el centro de la muralla de adelante!" });
        },

        /** Tren: tres vagones; encima la cabina, la caldera y la carga; y arriba sus remates. */
        tren: function (o) {
            var r = o.r;
            var L = paso(r, 1.8, 2.0, 0.2), D = 1.2, sep = 0.3;
            var vagon = o.forma("caja", L, D, 0.4);
            var cx = [0, 1, 2].map(function (k) { return r2(k * (L + sep) + L / 2); });
            var nombresV = ["el primero", "el del medio", "el último"];
            cx.forEach(function (x, k) { o.centrada("vagon-" + (k + 1), vagon, x, D / 2, 0, 0, 0, { pista: "¡{V} es un vagón del tren! Va abajo: " + nombresV[k] + "." }); });
            var cab = o.centrada("cabina", o.forma("caja", 1.2, 1.2, paso(r, 1.1, 1.3, 0.1)), cx[0], D / 2, 0.4, 0, 1, { sobre: "vagon-1", pista: "¡{V} es la cabina del maquinista, encima del primer vagón!" });
            var wc = paso(r, 0.9, 1.1, 0.1);
            var cal = o.centrada("caldera", o.forma("cilindro", wc, wc, paso(r, 1.0, 1.2, 0.1)), cx[1], D / 2, 0.4, 0, 1, { sobre: "vagon-2", pista: "¡{V} es la caldera, encima del vagón del medio!" });
            var car = o.centrada("carga", o.forma("caja", 0.9, 0.9, 0.9), cx[2], D / 2, 0.4, 0, 1, { sobre: "vagon-3", pista: "¡{V} es la carga, encima del último vagón!" });
            o.centrada("techo", o.forma("prisma", 1.3, 1.3, paso(r, 0.5, 0.7, 0.1)), cx[0], D / 2, o.tope(cab), r() < 0.5 ? 0 : 1, 2, { sobre: "cabina", pista: "¡{V} es el techo de la cabina!" });
            o.centrada("chimenea", o.forma("cono", 0.6, 0.6, paso(r, 0.6, 0.8, 0.1)), cx[1], D / 2, o.tope(cal), 0, 2, { sobre: "caldera", pista: "¡{V} es la chimenea, encima de {s}!" });
            o.centrada("tapa", o.forma("piramide", 0.9, 0.9, paso(r, 0.5, 0.7, 0.1)), cx[2], D / 2, o.tope(car), 0, 2, { sobre: "carga", pista: "¡{V} tapa la carga del último vagón!" });
        },

        /** Acueducto: tres pilares, tres columnas, dos vigas y el techo largo. */
        acueducto: function (o) {
            var r = o.r;
            var w = paso(r, 1.0, 1.2, 0.1), s = paso(r, 1.8, 2.2, 0.2), cy = 0.6;
            var cubo = o.forma("caja", w, w, w);
            var cx = [0, 1, 2].map(function (k) { return r2(w / 2 + k * s); });
            var lados = ["de la izquierda", "del centro", "de la derecha"];
            cx.forEach(function (x, k) { o.centrada("pilar-" + (k + 1), cubo, x, cy, 0, 0, 0, { pista: "¡{V} es el pilar " + lados[k] + "!" }); });
            var col = o.forma("cilindro", 0.8, 0.8, paso(r, 1.2, 1.6, 0.2)), cols = [];
            cx.forEach(function (x, k) { cols.push(o.centrada("columna-" + (k + 1), col, x, cy, r2(w), 0, 1, { sobre: "pilar-" + (k + 1), pista: "¡{V} va de pie encima del pilar " + lados[k] + "!" })); });
            var zv = o.tope(cols[0]), hv = paso(r, 0.4, 0.5, 0.1), viga = o.forma("caja", r2(s + 0.4), 1, hv);
            o.en("viga-izq", viga, [r2(cx[0] - 0.4), r2(cy - 0.5), zv], 0, 2, { pista: "¡{V} une las columnas de la izquierda!" });
            o.en("viga-der", viga, [cx[1], r2(cy - 0.5), zv], 0, 2, { pista: "¡{V} une las columnas de la derecha!" });
            o.en("techo", o.forma("prisma", r2(2 * s + 0.8), 1, paso(r, 0.7, 0.9, 0.1)), [r2(cx[0] - 0.4), r2(cy - 0.5), r2(zv + hv)], 0, 3, { pista: "¡{V} es el techo largo, arriba de todo!" });
        },

        // ---------------- grado 4 (11 piezas)

        /** Gran castillo: el castillo con techos puntiagudos en sus dos torres. */
        "gran-castillo": function (o) {
            FAMILIAS.castillo(o);
            ["torre-izq", "torre-der"].forEach(function (id, k) {
                var t = o.porId[id], f = o.formas[t.forma];
                var w = r2(f.w + 0.2);
                o.centrada("punta-" + (k ? "der" : "izq"), o.forma("cono", w, w, 0.9), r2(t.pos[0] + f.w / 2), r2(t.pos[1] + f.d / 2), o.tope(t), 0, 3,
                    { sobre: id, pista: "¡{V} es el techo de la torre " + (k ? "derecha" : "izquierda") + "!" });
            });
        },

        /** Pirámide escalonada: tres franjas, tres franjas, dos franjas, cubo, cilindro y punta. */
        escalonada: function (o) {
            var r = o.r;
            var A = paso(r, 3.9, 4.5, 0.3), a = r2(A / 3);
            var f0 = o.forma("caja", A, a, paso(r, 0.5, 0.6, 0.1)), z, prev;
            [0, 1, 2].forEach(function (k) { prev = o.en("escalon-1-" + (k + 1), f0, [0, r2(k * a), 0], 0, 0, { pista: "¡{V} es una franja del primer escalón, abajo de todo!" }); });
            z = o.tope(prev);
            var B = r2(A * 0.75), b = r2(B / 3), d1 = r2((A - B) / 2);
            var f1 = o.forma("caja", B, b, paso(r, 0.5, 0.6, 0.1));
            [0, 1, 2].forEach(function (k) { prev = o.en("escalon-2-" + (k + 1), f1, [d1, r2(d1 + k * b), z], 0, 1, { pista: "¡{V} es una franja del segundo escalón!" }); });
            z = o.tope(prev);
            var C = r2(A * 0.5), c = r2(C / 2), d2 = r2((A - C) / 2);
            var f2 = o.forma("caja", C, c, paso(r, 0.5, 0.6, 0.1));
            [0, 1].forEach(function (k) { prev = o.en("escalon-3-" + (k + 1), f2, [r2(d2 + k * c), d2, z], 1, 2, { pista: "¡{V} es una franja del tercer escalón! Gira la pieza como la guía." }); });
            var m = A / 2, wc = r2(C * 0.7);
            var cubo = o.centrada("cubo", o.forma("caja", wc, wc, wc), m, m, o.tope(prev), 0, 3, { pista: "¡{V} va encima de los escalones!" });
            var wl = r2(wc * 0.7);
            var cil = o.centrada("cilindro", o.forma("cilindro", wl, wl, paso(r, 0.6, 0.8, 0.1)), m, m, o.tope(cubo), 0, 4, { sobre: "cubo", pista: "¡{V} va encima de {s}!" });
            o.centrada("punta", o.forma(r() < 0.5 ? "piramide" : "cono", wl, wl, paso(r, 0.7, 0.9, 0.1)), m, m, o.tope(cil), 0, 5, { sobre: "cilindro", pista: "¡{V} es la punta, arriba de todo!" });
        },

        /** Torre del reloj: base con dos escalones, cuerpo, dos columnas, dos barras cruzadas, reloj, campanario y punta. */
        "torre-reloj": function (o) {
            var r = o.r;
            var h0 = paso(r, 0.8, 1.0, 0.2), he = paso(r, 0.5, 0.7, 0.1);
            o.en("base", o.forma("caja", 2, 2, h0), [1, 0, 0], 0, 0, { pista: "¡{V} va en el centro, abajo de todo!" });
            var esc = o.forma("caja", 2, 0.8, he);
            o.en("escalon-izq", esc, [0.2, 0, 0], 1, 0, { pista: "¡{V} va a la izquierda de la base! Gira la pieza como la guía." });
            o.en("escalon-der", esc, [3, 0, 0], 1, 0, { pista: "¡{V} va a la derecha de la base!" });
            var cuerpo = o.centrada("cuerpo", o.forma("caja", 1.6, 1.6, 1.6), 2, 1, h0, 0, 1, { sobre: "base", pista: "¡{V} es el cuerpo de la torre, encima de {s}!" });
            var col = o.forma("cilindro", 0.7, 0.7, paso(r, 1.0, 1.2, 0.1));
            o.centrada("columna-izq", col, 0.6, 1, he, 0, 1, { sobre: "escalon-izq", pista: "¡{V} va de pie a la izquierda!" });
            o.centrada("columna-der", col, 3.4, 1, he, 0, 1, { sobre: "escalon-der", pista: "¡{V} va de pie a la derecha!" });
            var barra = o.forma("caja", 2.4, paso(r, 0.8, 1.0, 0.1), paso(r, 0.4, 0.5, 0.1)), oa = r() < 0.5 ? 0 : 1;
            var b1 = o.centrada("barra-a", barra, 2, 1, o.tope(cuerpo), oa, 2, { sobre: "cuerpo", pista: "¡{V} va acostado encima de {s}! Fíjate hacia dónde apunta la guía." });
            var b2 = o.centrada("barra-b", barra, 2, 1, o.tope(b1), 1 - oa, 3, { pista: "¡El otro prisma largo se cruza! Gíralo para que apunte hacia el otro lado." });
            var reloj = o.centrada("reloj", o.forma("caja", 1.1, 1.1, 1.1), 2, 1, o.tope(b2), 0, 4, { pista: "¡{V} es el reloj de la torre!" });
            var camp = o.centrada("campanario", o.forma("cilindro", 0.8, 0.8, paso(r, 0.6, 0.8, 0.1)), 2, 1, o.tope(reloj), 0, 5, { sobre: "reloj", pista: "¡{V} es el campanario, encima de {s}!" });
            o.centrada("punta", o.forma(r() < 0.5 ? "cono" : "piramide", 0.9, 0.9, paso(r, 0.8, 1.0, 0.1)), 2, 1, o.tope(camp), 0, 6, { sobre: "campanario", pista: "¡{V} es la punta de la torre, arriba de todo!" });
        }

    };

    /** Lista de posiciones (como piezasNivel) de una obra generada, para validarla. */
    function listaDeObra(obra) {
        return obra.piezas.map(function (p, k) {
            var f = obra.formas[p.forma];
            return { id: p.id, forma: p.forma, def: f, pos: p.pos, orient: p.orient, capa: p.capa, orden: k, depende: [], incrustada: !!p.incrustada, caja: caja(p.pos, f, p.orient) };
        });
    }

    /** Piezas de cada grado de dificultad (1-4). */
    var PIEZAS_GRADO = [5, 6, 9, 11];

    function gradoDe(n, i) { return (n && n.grado) || (i + 1); }

    /** Una obra válida para el nivel n con el azar r (null si no se pudo). */
    function generarNivel(n, r) {
        var clave = n.clave || n.id;
        var fam = FAMILIAS[clave];
        if (!fam || n.generar === false) return null;
        var esperado = n.piezas ? n.piezas.length : PIEZAS_GRADO[(n.grado || 1) - 1];
        for (var intento = 0; intento < 20; intento++) {
            var o = new Obra(r, clave);
            fam(o);
            if (o.piezas.length !== esperado) continue;
            if (validarLista(listaDeObra(o)).length) continue;
            if (n.rotadas && o.piezas.filter(function (p) { return girable(o.formas[p.forma]); }).length < n.rotadas) continue;
            nombrar(o);
            pistas(o);
            return o;
        }
        return null;
    }

    /**
     * Una construcción al azar por nivel: { construcciones: { clave: { piezas } }, formas }.
     * Si el azar no da una figura válida se usa una sorteada con semilla fija (probada en las
     * pruebas); los niveles con `piezas` en el config tienen además su figura fija de respaldo.
     */
    function generarConstrucciones(cfg, rnd) {
        var r = typeof rnd === "function" ? rnd : Math.random;
        var out = { construcciones: {}, formas: {} };
        niveles(cfg).forEach(function (n) {
            var o = generarNivel(n, r) || (n.piezas ? null : generarNivel(n, semillaFija(7)));
            if (!o) return;
            Object.keys(o.formas).forEach(function (k) { out.formas[k] = o.formas[k]; });
            out.construcciones[n.clave || n.id] = { piezas: o.piezas };
        });
        return out;
    }

    function semillaFija(s) {
        var a = s >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /**
     * Los 4 niveles de la partida: uno al azar de cada grado, de menor a mayor dificultad.
     * `evitar` (claves de la partida anterior) se esquiva cuando el grado tiene otra opción.
     */
    function elegirNiveles(cfg, rnd, evitar) {
        var r = typeof rnd === "function" ? rnd : Math.random;
        var ev = evitar || [];
        var ns = niveles(cfg), out = [];
        [1, 2, 3, 4].forEach(function (g) {
            var del = ns.filter(function (n, i) { return gradoDe(n, i) === g; });
            if (!del.length) return;
            var nuevos = del.filter(function (n) { return ev.indexOf(n.clave) < 0; });
            out.push(elegir(nuevos.length ? nuevos : del, r));
        });
        return out;
    }

    /** Frase de una lista que no se repite seguida. */
    function frase(lista, turno) {
        if (!lista || !lista.length) return "¡Muy bien!";
        if (typeof lista === "string") return lista;
        return lista[Math.abs(turno | 0) % lista.length];
    }

    // ------------------------------------------------------------------ validación del config

    /**
     * Errores que romperían la partida (lista vacía = válido): exactamente cuatro niveles con
     * 5, 6, 9 y 11 piezas, formas conocidas, ninguna caja metida en otra, cada pieza apoyada en la
     * capa de abajo y una secuencia de abajo hacia arriba que se puede completar.
     */
    function validar(cfg) {
        var errores = [];
        var ns = niveles(cfg);
        var cuentas = PIEZAS_GRADO;
        [1, 2, 3, 4].forEach(function (g) {
            if (!ns.some(function (n, i) { return gradoDe(n, i) === g; })) errores.push("Falta un nivel de grado " + g);
        });
        Object.keys((cfg && cfg.formas) || {}).forEach(function (k) {
            var f = cfg.formas[k];
            if (TIPOS.indexOf(f.tipo) < 0) errores.push("Forma " + k + ": tipo desconocido " + f.tipo);
            if (!(f.w > 0 && f.d > 0 && f.h > 0)) errores.push("Forma " + k + ": medidas inválidas");
        });
        ns.forEach(function (n, i) {
            var pre = "Nivel " + (n.clave || i + 1) + ": ";
            var esperado = cuentas[gradoDe(n, i) - 1];
            if (!n.zeus || !n.zoe || !n.listo || !n.nombre) errores.push(pre + "faltan textos");
            if (n.rotadas && !n.giro) errores.push(pre + "hay piezas giradas pero no botones de giro");
            if (!n.piezas) {
                // nivel solo generado: la figura de respaldo (semilla fija) tiene que salir
                if (!FAMILIAS[n.clave]) errores.push(pre + "no hay generador para " + n.clave);
                else if (!generarNivel(n, semillaFija(7))) errores.push(pre + "el generador no arma una figura válida de " + esperado + " piezas");
                return;
            }
            var ps = n.piezas;
            if (esperado != null && ps.length !== esperado) errores.push(pre + "debe tener " + esperado + " piezas y tiene " + ps.length);
            var ids = {};
            ps.forEach(function (p) {
                if (ids[p.id]) errores.push(pre + "posición repetida " + p.id);
                ids[p.id] = true;
                if (!forma(cfg, p.forma)) errores.push(pre + "forma desconocida " + p.forma);
                (p.alternativas || []).forEach(function (a) {
                    var fa = forma(cfg, a), fb = forma(cfg, p.forma);
                    if (!fa) errores.push(pre + "alternativa desconocida " + a);
                    else if (fb && (Math.abs(fa.w - fb.w) > EPS || Math.abs(fa.d - fb.d) > EPS)) errores.push(pre + "la alternativa " + a + " no tiene la misma base");
                });
            });
            var lista = piezasNivel(cfg, i, null);
            if (lista.length !== ps.length) return;
            errores = errores.concat(validarLista(lista, pre));
        });
        return errores;
    }

    /** Errores físicos de una construcción: cajas metidas una en otra, piezas flotando, secuencia trabada. */
    function validarLista(lista, pre) {
        var errores = [];
        pre = pre || "";
        (function () {
            for (var a = 0; a < lista.length; a++) {
                for (var b = a + 1; b < lista.length; b++) {
                    var pa = lista[a], pb = lista[b];
                    if (pa.incrustada || pb.incrustada) continue;
                    if (solapan(pa.caja, pb.caja)) errores.push(pre + pa.id + " y " + pb.id + " se meten una en la otra");
                }
            }
            lista.forEach(function (p) {
                if (p.caja.z0 < EPS) return;
                var apoyo = lista.filter(function (q) {
                    return q !== p && q.capa < p.capa && pisanJuntas(q.caja, p.caja) &&
                        (Math.abs(q.caja.z1 - p.caja.z0) < 0.03 || (p.incrustada && q.caja.z1 > p.caja.z0 && q.caja.z0 < p.caja.z0));
                });
                if (!apoyo.length) errores.push(pre + p.id + " queda flotando: nada la sostiene en la capa de abajo");
            });
            // se puede completar: colocando una a una lo que está habilitado
            var col = {};
            var guardia = 0;
            while (!completo(col, lista) && guardia++ < 50) {
                var hab = habilitadas(lista, col);
                if (!hab.length) { errores.push(pre + "la secuencia se traba"); break; }
                col[hab[0].id] = true;
            }
        })();
        return errores;
    }

    global.ReglasPuzle = {
        TIPOS: TIPOS,
        niveles: niveles,
        nivel: nivel,
        forma: forma,
        normalizar: normalizar,
        girar: girar,
        simetria: simetria,
        girable: girable,
        indice: indice,
        orientacionOk: orientacionOk,
        medidas: medidas,
        caja: caja,
        solapan: solapan,
        piezasNivel: piezasNivel,
        capas: capas,
        capaActual: capaActual,
        habilitada: habilitada,
        habilitadas: habilitadas,
        siguiente: siguiente,
        capaCompletada: capaCompletada,
        altura: altura,
        completo: completo,
        evaluar: evaluar,
        cercano: cercano,
        iman: iman,
        ordenPintado: ordenPintado,
        barajar: barajar,
        elegir: elegir,
        repartir: repartir,
        orientacionesIniciales: orientacionesIniciales,
        sortearVariante: sortearVariante,
        generarConstrucciones: generarConstrucciones,
        generarNivel: generarNivel,
        elegirNiveles: elegirNiveles,
        PIEZAS_GRADO: PIEZAS_GRADO,
        validarLista: validarLista,
        frase: frase,
        validar: validar
    };
})(typeof window !== "undefined" ? window : global);
