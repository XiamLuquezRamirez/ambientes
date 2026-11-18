/**
 * Pruebas de "El Mapa Estelar y las Llaves Mágicas" (Polimotor 5-6 años): node scripts/probar-mapa-estelar-llaves-magicas.js
 * Revisa el config, los textos literales del enunciado, el index, los dos laberintos y las reglas de movimiento.
 */
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "MapaEstelarLlavesMagicas");
const R = require(path.join(dir, "reglas.js"));
const cfg = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
const index = fs.readFileSync(path.join(dir, "index.html"), "utf8");

let ok = 0, mal = 0;
function prueba(nombre, cond) {
    if (cond) ok++;
    else { mal++; console.log("FALLA:", nombre); }
}

// ---------------------------------------------------------------- config y textos
prueba("nombre", cfg.nombre === "El Mapa Estelar y las Llaves Mágicas");
prueba("mostrarFeedBack en la raíz", cfg.mostrarFeedBack === true);
prueba("tema polimotor", cfg.audios.tema === "polimotor");
prueba("edad 5-6 años", cfg.niveles.length === 1 && cfg.niveles[0].edad === "5-6 años");
["altoContraste", "mostrarIntro", "ayudaAutomatica", "mostrarProgreso", "letterSpacing", "volumenFondo", "rate"].forEach(function (k) {
    prueba("accesibilidad." + k, k in cfg.accesibilidad);
});
const literales = {
    introZeus: "¡Viajero del espacio! El portal galáctico está cerrado. Debes navegar por el laberinto, recoger las tres llaves estelares y llegar al portal para abrirlo.",
    sinSalida: "¡Camino cerrado! Volvamos al cruce anterior para encontrar otra ruta.",
    cruce: "¡Observa los caminos! ¿Cuál crees que nos llevará a la siguiente llave?",
    cierre: "¡ESPECTACULAR PLANIFICACIÓN! Supiste elegir los caminos correctos, recoger las tres llaves y resolver el laberinto estelar. ¡Eres un verdadero explorador espacial!",
    botonComenzar: "¡COMENZAR!",
    botonOtraVez: "VOLVER A JUGAR",
    botonInicio: "INICIO"
};
Object.keys(literales).forEach(function (k) { prueba("texto " + k, cfg.textos[k] === literales[k]); });
const misiones = [
    ["roja", "¡Primera misión! Busca el camino que te lleva hasta la llave roja. ¡Conduce tu nave con cuidado!", "¡Muy bien! Encontraste la llave roja. ¡Vamos por la siguiente!"],
    ["verde", "¡Ahora vamos por la llave verde! Observa los caminos y encuentra la ruta correcta.", "¡Excelente explorador! Ya tienes dos llaves. ¡Solo falta una!"],
    ["azul", "¡La última llave es azul! ¡Busca su camino y completa la misión!", "¡Lo lograste! ¡Ya tienes las tres llaves estelares!"]
];
misiones.forEach(function (m, i) {
    const d = cfg.misiones[i] || {};
    prueba("misión " + (i + 1) + " llave", d.llave === m[0]);
    prueba("misión " + (i + 1) + " instrucción", d.instruccion === m[1]);
    prueba("misión " + (i + 1) + " logro", d.logro === m[2]);
});
prueba("conversación Zoe/Zeus", cfg.textos.conversacion.length >= 2 && cfg.textos.conversacion.every(function (l) { return l.personaje === 0 || l.personaje === 1; }));

// ---------------------------------------------------------------- index
["reglas.js", "sonidos.js", "escenario-phaser.js", "arrastre.js", "demo.js", "script.js", "nave-3d.js", "guia-3d.js", "phaser.min.js", "edad-nivel.js", "texto_voz.js"].forEach(function (s) {
    prueba("index carga " + s, index.indexOf(s) >= 0);
});
["btn-sonido", "btn-recargar", "hud-edad", "nivel-mision", "menu-acc", "menu-vol", "guia-zeus", "btn-otra-vez", "mapa-estelar.png"].forEach(function (s) {
    prueba("index tiene " + s, index.indexOf(s) >= 0);
});
prueba("icono existe", fs.existsSync(path.join(dir, "mapa-estelar.png")));
prueba("sin título de letras en la cabecera", !/hud-titulo-linea/.test(index));

