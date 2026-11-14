/**
 * Pruebas de ReglasMemoPosturas (Memorama de Posturas Asimétricas y Lateralidad) y de su config.json.
 *
 *   node scripts/probar-memorama-posturas-lateralidad.js
 *
 * Comprueba lo que pide el enunciado: 4 rondas, 8 tarjetas (4 parejas) por ronda, contenido propio de
 * cada ronda, que una postura y su reflejo horizontal NUNCA formen pareja, los bloqueos de la partida
 * y los textos literales pedidos.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const BASE = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "MemoramaPosturasLateralidad");
const R = require(path.join(BASE, "reglas.js"));
const cfg = JSON.parse(fs.readFileSync(path.join(BASE, "config.json"), "utf8"));

let ok = 0;
let fallos = 0;

function comprobar(nombre, condicion, detalle) {
    if (condicion) {
        ok++;
        console.log("  ok  " + nombre);
    } else {
        fallos++;
        console.log("FALLA  " + nombre + (detalle ? "  →  " + detalle : ""));
    }
}

/** Generador reproducible, para que las pruebas no dependan del azar. */
function semilla(n) {
    let s = n;
    return function () {
        s = (s * 1103515245 + 12345) % 2147483648;
        return s / 2147483648;
    };
}

console.log("\n--- configuración ---");

const ids = R.posturas(cfg).map((p) => p.id);
comprobar("el catálogo tiene 16 posturas", R.posturas(cfg).length === 16, R.posturas(cfg).length + "");
comprobar("no hay ids repetidos", new Set(ids).size === ids.length);

const problemas = R.revisarJuego(cfg, ids);
comprobar("revisarJuego no encuentra problemas", problemas.length === 0, problemas.join(" | "));

comprobar("hay exactamente 4 rondas", R.rondas(cfg).length === 4, R.rondas(cfg).length + "");

R.rondas(cfg).forEach((r, i) => {
    const ronda = R.ronda(cfg, i);
    comprobar("ronda " + (i + 1) + ": 4 parejas", ronda.cartas.length === 4, ronda.cartas.length + "");
    comprobar("ronda " + (i + 1) + ": todas sus posturas existen",
        ronda.cartas.every((c) => c.partes && c.nombre));
});

// contenido propio: ninguna postura se repite entre rondas
const usadas = [];
R.rondas(cfg).forEach((r) => (r.posturas || []).forEach((id) => usadas.push(id)));
comprobar("cada ronda tiene contenido propio (ninguna postura se repite)",
    new Set(usadas).size === usadas.length);
comprobar("las 4 rondas usan las 16 posturas del catálogo", usadas.length === 16);

console.log("\n--- lateralidad (el punto del juego) ---");

// cada postura del catálogo tiene su reflejo, y son ids distintos
let paresEspejo = 0;
R.posturas(cfg).forEach((p) => {
    const esp = R.espejoDe(cfg, p.id);
    if (esp) {
        paresEspejo++;
        comprobar("el reflejo de " + p.id + " es otra postura distinta", esp !== p.id, esp);
    }
});
comprobar("las 16 posturas forman 8 pares postura/reflejo", paresEspejo === 16, paresEspejo + "");

// en cada ronda conviven una postura y su reflejo: ese es el reto
R.rondas(cfg).forEach((r, i) => {
    const ronda = R.ronda(cfg, i);
    const hayEspejoDentro = ronda.elegidas.some((id) => {
        const esp = R.espejoDe(cfg, id, ronda.elegidas);
        return esp && ronda.elegidas.indexOf(esp) >= 0;
    });
    comprobar("ronda " + (i + 1) + ": contiene al menos un par postura/reflejo", hayEspejoDentro);
});

// dos tarjetas con posturas reflejadas NO son pareja
(function () {
    const ronda = R.ronda(cfg, 0);
    const a = ronda.elegidas[0];
    const b = R.espejoDe(cfg, a, ronda.elegidas);
    const st = R.crear(ronda, semilla(7));
    R.iniciar(st);
    const ia = st.cartas.findIndex((c) => c.tipo === a);
    const ib = st.cartas.findIndex((c) => c.tipo === b);
    R.tocar(st, ia);
    R.tocar(st, ib);
    const c = R.comparar(st);
    comprobar("una postura y su reflejo NO forman pareja", c && c.pareja === false);
    comprobar("tras el fallo el estado es checking", st.estado === "checking", st.estado);
    comprobar("un fallo no descuenta parejas", st.parejas.length === 0);
})();

// dos tarjetas con el mismo id SÍ son pareja
(function () {
    const ronda = R.ronda(cfg, 0);
    const st = R.crear(ronda, semilla(11));
    R.iniciar(st);
    const tipo = st.cartas[0].tipo;
    const idx = st.cartas.filter((c) => c.tipo === tipo).map((c) => c.indice);
    R.tocar(st, idx[0]);
    R.tocar(st, idx[1]);
    const c = R.comparar(st);
    comprobar("dos posturas idénticas SÍ forman pareja", c && c.pareja === true);
    comprobar("tras el acierto el estado es matched", st.estado === "matched", st.estado);
})();

console.log("\n--- reparto en el tablero ---");

(function () {
    const ronda = R.ronda(cfg, 0);
    const st = R.crear(ronda, semilla(3));
    comprobar("el tablero tiene 8 tarjetas", st.cartas.length === 8, st.cartas.length + "");
    comprobar("son 4 parejas", st.total === 4, st.total + "");
    const cuenta = {};
    st.cartas.forEach((c) => (cuenta[c.tipo] = (cuenta[c.tipo] || 0) + 1));
    comprobar("cada postura sale exactamente 2 veces",
        Object.keys(cuenta).length === 4 && Object.keys(cuenta).every((k) => cuenta[k] === 2));
    comprobar("la rejilla es de 4 columnas × 2 filas", R.COLUMNAS === 4 && R.FILAS === 2);
})();

