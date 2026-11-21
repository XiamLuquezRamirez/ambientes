/**
 * EscenarioCanasta — habitación, cajas y arrastre (window.EscenarioCanasta).
 * Las posiciones y las zonas salen del config. Aquí solo se dibuja y se mueve.
 */
(function (global) {
    "use strict";

    var root = null;
    var cfg = null;
    var nivel = null;
    var piezas = {};
    var zonas = {};
    var ordenLista = [];
    var arrastreOn = false;
    var arrastreId = null;
    var punteroId = null;
    var agarreX = 0;
    var agarreY = 0;
    var oyentes = {};
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    function emitir(nombre, dato) {
        (oyentes[nombre] || []).forEach(function (fn) {
            try { fn(dato); } catch (e) { console.warn("[EscenarioCanasta]", e); }
        });
    }

    function al(nombre, fn) {
        if (!oyentes[nombre]) oyentes[nombre] = [];
        oyentes[nombre].push(fn);
    }

    function dibujo(tipo) {
        return (global.JuguetesCanasta && tipo) ? global.JuguetesCanasta.dibujar(tipo) : "";
    }

    function habitacionHtml() {
        return '' +
            '<div class="habitacion" style="--orden:0">' +
            '<div class="pared">' +
            '<div class="papel-pared"></div>' +
            '<div class="ventana">' +
            '<div class="cielo"><div class="sol"></div>' +
            '<div class="nube-cielo n1"></div><div class="nube-cielo n2"></div><div class="nube-cielo n3"></div>' +
            '<div class="colina c1"></div><div class="colina c2"></div>' +
            '<i class="pajaro p1"></i><i class="pajaro p2"></i>' +
            '</div>' +
            '<div class="marco"></div><div class="visillo izq"></div><div class="visillo der"></div>' +
            '<div class="repisa-ventana"></div>' +
            '</div>' +
            '<div class="estante izq">' + libros() + '<span class="planta"></span></div>' +
            '<div class="estante der">' + libros() + '<span class="pelota-estante"></span></div>' +
            '<div class="banderin">' + banderines() + '</div>' +
            '<div class="cuadro cuadro-izq"><span></span></div>' +
            '<div class="cuadro cuadro-der"><span></span></div>' +
            '</div>' +
            '<div class="zocalo"></div>' +
            '<div class="suelo"><div class="duelas"></div></div>' +
            '<div class="alfombra"><div class="alfombra-cara">' + cuadros() + '</div></div>' +
            '<div class="luz-calida"></div>' +
            '<div class="motas" aria-hidden="true">' + motas() + '</div>' +
            '<div class="desorden" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>' +
            '<div class="calidez"></div>' +
            '<div class="zonas"></div>' +
            '<div class="guardadas"></div>' +
            '<div class="piezas"></div>' +
            '<div class="fx"></div>' +
            '</div>';
    }

    function libros() {
        var colores = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#e599f7"];
        return colores.map(function (c, i) {
            return '<span class="libro" style="--c:' + c + ';--giro:' + ((i % 2 ? 7 : -6) + i) + 'deg"></span>';
        }).join("");
    }

    function cuadros() {
        var colores = ["#ff8787", "#ffd43b", "#74c0fc", "#69db7c", "#e599f7", "#ffa94d",
            "#ffa8a8", "#a9e34b", "#99e9f2", "#ffc9c9", "#d0bfff", "#ffe066"];
        var html = "";
        for (var i = 0; i < 12; i++) html += '<span style="background:' + colores[i % colores.length] + '"></span>';
        return html;
    }

    function banderines() {
        var colores = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#e599f7", "#ff922b", "#ffa94d", "#63e6be"];
        return colores.map(function (c, i) {
            return '<i style="--c:' + c + ';--n:' + i + '"></i>';
        }).join("");
    }

    function motas() {
        var html = "";
        for (var i = 0; i < 14; i++) {
            html += '<i style="--x:' + Math.round(4 + Math.random() * 92) + '%;--y:' + Math.round(10 + Math.random() * 70) +
                '%;--d:' + (6 + Math.random() * 7).toFixed(1) + 's;--r:' + (0.8 + Math.random() * 1.8).toFixed(1) +
                'px;--t:' + (Math.random() * 6).toFixed(1) + 's"></i>';
        }
        return html;
    }

    function $(sel) { return root ? root.querySelector(sel) : null; }

    function medida() {
        var h = root ? root.querySelector(".habitacion") : null;
        if (!h) return { w: 1, alto: 1, el: null };
        return { w: h.clientWidth || 1, alto: h.clientHeight || 1, el: h };
    }

    function montar(el, config) {
        root = el;
        cfg = config;
        root.innerHTML = habitacionHtml();
        root.addEventListener("pointerdown", abajo);
        global.addEventListener("pointermove", mueve);
        global.addEventListener("pointerup", arriba);
        global.addEventListener("pointercancel", arriba);
        return Promise.resolve(true);
    }

    function cargar(nivelCfg) {
        soltarArrastre(false);
        nivel = nivelCfg;
        piezas = {};
        zonas = {};
        ordenLista = [];
        var cajaZ = $(".zonas");
        var cajaP = $(".piezas");
        var hab = $(".habitacion");
        if (!cajaZ || !cajaP || !hab || !nivel) return;
        hab.classList.remove("festiva");
        hab.style.setProperty("--orden", "0");
        hab.dataset.nivel = String(nivel.id || "");
        cajaZ.innerHTML = "";
        cajaP.innerHTML = "";
        var cajaG = $(".guardadas");
        if (cajaG) cajaG.innerHTML = "";
        (nivel.zonas || []).forEach(function (z) {
            var n = document.createElement("div");
            n.className = "zona";
            n.dataset.zona = z.id;
            n.setAttribute("aria-label", z.nombre || "caja");
            n.innerHTML = '<div class="zona-halo"></div>' +
                '<div class="zona-caja" style="--tinta:' + (z.tinta || "#f59f00") + ';--tinta-oscura:' + (z.sombra || "rgba(0,0,0,.28)") + '">' +
                '<div class="zona-tapa"></div>' +
                '<div class="zona-cuerpo"><span class="zona-cinta"></span><span class="zona-brillo"></span></div>' +
                '<div class="zona-marca">' + dibujo(z.marca) + '</div>' +
                '<div class="zona-boca"></div>' +
                "</div>";
            cajaZ.appendChild(n);
            zonas[z.id] = { def: z, el: n, n: 0 };
        });
        (nivel.objetos || []).forEach(function (o) {
            var n = document.createElement("div");
            n.className = "pieza";
            n.dataset.id = o.id;
            n.setAttribute("role", "button");
            n.setAttribute("aria-label", o.nombre || "juguete");
            n.innerHTML = '<div class="pieza-sombra"></div><div class="pieza-cuerpo">' + dibujo(o.tipo) + "</div>";
            cajaP.appendChild(n);
            piezas[o.id] = { def: o, el: n, guardado: false, slot: 0 };
        });
        reacomodar();
    }

    function centroPct(pctX, pctY) {
        var m = medida();
        return { x: (pctX / 100) * m.w, y: (pctY / 100) * m.alto };
    }

    function ponerEsquina(el, cx, cy) {
        var w = el.offsetWidth || 80;
        var h = el.offsetHeight || 80;
        el.style.left = Math.round(cx - w / 2) + "px";
        el.style.top = Math.round(cy - h / 2) + "px";
    }

    function colocarHome(p) {
        var c = centroPct(p.def.x, p.def.y);
        ponerEsquina(p.el, c.x, c.y);
    }

    function idsEnZona(zonaId) {
        return ordenLista.filter(function (id) {
            return piezas[id] && piezas[id].def.zona === zonaId && piezas[id].guardado;
        });
    }

    /**
     * Dónde se posa un juguete dentro de su caja.
     *
     * Se mide sobre el CUERPO de la caja (.zona-cuerpo), no sobre la zona entera: la zona
     * incluye las solapas abiertas, que sobresalen, y usarlas dejaba los juguetes por fuera.
     * Con varios juguetes se reparten en filas de hasta 3 para que ninguno se salga por los lados.
     */
    function slotDe(zona, i, total) {
        var base = root.getBoundingClientRect();
        var cuerpo = zona.el.querySelector(".zona-cuerpo");
        var r = (cuerpo || zona.el).getBoundingClientRect();
        var n = Math.max(1, total || 1);
        var porFila = Math.min(n, 3);
        var filas = Math.ceil(n / porFila);
        var fila = Math.floor(i / porFila);
        var col = i % porFila;
        // La última fila puede ir incompleta: se centra.
        var enEstaFila = Math.min(porFila, n - fila * porFila);
        var cx = r.left - base.left + r.width * ((col + 1) / (enEstaFila + 1));
        // De abajo hacia arriba, como si se fueran apilando en el fondo de la caja.
        var cy = r.top - base.top + r.height * (filas === 1 ? 0.56 : (0.78 - fila * 0.3));
        return { x: cx, y: cy };
    }

    function colocarEnZona(p, total) {
        var z = zonas[p.def.zona];
        if (!z) return;
        var s = slotDe(z, p.slot, total || z.n || 1);
        ponerEsquina(p.el, s.x, s.y);
    }

    function reflowZona(zonaId) {
        var ids = idsEnZona(zonaId);
        ids.forEach(function (id, i) {
            piezas[id].slot = i;
            colocarEnZona(piezas[id], ids.length);
        });
    }

    function reacomodar() {
        if (!root || arrastreId) return;
        Object.keys(zonas).forEach(function (id) {
            var z = zonas[id];
            var c = centroPct(z.def.x, z.def.y);
            ponerEsquina(z.el, c.x, c.y);
        });
        Object.keys(piezas).forEach(function (id) {
            if (!piezas[id].guardado) colocarHome(piezas[id]);
        });
        Object.keys(zonas).forEach(function (id) { reflowZona(id); });
    }

    function rectZona(id) {
        var z = zonas[id];
        if (!z) return null;
        var base = root.getBoundingClientRect();
        var r = z.el.getBoundingClientRect();
        return {
            id: id,
            x: (r.left + r.right) / 2 - base.left,
            y: (r.top + r.bottom) / 2 - base.top,
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom
        };
    }

    function distancias(el) {
        var base = root.getBoundingClientRect();
        var r = el.getBoundingClientRect();
        var cx = (r.left + r.right) / 2 - base.left;
        var cy = (r.top + r.bottom) / 2 - base.top;
        return Object.keys(zonas).map(function (id) {
            var z = rectZona(id);
            var dx = cx - z.x;
            var dy = cy - z.y;
            return { id: id, distancia: Math.sqrt(dx * dx + dy * dy), rect: z };
        });
    }

    function radios() {
        var pts = Object.keys(zonas).map(function (id) {
            var z = rectZona(id);
            return { x: z.x, y: z.y };
        });
        return global.ReglasCanasta.radiosDe(pts, (cfg && cfg.juego) || {});
    }

    function marcarCerca(id) {
        var p = piezas[id];
        if (!p) return;
        var propia = p.def.zona;
        var lista = distancias(p.el);
        var rad = radios();
        var cerca = false;
        lista.forEach(function (z) {
            var on = z.id === propia && z.distancia <= rad.atraer * 1.05;
            zonas[z.id].el.classList.toggle("cerca", on);
            if (on) cerca = true;
        });
        return cerca;
    }

    function limpiarCerca() {
        Object.keys(zonas).forEach(function (id) { zonas[id].el.classList.remove("cerca"); });
    }

    function pulsoZona(zonaId) {
        var z = zonas[zonaId];
        if (!z) return;
        z.el.classList.remove("ayuda");
        void z.el.offsetWidth;
        z.el.classList.add("ayuda");
        setTimeout(function () { if (z.el) z.el.classList.remove("ayuda"); }, 2600);
    }

    function abajo(ev) {
        if (!arrastreOn || arrastreId || ev.button > 0) return;
        var el = ev.target && ev.target.closest ? ev.target.closest(".pieza") : null;
        if (!el || !root.contains(el)) return;
        var p = piezas[el.dataset.id];
        if (!p || p.guardado || el.classList.contains("volviendo")) return;
        ev.preventDefault();
        arrastreId = p.def.id;
        punteroId = ev.pointerId;
        var r = el.getBoundingClientRect();
        agarreX = ev.clientX - r.left;
        agarreY = ev.clientY - r.top;
        el.classList.add("tomado");
        try { el.setPointerCapture(ev.pointerId); } catch (e) { /* el movimiento global sigue */ }
        emitir("tomar", arrastreId);
    }

    function mueve(ev) {
        if (!arrastreId || (punteroId != null && ev.pointerId !== punteroId)) return;
        var p = piezas[arrastreId];
        if (!p) return;
        var base = root.getBoundingClientRect();
        var w = p.el.offsetWidth || 80;
        var h = p.el.offsetHeight || 80;
        var x = ev.clientX - base.left - agarreX;
        var y = ev.clientY - base.top - agarreY;
        x = Math.max(-w * 0.25, Math.min(base.width - w * 0.75, x));
        y = Math.max(-h * 0.15, Math.min(base.height - h * 0.45, y));
        p.el.style.left = Math.round(x) + "px";
        p.el.style.top = Math.round(y) + "px";
        marcarCerca(arrastreId);
        emitir("arrastrar", arrastreId);
    }

    function arriba(ev) {
        if (!arrastreId) return;
        if (ev && punteroId != null && ev.pointerId !== punteroId && ev.type !== "pointercancel") return;
        var id = arrastreId;
        var p = piezas[id];
        var puntero = ev ? { x: ev.clientX, y: ev.clientY } : null;
        arrastreId = null;
        punteroId = null;
        if (!p) return;
        p.el.classList.remove("tomado");
        limpiarCerca();
        emitir("soltar", { id: id, puntero: puntero });
    }

    function soltarArrastre(avisar) {
        if (!arrastreId) return;
        var id = arrastreId;
        arrastreId = null;
        punteroId = null;
        var p = piezas[id];
        if (p) p.el.classList.remove("tomado");
        limpiarCerca();
        if (avisar) emitir("soltar", { id: id, puntero: null });
    }

    function infoSoltar(id, puntero) {
        var p = piezas[id];
        if (!p) return null;
        var lista = distancias(p.el);
        var rad = radios();
        var dentro = false;
        if (puntero) {
            var z = rectZona(p.def.zona);
            var m = 28;
            if (z && puntero.x >= z.left - m && puntero.x <= z.right + m && puntero.y >= z.top - m && puntero.y <= z.bottom + m) {
                dentro = true;
            }
        }
        return {
            guardado: p.guardado,
            zonaObjetivo: p.def.zona,
            zonas: lista,
            radio: rad.radio,
            atraer: rad.atraer,
            punteroEnObjetivo: dentro
        };
    }

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 160) : ms); });
    }

    function estrellas(cx, cy) {
        var fx = $(".fx");
        if (!fx) return;
        var n = reducido ? 3 : 7;
        for (var i = 0; i < n; i++) {
            var s = document.createElement("i");
            s.className = "estrella";
            s.style.left = cx + "px";
            s.style.top = cy + "px";
            s.style.setProperty("--dx", Math.round(Math.cos(i / n * Math.PI * 2) * (28 + i * 6)) + "px");
            s.style.setProperty("--dy", Math.round(Math.sin(i / n * Math.PI * 2) * (22 + i * 4) - 20) + "px");
            fx.appendChild(s);
            (function (nodo) {
                setTimeout(function () { if (nodo.parentNode) nodo.parentNode.removeChild(nodo); }, 800);
            })(s);
        }
    }

    /** Onda blanca en la boca de la caja al entrar un juguete. */
    function anillo(cx, cy) {
        var fx = $(".fx");
        if (!fx || reducido) return;
        var a = document.createElement("i");
        a.className = "anillo";
        a.style.left = cx + "px";
        a.style.top = cy + "px";
        fx.appendChild(a);
        setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 700);
    }

    function guardar(id) {
        var p = piezas[id];
        var z = p && zonas[p.def.zona];
        if (!p || !z || p.guardado) return Promise.resolve(false);
        p.guardado = true;
        p.slot = z.n;
        z.n += 1;
        if (ordenLista.indexOf(id) < 0) ordenLista.push(id);
        p.el.classList.remove("tomado");
        p.el.classList.add("guardando");
        void p.el.offsetWidth;
        z.el.classList.add("rebote", "llena");
        setTimeout(function () { z.el.classList.remove("rebote"); }, 650);
        reflowZona(p.def.zona);
        var s = slotDe(z, p.slot, z.n);
        var boca = rectZona(p.def.zona);
        if (boca) anillo(boca.x, boca.y - (boca.bottom - boca.top) * 0.22);
        estrellas(s.x, s.y);
        var total = (nivel.objetos || []).length || 1;
        var hab = $(".habitacion");
        if (hab) hab.style.setProperty("--orden", String(ordenLista.length / total));
        return sleep(520).then(function () {
            p.el.classList.remove("guardando");
            p.el.classList.add("guardado");
            // Pasa detrás de las solapas: ya está dentro de la caja.
            var cajaG = $(".guardadas");
            if (cajaG && p.el.parentNode !== cajaG) cajaG.appendChild(p.el);
            colocarEnZona(p, z.n);
            return true;
        });
    }

    function devolver(id) {
        var p = piezas[id];
        if (!p || p.guardado) return Promise.resolve(false);
        p.el.classList.remove("tomado");
        p.el.classList.add("volviendo");
        void p.el.offsetWidth;
        colocarHome(p);
        return sleep(460).then(function () {
            p.el.classList.remove("volviendo");
            return true;
        });
    }

    /** La demo guarda y luego devuelve el mismo juguete, sin dejarlo contado. */
    function deshacer(id) {
        var p = piezas[id];
        if (!p || !p.guardado) return devolver(id);
        var z = zonas[p.def.zona];
        p.guardado = false;
        p.el.classList.remove("guardado", "guardando");
        var cajaP = $(".piezas");
        if (cajaP && p.el.parentNode !== cajaP) cajaP.appendChild(p.el);
        if (z) {
            z.n = Math.max(0, z.n - 1);
            if (z.n === 0) z.el.classList.remove("llena");
            else reflowZona(p.def.zona);
        }
        var i = ordenLista.indexOf(id);
        if (i >= 0) ordenLista.splice(i, 1);
        var hab = $(".habitacion");
        var total = (nivel.objetos || []).length || 1;
        if (hab) hab.style.setProperty("--orden", String(ordenLista.length / total));
        return devolver(id);
    }

    function celebrar() {
        var hab = $(".habitacion");
        if (hab) {
            hab.style.setProperty("--orden", "1");
            hab.classList.add("festiva");
        }
        Object.keys(zonas).forEach(function (id) { zonas[id].el.classList.add("fiesta"); });
        return sleep(700);
    }

    function confeti() {
        var fx = $(".fx");
        if (!fx || reducido) return;
        var colores = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#e599f7", "#ff922b"];
        for (var i = 0; i < 36; i++) {
            var c = document.createElement("i");
            c.className = "confeti";
            c.style.left = (8 + Math.random() * 84) + "%";
            c.style.background = colores[i % colores.length];
            c.style.animationDelay = (Math.random() * 0.4) + "s";
            c.style.setProperty("--gira", (Math.random() * 240 - 120) + "deg");
            fx.appendChild(c);
        }
    }

    function puntoCliente(id) {
        var p = piezas[id];
        if (!p) return null;
        var r = p.el.getBoundingClientRect();
        return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
    }

    function puntoZonaCliente(zonaId) {
        var z = zonas[zonaId];
        if (!z) return null;
        var r = z.el.getBoundingClientRect();
        return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
    }

    function ponerCliente(id, cx, cy) {
        var p = piezas[id];
        if (!p) return;
        var base = root.getBoundingClientRect();
        ponerEsquina(p.el, cx - base.left, cy - base.top);
        marcarCerca(id);
    }

    function marcarTomado(id) {
        var p = piezas[id];
        if (!p) return;
        p.el.classList.add("tomado");
    }

    function soltarMarca(id) {
        var p = piezas[id];
        if (p) p.el.classList.remove("tomado");
        limpiarCerca();
    }

    function arrastre(on) { arrastreOn = !!on; if (!arrastreOn) soltarArrastre(false); }
    function listo() { return !!root; }
    function guardados() { return ordenLista.slice(); }

    global.EscenarioCanasta = {
        montar: montar,
        cargar: cargar,
        reacomodar: reacomodar,
        arrastre: arrastre,
        infoSoltar: infoSoltar,
        guardar: guardar,
        devolver: devolver,
        deshacer: deshacer,
        celebrar: celebrar,
        confeti: confeti,
        pulsoZona: pulsoZona,
        puntoCliente: puntoCliente,
        puntoZonaCliente: puntoZonaCliente,
        ponerCliente: ponerCliente,
        marcarTomado: marcarTomado,
        soltarMarca: soltarMarca,
        guardados: guardados,
        listo: listo,
        al: al
    };
})(typeof window !== "undefined" ? window : global);
