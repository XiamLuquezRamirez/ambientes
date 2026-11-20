"use strict";
/**
 * Prueba de El Pinball de Gravedad Mágica.
 *
 * Corre la física real de reglas.js en Node (sin navegador) y comprueba que la partida es
 * jugable: la bola se mueve, rebota, los bumpers la impulsan, las palancas la devuelven y
 * nunca se queda atascada. También valida el config y el marcado común del index.html.
 *
 *   node scripts/probar-pinball-gravedad.js
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "PinballGravedadMagica");
const R = require(path.join(dir, "reglas.js"));
const cfg = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");

let ok = 0, total = 0;
const fallos = [];

function prueba(nombre, fn) {
    total++;
    try { fn(); ok++; }
    catch (e) { fallos.push("✗ " + nombre + "\n    " + e.message); }
}

/** Avanza la simulación `ms` milisegundos en pasos de 16, juntando los eventos. */
function simular(estado, ms, alPaso) {
    const eventos = [];
    const pasos = Math.round(ms / 16);
    for (let i = 0; i < pasos; i++) {
        const evs = R.avanzar(estado, 16, cfg);
        for (const e of evs) eventos.push(e);
        if (alPaso) alPaso(estado, i);
    }
    return eventos;
}

function nuevoEstado(indiceRonda) {
    const e = R.crearEstado(cfg);
    R.aplicarRonda(e, cfg.rondas[indiceRonda || 0]);
    R.lanzarBola(e, () => 0.5, true); // directo a la mesa; aleatorio fijo: reproducible
    return e;
}

// ------------------------------------------------------------------ config

prueba("config.json tiene las claves del contrato", () => {
    for (const k of ["nombre", "mostrarFeedBack", "accesibilidad", "audios", "textos", "niveles"]) {
        assert.ok(cfg[k] !== undefined, "falta la clave " + k);
    }
    assert.strictEqual(cfg.mostrarFeedBack, true, "mostrarFeedBack debe ir en la raíz y ser true");
    assert.strictEqual(cfg.audios.tema, "polimotor", "audios.tema debe ser polimotor");
});

prueba("la edad es 5-6 años y va en niveles[].edad", () => {
    assert.strictEqual(cfg.niveles.length, 1, "un solo nivel");
    assert.strictEqual(cfg.niveles[0].edad, "5-6 años");
});

prueba("accesibilidad trae las siete claves compartidas", () => {
    for (const k of ["altoContraste", "mostrarIntro", "ayudaAutomatica", "mostrarProgreso", "letterSpacing", "volumenFondo", "rate"]) {
        assert.ok(cfg.accesibilidad[k] !== undefined, "falta accesibilidad." + k);
    }
});

prueba("hay tres rondas con objetivo creciente", () => {
    assert.strictEqual(cfg.rondas.length, 3);
    for (let i = 1; i < cfg.rondas.length; i++) {
        assert.ok(cfg.rondas[i].golpesObjetivo >= cfg.rondas[i - 1].golpesObjetivo,
            "la ronda " + (i + 1) + " no pide al menos tantos golpes como la anterior");
        assert.ok(cfg.rondas[i].gravedad > cfg.rondas[i - 1].gravedad,
            "la ronda " + (i + 1) + " no es más exigente");
    }
});

prueba("los textos literales del enunciado están", () => {
    assert.ok(cfg.textos.introZoe.includes("El gran Pinball de la gravedad mágica"),
        "falta el audio de introducción literal");
    assert.ok(cfg.textos.introZoe.includes("antes de que caiga al fondo"),
        "la introducción no termina como pide el enunciado");
    assert.ok(cfg.textos.final.includes("¡ESPECTACULAR DOMINIO VISOMOTOR!"),
        "falta el audio de cierre literal");
    assert.ok(cfg.textos.final.includes("maestro de la gravedad mágica"),
        "el cierre no termina como pide el enunciado");
    assert.ok(cfg.textos.caida.some((t) => t.includes("Vamos a darle otra oportunidad")),
        "falta la frase de Zoe cuando cae la bola");
    assert.strictEqual(cfg.textos.avisoIzquierda, "¡Viene por la izquierda!");
    assert.strictEqual(cfg.textos.avisoDerecha, "¡Viene por la derecha!");
});