// ---------------------------------------------------------------- laberintos
prueba("dos niveles", cfg.mapas.length === 2);
prueba("tres llaves en config", (cfg.llaves || []).map(function (l) { return l.id; }).join() === "roja,verde,azul");
prueba("los mapas no traen nodos fijos (se generan)", cfg.mapas.every(function (m) { return !m.nodos && m.columnas % 2 === 1 && m.filas % 2 === 1; }));

// generación aleatoria: 200 mapas por nivel, todos jugables
cfg.mapas.forEach(function (m, i) {
    let fallos = 0, malos = [], cruces = 0, firmas = {};
    for (let semilla = 1; semilla <= 200; semilla++) {
        const def = R.generar(m, cfg.llaves, semilla);
        if (!def) { fallos++; continue; }
        const l = R.construir(def, cfg.juego);
        cruces += l.cruces.length;
        firmas[JSON.stringify(def.tramos)] = 1;
        const p = [];
        if (R.validar(l).length) p.push("inválido " + R.validar(l).join(","));
        if (l.cruces.length < (m.crucesMin || 3)) p.push("pocos cruces");
        if (l.sinSalida.length < (m.sinSalidaMin || 2)) p.push("pocos sin salida");
        if (l.llaves.length !== 3) p.push("llaves");
        const dist = l.llaves.map(function (L) { return R.ruta(l, l.inicio, L.nodo).length; });
        if (!(dist[0] <= dist[1] && dist[1] <= dist[2])) p.push("llaves fuera de orden");
        l.llaves.forEach(function (L) {
            const n = l.nodos[L.nodo];
            if (n.vecinos.length !== 1) p.push("llave no está al final de un ramal");
            if (!R.ruta(l, l.inicio, L.nodo).slice(0, -1).some(function (x) { return l.cruces.indexOf(x) >= 0; })) p.push("llave sin cruce en el camino");
        });
        if (l.nodos[l.portal].vecinos.length !== 1) p.push("portal no es final de ramal");
        if (l.nodos.S.i !== 0 || l.nodos.S.j !== l.filas - 1) p.push("salida fuera de la esquina");
        if (l.nodos.P.i !== l.cols - 1 || l.nodos.P.j !== 0) p.push("portal fuera de la esquina");
        if (l.tramos.length < Object.keys(l.nodos).length) p.push("sin ciclos");
        if (p.length) malos.push(semilla + ": " + p.join(", "));
    }
    prueba("nivel " + (i + 1) + ": se genera siempre", fallos === 0);
    prueba("nivel " + (i + 1) + ": todos jugables " + malos.slice(0, 3).join(" | "), malos.length === 0);
    prueba("nivel " + (i + 1) + ": mapas distintos (" + Object.keys(firmas).length + "/200)", Object.keys(firmas).length >= 190);
    m.promCruces = cruces / 200;
});
prueba("el nivel 2 es más difícil (más cruces en promedio)", cfg.mapas[1].promCruces > cfg.mapas[0].promCruces);
prueba("sin semilla también genera", !!R.generar(cfg.mapas[0], cfg.llaves));