(function () {
    // el reparto cambia entre partidas y no deja las parejas sistemáticamente juntas
    const ronda = R.ronda(cfg, 1);
    const rnd = semilla(99);
    let anterior = null;
    let distintos = 0;
    let pegados = 0;
    for (let i = 0; i < 30; i++) {
        const orden = R.repartir(ronda, rnd, anterior);
        if (!anterior || orden.join() !== anterior.join()) distintos++;
        if (R.pegadas(orden)) pegados++;
        anterior = orden;
    }
    comprobar("cada reparto es distinto del anterior", distintos === 30, distintos + "/30");
    comprobar("las parejas nunca quedan en celdas contiguas de la misma fila", pegados === 0, pegados + "");
})();

console.log("\n--- bloqueos de la partida ---");

(function () {
    const ronda = R.ronda(cfg, 0);
    const st = R.crear(ronda, semilla(5));
    comprobar("durante la vista previa no se puede tocar", R.puedeTocar(st, 0) === false);
    R.iniciar(st);
    comprobar("ya iniciada sí se puede tocar", R.puedeTocar(st, 0) === true);
    R.tocar(st, 0);
    comprobar("no se puede tocar dos veces la misma tarjeta", R.motivoBloqueo(st, 0) === "misma");
    R.tocar(st, 1);
    comprobar("con dos abiertas no se abre una tercera", R.motivoBloqueo(st, 2) === "bloqueado");
    R.comparar(st);
    R.terminarTurno(st);
    // una pareja ya encontrada no se vuelve a tocar
    const st2 = R.crear(ronda, semilla(13));
    R.iniciar(st2);
    const t = st2.cartas[0].tipo;
    const idx = st2.cartas.filter((c) => c.tipo === t).map((c) => c.indice);
    R.tocar(st2, idx[0]);
    R.tocar(st2, idx[1]);
    R.comparar(st2);
    R.terminarTurno(st2);
    comprobar("una pareja encontrada no se puede volver a tocar", R.motivoBloqueo(st2, idx[0]) === "emparejada");
    comprobar("las parejas encontradas siguen abiertas", st2.cartas[idx[0]].abierta === true);
})();

(function () {
    // ronda completa
    const ronda = R.ronda(cfg, 3);
    const st = R.crear(ronda, semilla(21));
    R.iniciar(st);
    let guard = 0;
    while (!R.progreso(st).completo && guard++ < 10) {
        const pend = {};
        st.cartas.forEach((c) => { if (!c.emparejada) (pend[c.tipo] = pend[c.tipo] || []).push(c.indice); });
        const par = Object.values(pend).find((a) => a.length === 2);
        if (!par) break;
        R.tocar(st, par[0]);
        R.tocar(st, par[1]);
        R.comparar(st);
        R.terminarTurno(st);
    }
    comprobar("se puede completar una ronda entera", R.progreso(st).completo === true);
    comprobar("al completarla el estado es completed", st.estado === "completed", st.estado);
    comprobar("no se descuenta nada por los errores (no hay vidas ni puntos)",
        st.fallos === 0 && st.parejas.length === 4);
})();

console.log("\n--- textos pedidos por el enunciado ---");

const T = cfg.textos || {};
const literales = [
    ["tituloIntro", "¡MEMORAMA DE POSTURAS!"],
    ["bienvenida", "¡Desafío de memoria y lateralidad! Encuentra las parejas de fotos que muestran exactamente la misma postura corporal y del mismo lado."],
    ["botonComenzar", "¡COMENZAR!"],
    ["demoFin", "¡Ahora es tu turno! ¡Encuentra todas las parejas!"],
    ["recordatorioZeus", "¡Observa bien! ¿Están usando la misma mano y la misma rodilla?"],
    ["rondaLista", "¡Excelente memoria! ¡Reconociste las posturas y sus lados!"],
    ["finalTitulo", "¡RETO COMPLETADO!"],
    ["cierre", "¡Memoria espacial de nivel maestro! Identificaste cada postura y su lateralidad sin confundirte."]
];
literales.forEach(([clave, texto]) => {
    comprobar('textos.' + clave + ' es el del enunciado', T[clave] === texto, T[clave]);
});
comprobar('la demo dice "¡Ojo con el lado!"',
    String(T.demoDistinta || "").indexOf("¡Ojo con el lado!") >= 0, T.demoDistinta);
comprobar('el acierto dice "¡Muy bien! ¡Encontraste las dos posturas iguales!"',
    R.posturas(cfg).every((p) => p.acierto === "¡Muy bien! ¡Encontraste las dos posturas iguales!"));
comprobar("la ronda 1 arranca con el audio del enunciado",
    R.rondas(cfg)[0].instruccion === "¡Comencemos! Observa las posturas y encuentra las imágenes que son exactamente iguales.");
comprobar("la ronda 2 arranca con el audio del enunciado",
    R.rondas(cfg)[1].instruccion === "¡Muy bien! Ahora tenemos nuevas posturas. ¡Fíjate bien en qué lado se mueve cada mano!");
comprobar("la última ronda arranca con el audio del gran desafío",
    R.rondas(cfg)[3].instruccion === "¡Llegó el gran desafío! Observa con mucha atención y encuentra las cuatro parejas sin confundirte de lado.");
comprobar("el nivel es 5-6 años", (cfg.niveles || []).some((n) => n.edad === "5-6 años"));

console.log("\n" + ok + " pruebas superadas, " + fallos + " fallidas\n");
process.exit(fallos ? 1 : 0);
