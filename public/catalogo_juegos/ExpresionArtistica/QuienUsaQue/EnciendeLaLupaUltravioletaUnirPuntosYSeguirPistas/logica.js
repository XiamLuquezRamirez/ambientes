/**
 * Reglas puras de "¿Quién usa qué?" — Expresión Artística (sin DOM ni reloj).
 *
 * 3-4: arrastreHerramienta ×4.
 * 5-6: ensamblaje (trípode → tubo → lente, luego cielo), unirPuntos 1..8,
 *      ritmoBatuta (orden arriba/abajo), notasCarriles (siempre completa).
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TIPOS_34 = ["arrastreHerramienta", "arrastreHerramienta", "arrastreHerramienta", "arrastreHerramienta"];
    const TIPOS_56 = ["ensamblaje", "unirPuntos", "ritmoBatuta", "notasCarriles"];
    const TIPOS = ["arrastreHerramienta", "ensamblaje", "unirPuntos", "ritmoBatuta", "notasCarriles"];
    const IDS_34 = ["pintora", "doctor", "chef", "cantante"];
    const IDS_56 = ["telescopio", "lupa", "batuta", "notas"];
    const ORDEN_TELESCOPIO = ["tripode", "tubo", "lente"];
    const DIRECCIONES = ["arriba", "abajo"];
    const REGLAS = {
        "3-4 años": { tema: "taller", tipos: TIPOS_34, ids: IDS_34, insignia: "Detective de Herramientas" },
        "5-6 años": { tema: "laboratorio", tipos: TIPOS_56, ids: IDS_56, insignia: "Maestro de la Lógica y las Herramientas Escénicas" }
    };

    const LITERAL = {
        pintora: {
            voz: "zoe",
            consigna: "¡Voy a pintar un cuadro lleno de colores! ¿Cuál es la herramienta que necesito para pintar en mi lienzo?",
            acierto: "¡Exacto! El pintor usa el pincel para crear arte. ¡A pintar se ha dicho!",
            errorVoz: "zeus",
            error: "¡Ese es un instrumento para hacer música!"
        },
        doctor: {
            voz: "zeus",
            consigna: "¡El osito vino a su chequeo médico! ¿Qué objeto usa el doctor para escuchar el corazón?",
            acierto: "¡Muy bien! El doctor usa el estetoscopio para cuidar la salud. ¡El osito está muy sano!"
        },
        chef: {
            voz: "zoe",
            consigna: "¡Mmm, ¡qué rica huele la sopa! ¿Con qué objeto revuelvo mi comida en la olla?",
            acierto: "¡Delicioso! El chef usa el cucharón para preparar recetas ricas."
        },
        cantante: {
            texto: "¡El gran concierto de cierre! ¿Qué objeto necesita el cantante para que todos en el teatro escuchen su voz?",
            acierto: "¡BRAVO! Le diste el micrófono al cantante. ¡Entregaste todas las herramientas a sus dueños con total éxito!"
        },
        telescopio: {
            voz: "zoe",
            consigna: "¡Voy a interpretar a una astrónoma que descubre una nueva estrella! Pero mi herramienta está en piezas. Une el trípode, el tubo de lente y la mira para armar el objeto que me permite ver el universo.",
            acierto: "¡Brillante! Armaste el telescopio pieza por pieza y lo apuntaste a las estrellas. ¡La astrónoma está lista para actuar!",
            pregunta: "¿Hacia dónde debe apuntar la astrónoma?"
        },
        lupa: {
            voz: "zeus",
            consigna: "¡Hay un mapa antiguo grabado en la pared! Para encender mi lupa de explorador, conecta los puntos del 1 al 8 siguiendo la secuencia numérica.",
            acierto: "¡Increíble precisión! Conectaste todos los números, encendiste la lupa y descubriste la entrada secreta."
        },
        batuta: {
            voz: "zoe",
            consigna: "¡La orquesta está desafinada! Para dirigirla, debes copiar el ritmo que yo marco.",
            casi: "¡Casi! Intenta otra vez siguiendo mi tempo"
        },
        notas: {
            voz: "zoe",
            acierto: "Eres un experto en crear pistas musicales. ¡Felicidades!"
        },
        cierre34: [
            { voz: "zoe", texto: "¡Qué gran detective de herramientas eres! Le devolviste a cada personaje el objeto que necesita para trabajar y actuar." },
            { voz: "zeus", texto: "¡Saber qué usa cada profesional nos ayuda a entender el mundo y a actuar en el teatro como ellos!" }
        ],
        cierre56: [
            { voz: "zoe", texto: "¡Demostraste una mente de gran detective y constructor! No solo asociaste las herramientas, sino que las armaste, las encendiste y creaste música." },
            { voz: "zeus", texto: "¡El teatro necesita mentes creativas que sepan cómo funciona cada objeto en el escenario!" }
        ]
    };

    const PARES = {
        pintora: ["pincel", "saxofon"],
        doctor: ["estetoscopio", "martillo"],
        chef: ["cucharon", "pelota"],
        cantante: ["microfono", "escoba"]
    };

    function esLinea(l) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "" && VOCES.indexOf(l.voz) !== -1;
    }
    function lineas(x) {
        if (!x) return [];
        return (Array.isArray(x) ? x : [x]).filter(esLinea);
    }
    function lineasValidas(x) {
        const lista = Array.isArray(x) ? x : (x ? [x] : []);
        return lista.length > 0 && lista.every(esLinea);
    }
    function esNumero(n) {
        return typeof n === "number" && isFinite(n);
    }
    function esZona(z) {
        return !!z && esNumero(z.x) && esNumero(z.y) && esNumero(z.w) && esNumero(z.h) && z.w > 0 && z.h > 0;
    }
    function dentroPct(px, py, z) {
        const halfW = z.w / 2;
        const halfH = z.h / 2;
        return px >= z.x - halfW && px <= z.x + halfW && py >= z.y - halfH && py <= z.y + halfH;
    }
    function idOpcion(o) {
        if (!o) return "";
        return typeof o === "string" ? o : String(o.id || "");
    }
    function nombreOpcion(o, elementos) {
        if (o && typeof o === "object" && o.nombre) return o.nombre;
        const id = idOpcion(o);
        return (elementos && elementos[id] && elementos[id].nombre) || id;
    }
    function mismaLista(a, b) {
        if (!a || !b || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
        return true;
    }
    function textoUnico(x) {
        const lista = Array.isArray(x) ? x : [x];
        if (lista.length !== 1 || !esLinea(lista[0])) return null;
        return lista[0];
    }

    function evaluarArrastre(reto, piezaId, px, py) {
        if (!reto || !piezaId) return { estado: "mal" };
        const ids = (reto.opciones || []).map(idOpcion);
        if (ids.indexOf(piezaId) === -1) return { estado: "mal" };
        if (piezaId !== reto.correcta) return { estado: "mal", correcta: false };
        if (!esZona(reto.zonaDestino)) return { estado: "mal" };
        if (!esNumero(px) || !esNumero(py) || !dentroPct(px, py, reto.zonaDestino)) return { estado: "fuera", correcta: true };
        return { estado: "completo", correcta: true };
    }

    function evaluarEnsamblaje(reto, piezaId, px, py, colocadas) {
        const halladas = Object.assign({}, colocadas || {});
        const orden = (reto && reto.orden) || [];
        if (!piezaId) return { estado: "mal", halladas: halladas };
        if (halladas[piezaId]) return { estado: "ya", halladas: halladas };
        const siguiente = orden.filter(function (id) { return !halladas[id]; })[0] || null;
        if (!siguiente || piezaId !== siguiente) return { estado: "orden", halladas: halladas, esperado: siguiente };
        const pieza = (reto.piezas || []).filter(function (p) { return p && p.id === piezaId; })[0];
        if (!pieza || !esZona(pieza.zonaDestino)) return { estado: "mal", halladas: halladas };
        if (!esNumero(px) || !esNumero(py) || !dentroPct(px, py, pieza.zonaDestino)) return { estado: "fuera", halladas: halladas };
        halladas[piezaId] = true;
        const faltan = orden.some(function (id) { return !halladas[id]; });
        return { estado: faltan ? "progreso" : "armado", halladas: halladas, pieza: pieza };
    }

    function evaluarApunte(reto, destino) {
        const ok = !!(reto && reto.apunte && destino === reto.apunte.correcto);
        return { estado: ok ? "completo" : "mal" };
    }

    /**
     * Une el punto `desde` con `hasta`. Solo avanza si es el siguiente número
     * (1→2→…→8). Cualquier otro par es un salto: la línea roja no cuenta.
     * `ultimo` es el último número ya conectado (0 si todavía no hay trazo).
     */
    function evaluarUnion(ultimo, desde, hasta, total) {
        const n = total || 8;
        const prev = ultimo || 0;
        if (!esNumero(desde) || !esNumero(hasta)) return { estado: "mal", ultimo: prev };
        if (desde === hasta) return { estado: "mismo", ultimo: prev };
        const esperadoDesde = prev === 0 ? 1 : prev;
        const esperadoHasta = esperadoDesde + 1;
        if (desde === esperadoDesde && hasta === esperadoHasta && hasta <= n) {
            return { estado: hasta >= n ? "circuito" : "bien", ultimo: hasta };
        }
        return { estado: "salto", ultimo: prev };
    }

    function evaluarHallazgo(zona, px, py) {
        if (!esZona(zona) || !esNumero(px) || !esNumero(py)) return { estado: "mal" };
        if (dentroPct(px, py, zona)) return { estado: "completo" };
        return { estado: "fuera" };
    }

    /** Orden de la batuta. Un fallo reinicia la ronda (indice 0). */
    function evaluarBatuta(patron, indice, direccion) {
        const i = indice || 0;
        if (!patron || !patron.length) return { estado: "mal", indice: 0 };
        if (i >= patron.length) return { estado: "completo", indice: i };
        if (direccion !== patron[i]) return { estado: "mal", indice: 0 };
        const next = i + 1;
        return { estado: next >= patron.length ? "completo" : "bien", indice: next };
    }

    function evaluarNota(nota, carril) {
        const afinada = !!(nota && nota.carril === carril);
        return { afinada: afinada, sonido: afinada ? "nota" : "desafinada" };
    }

    function avanzarPista(indice, total) {
        const next = (indice || 0) + 1;
        if (next >= total) return { estado: "completo", indice: next };
        return { estado: "sigue", indice: next };
    }

    /** La pista siempre termina: no hay estado de fracaso. */
    function cierreMelodia(afinadas, total) {
        const n = total || 0;
        const a = afinadas || 0;
        return { estado: "completo", afinadas: a, perfecta: n > 0 && a === n };
    }

    function validarConfig(cfg) {
        const errores = [];
        const err = function (m) { errores.push(m); };
        if (!cfg || cfg.stub) err("config stub");
        if (!cfg || !Array.isArray(cfg.niveles)) return errores.length ? errores : ["config sin niveles"];
        if ((cfg.niveles.length < 1 || cfg.niveles.length > 2)) err("debe haber 1 o 2 niveles");
        if (!cfg.elementos || typeof cfg.elementos !== "object") err("elementos requeridos");
        const elementos = cfg.elementos || {};

        function exigeElemento(tag, id) {
            const el = elementos[id];
            if (!el || typeof el.img !== "string" || el.img.indexOf(".svg") === -1) err(tag + ": elemento " + id);
        }

        cfg.niveles.forEach(function (n, ni) {
            const tag = "nivel " + (n && n.id);
            const regla = n && REGLAS[n.edad];
            if (!regla) { err(tag + ": edad desconocida"); return; }
            if (n.tema !== regla.tema) err(tag + ": tema debe ser " + regla.tema);
            if ((n.edad === "3-4 años" && n.id !== "3") || (n.edad === "5-6 años" && n.id !== "5")) err(tag + ": id de nivel inesperado");
            if (!cfg.escenas || typeof cfg.escenas[n.escena] !== "string") err(tag + ": escena inexistente");
            if (!Array.isArray(n.retos) || n.retos.length < 1 || n.retos.length > 4) err(tag + ": debe tener entre 1 y 4 retos");
            if (!Array.isArray(n.galeria) || n.galeria.length !== 4) err(tag + ": galería de 4");
            (n.galeria || []).forEach(function (id) { exigeElemento(tag, id); });
            if (!n.insignia || n.insignia.nombre !== regla.insignia || !n.insignia.img) err(tag + ": insignia");
            if (n.insignia && n.insignia.sonido !== "celebracion") err(tag + ": sonido de insignia");

            const cierreEsp = n.edad === "3-4 años" ? LITERAL.cierre34 : LITERAL.cierre56;
            if (!Array.isArray(n.cierre) || n.cierre.length !== 2) err(tag + ": cierre");
            else cierreEsp.forEach(function (esp, i) {
                const got = n.cierre[i];
                if (!got || got.voz !== esp.voz || got.texto !== esp.texto) err(tag + ": cierre literal " + esp.voz);
            });
            if (!lineasValidas(n.desfile)) err(tag + ": desfile");

            (n.retos || []).forEach(function (r, i) {
                const iLargo = (typeof r.iOrigen === "number" ? r.iOrigen : i);
                const rt = tag + " reto " + (r && r.id);
                if (!r || TIPOS.indexOf(r.tipo) === -1) { err(rt + ": tipo inválido"); return; }
                if (regla.tipos[iLargo] !== r.tipo) err(rt + ": tipo esperado " + regla.tipos[iLargo]);
                if (regla.ids[iLargo] !== r.id) err(rt + ": id esperado " + regla.ids[iLargo]);
                if (!r.personaje) err(rt + ": personaje");
                else exigeElemento(rt, r.personaje);

                if (r.tipo === "arrastreHerramienta") validarArrastre(r, rt, err, exigeElemento);
                if (r.tipo === "ensamblaje") validarEnsamblaje(r, rt, err, exigeElemento);
                if (r.tipo === "unirPuntos") validarPuntos(r, rt, err, exigeElemento);
                if (r.tipo === "ritmoBatuta") validarBatuta(r, rt, err);
                if (r.tipo === "notasCarriles") validarNotas(r, rt, err, exigeElemento);
            });
        });

        if (!cfg.textos || !cfg.textos.eligeNivel || !cfg.textos.demostracion || !cfg.textos.demostracionFin) {
            err("textos de inicio incompletos");
        }
        if (!cfg.demo || !elementos[cfg.demo.elemento] || !elementos[cfg.demo.personaje]) err("demo incompleta");
        return errores;
    }

    function validarArrastre(r, rt, err, exigeElemento) {
        const par = PARES[r.id];
        const lit = LITERAL[r.id];
        if (!par || !mismaLista(r.opciones, par)) err(rt + ": opciones");
        if (r.correcta !== par[0]) err(rt + ": correcta");
        (r.opciones || []).forEach(function (id) { exigeElemento(rt, id); });
        if (!esZona(r.zonaDestino)) err(rt + ": zonaDestino");
        if (!r.efecto || !r.efectoError) err(rt + ": efectos");
        if (r.id === "cantante") {
            if (!Array.isArray(r.consigna) || r.consigna.length !== 2) err(rt + ": dúo consigna");
            else ["zoe", "zeus"].forEach(function (voz, i) {
                const l = r.consigna[i];
                if (!l || l.voz !== voz || l.texto !== lit.texto) err(rt + ": consigna " + voz);
            });
            if (!Array.isArray(r.acierto) || r.acierto.length !== 2) err(rt + ": dúo acierto");
            else ["zoe", "zeus"].forEach(function (voz, i) {
                const l = r.acierto[i];
                if (!l || l.voz !== voz || l.texto !== lit.acierto) err(rt + ": acierto " + voz);
            });
        } else {
            const c = textoUnico(r.consigna);
            const a = textoUnico(r.acierto);
            if (!c || c.voz !== lit.voz || c.texto !== lit.consigna) err(rt + ": consigna literal");
            if (!a || a.voz !== lit.voz || a.texto !== lit.acierto) err(rt + ": acierto literal");
        }
        if (!lineasValidas(r.error)) err(rt + ": error");
        if (lit.error) {
            const e = textoUnico(r.error);
            if (!e || e.voz !== lit.errorVoz || e.texto !== lit.error) err(rt + ": error literal");
        }
    }

    function validarEnsamblaje(r, rt, err, exigeElemento) {
        const lit = LITERAL.telescopio;
        if (!mismaLista(r.orden, ORDEN_TELESCOPIO)) err(rt + ": orden");
        if (!Array.isArray(r.piezas) || r.piezas.length !== 3) err(rt + ": piezas");
        ORDEN_TELESCOPIO.forEach(function (id) {
            exigeElemento(rt, id);
            const p = (r.piezas || []).filter(function (x) { return x && x.id === id; })[0];
            if (!p || !esZona(p.zonaDestino) || !p.slot) err(rt + ": pieza " + id);
        });
        if (!r.apunte || r.apunte.correcto !== "cielo" || r.apunte.pregunta !== lit.pregunta) err(rt + ": apunte");
        if (!r.apunte || !mismaLista(r.apunte.opciones, ["cielo", "suelo"])) err(rt + ": opciones de apunte");
        if (!r.apunte || !esZona(r.apunte.zonas && r.apunte.zonas.cielo) || !esZona(r.apunte.zonas && r.apunte.zonas.suelo)) {
            err(rt + ": zonas de apunte");
        }
        ["cielo", "suelo", "telescopio"].forEach(function (id) { exigeElemento(rt, id); });
        const c = textoUnico(r.consigna);
        const a = textoUnico(r.acierto);
        if (!c || c.voz !== lit.voz || c.texto !== lit.consigna) err(rt + ": consigna literal");
        if (!a || a.voz !== lit.voz || a.texto !== lit.acierto) err(rt + ": acierto literal");
        if (!lineasValidas(r.errorOrden) || !lineasValidas(r.errorApunte)) err(rt + ": errores");
        if (!r.efecto) err(rt + ": efecto");
    }

    function validarPuntos(r, rt, err, exigeElemento) {
        const lit = LITERAL.lupa;
        if (r.puntos !== 8) err(rt + ": deben ser 8 puntos");
        if (!esZona(r.jeroglifico)) err(rt + ": jeroglifico");
        ["lupa", "jeroglifico"].forEach(function (id) { exigeElemento(rt, id); });
        const c = textoUnico(r.consigna);
        const a = textoUnico(r.acierto);
        if (!c || c.voz !== lit.voz || c.texto !== lit.consigna) err(rt + ": consigna literal");
        if (!a || a.voz !== lit.voz || a.texto !== lit.acierto) err(rt + ": acierto literal");
        if (!lineasValidas(r.errorSalto)) err(rt + ": errorSalto");
        if (!r.efecto) err(rt + ": efecto");
    }

    function validarBatuta(r, rt, err) {
        const lit = LITERAL.batuta;
        if (!mismaLista(r.direcciones, DIRECCIONES)) err(rt + ": direcciones");
        if (!Array.isArray(r.botones) || r.botones.length !== 2) err(rt + ": botones");
        else {
            if (r.botones[0].id !== "arriba" || r.botones[0].etiqueta !== "BATUTA ARRIBA") err(rt + ": botón arriba");
            if (r.botones[1].id !== "abajo" || r.botones[1].etiqueta !== "BATUTA ABAJO") err(rt + ": botón abajo");
        }
        if (!Array.isArray(r.rondas) || r.rondas.length !== 3) { err(rt + ": 3 rondas"); return; }
        const largos = [3, 4, 5];
        const instrumentos = ["violines", "trompetas", "bateria"];
        r.rondas.forEach(function (ron, i) {
            if (!ron || !Array.isArray(ron.patron) || ron.patron.length !== largos[i]) err(rt + ": patrón " + (i + 1));
            (ron && ron.patron || []).forEach(function (d) {
                if (DIRECCIONES.indexOf(d) === -1) err(rt + ": dirección inválida");
            });
            if (!ron || ron.instrumento !== instrumentos[i]) err(rt + ": instrumento " + (i + 1));
            if (!ron || !esNumero(ron.tempoMs) || ron.tempoMs <= 0) err(rt + ": tempo " + (i + 1));
            if (i > 0 && r.rondas[i - 1] && !(ron.tempoMs < r.rondas[i - 1].tempoMs)) err(rt + ": el tempo debe acelerar");
        });
        if (!mismaLista(r.rondas[0].patron, ["arriba", "abajo", "arriba"])) err(rt + ": patrón inicial");
        const c = textoUnico(r.consigna);
        const casi = textoUnico(r.casi);
        if (!c || c.voz !== lit.voz || c.texto !== lit.consigna) err(rt + ": consigna literal");
        if (!casi || casi.voz !== lit.voz || casi.texto !== lit.casi) err(rt + ": casi literal");
        if (!lineasValidas(r.acierto)) err(rt + ": acierto");
    }

    function validarNotas(r, rt, err, exigeElemento) {
        const lit = LITERAL.notas;
        if (!Array.isArray(r.carriles) || r.carriles.length !== 3) err(rt + ": 3 carriles");
        if (!Array.isArray(r.notas) || r.notas.length < 6) err(rt + ": notas");
        (r.notas || []).forEach(function (nota, i) {
            if (!nota || (nota.carril !== 0 && nota.carril !== 1 && nota.carril !== 2)) err(rt + ": carril " + i);
            if (!nota || !esNumero(nota.f) || nota.f <= 0) err(rt + ": frecuencia " + i);
        });
        if (r.siempreCompleta !== true) err(rt + ": debe completar siempre");
        const a = textoUnico(r.acierto);
        if (!a || a.voz !== lit.voz || a.texto !== lit.acierto) err(rt + ": acierto literal");
        if (!lineasValidas(r.consigna)) err(rt + ": consigna");
        exigeElemento(rt, "nota_musical");
    }

    global.QuienUsaQueLogica = {
        VOCES: VOCES,
        TIPOS: TIPOS,
        REGLAS: REGLAS,
        LITERAL: LITERAL,
        ORDEN_TELESCOPIO: ORDEN_TELESCOPIO,
        lineas: lineas,
        idOpcion: idOpcion,
        nombreOpcion: nombreOpcion,
        dentroPct: dentroPct,
        evaluarArrastre: evaluarArrastre,
        evaluarEnsamblaje: evaluarEnsamblaje,
        evaluarApunte: evaluarApunte,
        evaluarUnion: evaluarUnion,
        evaluarHallazgo: evaluarHallazgo,
        evaluarBatuta: evaluarBatuta,
        evaluarNota: evaluarNota,
        avanzarPista: avanzarPista,
        cierreMelodia: cierreMelodia,
        validarConfig: validarConfig
    };
    if (typeof module !== "undefined") module.exports = global.QuienUsaQueLogica;
})(typeof window !== "undefined" ? window : global);