prueba("la conversación usa Zeus 0 y Zoe 1", () => {
    for (const c of cfg.textos.conversacion) {
        assert.ok(c.personaje === 0 || c.personaje === 1, "personaje debe ser 0 o 1");
    }
});

// ------------------------------------------------------------------ marcado común

prueba("el index.html trae los botones comunes sin cambiar los íconos", () => {
    assert.ok(html.includes('onclick="location.reload()"') && html.includes("fa-solid fa-rotate"),
        "falta el botón de reiniciar con su ícono");
    assert.ok(html.includes('onclick="history.back()"') && html.includes("fa-solid fa-arrow-left"),
        "falta el botón de salir con su ícono");
    assert.ok(html.includes('id="btn-menu-acc"') && html.includes("fa-universal-access"),
        "falta el botón de accesibilidad");
    assert.ok(html.includes('id="btn-menu-vol"') && html.includes("fa-volume-high"),
        "falta el botón de volumen");
    assert.ok(html.includes("menu-acc-fab"), "los FAB deben usar la clase menu-acc-fab");
});

prueba("interfaz.css se carga después de style.css", () => {
    const iStyle = html.indexOf('href="style.css');
    const iComun = html.indexOf('href="../comun/interfaz.css');
    assert.ok(iStyle > -1 && iComun > iStyle, "interfaz.css debe ir después de style.css");
});

prueba("volumen.js se carga antes de sonidos.js", () => {
    const iVol = html.indexOf("comun/volumen.js");
    const iSon = html.indexOf('src="sonidos.js');
    assert.ok(iVol > -1 && iSon > iVol, "volumen.js debe cargarse antes que sonidos.js");
});

prueba("están los dos controles de palanca y el botón de comenzar", () => {
    assert.ok(html.includes('id="btn-palanca-izq"'), "falta el control izquierdo");
    assert.ok(html.includes('id="btn-palanca-der"'), "falta el control derecho");
    assert.ok(html.includes("Toca Izquierda") && html.includes("Toca Derecha"),
        "los controles deben estar rotulados");
    assert.ok(html.includes('id="btn-comenzar"'), "falta el botón de arranque");
});

prueba("sin título ni cartel de edad en la partida, y el icono existe", () => {
    assert.ok(!html.includes('id="titulo-juego"'), "el título del juego ya no va en la partida");
    assert.ok(!html.includes("pastilla-edad"), "el botón de 5-6 años ya no va");
    assert.ok(fs.existsSync(path.join(dir, "pinball-gravedad.png")), "falta el icono del juego");
});

prueba("Zoe 3D entra solo para la demo y luego sale", () => {
    assert.ok(!/zoe_normal\.gif|zeus_normal\.gif/.test(html), "quedan GIF de los personajes");
    assert.ok(html.includes('id="guia-demo"'), "falta el hueco de Zoe para la demo");
    assert.ok(!html.includes('id="pj-zoe"') && !html.includes('id="pj-zeus"'), "ya no hay personajes fijos durante la partida");
    const g = fs.readFileSync(path.join(dir, "guia-3d.js"), "utf8");
    assert.ok(g.includes("nina.glb"), "Zoe debe usar intro3d/models/nina.glb");
    assert.ok(g.includes("forceContextLoss") && g.includes("dispose"), "al salir debe liberarse el WebGL");
    const src = fs.readFileSync(path.join(dir, "script.js"), "utf8");
    assert.ok(src.includes("Guia3D.entrar()") && src.includes("Guia3D.salir()"), "Zoe debe entrar a la demo y salir antes de jugar");
    assert.ok(src.indexOf("Guia3D.salir()") < src.indexOf("esperarBotonComenzar(); })"),
        "Zoe sale antes del botón de comenzar");
});

prueba("lo que dicen Zoe y Zeus sale en una nube con su ícono", () => {
    for (const id of ["zoe", "zeus"]) {
        assert.ok(html.includes('id="nube-' + id + '"'), "falta la nube de " + id);
        assert.ok(html.includes('src="icono-' + id + '.png"'), "la nube de " + id + " no tiene ícono");
        assert.ok(fs.existsSync(path.join(dir, "icono-" + id + ".png")), "falta icono-" + id + ".png");
    }
});

