/**
 * Reglas de Descubre las vocales, sin DOM.
 * Posiciones en porcentaje del área de vocales (centro de cada una).
 *
 * rondas del gran desafío (5-6): el documento no fija el número.
 * Aquí se acepta el valor del config (2 a 5 aciertos). Los errores no consumen ronda.
 */
(function (global) {
    "use strict";

    var VOCES = ["zoe", "zeus"];
    var VOCALES = ["a", "e", "i", "o", "u"];
    var EFECTOS = ["salta", "ilumina", "mueve", "gira", "estrellas", "cierre", "celebra"];

    // Tres lugares y solo dos en pantalla: así cambian de sitio sin quedar
    // siempre a la izquierda y a la derecha (con dos fijos, el acierto alterna).
    var SLOTS2 = [
        { id: "izq", x: 24, y: 64 },
        { id: "alto", x: 50, y: 36 },
        { id: "der", x: 76, y: 64 }
    ];

    var SLOTS5 = [
        { id: "1", x: 14, y: 62 },
        { id: "2", x: 32, y: 44 },
        { id: "3", x: 50, y: 34 },
        { id: "4", x: 68, y: 44 },
        { id: "5", x: 86, y: 62 }
    ];

    var REGLAS = {
        "3-4 años": [
            { tipo: "fijo", vocales: ["a", "e"], correcto: "a", pista: true, efecto: "salta", repetir: true, voz: "zoe", texto: "¡Muy Bien!", errorVoz: "zeus", errorTexto: "¡Escucha con mucha atención, otra vez!" },
            { tipo: "fijo", vocales: ["a", "e"], correcto: "e", efecto: "ilumina", sonido: "celebracion" },
            { tipo: "fijo", vocales: ["i", "a"], correcto: "i", efecto: "mueve", voz: "zoe", texto: "¡La encontraste! Muy Bien lo hiciste." },
            { tipo: "fijo", vocales: ["o", "e"], correcto: "o", efecto: "gira", repetir: true, voz: "zeus", texto: "¡Excelente!" },
            { tipo: "fijo", vocales: ["u", "a"], correcto: "u", efecto: "estrellas" },
            { tipo: "par", vocales: ["a", "e", "i", "o", "u"], efecto: "cierre" }
        ],
        "5-6 años": [
            { tipo: "fijo", vocales: ["a", "e", "i", "o", "u"], correcto: "i", efecto: "ilumina", repetir: true, sonido: "recompensa" },
            { tipo: "fijo", vocales: ["a", "e", "i", "o", "u"], correcto: "u", efecto: "mueve" },
            { tipo: "fijo", vocales: ["a", "e", "i", "o", "u"], correcto: "e", efecto: "ilumina", voz: "zoe", texto: "¡Muy bien, la reconociste!" },
            { tipo: "reubicar", vocales: ["a", "e", "i", "o", "u"], correcto: "a", efecto: "ilumina", repetir: true },
            { tipo: "fijo", vocales: ["a", "e", "i", "o", "u"], correcto: "o", sinAnimacionPrevia: true, efecto: "celebra", sonido: "celebracion" },
            { tipo: "serie", vocales: ["a", "e", "i", "o", "u"], efecto: "ilumina", rondas: true }
        ]
    };

    function azar(aleatorio) {
        return typeof aleatorio === "function" ? aleatorio : Math.random;
    }

    function mezclar(lista, aleatorio) {
        var rnd = azar(aleatorio);
        var out = (lista || []).slice();
        var i;
        for (i = out.length - 1; i > 0; i--) {
            var j = Math.floor(rnd() * (i + 1));
            var t = out[i];
            out[i] = out[j];
            out[j] = t;
        }
        return out;
    }

    function igualLista(a, b) {
        if (!a || !b || a.length !== b.length) return false;
        var i;
        for (i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
        return true;
    }

    function slotsPara(cantidad) {
        return cantidad <= 2 ? SLOTS2 : SLOTS5;
    }

    function mismoMapa(mapa, previo, vocales) {
        if (!previo) return false;
        var i;
        var alguno = false;
        for (i = 0; i < vocales.length; i++) {
            var id = vocales[i];
            if (!previo[id] || !mapa[id]) return false;
            alguno = true;
            if (previo[id].slot !== mapa[id].slot) return false;
        }
        return alguno;
    }

    function lugar(slot) {
        return { slot: slot.id, x: slot.x, y: slot.y };
    }

    function elegirDe(lista, evitar, rnd) {
        var pool = (lista || []).filter(function (id) { return id !== evitar; });
        if (!pool.length) pool = (lista || []).slice();
        if (!pool.length) return null;
        return pool[Math.floor(rnd() * pool.length)];
    }

    /**
     * Reparte vocales en plataformas. La correcta no repite la plataforma anterior
     * si hay otra libre: si no, el niño responde por el lugar y no por el sonido.
     */
    function ubicarDos(vocales, correcto, mapaPrevio, rnd) {
        var previo = mapaPrevio || {};
        var slotPrev = previo[correcto] && previo[correcto].slot;
        var mejor = null;
        var intento;
        for (intento = 0; intento < 24; intento++) {
            var pool = SLOTS2.filter(function (s) { return s.id !== slotPrev; });
            if (pool.length < 2) pool = SLOTS2.slice();
            var lugares = mezclar(pool, rnd).slice(0, 2);
            if (Math.abs(lugares[0].x - lugares[1].x) < 26) continue;
            var idx = lugares[1].id !== slotPrev && rnd() < 0.5 ? 1 : 0;
            if (lugares[idx].id === slotPrev) idx = 1 - idx;
            var mapa = {};
            mapa[correcto] = lugar(lugares[idx]);
            vocales.forEach(function (id) {
                if (id === correcto) return;
                mapa[id] = lugar(lugares[1 - idx]);
            });
            mejor = mapa;
            if (!mismoMapa(mapa, previo, vocales)) return mapa;
        }
        return mejor;
    }

    function ubicar(vocales, correcto, evitarSlot, aleatorio, mapaPrevio) {
        var rnd = azar(aleatorio);
        if ((vocales || []).length <= 2) return ubicarDos(vocales, correcto, mapaPrevio, rnd);
        var base = slotsPara(vocales.length);
        var mejor = null;
        var intento;
        for (intento = 0; intento < 24; intento++) {
            var lugares = mezclar(base, rnd).slice(0, vocales.length);
            var mapa = {};
            vocales.forEach(function (id, i) {
                mapa[id] = lugar(lugares[i]);
            });
            mejor = mapa;
            if (evitarSlot && mapa[correcto] && mapa[correcto].slot === evitarSlot) continue;
            if (mismoMapa(mapa, mapaPrevio, vocales)) continue;
            return mapa;
        }
        return mejor;
    }

    function preparar(reto, estado, aleatorio) {
        var rnd = azar(aleatorio);
        var prev = estado || {};
        var vocales;
        var correcto;
        if (!reto) return null;
        if (reto.tipo === "par") {
            correcto = elegirDe(reto.vocales, prev.ultimoCorrecto, rnd);
            var resto = (reto.vocales || []).filter(function (id) { return id !== correcto; });
            var distractor = resto.length ? resto[Math.floor(rnd() * resto.length)] : null;
            vocales = [correcto, distractor].filter(Boolean);
        } else if (reto.tipo === "serie") {
            vocales = (reto.vocales || []).slice();
            correcto = elegirDe(vocales, prev.ultimoCorrecto, rnd);
        } else {
            vocales = (reto.vocales || []).slice();
            correcto = reto.correcto;
        }
        return {
            vocales: vocales,
            correcto: correcto,
            mapa: ubicar(
                vocales,
                correcto,
                vocales.length > 2 ? prev.ultimoSlot : null,
                rnd,
                prev.ultimoMapa
            )
        };
    }

    function totalEstrellas(nivel) {
        var n = 0;
        ((nivel && nivel.retos) || []).forEach(function (r) {
            n += r.tipo === "serie" ? Math.max(1, Number(r.rondas) || 1) : 1;
        });
        return n;
    }

    function esLinea(l, voz) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "" && (!voz || l.voz === voz) && VOCES.indexOf(l.voz) !== -1;
    }

    function validarConfig(cfg) {
        var errores = [];
        var vocales = (cfg && cfg.vocales) || {};
        var niveles = (cfg && cfg.niveles) || [];
        if (!niveles.length) errores.push("Sin niveles");

        VOCALES.forEach(function (id) {
            var v = vocales[id];
            if (!v) errores.push("Falta la vocal " + id);
            else {
                if (!v.img) errores.push("Vocal " + id + ": sin imagen");
                if (!v.color) errores.push("Vocal " + id + ": sin color");
            }
        });

        niveles.forEach(function (n) {
            var tag = "Nivel " + (n && n.id);
            var regla = REGLAS[n && n.edad];
            if (!regla) {
                errores.push(tag + ": edad sin reglas (" + (n && n.edad) + ")");
                return;
            }
            if (!n.titulo) errores.push(tag + ": sin título");
            if (!Array.isArray(n.bienvenida) || n.bienvenida.length < 2) errores.push(tag + ": bienvenida incompleta");
            (n.bienvenida || []).forEach(function (l, i) {
                if (!l || !l.texto || (l.personaje !== 0 && l.personaje !== 1)) {
                    errores.push(tag + ": bienvenida " + (i + 1) + " inválida");
                }
            });
            if (!esLinea(n.cierre)) errores.push(tag + ": cierre inválido");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) errores.push(tag + ": sin insignia");

            var retos = n.retos || [];
            if (retos.length !== regla.length) errores.push(tag + ": deben ser " + regla.length + " retos");
            retos.forEach(function (r, i) {
                var esp = regla[i];
                var rt = tag + " reto " + (i + 1);
                if (!esp || !r) return;
                if (r.tipo !== esp.tipo) errores.push(rt + ": tipo debe ser " + esp.tipo);
                if (!igualLista(r.vocales, esp.vocales)) errores.push(rt + ": vocales distintas al documento");
                if (esp.correcto && r.correcto !== esp.correcto) errores.push(rt + ": la correcta es " + esp.correcto);
                if (!!r.pista !== !!esp.pista) errores.push(rt + ": pista visual " + (esp.pista ? "obligatoria" : "no va"));
                if (!!r.sinAnimacionPrevia !== !!esp.sinAnimacionPrevia) errores.push(rt + ": animación previa");
                if (esp.rondas) {
                    var rondas = Number(r.rondas);
                    if (!isFinite(rondas) || rondas < 2 || rondas > 5) errores.push(rt + ": rondas debe estar entre 2 y 5");
                } else if (r.rondas) errores.push(rt + ": no lleva rondas");

                var a = r.acierto || {};
                if (a.efecto !== esp.efecto || EFECTOS.indexOf(a.efecto) === -1) errores.push(rt + ": efecto " + esp.efecto);
                if (!!a.repetir !== !!esp.repetir) errores.push(rt + ": repetir sonido");
                if ((a.sonido || "") !== (esp.sonido || "")) errores.push(rt + ": sonido de acierto");
                if (esp.texto) {
                    if (!esLinea(a, esp.voz) || a.texto !== esp.texto) errores.push(rt + ": frase de acierto");
                } else if (a.texto || a.voz) errores.push(rt + ": el documento no da frase de acierto");

                if (esp.errorTexto) {
                    if (!esLinea(r.error, esp.errorVoz) || r.error.texto !== esp.errorTexto) errores.push(rt + ": frase de error");
                } else if (r.error) errores.push(rt + ": el documento no da frase de error");
            });
        });
        return errores;
    }

    global.DescubreVocalesLogica = {
        VOCALES: VOCALES,
        SLOTS2: SLOTS2,
        SLOTS5: SLOTS5,
        mezclar: mezclar,
        ubicar: ubicar,
        preparar: preparar,
        totalEstrellas: totalEstrellas,
        validarConfig: validarConfig
    };
})(typeof window !== "undefined" ? window : this);
