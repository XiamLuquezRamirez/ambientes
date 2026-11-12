/**
 * Topos — los topos de "Golpea a los Topos" y sus globos (window.Topos).
 *
 * Cada agujero de la colina tiene un topo y un globo. El escenario (escenario-phaser.js) crea las imágenes y
 * en cada cuadro las dibuja a partir de unos números del registro del agujero; este módulo solo anima esos
 * números con tweens de Phaser 4 y cambia la cara del topo. Así los topos siguen a la colina cuando cambia
 * el tamaño de la pantalla, y todo corre con el reloj de la escena.
 *
 * Registro de un agujero (EscenarioTopos.hoyo(id)):
 *   sube 0..1 (0 = escondido, 1 = afuera de cuerpo entero, con los pies en el borde) · salto (px de dibujo hacia arriba) · giro (grados)
 *   kx, ky (aplastar/estirar) · globoK (tamaño del globo, 0 = no se ve) · estado · imagen (id en config)
 *
 * Estados: oculto → apareciendo → visible → golpeado → celebrando → escondiendose → oculto
 *          (visible → escondiendose cuando se acaba su tiempo; golpeado → escondiendose en un error)
 *
 * API:
 *   SVG                                el topo entero con cinco caras (normal, parpadeo, feliz, mareado, tapa)
 *   salir(id, imagenId) → Promise      sale del agujero y muestra el globo (estado visible al terminar)
 *   esconder(id) → Promise             el globo se achica y el topo vuelve a su agujero
 *   golpeAcierto(id) → Promise         el mazo lo golpea; queda mareado con estrellitas, el globo estalla y se hunde
 *   golpeError(id) → Promise           el mazo lo golpea; se tapa los ojos, la pantalla se sacude y se esconde
 *   celebrarTodos() → Promise          todos los topos salen a festejar (final)
 *   marcar(id, "si"|"no"|null)         sello sobre el globo (presentación y demo)
 *   destacar(id, on)                   aro dorado que late alrededor del globo
 *   estado(id), visibles(), ocultarTodos()
 */