prueba("hay modo ligero para tabletas modestas", () => {
    const src = fs.readFileSync(path.join(dir, "script.js"), "utf8");
    assert.ok(src.includes("deviceMemory") && src.includes("activarLigero"), "falta la detección del modo ligero");
    const mesaSrc = fs.readFileSync(path.join(dir, "mesa.js"), "utf8");
    assert.ok(mesaSrc.includes("construirCapa") && mesaSrc.includes("m.ligero ? 1"), "la mesa debe usar capa fija y 1x en modo ligero");
    const fondoSrc = fs.readFileSync(path.join(dir, "fondo.js"), "utf8");
    assert.ok(fondoSrc.includes("hornearCielo") && fondoSrc.includes("ligero: function"), "el cielo debe tener modo ligero");
});

prueba("Volver va junto a Reiniciar, arriba a la derecha", () => {
    const i = html.indexOf('onclick="location.reload()"');
    const j = html.indexOf('onclick="history.back()"');
    assert.ok(i > -1 && j > i, "Volver debe ir después de Reiniciar");
    const bloque = html.slice(html.lastIndexOf("<div", i), j);
    assert.ok(!bloque.includes("</div>"), "Reiniciar y Volver deben estar en el mismo contenedor");
});

prueba("el cielo reacciona a los eventos del juego", () => {
    assert.ok(html.includes('id="fondo-cielo"') && html.includes('src="fondo.js'), "falta el cielo animado");
    const src = fs.readFileSync(path.join(dir, "script.js"), "utf8");
    for (const ev of ["bumper", "diana", "aro", "golpe", "caida", "aviso", "ronda", "celebrar"]) {
        assert.ok(src.includes('cielo("' + ev + '"'), "el cielo no reacciona a " + ev);
    }
    const f = fs.readFileSync(path.join(dir, "fondo.js"), "utf8");
    for (const ev of ["bumper", "diana", "aro", "golpe", "caida", "aviso", "ronda", "celebrar"]) {
        assert.ok(f.includes('case "' + ev + '"'), "fondo.js no atiende " + ev);
    }
});

// ------------------------------------------------------------------ física

prueba("la bola entra al tablero por arriba y baja por gravedad", () => {
    const e = nuevoEstado(0);
    assert.ok(e.bola.viva, "la bola debe quedar viva al lanzarse");
    assert.ok(e.bola.x > 100 && e.bola.x < e.ancho - 100,
        "la bola debe nacer dentro del tablero, no pegada a una pared");
    const y0 = e.bola.y;
    simular(e, 400);
    assert.ok(e.bola.y > y0, "la bola no baja: la gravedad no actúa");
});

prueba("la bola nunca baja pegada a una pared lateral", () => {
    // Un pasillo vertical junto al muro deja al niño sin nada que hacer: la bola cae sin
    // tocar bumpers ni llegar a las palancas. No debe existir en ninguna ronda.
    for (let r = 0; r < cfg.rondas.length; r++) {
        const e = nuevoEstado(r);
        let msPegada = 0;
        simular(e, 30000, (est) => {
            if (!est.bola || !est.bola.viva) { R.lanzarBola(est, Math.random); return; }
            const pegada = est.bola.x < 110 || est.bola.x > est.ancho - 110;
            msPegada = pegada ? msPegada + 16 : 0;
            assert.ok(msPegada < 3000,
                "en la ronda " + (r + 1) + " la bola bajó pegada a la pared más de 3 s");
        });
    }
});

prueba("la bola lanzada llega a la zona de los bumpers", () => {
    // Si el carril fuera un pasillo ciego, la bola bajaría pegada a la pared sin jugar.
    const e = nuevoEstado(0);
    const xBumperMin = Math.min(...e.bumpers.map((b) => b.x));
    const xBumperMax = Math.max(...e.bumpers.map((b) => b.x));
    let entroAlCentro = false;
    simular(e, 4000, (est) => {
        if (est.bola && est.bola.viva && est.bola.x > xBumperMin - 60 && est.bola.x < xBumperMax + 60) {
            entroAlCentro = true;
        }
    });
    assert.ok(entroAlCentro, "la bola nunca entró a la zona central de bumpers");
});