// movimiento y zonas: sobre un mapa fijo de prueba (el antiguo nivel 1)
const fijo = {
    id: "prueba", columnas: 11, filas: 9, inicio: "S", portal: "P",
    nodos: { S: [0, 8], A: [3, 8], B: [7, 8], R: [7, 6], D1: [9, 8], C: [3, 5], H: [1, 5], G: [1, 2], K: [5, 5], K2: [5, 3], D2: [3, 3], M: [5, 1], D3: [3, 1], Q: [8, 3], BL: [8, 5], U: [10, 3], D4: [10, 5], T: [10, 1], P: [10, 0] },
    tramos: [["S", "A"], ["A", "B"], ["B", "R"], ["B", "D1"], ["A", "C"], ["C", "H"], ["H", "G"], ["C", "K"], ["K", "K2"], ["K2", "D2"], ["K2", "M"], ["M", "D3"], ["M", "T"], ["K2", "Q"], ["Q", "BL"], ["Q", "U"], ["U", "D4"], ["U", "T"], ["T", "P"]],
    llaves: cfg.llaves.map(function (L, k) { return { id: L.id, nodo: ["R", "G", "BL"][k], color: L.color }; })
};
const lab = R.construir(fijo, cfg.juego);
prueba("mapa de prueba válido", R.validar(lab).length === 0);
const demo = R.construir(cfg.demoLaberinto, cfg.juego);
prueba("demo válida: " + R.validar(demo).join("; "), R.validar(demo).length === 0);
prueba("al menos tres cruces", lab.cruces.length >= 3);
prueba("caminos sin salida", lab.sinSalida.length >= 2);
prueba("llaves en orden roja, verde, azul", lab.llaves.map(function (l) { return l.id; }).join() === "roja,verde,azul");
prueba("caminos que se conectan (hay un ciclo)", lab.tramos.length >= Object.keys(lab.nodos).length);
// cada llave queda al final de un ramal y requiere pasar por al menos un cruce
lab.llaves.forEach(function (L) {
    const r = R.ruta(lab, lab.inicio, L.nodo);
    prueba("llave " + L.id + " alcanzable", r.length > 1);
    prueba("llave " + L.id + " pasa por un cruce", r.some(function (n) { return lab.cruces.indexOf(n) >= 0; }));
});
// la ruta de la demo: nodos vecinos y recorre cruce, sin salida, 3 llaves y portal
const rd = cfg.demoLaberinto.ruta;
let contigua = true;
for (let i = 1; i < rd.length; i++) if (demo.nodos[rd[i - 1]].vecinos.indexOf(rd[i]) < 0) contigua = false;
prueba("ruta de la demo contigua", contigua);
prueba("demo pasa por un sin salida", rd.some(function (n) { return demo.sinSalida.indexOf(n) >= 0; }));
prueba("demo recoge las 3 llaves", demo.llaves.every(function (L) { return rd.indexOf(L.nodo) >= 0; }));
prueba("demo termina en el portal", rd[rd.length - 1] === demo.portal);

// ---------------------------------------------------------------- movimiento
function llevar(l, pos, obj, pasos) {
    let p = { x: pos.x, y: pos.y };
    for (let i = 0; i < (pasos || 200); i++) {
        const r = R.mover(l, p, obj, 16, { velMax: 6.5 });
        p = { x: r.x, y: r.y };
    }
    return p;
}
const S = lab.nodos.S, A = lab.nodos.A, C = lab.nodos.C;
let p = llevar(lab, S, { x: A.x, y: A.y });
prueba("derecha por el pasillo", Math.abs(p.x - A.x) < 0.01 && Math.abs(p.y - A.y) < 0.01);
p = llevar(lab, A, { x: C.x, y: C.y });
prueba("arriba en el cruce", Math.abs(p.y - C.y) < 0.01);
p = llevar(lab, C, { x: A.x, y: A.y });
prueba("abajo (regresa)", Math.abs(p.y - A.y) < 0.01);
p = llevar(lab, A, { x: S.x, y: S.y });
prueba("izquierda (regresa a la salida)", Math.abs(p.x - S.x) < 0.01);
// muro: empujar hacia arriba desde la salida no saca la nave del pasillo
p = llevar(lab, S, { x: S.x, y: S.y - 3 });
prueba("el muro detiene la nave", R.dentro(lab, p.x, p.y) && p.y >= S.y - lab.margen - 1e-6);
prueba("mover marca bloqueado contra el muro", R.mover(lab, p, { x: p.x, y: p.y - 1 }, 16, { velMax: 6.5 }).bloqueado);
// sin atajos a través de la pared: de H hacia G en diagonal no se salta al pasillo vecino
p = llevar(lab, { x: 3.5, y: 8.5 }, { x: 3.5, y: 2.0 });
prueba("no atraviesa la roca hacia la fila 3", p.y >= 5.5 - lab.margen - 1e-6);
// esquina: de la salida a la llave roja con objetivo en diagonal se desliza sin trabarse
p = llevar(lab, lab.nodos.B, { x: lab.nodos.R.x + 0.3, y: lab.nodos.R.y }, 300);
prueba("dobla la esquina deslizándose", Math.abs(p.y - lab.nodos.R.y) < 0.05);
// freno en los cruces
const libre = R.mover(lab, S, { x: A.x, y: A.y }, 100, { velMax: 6.5 }).avance;
const frenado = R.mover(lab, S, { x: A.x, y: A.y }, 100, { velMax: 6.5, factor: 0.62 }).avance;
prueba("freno en cruce", frenado < libre);