(function (global) {
    "use strict";

    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var E = function () { return global.EscenarioTopos || null; };

    // ------------------------------------------------------------------ dibujos (topo entero: 200 × 300, pies en y = 292)

    var PIEL = "#8a5a3b";
    var LINEA = "#55361f";
    var PANZA = "#d9a679";
    var HOCICO = "#efc7a4";
    var PATA = "#f2b8a0";
    var PATA_LINEA = "#b7795f";
    var T = 'stroke="' + LINEA + '" stroke-width="5" stroke-linejoin="round"';

    function svg(cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" width="200" height="300">' + cuerpo + "</svg>";
    }

    // Patas (pies rosados con deditos), debajo del cuerpo.
    var PIES = '<g fill="' + PATA + '" stroke="' + PATA_LINEA + '" stroke-width="3.5"><ellipse cx="66" cy="284" rx="30" ry="13"/><ellipse cx="134" cy="284" rx="30" ry="13"/></g>' +
        '<path d="M48,280 L46,290 M60,277 L59,293 M72,278 L72,293 M128,278 L128,293 M140,277 L141,293 M152,280 L154,290" stroke="' + PATA_LINEA + '" stroke-width="2.5" stroke-linecap="round"/>';

    // Cuerpo redondo con barriga clara.
    var CUERPO = '<path d="M38,214 Q36,150 100,146 Q164,150 162,214 Q162,282 100,284 Q38,282 38,214 Z" fill="' + PIEL + '" ' + T + '/>' +
        '<ellipse cx="100" cy="226" rx="40" ry="48" fill="' + PANZA + '"/>' +
        '<path d="M86,214 Q100,220 114,214 M88,236 Q100,242 112,236" stroke="#c48e60" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>';

    // Cabeza con orejitas, mechón, mejillas, hocico y nariz rosada.
    var CABEZA = '<circle cx="50" cy="52" r="15" fill="' + PIEL + '" ' + T + '/><circle cx="150" cy="52" r="15" fill="' + PIEL + '" ' + T + '/>' +
        '<circle cx="50" cy="52" r="6.5" fill="#e7a98a"/><circle cx="150" cy="52" r="6.5" fill="#e7a98a"/>' +
        '<ellipse cx="100" cy="98" rx="66" ry="62" fill="' + PIEL + '" ' + T + '/>' +
        '<path d="M92,40 Q88,22 97,16 M101,38 Q104,20 113,22 M107,41 Q117,30 124,35" stroke="' + LINEA + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<path d="M50,102 Q52,62 82,48" stroke="#a87650" stroke-width="7" fill="none" stroke-linecap="round" opacity=".5"/>' +
        '<ellipse cx="58" cy="122" rx="11" ry="7" fill="#ff9aa9" opacity=".65"/><ellipse cx="142" cy="122" rx="11" ry="7" fill="#ff9aa9" opacity=".65"/>' +
        '<ellipse cx="100" cy="126" rx="34" ry="23" fill="' + HOCICO + '" stroke="#b78560" stroke-width="3"/>' +
        '<path d="M68,122 L40,116 M68,130 L40,134 M132,122 L160,116 M132,130 L160,134" stroke="' + LINEA + '" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>' +
        '<ellipse cx="100" cy="111" rx="16" ry="11" fill="#ff7096" stroke="#b83b5e" stroke-width="3"/>' +
        '<ellipse cx="94" cy="107" rx="5" ry="3" fill="#ffffff" opacity=".75"/>';

    // Brazos: abajo sobre la barriga, arriba festejando, o tapándose los ojos.
    var BRAZOS = '<g fill="' + PIEL + '" ' + T + '><ellipse cx="44" cy="208" rx="14" ry="27" transform="rotate(22 44 208)"/><ellipse cx="156" cy="208" rx="14" ry="27" transform="rotate(-22 156 208)"/></g>' +
        '<g fill="' + PATA + '" stroke="' + PATA_LINEA + '" stroke-width="3"><circle cx="56" cy="232" r="11"/><circle cx="144" cy="232" r="11"/></g>';
    var BRAZOS_ARRIBA = '<g fill="' + PIEL + '" ' + T + '><ellipse cx="34" cy="160" rx="14" ry="30" transform="rotate(-38 34 160)"/><ellipse cx="166" cy="160" rx="14" ry="30" transform="rotate(38 166 160)"/></g>' +
        '<g fill="' + PATA + '" stroke="' + PATA_LINEA + '" stroke-width="3"><circle cx="18" cy="136" r="12"/><circle cx="182" cy="136" r="12"/></g>';
    var BRAZOS_TAPA = '<path d="M50,196 Q30,150 70,104 M150,196 Q170,150 130,104" stroke="' + LINEA + '" stroke-width="30" fill="none" stroke-linecap="round"/>' +
        '<path d="M50,196 Q30,150 70,104 M150,196 Q170,150 130,104" stroke="' + PIEL + '" stroke-width="22" fill="none" stroke-linecap="round"/>' +
        '<g fill="' + PATA + '" stroke="' + PATA_LINEA + '" stroke-width="3"><ellipse cx="76" cy="90" rx="25" ry="19"/><ellipse cx="124" cy="90" rx="25" ry="19"/></g>' +
        '<path d="M62,80 L62,98 M74,76 L74,102 M86,78 L86,100 M114,78 L114,100 M126,76 L126,102 M138,80 L138,98" stroke="' + PATA_LINEA + '" stroke-width="2.5" stroke-linecap="round"/>';

    var OJOS = '<circle cx="78" cy="90" r="11" fill="#1d120b"/><circle cx="122" cy="90" r="11" fill="#1d120b"/>' +
        '<circle cx="82" cy="85" r="4" fill="#ffffff"/><circle cx="126" cy="85" r="4" fill="#ffffff"/>';
    var OJOS_CERRADOS = '<path d="M67,92 Q78,98 89,92 M111,92 Q122,98 133,92" stroke="#1d120b" stroke-width="5" fill="none" stroke-linecap="round"/>';
    var OJOS_FELICES = '<path d="M67,95 Q78,79 89,95 M111,95 Q122,79 133,95" stroke="#1d120b" stroke-width="6" fill="none" stroke-linecap="round"/>';
    // Ojitos en espiral (mareado después del golpe del mazo).
    function espiral(cx) {
        return '<path d="M' + cx + ',90 m0,-2 a2,2 0 1,1 -0.1,0 M' + cx + ',90 m-6,0 a6,6 0 1,1 12,0 a9,9 0 1,1 -18,1 a12,12 0 1,1 24,0" ' +
            'stroke="#1d120b" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
    }
    var OJOS_MAREADOS = espiral(78) + espiral(122);
    var BOCA = '<path d="M88,140 Q100,149 112,140" stroke="' + LINEA + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<rect x="94" y="143" width="12" height="10" rx="2" fill="#ffffff" stroke="#c8b6a6" stroke-width="1.5"/>';
    var BOCA_RISA = '<path d="M82,138 Q100,168 118,138 Z" fill="#7a2e2e" stroke="' + LINEA + '" stroke-width="3.5" stroke-linejoin="round"/>' +
        '<path d="M90,153 Q100,163 110,153 Q100,148 90,153 Z" fill="#ff8fa3"/>' +
        '<rect x="94" y="139" width="12" height="8" fill="#ffffff"/>';
    var BOCA_O = '<ellipse cx="100" cy="148" rx="9" ry="11" fill="#7a2e2e" stroke="' + LINEA + '" stroke-width="3"/>';
    var BOCA_MAREADA = '<path d="M84,142 Q92,136 100,142 Q108,148 116,142" stroke="' + LINEA + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<path d="M102,144 Q104,158 112,156 Q116,150 110,144 Z" fill="#ff8fa3" stroke="#c9496b" stroke-width="2"/>';

    var SVG = {
        normal: svg(PIES + CUERPO + BRAZOS + CABEZA + OJOS + BOCA),
        parpadeo: svg(PIES + CUERPO + BRAZOS + CABEZA + OJOS_CERRADOS + BOCA),
        feliz: svg(PIES + CUERPO + BRAZOS_ARRIBA + CABEZA + OJOS_FELICES + BOCA_RISA),
        mareado: svg(PIES + CUERPO + BRAZOS + CABEZA + OJOS_MAREADOS + BOCA_MAREADA),
        tapa: svg(PIES + CUERPO + CABEZA + BOCA_O + BRAZOS_TAPA)
    };

    // ------------------------------------------------------------------ utilidades

    function sc() { return E() ? E().escena() : null; }
    function hoyo(id) { return E() ? E().hoyo(id) : null; }
    function todos() { return E() ? E().hoyos() : []; }

    function cara(r, nombre) {
        if (r && r.img && r.img.scene) r.img.setTexture("topo-" + nombre);
    }

    /** Tween con Promise que también termina si el tween se corta (killTweensOf). */
    function tw(c) {
        var s = sc();
        if (!s) return Promise.resolve();
        if (reducido) c.duration = Math.min(c.duration || 300, 90);
        return new Promise(function (resolve) {
            var hecho = false;
            var fin = function () { if (!hecho) { hecho = true; resolve(); } };
            var prevC = c.onComplete;
            var prevS = c.onStop;
            c.onComplete = function () { if (typeof prevC === "function") prevC(); fin(); };
            c.onStop = function () { if (typeof prevS === "function") prevS(); fin(); };
            s.tweens.add(c);
        });
    }

    function espera(ms) {
        var s = sc();
        if (!s) return Promise.resolve();
        return new Promise(function (r) { s.time.delayedCall(reducido ? Math.min(ms, 80) : ms, r); });
    }

    function parar(r) {
        var s = sc();
        if (s) s.tweens.killTweensOf(r);
        if (r.tReposo) { r.tReposo.remove(false); r.tReposo = null; }
    }

    /** Mientras espera: parpadea y respira un poquito (salto chiquito). */
    function reposo(r) {
        var s = sc();
        if (!s || reducido) return;
        var paso = 0;
        var tic = function () {
            if (r.estado !== "visible") return;
            paso++;
            cara(r, "parpadeo");
            s.time.delayedCall(140, function () { if (r.estado === "visible") cara(r, "normal"); });
            if (paso % 2) s.tweens.add({ targets: r, salto: 7, duration: 220, yoyo: true, ease: "Sine.easeOut" });
            r.tReposo = s.time.delayedCall(1500 + (paso % 3) * 450, tic);
        };
        r.tReposo = s.time.delayedCall(900, tic);
    }

    function iconoDe(imagenId) {
        var cfg = E() && E().config();
        var im = cfg && global.ReglasTopos ? global.ReglasTopos.imagen(cfg, imagenId) : null;
        return im ? im.icono : imagenId;
    }

    /** El mazo de juguete cae sobre el topo; en el impacto el topo se aplasta un instante. */
    async function golpeMazo(r, rebote) {
        if (!E() || !E().mazo) return;
        await E().mazo(r.id);
        r.ky = 0.8;
        r.kx = 1.12;
        if (rebote) await tw({ targets: r, kx: 1, ky: 1, duration: 120, ease: "Back.easeOut" });
    }

    // ------------------------------------------------------------------ acciones

    async function salir(id, imagenId) {
        var r = hoyo(id);
        if (!r || r.estado !== "oculto") return false;
        parar(r);
        r.op = (r.op || 0) + 1;
        var op = r.op;
        r.estado = "apareciendo";
        r.imagen = imagenId;
        r.salto = 0;
        r.giro = 0;
        r.kx = 1;
        r.ky = 1;
        r.globoK = 0;
        E().iconoGlobo(id, iconoDe(imagenId));
        marcar(id, null);
        destacar(id, false);
        cara(r, "normal");
        await tw({ targets: r, sube: 1, duration: 340, ease: "Back.easeOut" });
        if (op !== r.op) return false;
        await tw({ targets: r, globoK: 1, duration: 260, ease: "Back.easeOut" });
        if (op !== r.op) return false;
        r.estado = "visible";
        reposo(r);
        return true;
    }

    async function esconder(id) {
        var r = hoyo(id);
        if (!r || r.estado === "oculto" || r.estado === "escondiendose") return;
        parar(r);
        r.op = (r.op || 0) + 1;
        var op = r.op;
        r.estado = "escondiendose";
        destacar(id, false);
        await tw({ targets: r, globoK: 0, duration: 170, ease: "Quad.easeIn" });
        if (op !== r.op) return;
        marcar(id, null);
        await tw({ targets: r, sube: 0, salto: 0, duration: 280, ease: "Back.easeIn" });
        if (op !== r.op) return;
        terminarOculto(r);
    }

    function terminarOculto(r) {
        r.estado = "oculto";
        r.imagen = null;
        r.giro = 0;
        r.salto = 0;
        r.kx = 1;
        r.ky = 1;
        r.globoK = 0;
        cara(r, "normal");
    }

    /**
     * Acierto: el mazo lo golpea, el topo queda aplastado y mareado (ojitos en espiral y estrellitas que dan
     * vueltas sobre su cabeza), el globo estalla en estrellas y el topo se hunde en su agujero.
     */
    async function golpeAcierto(id) {
        var r = hoyo(id);
        if (!r) return;
        parar(r);
        r.op = (r.op || 0) + 1;
        var op = r.op;
        r.estado = "golpeado";
        destacar(id, false);
        await golpeMazo(r);
        if (op !== r.op) return;
        cara(r, "mareado");
        var g = E().puntoGlobo(id, true);
        r.globoK = 0;
        marcar(id, null);
        if (g) E().estallido(g.x, g.y);
        r.estado = "celebrando";
        E().mareo(id, 900);
        // rebota del aplastón y se tambalea un poquito
        await tw({ targets: r, kx: 1, ky: 1, duration: 220, ease: "Back.easeOut" });
        if (op !== r.op) return;
        await tw({ targets: r, giro: 5, duration: 140, yoyo: true, repeat: 1, ease: "Sine.easeInOut" });
        if (op !== r.op) return;
        r.giro = 0;
        await espera(250);
        if (op !== r.op) return;
        r.estado = "escondiendose";
        await tw({ targets: r, sube: 0, duration: 280, ease: "Quad.easeIn" });
        if (op !== r.op) return;
        terminarOculto(r);
    }

    /** Error: el mazo lo golpea, se tapa los ojos y la pantalla se sacude; luego se esconde. Sin castigo. */
    async function golpeError(id) {
        var r = hoyo(id);
        if (!r) return;
        parar(r);
        r.op = (r.op || 0) + 1;
        var op = r.op;
        r.estado = "golpeado";
        destacar(id, false);
        await golpeMazo(r, true);
        if (op !== r.op) return;
        cara(r, "tapa");
        if (E().sacudir) E().sacudir();
        await Promise.all([
            tw({ targets: r, globoK: 0.85, duration: 140, ease: "Quad.easeOut" }),
            tw({ targets: r, ky: 1.08, kx: 0.95, salto: 14, duration: 120, yoyo: true, ease: "Quad.easeOut" })
        ]);
        if (op !== r.op) return;
        r.kx = 1;
        r.ky = 1;
        await tw({ targets: r, giro: 7, duration: 90, yoyo: true, repeat: 2, ease: "Sine.easeInOut" });
        if (op !== r.op) return;
        r.giro = 0;
        await espera(260);
        if (op !== r.op) return;
        r.estado = "escondiendose";
        await tw({ targets: r, globoK: 0, duration: 140, ease: "Quad.easeIn" });
        if (op !== r.op) return;
        marcar(id, null);
        await tw({ targets: r, sube: 0, salto: 0, duration: 300, ease: "Back.easeIn" });
        if (op !== r.op) return;
        terminarOculto(r);
    }

    /** Final: todos los topos salen felices con los brazos arriba y dan tres saltitos. */
    async function celebrarTodos() {
        var lista = todos();
        await Promise.all(lista.map(function (r, i) {
            parar(r);
            r.op = (r.op || 0) + 1;
            var op = r.op;
            r.estado = "celebrando";
            r.globoK = 0;
            r.giro = 0;
            marcar(r.id, null);
            cara(r, "feliz");
            return espera(i * 110).then(function () {
                return tw({ targets: r, sube: 1, duration: 300, ease: "Back.easeOut" });
            }).then(function () {
                if (op !== r.op) return null;
                return tw({ targets: r, salto: 60, duration: 230, yoyo: true, repeat: 2, ease: "Quad.easeOut" });
            }).then(function () {
                if (op !== r.op) return null;
                r.salto = 0;
                return null;
            });
        }));
    }

    function marcar(id, tipo) {
        if (E()) E().marcaGlobo(id, tipo);
    }

    function destacar(id, on) {
        if (E()) E().haloGlobo(id, on);
    }

    function estado(id) {
        var r = hoyo(id);
        return r ? r.estado : null;
    }

    /** Topos afuera con globo (los que se pueden tocar o están por esconderse). */
    function visibles() {
        return todos().filter(function (r) { return r.estado !== "oculto"; }).map(function (r) { return { hoyo: r.id, imagen: r.imagen, estado: r.estado }; });
    }

    /** Todos al agujero ya (reinicio, salida del juego). */
    function ocultarTodos() {
        todos().forEach(function (r) {
            parar(r);
            r.op = (r.op || 0) + 1;
            marcar(r.id, null);
            destacar(r.id, false);
            r.sube = 0;
            terminarOculto(r);
        });
    }

    global.Topos = {
        SVG: SVG,
        salir: salir,
        esconder: esconder,
        golpeAcierto: golpeAcierto,
        golpeError: golpeError,
        celebrarTodos: celebrarTodos,
        marcar: marcar,
        destacar: destacar,
        estado: estado,
        visibles: visibles,
        ocultarTodos: ocultarTodos
    };
})(window);