prueba("la bola nunca sale por los lados del tablero", () => {
    const e = nuevoEstado(2);
    let fuera = false;
    simular(e, 12000, (est) => {
        if (est.bola && est.bola.viva && !est.bola.enTubo) {
            if (est.bola.x < -5 || est.bola.x > est.ancho + 5) fuera = true;
            if (est.bola.y < -60) fuera = true;
        }
        if (est.bola && !est.bola.viva) R.lanzarBola(est, () => 0.5);
    });
    assert.ok(!fuera, "la bola se escapó del tablero");
});

prueba("la velocidad nunca pasa del tope de la ronda", () => {
    const e = nuevoEstado(2);
    let maxV = 0;
    simular(e, 10000, (est) => {
        if (est.bola && est.bola.viva) {
            const v = Math.hypot(est.bola.vx, est.bola.vy);
            if (v > maxV) maxV = v;
        } else if (est.bola) R.lanzarBola(est, () => 0.5);
    });
    assert.ok(maxV <= e.velocidadMaxima * 1.02,
        "la bola llegó a " + Math.round(maxV) + ", por encima del tope " + e.velocidadMaxima);
});

prueba("los bumpers impulsan la bola", () => {
    const e = nuevoEstado(0);
    const b = e.bumpers[0];
    // Colocamos la bola cayendo justo sobre el primer bumper.
    e.bola.x = b.x;
    e.bola.y = b.y - e.radioBumper - e.radioBola - 4;
    e.bola.vx = 0;
    e.bola.vy = 200;
    const eventos = simular(e, 400);
    const golpes = eventos.filter((v) => v.tipo === "bumper");
    assert.ok(golpes.length > 0, "la bola atravesó el bumper sin activarlo");
    assert.ok(e.bola.vy < 0, "el bumper no devolvió la bola hacia arriba");
});

prueba("una palanca devuelve la bola hacia arriba", () => {
    const e = nuevoEstado(0);
    const f = e.flippers.izquierda;
    e.bola.x = f.pivoteX + 60;
    e.bola.y = f.pivoteY - 40;
    e.bola.vx = -40;
    e.bola.vy = 300;
    const res = R.activarFlipper(e, "izquierda", cfg.juego);
    assert.ok(res.golpeo, "la palanca no alcanzó una bola que tenía al lado");
    assert.ok(e.bola.vy < 0, "la bola no salió hacia arriba tras el golpe");
});

prueba("tocar la palanca lejos de la bola no castiga", () => {
    const e = nuevoEstado(0);
    e.bola.x = e.ancho / 2;
    e.bola.y = 200; // arriba del todo, lejísimos de las palancas
    const vxAntes = e.bola.vx, vyAntes = e.bola.vy;
    const puntosAntes = e.puntos;
    const res = R.activarFlipper(e, "derecha", cfg.juego);
    assert.ok(res.movio, "la palanca debe moverse siempre, aunque la bola esté lejos");
    assert.ok(!res.golpeo, "no debía alcanzar la bola");
    assert.strictEqual(e.bola.vx, vxAntes, "la bola cambió sin que la tocara");
    assert.strictEqual(e.bola.vy, vyAntes, "la bola cambió sin que la tocara");
    assert.strictEqual(e.puntos, puntosAntes, "un fallo de timing no debe restar puntos");
});

prueba("el antiatasco devuelve una bola parada", () => {
    const e = nuevoEstado(0);
    e.bola.x = 100;
    e.bola.y = 500;
    e.bola.vx = 0;
    e.bola.vy = 0;
    e.gravedad = 0; // la aislamos para provocar el atasco
    const eventos = simular(e, e.antiatascoMs + 400);
    assert.ok(eventos.some((v) => v.tipo === "antiatasco"),
        "la bola quedó parada y nadie la rescató");
});

