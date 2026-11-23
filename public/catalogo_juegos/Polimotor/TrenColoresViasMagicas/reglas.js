/**
 * ReglasTren — decisión del trazado de "El Tren de Colores y las Vías Mágicas" (window.ReglasTren).
 *
 * Puro: no toca el DOM ni three.js, se prueba en Node (tests/js/tren-colores). Trabaja en coordenadas del MUNDO 3D
 * sobre el suelo (x, z): la escena proyecta el dedo con un rayo de la cámara al plano de la vía y entrega aquí
 * el punto { x, z }. Así la regla no depende de la resolución de pantalla.
 *
 * Cada nivel es una ruta con 2, 3 o 4 estaciones (generarRuta, al azar en cada partida): entre dos estaciones
 * hay un hueco (tramo) que el niño construye con el dedo. El tramo es una polilínea (recta o curva); el avance `s`
 * (0..largo) es la distancia construida sobre ella, nunca la posición suelta del dedo:
 *   - solo se empieza tocando la punta (al principio, el punto INICIO junto al tren);
 *   - el dedo tiene que estar dentro del carril (|lateral| ≤ tolerancia) y como mucho `ventana` por delante de la
 *     punta: saltar al final o tocar la estación siguiente no construye nada;
 *   - la punta avanza a lo sumo `velocidadMax` por segundo (sin teletransporte);
 *   - salirse detiene el avance sin perder lo construido; al volver, sigue;
 *   - levantar el dedo deja la vía construida y se retoma tocando la punta brillante.
 */