// ---------------------------------------------------------------- arrastre guiado
function seguir(l, pos, dedo, pasos) {
    let p = { x: pos.x, y: pos.y }, ult = null;
    for (let i = 0; i < (pasos || 300); i++) { ult = R.guiar(l, p, dedo, 16, { velMax: 8 }); p = { x: ult.x, y: ult.y }; }
    p.ult = ult;
    return p;
}
// el dedo en diagonal "cortando" la esquina A: la nave dobla sola y sube por el pasillo
p = seguir(lab, S, { x: 3.5, y: 6.2 });
prueba("dobla la esquina con el dedo en diagonal", Math.abs(p.x - 3.5) < 0.05 && Math.abs(p.y - 6.2) < 0.05);
// el dedo un poco fuera del camino: la nave va al punto más cercano y no avisa
p = seguir(lab, S, { x: 2.0, y: 8.85 });
prueba("dedo cerca del borde: sigue sin aviso", Math.abs(p.x - 2.0) < 0.05 && p.ult.fuera < 0.6 && !p.ult.desvio);
// el dedo sobre la roca lejos del camino: avisa
p = seguir(lab, S, { x: 1.5, y: 6.5 }, 60);
prueba("dedo sobre la roca: avisa", p.ult.fuera > 0.6 || p.ult.desvio);
// el dedo en otro pasillo al otro lado de la pared: no da el rodeo largo (no resuelve el laberinto)
p = seguir(lab, { x: 3.5, y: 8.5 }, { x: 3.5, y: 3.5 }, 200);
prueba("no atraviesa ni rodea hacia el pasillo de la fila 3", p.y > 4.6 && p.ult.desvio);
// rodeo corto sí: de la salida al cruce A y hacia la derecha con el dedo pasado de la esquina
p = seguir(lab, { x: 3.5, y: 7.2 }, { x: 5.0, y: 8.5 });
prueba("rodeo corto por la esquina", Math.abs(p.x - 5.0) < 0.05 && Math.abs(p.y - 8.5) < 0.05);

// ---------------------------------------------------------------- zonas y decisiones
prueba("zona cruce en A", (R.zona(lab, A.x, A.y) || {}).tipo === "cruce");
prueba("zona sin salida en D1", (R.zona(lab, lab.nodos.D1.x, lab.nodos.D1.y) || {}).tipo === "sinSalida");
const zr = R.zona(lab, lab.nodos.R.x, lab.nodos.R.y);
prueba("zona llave roja", zr && zr.tipo === "llave" && zr.llave === "roja");
prueba("zona portal", (R.zona(lab, lab.nodos.P.x, lab.nodos.P.y) || {}).tipo === "portal");
const est = { recogidas: [] };
prueba("roja se recoge primero", R.decidirLlave(lab, est, "roja") === "recoger");
prueba("verde dormida al inicio", R.decidirLlave(lab, est, "verde") === "dormida");
prueba("azul dormida al inicio", R.decidirLlave(lab, est, "azul") === "dormida");
prueba("portal cerrado sin llaves", R.decidirPortal(lab, est) === "cerrado");
est.recogidas.push("roja");
prueba("roja ya", R.decidirLlave(lab, est, "roja") === "ya");
prueba("verde toca después", R.decidirLlave(lab, est, "verde") === "recoger");
est.recogidas.push("verde");
prueba("portal cerrado con dos", R.decidirPortal(lab, est) === "cerrado");
est.recogidas.push("azul");
prueba("portal abre con tres", R.decidirPortal(lab, est) === "abrir");
prueba("sin llave actual al final", R.llaveActual(lab, est) === null);

console.log("Mapa Estelar: " + ok + "/" + (ok + mal) + " pruebas correctas");
process.exit(mal ? 1 : 0);