prueba("la caída se detecta y no reinicia la partida", () => {
    const e = nuevoEstado(0);
    e.puntos = 120;
    e.bola.x = e.ancho / 2;
    e.bola.y = e.alto - 10;
    e.bola.vx = 0;
    e.bola.vy = 600;
    const eventos = simular(e, 500);
    assert.ok(eventos.some((v) => v.tipo === "caida"), "no se detectó la caída");
    assert.strictEqual(e.caidas, 1, "no se contó la caída");
    assert.strictEqual(e.puntos, 120, "la caída no debe restar puntos");
});

prueba("el aviso llega antes de que la bola alcance la palanca", () => {
    const e = nuevoEstado(0);
    e.bola.x = 300;
    e.bola.y = 1020;     // por debajo del umbral de aviso
    e.bola.vx = -30;
    e.bola.vy = 350;     // bajando
    const lado = R.ladoDeAviso(e, cfg.juego);
    assert.strictEqual(lado, "izquierda", "debía avisar del lado izquierdo");
    assert.ok(e.bola.y < e.flippers.izquierda.pivoteY,
        "el aviso llegó cuando la bola ya estaba en la palanca");
});

prueba("no se avisa cuando la bola sube", () => {
    const e = nuevoEstado(0);
    e.bola.x = 300;
    e.bola.y = 1020;
    e.bola.vy = -400; // subiendo
    assert.strictEqual(R.ladoDeAviso(e, cfg.juego), null, "no debe avisar con la bola subiendo");
});

prueba("las dianas solo cuentan una vez y se apagan al cambiar de ronda", () => {
    const e = nuevoEstado(1);
    // La diana horizontal del centro: la bola le cae encima desde arriba.
    const d = e.dianas.find((x) => x.angulo === 0);
    e.bola.x = d.x;
    e.bola.y = d.y - d.alto / 2 - e.radioBola - 3;
    e.bola.vx = 0;
    e.bola.vy = 260;
    const eventos = simular(e, 600);
    const golpes = eventos.filter((v) => v.tipo === "diana" && v.id === d.id);
    assert.ok(golpes.length >= 1, "la diana no reaccionó");
    assert.strictEqual(golpes.length, 1, "la diana contó más de una vez");
    R.aplicarRonda(e, cfg.rondas[2]);
    assert.ok(e.dianas.every((x) => !x.encendida), "las dianas no se apagaron al cambiar de ronda");
});

prueba("la ronda 1 no usa dianas", () => {
    const e = nuevoEstado(0);
    assert.strictEqual(e.dianasActivas, false, "la ronda de familiarización no debe traer dianas");
});

prueba("el puntaje sube y nunca es negativo", () => {
    const e = nuevoEstado(0);
    R.puntuar(e, { tipo: "bumper" }, cfg);
    R.puntuar(e, { tipo: "diana" }, cfg);
    R.puntuar(e, { tipo: "flipper" }, cfg);
    assert.ok(e.puntos > 0, "no sumó puntos");
    assert.strictEqual(e.golpes, 1, "no contó el golpe de palanca");
    const antes = e.puntos;
    simular(e, 3000);
    assert.ok(e.puntos >= antes, "los puntos bajaron en algún momento");
});

prueba("la racha premia golpes seguidos y se corta al caer", () => {
    const e = nuevoEstado(0);
    for (let i = 0; i < 4; i++) R.puntuar(e, { tipo: "flipper" }, cfg);
    assert.strictEqual(e.racha, 4, "la racha no se acumuló");
    assert.strictEqual(e.mejorRacha, 4, "no se guardó la mejor racha");
    e.bola.y = e.alto + 100;
    simular(e, 50);
    assert.strictEqual(e.racha, 0, "la racha no se cortó al caer");
    assert.strictEqual(e.mejorRacha, 4, "la mejor racha no debe perderse");
});

prueba("la ronda se completa al llegar al objetivo", () => {
    const e = nuevoEstado(0);
    const ronda = cfg.rondas[0];
    assert.ok(!R.rondaCompleta(e, ronda), "la ronda no puede estar completa al empezar");
    for (let i = 0; i < ronda.golpesObjetivo; i++) R.puntuar(e, { tipo: "flipper" }, cfg);
    assert.ok(R.rondaCompleta(e, ronda), "la ronda no se completó con los golpes pedidos");
});