(function (global) {
    "use strict";

    var DEF = {
        toqueInicio: 1.25,   // radio (mundo) alrededor de la punta para empezar o retomar
        margen: 0.55,        // tolerancia lateral = ancho/2 + margen·ancho
        ventana: 2.2,        // cuánto puede ir el dedo por delante de la punta
        atras: 1.6,          // cuánto puede ir por detrás (volver un poco no cuenta como salirse)
        velocidadMax: 9,     // unidades por segundo
        finTolerancia: 0.08, // la meta se da al llegar a largo − finTolerancia
        separacionPuntos: 0.62,
        separacionTraviesas: 0.56,
        hitos: [0.25, 0.5, 0.75]
    };

    // dónde caben las estaciones (unidades del mundo); config.json → ruta puede cambiarlo
    var RUTA = {
        x0: -10.5,          // primera estación
        x1: 13.5,           // última estación
        zMin: -1.5,
        zMax: 1.7,
        z0: 0.6,            // altura de la ruta en los niveles sin desnivel
        huecoMin: 5.4,      // ningún hueco más corto (el tren cabe entre dos estaciones)
        pesoMax: 2,         // el hueco más largo puede ser hasta pesoMax veces el más corto
        pendienteMax: 0.32, // |Δz| ≤ pendienteMax·Δx entre dos estaciones
        curvaMin: 1.2,      // altura de la joroba de las curvas (nivel con curvas)
        curvaMax: 1.8,
        radioMin: 2.6,      // radio mínimo de las curvas (mayor que la tolerancia del carril: el dedo no salta de lado)
        margenCurva: 0.9,   // cuánto puede salirse la curva de [zMin, zMax]
        paso: 0.25,         // muestreo de las curvas
        antes: 7.5,         // vía fija detrás de la primera estación (donde espera el tren)
        despues: 3.2        // vía fija después de la última (hasta el tope)
    };

    function num(v, d) {
        var n = Number(v);
        return isFinite(n) ? n : d;
    }

    function opciones(cfg) {
        var c = cfg || {};
        var o = {};
        Object.keys(DEF).forEach(function (k) {
            o[k] = k === "hitos" ? (Array.isArray(c.hitos) ? c.hitos.slice() : DEF.hitos.slice()) : num(c[k], DEF[k]);
        });
        return o;
    }

    function opcionesRuta(cfg) {
        var c = cfg || {};
        var o = {};
        Object.keys(RUTA).forEach(function (k) { o[k] = num(c[k], RUTA[k]); });
        return o;
    }

    function par(p) {
        if (Array.isArray(p)) return { x: num(p[0], 0), z: num(p[1], 0) };
        return { x: num(p && p.x, 0), z: num(p && p.z, 0) };
    }

    /**
     * Arma el trazo de un tramo. def: { puntos: [[x, z], …] } (polilínea, recta o curva) o { desde, hasta }
     * (recta); además ancho, id e hitos (opcional, si no los de cfg).
     */
    function construir(def, cfg) {
        var o = opciones(cfg);
        var d = def || {};
        var lista = Array.isArray(d.puntos) && d.puntos.length >= 2
            ? d.puntos.map(par)
            : [par(d.desde || [-4, 0]), par(d.hasta || [4, 0])];
        // quita puntos repetidos
        var P = [lista[0]];
        for (var i = 1; i < lista.length; i++) {
            var q = P[P.length - 1];
            if (Math.abs(lista[i].x - q.x) + Math.abs(lista[i].z - q.z) > 1e-6) P.push(lista[i]);
        }
        if (P.length < 2) P.push({ x: P[0].x + 1, z: P[0].z });
        var S = [0];
        var seg = [];
        for (var j = 0; j + 1 < P.length; j++) {
            var dx = P[j + 1].x - P[j].x;
            var dz = P[j + 1].z - P[j].z;
            var l = Math.sqrt(dx * dx + dz * dz);
            seg.push({ ux: dx / l, uz: dz / l, l: l });
            S.push(S[j] + l);
        }
        var largo = S[S.length - 1];
        var A = P[0];
        var B = P[P.length - 1];
        var cx = B.x - A.x;
        var cz = B.z - A.z;
        var cl = Math.sqrt(cx * cx + cz * cz) || 1;
        var ancho = Math.max(0.6, num(d.ancho, 1.7));
        var hitos = Array.isArray(d.hitos) ? d.hitos.slice() : o.hitos;
        var puntos = [];
        var nP = Math.max(4, Math.round(largo / o.separacionPuntos));
        for (var k = 0; k <= nP; k++) puntos.push(largo * k / nP);
        var traviesas = [];
        var nT = Math.max(4, Math.round(largo / o.separacionTraviesas));
        for (var m = 0; m < nT; m++) traviesas.push((m + 0.5) * largo / nT);
        return {
            id: d.id,
            P: P,
            S: S,
            seg: seg,
            curva: P.length > 2,
            A: A,
            B: B,
            largo: largo,
            ux: cx / cl,          // dirección de la cuerda A → B (en una recta, la de la vía)
            uz: cz / cl,
            nx: -cz / cl,         // normal en el suelo (a la izquierda de la marcha)
            nz: cx / cl,
            angulo: Math.atan2(cz, cx),
            ancho: ancho,
            tolerancia: ancho / 2 + o.margen * ancho,
            toqueInicio: o.toqueInicio,
            ventana: o.ventana,
            atras: o.atras,
            velocidadMax: o.velocidadMax,
            finTolerancia: o.finTolerancia,
            hitos: hitos,
            puntos: puntos,
            traviesas: traviesas
        };
    }

    function indiceDe(t, s) {
        var lo = 0, hi = t.seg.length - 1;
        while (lo < hi) {
            var mid = (lo + hi + 1) >> 1;
            if (t.S[mid] <= s) lo = mid; else hi = mid - 1;
        }
        return lo;
    }

    /** Punto del eje a la distancia s (recortada a 0..largo). */
    function punto(t, s) {
        var k = Math.max(0, Math.min(t.largo, s));
        var i = indiceDe(t, k);
        var g = t.seg[i];
        var u = k - t.S[i];
        return { x: t.P[i].x + g.ux * u, z: t.P[i].z + g.uz * u };
    }

    /** Punto del eje a la distancia s, prolongando en recta antes del inicio y después del final. */
    function puntoExt(t, s) {
        if (s <= 0) return { x: t.P[0].x + t.seg[0].ux * s, z: t.P[0].z + t.seg[0].uz * s };
        if (s >= t.largo) {
            var g = t.seg[t.seg.length - 1];
            return { x: t.B.x + g.ux * (s - t.largo), z: t.B.z + g.uz * (s - t.largo) };
        }
        return punto(t, s);
    }

    /** Dirección de la marcha en s, suavizada entre segmentos { ux, uz, nx, nz }. */
    function direccion(t, s) {
        var h = t.curva ? 0.3 : 0;
        var a = puntoExt(t, s - h - 1e-3);
        var b = puntoExt(t, s + h + 1e-3);
        var dx = b.x - a.x, dz = b.z - a.z;
        var l = Math.sqrt(dx * dx + dz * dz) || 1;
        return { ux: dx / l, uz: dz / l, nx: -dz / l, nz: dx / l };
    }

    /** s (sin recortar fuera de los extremos) y desvío lateral del punto p respecto del eje. */
    function proyectar(t, p) {
        var mejor = null;
        var ultimo = t.seg.length - 1;
        for (var i = 0; i <= ultimo; i++) {
            var g = t.seg[i];
            var px = p.x - t.P[i].x;
            var pz = p.z - t.P[i].z;
            var u = px * g.ux + pz * g.uz;
            if (i > 0 && u < 0) u = 0;
            if (i < ultimo && u > g.l) u = g.l;
            var lat = px * -g.uz + pz * g.ux;
            var ex = px - g.ux * u, ez = pz - g.uz * u;
            var d = Math.sqrt(ex * ex + ez * ez);
            if (!mejor || d < mejor.d - 1e-9) mejor = { s: t.S[i] + u, lat: lat < 0 ? -d : d, d: d };
        }
        return mejor;
    }

    function nuevoEstado() {
        return {
            s: 0,
            estado: "lista",     // lista | trazando | fuera | pausa | meta
            motivo: null,        // por qué está fuera: "lado" | "adelante" | "atras"
            recorrido: 0,        // distancia que el dedo realmente acompañó a la punta
            hitos: 0,
            toques: 0,
            ultimoLat: 0
        };
    }

    /**
     * Toque (pointerdown). Solo engancha cerca de la punta: al empezar, el punto INICIO.
     * Devuelve { ok, evento: "inicio" | "retoma", motivo }.
     */
    function tocar(t, est, p) {
        if (est.estado === "meta") return { ok: false, motivo: "meta" };
        var punta = punto(t, est.s);
        var dx = p.x - punta.x;
        var dz = p.z - punta.z;
        var dist = Math.sqrt(dx * dx + dz * dz);
        var pr = proyectar(t, p);
        var cerca = dist <= t.toqueInicio ||
            (pr.d <= t.tolerancia && pr.s >= est.s - t.toqueInicio && pr.s <= est.s + t.toqueInicio * 0.6);
        if (!cerca) {
            var motivo = "fuera";
            if (pr.d <= t.tolerancia && pr.s > est.s) motivo = pr.s >= t.largo - t.toqueInicio ? "destino" : "adelante";
            return { ok: false, motivo: motivo };
        }
        var evento = est.s > 0.01 ? "retoma" : "inicio";
        est.estado = "trazando";
        est.motivo = null;
        est.toques++;
        return { ok: true, evento: evento };
    }

    /**
     * El dedo está en p (ya proyectado al suelo) y pasaron dt segundos. Devuelve la lista de eventos:
     * "avance" | "fuera" | "vuelve" | "hito" | "meta".
     */
    function mover(t, est, p, dt) {
        var ev = [];
        if (est.estado !== "trazando" && est.estado !== "fuera") return ev;
        var pr = proyectar(t, p);
        est.ultimoLat = pr.lat;
        var motivo = null;
        if (pr.d > t.tolerancia) motivo = "lado";
        else if (pr.s > est.s + t.ventana) motivo = "adelante";
        else if (pr.s < est.s - t.atras) motivo = "atras";
        if (motivo) {
            if (est.estado !== "fuera" || est.motivo !== motivo) ev.push("fuera");
            est.estado = "fuera";
            est.motivo = motivo;
            return ev;
        }
        if (est.estado === "fuera") {
            est.estado = "trazando";
            est.motivo = null;
            ev.push("vuelve");
        }
        var objetivo = Math.min(pr.s, t.largo);
        if (objetivo > est.s) {
            var paso = Math.min(objetivo - est.s, t.velocidadMax * Math.max(0, Math.min(0.1, dt)));
            if (paso > 0) {
                est.s += paso;
                est.recorrido += paso;
                ev.push("avance");
                var k = est.s / t.largo;
                while (est.hitos < t.hitos.length && k >= t.hitos[est.hitos]) {
                    est.hitos++;
                    ev.push("hito");
                }
            }
        }
        if (est.s >= t.largo - t.finTolerancia) {
            est.s = t.largo;
            est.estado = "meta";
            ev.push("meta");
        }
        return ev;
    }

    /** Se levantó el dedo: la vía construida se queda y la punta espera. */
    function soltar(est) {
        if (est.estado === "trazando" || est.estado === "fuera") {
            est.estado = "pausa";
            est.motivo = null;
            return true;
        }
        return false;
    }

    function reiniciar(est) {
        var n = nuevoEstado();
        Object.keys(n).forEach(function (k) { est[k] = n[k]; });
        return est;
    }

    // ------------------------------------------------------------------ ruta del nivel (al azar)

    /**
     * Ruta de un nivel: n estaciones de izquierda a derecha con huecos de largo al azar.
     *   nivel: { estaciones: 2..4, hueco: [mín, máx] (largo al azar de cada hueco), desnivel: true (las estaciones
     *   a distinta altura), curvas: true, curva: [mín, máx] y margenCurva (alto de las curvas del nivel), ancho,
     *   hitos }
     *   cfg: config.json → ruta (zona y medidas). azar: función 0..1 (Math.random por defecto; las pruebas
     *   pasan una con semilla).
     * Devuelve { estaciones: [{ x, z }], tramos: [{ id, puntos, ancho, hitos, curva }], camino: [[x, z], …]
     * (antes + tramos + después, para mover el tren), sEstaciones: s de cada estación sobre `camino` }.
     */
    function generarRuta(nivel, cfg, azar) {
        var o = opcionesRuta(cfg);
        var rnd = typeof azar === "function" ? azar : Math.random;
        var n = Math.max(2, Math.min(6, Math.round(num(nivel && nivel.estaciones, 2))));
        var huecos = n - 1;
        var xs = [o.x0];
        if (nivel && Array.isArray(nivel.hueco)) {
            // cada hueco con su propio largo al azar entre hueco[0] y hueco[1]: la ruta sigue fuera de la
            // pantalla y la cámara la recorre estación por estación
            var hMin = num(nivel.hueco[0], 18), hMax = Math.max(hMin, num(nivel.hueco[1], hMin));
            for (var h = 0; h < huecos; h++) xs.push(xs[xs.length - 1] + hMin + rnd() * (hMax - hMin));
        } else {
            // reparto de un ancho fijo (x0..x1) en huecos al azar, ninguno por debajo de huecoMin
            var span = o.x1 - o.x0;
            var huecoMin = num(nivel && nivel.huecoMin, o.huecoMin);
            var pesos = null;
            for (var intento = 0; intento < 80; intento++) {
                var w = [];
                var suma = 0;
                for (var i = 0; i < huecos; i++) {
                    var x = 1 + rnd() * (o.pesoMax - 1);
                    w.push(x);
                    suma += x;
                }
                var ok = w.every(function (v) { return v / suma * span >= huecoMin - 1e-9; });
                pesos = w.map(function (v) { return v / suma; });
                if (ok) break;
                pesos = null;
            }
            if (!pesos) pesos = Array.from({ length: huecos }, function () { return 1 / huecos; });
            pesos.forEach(function (p) { xs.push(xs[xs.length - 1] + p * span); });
            xs[xs.length - 1] = o.x1;
        }

        // alturas: planas o con desnivel al azar (pendiente limitada)
        var desnivel = !!(nivel && (nivel.desnivel || nivel.curvas));
        var zs = [];
        if (!desnivel) {
            for (var a = 0; a < n; a++) zs.push(o.z0);
        } else {
            zs.push(o.zMin + rnd() * (o.zMax - o.zMin));
            for (var b = 1; b < n; b++) {
                var dxs = xs[b] - xs[b - 1];
                var tope = o.pendienteMax * dxs;
                var lo = Math.max(o.zMin, zs[b - 1] - tope);
                var hi = Math.min(o.zMax, zs[b - 1] + tope);
                var z = lo + rnd() * (hi - lo);
                // que no quede casi plano: al menos un tercio del desnivel posible
                if (Math.abs(z - zs[b - 1]) < tope * 0.33) {
                    var arriba = zs[b - 1] + tope * 0.33 <= hi;
                    var abajo = zs[b - 1] - tope * 0.33 >= lo;
                    if (arriba && (!abajo || rnd() < 0.5)) z = Math.max(z, zs[b - 1] + tope * 0.33);
                    else if (abajo) z = Math.min(z, zs[b - 1] - tope * 0.33);
                }
                zs.push(z);
            }
        }
        var estaciones = xs.map(function (x, k) { return { x: x, z: zs[k] }; });

        var ancho = num(nivel && nivel.ancho, 1.8);
        var hitos = nivel && Array.isArray(nivel.hitos) ? nivel.hitos.slice() : null;
        var signo = rnd() < 0.5 ? 1 : -1;
        var tramos = [];
        for (var c = 0; c < huecos; c++) {
            var A = estaciones[c], B = estaciones[c + 1];
            var pts;
            if (nivel && nivel.curvas) {
                // joroba sin²: sale y llega derecha a las estaciones (no pisa sus andenes) y se curva en el medio;
                // alterna hacia el fondo y hacia el frente
                // cada nivel puede pedir curvas más altas: nivel.curva = [mín, máx] y nivel.margenCurva
                var cMin = num(nivel.curva && nivel.curva[0], o.curvaMin);
                var cMax = Math.max(cMin, num(nivel.curva && nivel.curva[1], o.curvaMax));
                var margen = num(nivel.margenCurva, o.margenCurva);
                var alto = cMin + rnd() * (cMax - cMin);
                var tope2 = signo > 0
                    ? (o.zMax + margen) - Math.max(A.z, B.z)
                    : Math.min(A.z, B.z) - (o.zMin - margen);
                var dx2 = B.x - A.x;
                // la joroba (1 − cos)/2 se curva más en la cima y en los extremos: radio = L² / (2π²·alto)
                var porRadio = dx2 * dx2 / (2 * Math.PI * Math.PI * o.radioMin);
                alto = Math.max(0.5, Math.min(alto, tope2, porRadio)) * signo;
                var m = Math.max(8, Math.ceil(Math.abs(dx2) * 1.3 / o.paso));
                pts = [];
                for (var q = 0; q <= m; q++) {
                    var u = q / m;
                    var s2 = Math.sin(Math.PI * u);
                    pts.push([A.x + dx2 * u, A.z + (B.z - A.z) * u + alto * s2 * s2]);
                }
                signo = -signo;
            } else {
                pts = [[A.x, A.z], [B.x, B.z]];
            }
            tramos.push({ id: c + 1, puntos: pts, ancho: ancho, hitos: hitos, curva: !!(nivel && nivel.curvas) });
        }

        // camino completo para el tren: vía fija antes, tramos y vía fija después
        var camino = [];
        var t0 = tramos[0].puntos;
        var ux0 = t0[1][0] - t0[0][0], uz0 = t0[1][1] - t0[0][1];
        var l0 = Math.sqrt(ux0 * ux0 + uz0 * uz0) || 1;
        camino.push([t0[0][0] - ux0 / l0 * o.antes, t0[0][1] - uz0 / l0 * o.antes]);
        var sEst = [];
        var acum = 0;
        tramos.forEach(function (tr, it) {
            for (var r = 0; r < tr.puntos.length; r++) {
                if (r === 0 && it > 0) continue;
                var p = tr.puntos[r];
                var ult = camino[camino.length - 1];
                acum += Math.sqrt(Math.pow(p[0] - ult[0], 2) + Math.pow(p[1] - ult[1], 2));
                camino.push(p);
                if (r === 0) sEst.push(acum);
            }
            sEst.push(acum);
        });
        var tf = tramos[tramos.length - 1].puntos;
        var a2 = tf[tf.length - 2], b2 = tf[tf.length - 1];
        var ux1 = b2[0] - a2[0], uz1 = b2[1] - a2[1];
        var l1 = Math.sqrt(ux1 * ux1 + uz1 * uz1) || 1;
        camino.push([b2[0] + ux1 / l1 * o.despues, b2[1] + uz1 / l1 * o.despues]);
        return { estaciones: estaciones, tramos: tramos, camino: camino, sEstaciones: sEst, opciones: o };
    }

    /** Pseudoazar con semilla (para pruebas y para repetir una ruta). */
    function azarConSemilla(semilla) {
        var s = Math.max(1, Math.floor(num(semilla, 1) * 7919 + 104729) % 2147483647);
        // las primeras salidas de una semilla chica son casi 0: se descartan unas cuantas
        for (var k = 0; k < 6; k++) s = (s * 16807) % 2147483647;
        return function () {
            s = (s * 16807) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    /**
     * Simulación para pruebas: un dedo que recorre el tramo de A a B a velocidad `vel`.
     * modo: "centro" | "desviado" (zigzag dentro del margen) | "salto" (toca el inicio y salta al final)
     *       | "fuera" (se sale a la mitad y vuelve) | "soltar" (levanta el dedo a la mitad y retoma).
     */
    function simular(t, modo, vel) {
        var est = nuevoEstado(t);
        var v = vel || 4;
        var dt = 1 / 60;
        var r = { llego: false, eventos: [], maxS: 0, pasos: 0 };
        var anotar = function (lista) {
            lista.forEach(function (e) { if (r.eventos.indexOf(e) < 0) r.eventos.push(e); });
        };
        var lado = function (s, lat) {
            var b = punto(t, s);
            var d = direccion(t, s);
            return { x: b.x + d.nx * lat, z: b.z + d.nz * lat };
        };
        var inicio = tocar(t, est, punto(t, 0));
        if (!inicio.ok) return r;
        if (modo === "salto") {
            for (var q = 0; q < 240; q++) anotar(mover(t, est, punto(t, t.largo), dt));
            r.maxS = est.s;
            r.llego = est.estado === "meta";
            return r;
        }
        var dedo = 0;
        var soltado = false;
        var salio = false;
        while (r.pasos < 20000 && est.estado !== "meta") {
            r.pasos++;
            dedo = Math.min(t.largo + 0.3, dedo + v * dt);
            var lat = 0;
            if (modo === "desviado") lat = Math.sin(dedo * 1.7) * t.tolerancia * 0.85;
            if (modo === "fuera" && !salio && dedo > t.largo * 0.5) {
                // medio segundo fuera del carril
                for (var f = 0; f < 30; f++) anotar(mover(t, est, lado(dedo, t.tolerancia * 1.8), dt));
                salio = true;
            }
            if (modo === "soltar" && !soltado && dedo > t.largo * 0.5) {
                if (soltar(est)) r.eventos.push("soltar");
                soltado = true;
                var re = tocar(t, est, punto(t, est.s));
                if (re.ok) anotar([re.evento]);
            }
            var p = dedo > t.largo ? puntoExt(t, dedo) : lado(dedo, lat);
            anotar(mover(t, est, p, dt));
            r.maxS = Math.max(r.maxS, est.s);
        }
        r.llego = est.estado === "meta";
        r.estado = est;
        return r;
    }

    var api = {
        DEF: DEF,
        RUTA: RUTA,
        opciones: opciones,
        opcionesRuta: opcionesRuta,
        construir: construir,
        punto: punto,
        puntoExt: puntoExt,
        direccion: direccion,
        proyectar: proyectar,
        nuevoEstado: nuevoEstado,
        tocar: tocar,
        mover: mover,
        soltar: soltar,
        reiniciar: reiniciar,
        generarRuta: generarRuta,
        azarConSemilla: azarConSemilla,
        simular: simular
    };
    global.ReglasTren = api;
})(typeof window !== "undefined" ? window : global);
