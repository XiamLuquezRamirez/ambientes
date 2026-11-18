/**
 * Prueba de "El Cazador de Burbujas Mágicas": reglas puras, config.json válido, cada objeto tiene dibujo y
 * los textos de voz del enunciado están literales.  Uso: node scripts/probar-cazador-burbujas-magicas.js
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "CazadorBurbujasMagicas");
const R = require(path.join(dir, "reglas.js"));
const cfg = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
let ok = 0;
function prueba(nombre, fn) {
    fn();
    ok++;
    console.log("ok -", nombre);
}

prueba("config sin problemas", function () {
    assert.deepStrictEqual(R.revisarJuego(cfg), []);
});

prueba("3 rondas de 4 objetivos, dificultad gradual", function () {
    const rs = R.rondas(cfg);
    assert.strictEqual(rs.length, 3);
    rs.forEach(function (r) { assert.strictEqual(r.objetivos, 4); });
    assert.ok(rs[0].subidaSeg[0] >= rs[1].subidaSeg[0] && rs[1].subidaSeg[0] >= rs[2].subidaSeg[0]);
    assert.ok(rs[0].maxEnPantalla <= rs[2].maxEnPantalla && rs[2].maxEnPantalla <= 3);
    assert.ok(rs[0].radio[0] >= rs[2].radio[0]);
});

prueba("cada objeto tiene dibujo propio o imagen importada que existe", function () {
    const src = fs.readFileSync(path.join(dir, "iconos.js"), "utf8");
    cfg.objetos.forEach(function (o) {
        if (o.imagen) assert.ok(fs.existsSync(path.join(dir, o.imagen)), "falta el archivo " + o.imagen);
        else assert.ok(src.indexOf(o.icono + ": S(") >= 0, "falta el dibujo " + o.icono);
    });
});

prueba("burbuja fuerte: nunca en la ronda 1 ni la primera de la ronda, 2-3 toques", function () {
    const r1 = R.ronda(cfg, 0);
    const r3 = R.ronda(cfg, 2);
    assert.strictEqual(R.elegirToques(r1, 5, false, function () { return 0; }), 1);
    assert.strictEqual(R.elegirToques(r3, 0, false, function () { return 0; }), 1);
    assert.strictEqual(R.elegirToques(r3, 3, true, function () { return 0; }), 1);
    for (let i = 0; i < 50; i++) {
        const t = R.elegirToques(r3, 3, false, Math.random);
        assert.ok(t === 1 || (t >= 2 && t <= 3));
    }
    assert.ok(R.elegirToques(r3, 3, false, function () { return 0; }) >= 2);
});

prueba("la primera burbuja de la ronda 1 lleva la estrella y no se repiten seguidas", function () {
    const r = R.ronda(cfg, 0);
    assert.strictEqual(R.elegirObjeto(r, 0, null, function () { return 0.9; }), "estrella");
    let ant = "estrella";
    for (let n = 1; n < 40; n++) {
        const o = R.elegirObjeto(r, n, ant, Math.random);
        assert.notStrictEqual(o, ant);
        ant = o;
    }
});

prueba("carriles separados y null si no cabe", function () {
    const x = R.elegirCarril(100, 900, 80, [{ x: 400, r: 80 }], function () { return 0.5; });
    assert.ok(Math.abs(x - 400) >= 1.15 * 160);
    assert.strictEqual(R.elegirCarril(100, 200, 80, [{ x: 150, r: 80 }]), null);
});

prueba("no salen más burbujas con los objetivos cubiertos ni sobre el máximo", function () {
    const r = R.ronda(cfg, 0);
    assert.strictEqual(R.puedeSalir(r, 0, 3, 1), false);
    assert.strictEqual(R.puedeSalir(r, 2, 0, 0), false);
    assert.strictEqual(R.puedeSalir(r, 1, 1, 0), true);
});

prueba("progreso en estrellas", function () {
    const p = R.progreso(2, 4);
    assert.deepStrictEqual(p.marcas, [true, true, false, false]);
    assert.strictEqual(R.progreso(4, 4).completo, true);
});

prueba("textos del enunciado literales", function () {
    const t = cfg.textos;
    assert.strictEqual(t.bienvenida, "¡Mira cuántas burbujas mágicas flotan en el aire! Sigue las burbujas con tus ojos y tócalas con tu dedo para reventarlas.");
    assert.strictEqual(t.instruccionZeus, "¡Síguela con la vista y toca la burbuja que lleva la estrella!");
    assert.ok(t.escapeVoz.indexOf("¡Esa se nos escapó! Vamos a atrapar la siguiente.") >= 0);
    assert.strictEqual(t.cierre, "¡SÚPER VISTA! Reventaste todas las burbujas mágicas y llenaste la canasta de estrellas.");
    assert.strictEqual(t.final, "¡SÚPER VISTA! Reventaste todas las burbujas mágicas y llenaste la canasta de estrellas. ¡Lo hiciste fantástico!");
    assert.strictEqual(cfg.niveles[0].edad, "3-4 años");
    assert.strictEqual(cfg.mostrarFeedBack, true);
    assert.strictEqual(cfg.audios.tema, "polimotor");
});

prueba("el título no está en la partida (solo en la presentación)", function () {
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    const principal = html.slice(html.indexOf('<div id="principal">'), html.indexOf('<div id="comenzar-wrap"'));
    assert.ok(principal.indexOf("Cazador") < 0, "el título aparece fijo en #principal");
});

console.log("\n" + ok + " pruebas bien");