prueba("las estrellas nunca bajan de una", () => {
    const e = nuevoEstado(0);
    assert.strictEqual(R.estrellas(e, 24), 1, "con cero golpes debe dar una estrella, no cero");
    e.golpes = 24;
    e.caidas = 0;
    assert.strictEqual(R.estrellas(e, 24), 3, "una partida perfecta debe dar tres estrellas");
});

prueba("reiniciar deja el estado como recién creado", () => {
    const e = nuevoEstado(2);
    simular(e, 2000);
    e.puntos = 999;
    R.reiniciar(e, cfg);
    assert.strictEqual(e.puntos, 0, "no se reiniciaron los puntos");
    assert.strictEqual(e.golpes, 0, "no se reiniciaron los golpes");
    assert.strictEqual(e.caidas, 0, "no se reiniciaron las caídas");
    assert.strictEqual(e.bola, null, "la bola debe quedar sin lanzar");
    assert.strictEqual(e.flippers.izquierda.angulo, e.flippers.izquierda.anguloReposo,
        "la palanca no volvió a su posición de reposo");
});

prueba("la bola golpea bumpers jugando de verdad, en las tres rondas", () => {
    // Esta es la prueba que distingue un pinball de una bola que cae por un tubo: si el
    // tablero tiene un pasillo ciego o el golpe no alcanza, aquí sale cero.
    for (let r = 0; r < cfg.rondas.length; r++) {
        const e = nuevoEstado(r);
        let bumpers = 0;
        simular(e, 40000, (est, i) => {
            if (!est.bola || !est.bola.viva) { R.lanzarBola(est, Math.random); return; }
            const f = est.flippers.izquierda;
            if (est.bola.y > f.pivoteY - 190 && est.bola.vy > 0 && i % 11 === 0) {
                R.activarFlipper(est, est.bola.x < est.ancho / 2 ? "izquierda" : "derecha", cfg.juego);
            }
        });
        // simular() no acumula los eventos del callback, los contamos del estado
        bumpers = e.bumpersGolpeados;
        assert.ok(bumpers > 0,
            "en la ronda " + (r + 1) + " la bola no tocó ni un bumper en 40 s de juego");
    }
});

prueba("una partida larga de la ronda 3 sigue siendo jugable", () => {
    // 60 segundos simulados, golpeando siempre que la bola llega abajo: no debe atascarse
    // ni dispararse, y el niño debe poder mantenerla en juego.
    const e = nuevoEstado(2);
    let golpesLogrados = 0;
    let atascos = 0;
    simular(e, 60000, (est) => {
        if (!est.bola || !est.bola.viva) { R.lanzarBola(est, () => 0.5); return; }
        if (est.msSinMoverse > est.antiatascoMs) atascos++;
        const y = est.bola.y;
        const f = est.flippers.izquierda;
        if (y > f.pivoteY - 200 && est.bola.vy > 0) {
            const lado = est.bola.x < est.ancho / 2 ? "izquierda" : "derecha";
            if (R.activarFlipper(est, lado, cfg.juego).golpeo) golpesLogrados++;
        }
    });
    assert.ok(golpesLogrados >= 5,
        "en un minuto solo se lograron " + golpesLogrados + " golpes: el juego no es jugable");
    assert.strictEqual(atascos, 0, "la bola se quedó atascada pese al antiatasco");
});

// ------------------------------------------------------------------ tubos laterales

prueba("la bola no aparece de la nada: sale del lanzador y sube por un tubo lateral", () => {
    for (const azar of [0.2, 0.8]) {
        const e = R.crearEstado(cfg);
        R.aplicarRonda(e, cfg.rondas[0]);
        R.lanzarBola(e, () => azar);
        assert.ok(e.bola.enTubo, "la bola debe empezar dentro del tubo");
        const lado = e.bola.enTubo.lado;
        const inicio = R.puntoTubo(e, lado, 0);
        assert.ok(Math.abs(e.bola.x - inicio.x) < 1 && Math.abs(e.bola.y - inicio.y) < 1,
            "la bola debe empezar en el lanzador del tubo");
        assert.ok(e.bola.x < e.paredX || e.bola.x > e.ancho - e.paredX, "el tubo va por fuera de las paredes");
        let salio = null, minY = e.bola.y;
        simular(e, 2000, (est, i) => {
            if (est.bola.enTubo) minY = Math.min(minY, est.bola.y);
            if (!est.bola.enTubo && salio === null) salio = i * 16;
        });
        assert.ok(salio !== null && salio > 700 && salio < 1600, "el viaje por el tubo debe durar alrededor de un segundo");
        assert.ok(minY < e.arco.cy, "la bola debe subir por el tubo hasta la cabecera");
    }
});

