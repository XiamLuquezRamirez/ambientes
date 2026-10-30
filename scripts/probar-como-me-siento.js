/**
 * Pruebas de ¿Cómo me siento?
 * Uso: node scripts/probar-como-me-siento.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.resolve(__dirname, "../public/catalogo_juegos/ExpresionArtistica/ComoMeSiento");
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "logica.js"), "utf8"), sandbox);
const L = sandbox.ComoMeSientoLogica;
vm.runInContext(fs.readFileSync(path.join(dir, "sfx.js"), "utf8"), sandbox);
const Sfx = sandbox.ComoMeSientoSfx;
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
const doc = fs.readFileSync(path.join(dir, "docs/requerimientos.md"), "utf8");
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const css = fs.readFileSync(path.join(dir, "style.css"), "utf8");

let oks = 0, fails = 0;
function assert(cond, msg) { if (cond) oks += 1; else { fails += 1; console.error("  FAIL " + msg); } }
const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
const enDoc = (texto) => norm(doc).includes(norm(texto));
const nivel = (edad) => config.niveles.find((n) => n.edad === edad);
const n34 = nivel("3-4 años");
const n56 = nivel("5-6 años");

console.log("=== Config ===");
const errores = L.validarConfig(config);
errores.forEach((e) => console.error("  " + e));
assert(errores.length === 0, "validarConfig sin errores");
assert(!config.stub, "config sin stub");
assert(n34.tema === "camerino" && n56.tema === "escenario", "temas camerino y escenario");
assert(n34.retos.map((r) => r.tipo).join() === "elegir,elegir,elegirAbrazo,elegir", "tipos 3-4");
assert(n56.retos.map((r) => r.tipo).join() === "elegirArrastre,elegirArrastre,medidor,elegirArrastre", "tipos 5-6");

console.log("=== Textos ===");
config.niveles.forEach((n) => {
    n.retos.forEach((r) => {
        ["consigna", "acierto"].forEach((k) => {
            L.lineas(r[k]).forEach((l) => assert(enDoc(l.texto), n.edad + " " + r.id + " " + k));
        });
        if (r.despuesAcierto) L.lineas(r.despuesAcierto).forEach((l) => assert(enDoc(l.texto), n.edad + " " + r.id + " despues"));
        if (r.feedbackAccion) L.lineas(r.feedbackAccion).forEach((l) => assert(enDoc(l.texto), n.edad + " " + r.id + " feedbackAccion"));
        if (r.error) L.lineas(r.error).forEach((l) => assert(enDoc(l.texto) || /prueba con otra/i.test(l.texto), n.edad + " " + r.id + " error"));
    });
    L.lineas(n.cierre).forEach((l) => assert(enDoc(l.texto), n.edad + " cierre"));
    assert(enDoc(n.insignia.nombre) || /actor|director/i.test(n.insignia.nombre), n.edad + " medalla");
});

console.log("=== Logica ===");
assert(L.evaluarEleccion(n34.retos[0], "cara_feliz").estado === "bien", "alegria ok");
assert(L.evaluarEleccion(n34.retos[0], "cara_triste").estado === "mal", "alegria mal");
assert(L.evaluarEleccion(n34.retos[1], "cara_enojada").estado === "bien", "enojo ok");
assert(L.idsOpciones(n34.retos[1]).join() === "cara_enojada,cara_sorprendida,cara_triste", "enojo opciones");
assert(L.nombreOpcion(n34.retos[1].opciones[1], config.elementos) === "Carita de Sorpresa", "enojo etiqueta sorpresa");
assert(L.evaluarEleccion(n34.retos[2], "cara_triste").estado === "bien", "tristeza ok");
assert(n34.retos[2].tipo === "elegirAbrazo", "abrazo tipo");
assert(n34.retos[1].escenaResuelta === "zeus_relajado", "enojo se relaja");
assert(L.evaluarEleccion(n34.retos[3], "cara_sorprendida").estado === "bien", "sorpresa ok");
assert(n34.retos[3].escena === "duo_sorpresa", "sorpresa muestra a Zoe y Zeus");
assert(n34.retos[0].invitarImitacion && n34.retos[0].invitarImitacion.zona === "boca", "alegria imitación sonrisa");
assert(n34.retos[1].invitarImitacion && n34.retos[1].invitarImitacion.zona === "ojos", "enojo imitación respirar");
assert(n34.retos[3].invitarImitacion && n34.retos[3].invitarImitacion.zona === "boca", "sorpresa imitación boca O");
assert(n56.retos[2].niveles.every((n) => n.escena && config.elementos[n.escena]), "medidor con escenas por intensidad");
assert(n56.retos[2].escena === "zoe_contenta", "medidor inicia contenta");
assert(L.evaluarEleccion(n56.retos[0], "cara_frustrada").estado === "bien", "frustracion ok");
assert(L.evaluarArrastre(n56.retos[0], 50, 45).estado === "completo", "respiracion destino");
assert(L.evaluarArrastre(n56.retos[0], 10, 10).estado === "mal", "respiracion mal");
assert(L.evaluarEleccion(n56.retos[1], "cara_temerosa").estado === "bien", "miedo ok");
assert(L.evaluarMedidor(n56.retos[2], 3).estado === "completo", "medidor 3");
assert(L.evaluarMedidor(n56.retos[2], 2).estado === "casi", "medidor 2 casi");
assert(L.evaluarMedidor(n56.retos[2], 1).estado === "mal", "medidor 1 mal");
assert(n56.retos[2].completarAlLlegar === true, "medidor auto completar");
assert(L.evaluarEleccion(n56.retos[3], "cara_melancolica").estado === "bien", "mimo ok");
assert(L.nombreOpcion(n56.retos[3].opciones[1], config.elementos) === "Asombro", "mimo asombro");
assert(L.nombreOpcion(n56.retos[3].opciones[2], config.elementos) === "Rabia", "mimo rabia");
assert(n56.cierreSoloTexto === true, "5-6 cierre solo texto");
assert(js.includes("completarAlLlegar") && js.includes("aplicarEscenaResuelta"), "script doc mecánicas");
assert(!js.includes("btn-medidor") || !/btn-medidor/.test(js.split("retoMedidor")[1].slice(0, 2000)), "medidor sin boton Listo");

console.log("=== Assets ===");
const cfgTxt = JSON.stringify(config);
(function recorrer(rel) {
    fs.readdirSync(path.join(dir, rel)).forEach((f) => {
        const r = rel + "/" + f;
        if (fs.statSync(path.join(dir, r)).isDirectory()) recorrer(r);
        else {
            assert(js.includes(r) || cfgTxt.includes(r) || html.includes(r) || css.includes(r), r + " se usa");
            if (!r.endsWith(".svg")) return;
            let utf = true;
            try { new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(path.join(dir, r))); } catch (e) { utf = false; }
            assert(utf && /width="\d+"/.test(fs.readFileSync(path.join(dir, r), "utf8").slice(0, 220)), r + " UTF-8");
        }
    });
})("img");

console.log("=== Shell ===");
assert(html.includes("logica.js") && html.includes("sfx.js"), "html scripts");
assert(js.includes("retoElegir") && js.includes("retoMedidor") && js.includes("accionAbrazo") && js.includes("accionArrastre"), "script retos");
assert(js.includes("mostrarCierre") && js.includes("granCierre") && js.includes("pednia:perfil"), "script cierre");
assert(css.includes(".tema-camerino") && css.includes(".tema-escenario") && css.includes(".tarjeta-cara"), "css temas");
assert(css.includes(".emocionometro") && css.includes(".herramienta"), "css medidor/herramienta");
assert(/tema-escenario \.tarjeta-nombre\s*\{\s*color:\s*#311b92/i.test(css), "etiquetas 5-6 legibles");
assert(js.includes("evaluarMedidor(r, Number(rango.value)).estado === \"completo\""), "medidor no castiga al pasar por 2");
assert(L.evaluarArrastre(n56.retos[0], 50, 48).estado === "completo", "zona respiracion ampliada");
assert(!/\.destello\b/.test(css), "css sin .destello");
assert(!/\.lienzo\b/.test(css) && !/\.gota\b/.test(css) && !/\.paleta-fondo\b/.test(css), "css sin restos de pintura");
assert(!/fa-droplet|fa-palette/.test(html), "inicio sin iconos de pintura");
assert(/fa-face-smile|fa-masks-theater/.test(html), "inicio temático emociones/teatro");
assert(js.includes("fiestaMuecas") && css.includes(".mueca-btn"), "cierre 3-4 fiesta de muecas");
assert(!!n56.retos[3].despuesAcierto, "mimo pide regadera");
assert(js.includes("invitarImitacion") && js.includes("montarHotspots") && js.includes("montarLuces"), "imitación y luces del espejo");
assert(css.includes(".espejo-luces") && css.includes(".hotspot-ojos") && css.includes(".hotspot-boca"), "css espejo mágico");
assert(css.includes("particula-sol") && css.includes("particula-nube") && css.includes("particula-serpentina"), "css feedbacks kinestésicos");
assert(js.includes("pintarNivelMedidor"), "medidor cambia escena");
assert(Sfx && Sfx.EFECTOS.indexOf("destello") !== -1 && Sfx.EFECTOS.indexOf("arpa") !== -1, "sfx efectos");
assert(Sfx.EFECTOS.indexOf("risa") !== -1 && Sfx.EFECTOS.indexOf("ohh") !== -1 && Sfx.EFECTOS.indexOf("suspiro") !== -1, "sfx imitación");

console.log("\nOK " + oks + " FAIL " + fails);
process.exit(fails ? 1 : 0);
