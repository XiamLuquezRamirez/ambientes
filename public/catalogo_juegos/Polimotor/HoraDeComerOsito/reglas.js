/**
 * ReglasComer — reglas puras de "¡La Hora de Comer!" (sin DOM ni Phaser).
 * window.ReglasComer en el navegador; module.exports para las pruebas de node.
 */
(function (global) {
    "use strict";

    function rondas(cfg) {
        return cfg && Array.isArray(cfg.rondas) ? cfg.rondas : [];
    }

    function totalRondas(cfg) {
        return rondas(cfg).length;
    }

    function ronda(cfg, i) {
        var r = rondas(cfg);
        if (!r.length) return null;
        return r[Math.max(0, Math.min(r.length - 1, i | 0))];
    }

    function totalFrutas(cfg) {
        return rondas(cfg).reduce(function (s, r) { return s + (r.frutas || []).length; }, 0);
    }

    /** Identificador único de una fruta de una ronda (no se repite entre rondas). */
    function idFruta(rondaIdx, k, tipo) {
        return "r" + (rondaIdx + 1) + "-" + k + "-" + tipo;
    }

    /** Identificador de un objeto que no se come (cuchara, salero…) de una ronda. */
    function idObjeto(rondaIdx, k, tipo) {
        return "r" + (rondaIdx + 1) + "-o" + k + "-" + tipo;
    }

    function esFrutaId(id) {
        var p = String(id || "").split("-");
        return p.length >= 3 && /^\d+$/.test(p[1]);
    }

    /**
     * Piezas del plato en una ronda: sus frutas y los objetos que no se comen, mezclados.
     * rnd: función de azar (Math.random en el juego; una fija en las pruebas).
     */
    function piezasRonda(cfg, i, rnd) {
        var r = ronda(cfg, i) || {};
        var l = (r.frutas || []).map(function (t, k) { return { id: idFruta(i, k, t), tipo: t, fruta: true }; })
            .concat((r.objetos || []).map(function (t, k) { return { id: idObjeto(i, k, t), tipo: t, fruta: false }; }));
        return mezclar(l, rnd);
    }

    function mezclar(lista, rnd) {
        var a = lista.slice();
        var f = rnd || Math.random;
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(f() * (i + 1));
            var t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        return a;
    }

    function tipoDe(id) {
        var p = String(id || "").split("-");
        return p.length >= 3 ? p.slice(2).join("-") : null;
    }

    function suave(u) {
        return u * u * (3 - 2 * u);
    }

    /**
     * Ciclo de la boca: cerrada → abriendo → abierta → cerrando.
     * t: ms desde que empezó el ciclo. p: { cerradaMs, abreMs, abiertaMs, cierraMs }.
     */
    function cicloBoca(t, p) {
        var c = Number(p.cerradaMs) || 2000;
        var a = Number(p.abreMs) || 300;
        var o = Number(p.abiertaMs) || 2500;
        var z = Number(p.cierraMs) || 250;
        var total = c + a + o + z;
        var u = ((t % total) + total) % total;
        if (u < c) return { estado: "cerrada", apertura: 0, vuelta: Math.floor(t / total) };
        u -= c;
        if (u < a) return { estado: "abriendo", apertura: suave(u / a), vuelta: Math.floor(t / total) };
        u -= a;
        if (u < o) return { estado: "abierta", apertura: 1, vuelta: Math.floor(t / total) };
        u -= o;
        return { estado: "cerrando", apertura: 1 - suave(u / z), vuelta: Math.floor(t / total) };
    }

    function bocaLista(apertura, umbral) {
        return apertura >= (umbral == null ? 0.6 : umbral);
    }

    /** Radio de entrega alrededor de la boca: crece un poco con los fallos seguidos (con tope). */
    function radioEntrega(cfg, fallosSeguidos) {
        var j = (cfg && cfg.juego) || {};
        var base = Number(j.radioBoca) || 90;
        var paso = Number(j.radioBocaPorFallo) || 0;
        var tope = Number(j.radioBocaMax) || base;
        return Math.min(tope, base + paso * Math.max(0, fallosSeguidos | 0));
    }

    /**
     * Decide una entrega. o = { fruta:{x,y}, boca:{x,y}, apertura, radio, umbral, entregada }
     * motivo: "boca" (acierto), "repetida", "cerrada" (en la boca pero cerrada), "cerca" (junto al osito), "lejos".
     */
    function evaluarEntrega(o) {
        if (!o || !o.fruta || !o.boca) return { acierto: false, motivo: "lejos", distancia: Infinity };
        var d = Math.hypot(o.fruta.x - o.boca.x, o.fruta.y - o.boca.y);
        if (o.entregada) return { acierto: false, motivo: "repetida", distancia: d };
        var r = Number(o.radio) || 90;
        // un objeto que no se come (cuchara, salero…) llevado a la boca: el osito no lo acepta
        if (o.esFruta === false && d <= r * 1.4) return { acierto: false, motivo: "noComida", distancia: d };
        if (d <= r) {
            if (bocaLista(o.apertura, o.umbral)) return { acierto: true, motivo: "boca", distancia: d };
            return { acierto: false, motivo: "cerrada", distancia: d };
        }
        if (d <= r * 2.4) return { acierto: false, motivo: "cerca", distancia: d };
        return { acierto: false, motivo: "lejos", distancia: d };
    }

    /** Posición lateral del osito: va y viene alrededor del centro. */
    function posicionLateral(fase, centro, rango) {
        return centro + rango * Math.sin(fase);
    }

    /** Velocidad angular del vaivén según la ronda, el estado de la boca y la variación. */
    function velocidadVaiven(r, estadoBoca, tSeg) {
        var v = Number(r.velocidad) || 0.5;
        var frena = (estadoBoca === "abierta" || estadoBoca === "abriendo") ? (Number(r.frenaAlAbrir) || 0) : 0;
        var vari = Number(r.variacion) || 0;
        return v * (1 - frena) * (1 + vari * Math.sin(tSeg * 0.9) * Math.sin(tSeg * 0.37 + 1));
    }

    function progreso(hechas, total) {
        var n = Math.max(0, Math.min(total, hechas | 0));
        var marcas = [];
        for (var i = 0; i < total; i++) marcas.push(i < n);
        return { hechas: n, total: total, marcas: marcas, completo: n >= total };
    }

    function plantilla(texto, vars) {
        return String(texto || "").replace(/\{(\w+)\}/g, function (m, k) {
            return vars && vars[k] != null ? String(vars[k]) : m;
        });
    }

    /** Revisa que la configuración sea jugable; devuelve una lista de problemas (vacía si está bien). */
    function revisarJuego(cfg) {
        var p = [];
        var rs = rondas(cfg);
        if (rs.length !== 3) p.push("deben ser 3 rondas");
        var tipos = {};
        (cfg.frutas || []).forEach(function (f) { tipos[f.id] = true; });
        var ids = {};
        rs.forEach(function (r, i) {
            if (!Array.isArray(r.frutas) || r.frutas.length !== 4) p.push("la ronda " + (i + 1) + " debe tener 4 frutas");
            (r.frutas || []).forEach(function (t, k) {
                if (!tipos[t]) p.push("fruta desconocida: " + t);
                var id = idFruta(i, k, t);
                if (ids[id]) p.push("id repetido: " + id);
                ids[id] = true;
            });
            var objs = {};
            (cfg.objetos || []).forEach(function (o) { objs[o.id] = true; });
            (r.objetos || []).forEach(function (t, k) {
                if (!objs[t]) p.push("objeto desconocido: " + t);
                if (tipos[t]) p.push("el objeto " + t + " no puede ser una fruta");
                var id = idObjeto(i, k, t);
                if (ids[id]) p.push("id repetido: " + id);
                ids[id] = true;
            });
            if ((r.frutas || []).length + (r.objetos || []).length > 6) p.push("la ronda " + (i + 1) + " tiene más de 6 piezas en el plato");
            if (i > 0) {
                var a = rs[i - 1];
                if (!(r.velocidad > a.velocidad)) p.push("la ronda " + (i + 1) + " debe moverse más rápido");
                if (!(r.rango > a.rango)) p.push("la ronda " + (i + 1) + " debe recorrer más");
                if (!(r.abiertaMs < a.abiertaMs)) p.push("la ronda " + (i + 1) + " debe abrir la boca menos tiempo");
            }
        });
        if (!cfg.niveles || !cfg.niveles.length) p.push("faltan niveles");
        return p;
    }

    var api = {
        rondas: rondas,
        totalRondas: totalRondas,
        ronda: ronda,
        totalFrutas: totalFrutas,
        idFruta: idFruta,
        idObjeto: idObjeto,
        esFrutaId: esFrutaId,
        piezasRonda: piezasRonda,
        mezclar: mezclar,
        tipoDe: tipoDe,
        cicloBoca: cicloBoca,
        bocaLista: bocaLista,
        radioEntrega: radioEntrega,
        evaluarEntrega: evaluarEntrega,
        posicionLateral: posicionLateral,
        velocidadVaiven: velocidadVaiven,
        progreso: progreso,
        plantilla: plantilla,
        revisarJuego: revisarJuego
    };

    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (global) global.ReglasComer = api;
})(typeof window !== "undefined" ? window : null);