prueba("al salir del tubo la bola cae dentro de la mesa y juega", () => {
    const e = R.crearEstado(cfg);
    R.aplicarRonda(e, cfg.rondas[0]);
    R.lanzarBola(e, () => 0.3);
    let eventos = [];
    simular(e, 3000, (est) => { eventos = eventos; });
    eventos = simular(e, 0);
    assert.ok(!e.bola.enTubo, "la bola sigue en el tubo");
    assert.ok(e.bola.x > e.paredX && e.bola.x < e.ancho - e.paredX, "la bola quedó fuera de la mesa");
    const e2 = R.crearEstado(cfg);
    R.aplicarRonda(e2, cfg.rondas[0]);
    R.lanzarBola(e2, () => 0.7);
    const evs = simular(e2, 1600);
    assert.ok(evs.some((x) => x.tipo === "tubo"), "falta el evento de entrada al tubo");
    assert.ok(evs.some((x) => x.tipo === "salidaTubo"), "falta el evento de salida del tubo");
});

prueba("con la bola en el tubo no hay golpe de palanca ni aviso", () => {
    const e = R.crearEstado(cfg);
    R.aplicarRonda(e, cfg.rondas[0]);
    R.lanzarBola(e, () => 0.5);
    simular(e, 200);
    assert.ok(e.bola.enTubo, "la bola ya salió del tubo");
    assert.ok(!R.activarFlipper(e, "izquierda").golpeo && !R.activarFlipper(e, "derecha").golpeo,
        "las palancas no pueden golpear la bola dentro del tubo");
    assert.strictEqual(R.ladoDeAviso(e, cfg.juego), null, "no debe avisar con la bola en el tubo");
});

// ------------------------------------------------------------------ demostración

prueba("la demo enseña dos golpes que aciertan, uno por lado", async () => {
    // Una demostración en la que la palanca falla enseña lo contrario de lo que queremos.
    const demoSrc = fs.readFileSync(path.join(dir, "demo.js"), "utf8");
    assert.ok(demoSrc.includes('colocarEnPalanca("izquierda")'),
        "la demo no asegura el golpe de la palanca izquierda");
    assert.ok(demoSrc.includes('colocarEnPalanca("derecha")'),
        "la demo no asegura el golpe de la palanca derecha");

    // Y el golpe asegurado tiene que funcionar de verdad con la física.
    const e = nuevoEstado(0);
    for (const lado of ["izquierda", "derecha"]) {
        const f = e.flippers[lado];
        const punta = R.puntaFlipper(f);
        e.bola.x = (f.pivoteX + punta.x) / 2;
        e.bola.y = f.pivoteY - 70;
        e.bola.vx = lado === "izquierda" ? -40 : 40;
        e.bola.vy = 180;
        const res = R.activarFlipper(e, lado, cfg.juego);
        assert.ok(res.golpeo, "el golpe asegurado de la demo falló en la palanca " + lado);
    }
});

prueba("script.js expone colocarEnPalanca para la demo", () => {
    const src = fs.readFileSync(path.join(dir, "script.js"), "utf8");
    assert.ok(src.includes("colocarEnPalanca:"),
        "el api de la demo no expone colocarEnPalanca, la demo fallaría en silencio");
});

// ------------------------------------------------------------------ resultado

if (fallos.length) {
    console.error(fallos.join("\n"));
    console.error("");
}
console.log((ok === total ? "✓ " : "✗ ") + ok + "/" + total + " pruebas");
process.exit(ok === total ? 0 : 1);
