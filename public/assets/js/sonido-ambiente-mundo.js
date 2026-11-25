/**
 * Sonido ambiente del mundo del kiosco: brisa con ráfagas, hojas y, de vez en
 * cuando, la voz de algún animal que esté en el mapa (pájaros, gallina, pato,
 * oveja, vaca, burro…). Todo sintetizado con Web Audio, sin archivos.
 *
 * Cada animal suena desde su lugar: se paneo y atenúa según dónde esté frente
 * a la cámara. Mientras Zoe/Zeus hablan, el ambiente baja para no tapar la voz.
 */

const VOLUMEN = 0.85;
const DUCK_HABLANDO = 0.35;
const MAX_VOCES = 3;

const rnd = (a, b) => a + Math.random() * (b - a);
const elegir = (lista) => lista[Math.floor(Math.random() * lista.length)];

// Qué sonido hace cada modelo de 04_animales / 05_aves_insectos_peces.
// Conejo, zorro, iguana, mariposas y peces no suenan (como en la realidad).
const VOZ_DE = {
    ave_azul: 'pajaro',
    ave_amarilla: 'pajaro',
    ave_roja: 'pajaro',
    guacamaya: 'guacamaya',
    gallina: 'gallina',
    pato: 'pato',
    oveja: 'oveja',
    vaca_cebu: 'vaca',
    burro: 'burro',
    garza: 'garza',
};

// Peso de aparición: los pájaros cantan mucho; vaca y burro, de vez en cuando.
const PESO = {
    pajaro: 7, guacamaya: 1, gallina: 2, pato: 2, oveja: 2, vaca: 1, burro: 0.6, garza: 0.4, grillo: 2,
};

export function crearSonidoAmbiente({ animales = () => [], activo = () => true } = {}) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return { actualizar() {}, pausar() {}, reanudar() {}, destruir() {} };

    let ctx = null;
    let master = null;
    let bus = null;
    let brisa = null;
    let pausado = false;
    let destruido = false;
    let duck = 1;
    let camara = null;
    let voces = 0;
    let timerAnimal = null;
    let timerRafaga = null;

    // ---------- Arranque (el audio necesita un toque del niño) ----------
    function arrancar() {
        if (destruido || !activo()) return;
        if (!ctx) {
            try { ctx = new Ctx(); } catch (e) { return; }
            master = ctx.createGain();
            master.gain.value = 0;
            const comp = ctx.createDynamicsCompressor();
            comp.threshold.value = -18;
            comp.ratio.value = 4;
            master.connect(comp);
            comp.connect(ctx.destination);
            bus = ctx.createGain();
            bus.connect(master);
            brisa = crearBrisa();
            programarRafaga();
            programarAnimal(rnd(1.5, 3));
        }
        if (pausado) return;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        subirVolumen();
    }

    function subirVolumen() {
        if (!ctx || !master) return;
        const t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setTargetAtTime(VOLUMEN * duck, t, 0.8);
    }

    const alGesto = () => arrancar();
    ['pointerdown', 'touchend', 'keydown'].forEach((ev) => document.addEventListener(ev, alGesto, true));
    const alVisibilidad = () => {
        if (!ctx) return;
        if (document.hidden) ctx.suspend().catch(() => {});
        else if (!pausado) ctx.resume().catch(() => {});
    };
    document.addEventListener('visibilitychange', alVisibilidad);
    arrancar(); // si el navegador ya lo permite (hubo un toque antes), suena de una vez

    // ---------- Ruido base ----------
    function bufferRuido(tipo, seg) {
        const n = Math.floor(ctx.sampleRate * seg);
        const buf = ctx.createBuffer(1, n, ctx.sampleRate);
        const d = buf.getChannelData(0);
        let ult = 0;
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < n; i++) {
            const w = Math.random() * 2 - 1;
            if (tipo === 'marron') {
                ult = (ult + 0.02 * w) / 1.02;
                d[i] = ult * 3.5;
            } else if (tipo === 'rosa') {
                b0 = 0.99765 * b0 + w * 0.0990460;
                b1 = 0.96300 * b1 + w * 0.2965164;
                b2 = 0.57000 * b2 + w * 1.0526913;
                d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
            } else {
                d[i] = w;
            }
        }
        return buf;
    }

    let ruidoBlanco = null;
    function ruidoCorto() {
        if (!ruidoBlanco) ruidoBlanco = bufferRuido('blanco', 1);
        const s = ctx.createBufferSource();
        s.buffer = ruidoBlanco;
        return s;
    }

    // ---------- Brisa: viento grave + susurro de hojas ----------
    function crearBrisa() {
        const viento = ctx.createBufferSource();
        viento.buffer = bufferRuido('marron', 6);
        viento.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 500;
        lp.Q.value = 0.6;
        const gViento = ctx.createGain();
        gViento.gain.value = 0.08;
        viento.connect(lp).connect(gViento).connect(bus);

        const hojas = ctx.createBufferSource();
        hojas.buffer = bufferRuido('rosa', 5);
        hojas.loop = true;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 2200;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 4500;
        bp.Q.value = 0.5;
        const gHojas = ctx.createGain();
        gHojas.gain.value = 0.015;
        hojas.connect(hp).connect(bp).connect(gHojas).connect(bus);

        viento.start();
        hojas.start();
        return { viento, hojas, lp, gViento, gHojas };
    }

    // Cada pocos segundos el viento sube o baja, como ráfagas suaves.
    function programarRafaga() {
        clearTimeout(timerRafaga);
        if (destruido) return;
        if (ctx && brisa) {
            const t = ctx.currentTime;
            const fuerza = Math.random() < 0.25 ? rnd(0.7, 1) : rnd(0.15, 0.55);
            const tau = rnd(0.8, 2);
            brisa.gViento.gain.setTargetAtTime(0.05 + fuerza * 0.13, t, tau);
            brisa.lp.frequency.setTargetAtTime(320 + fuerza * 900, t, tau);
            brisa.gHojas.gain.setTargetAtTime(0.008 + fuerza * fuerza * 0.05, t, tau * 0.8);
        }
        timerRafaga = setTimeout(programarRafaga, rnd(2500, 6500));
    }

    // ---------- Ubicación del animal respecto a la cámara ----------
    function ubicar(o) {
        if (!o || !camara || !camara.matrixWorld) return { pan: rnd(-0.7, 0.7), gan: rnd(0.25, 0.5) };
        const e = camara.matrixWorld.elements;
        const p = o.position;
        const dx = p.x - e[12];
        const dy = p.y - e[13];
        const dz = p.z - e[14];
        const dist = Math.hypot(dx, dy, dz) || 1;
        const derecha = (dx * e[0] + dy * e[1] + dz * e[2]) / dist;
        const pan = Math.max(-0.9, Math.min(0.9, derecha));
        const gan = 1 / (1 + Math.pow(dist / 18, 1.3));
        return { pan, gan: Math.max(0.12, gan), dist };
    }

    function salida(pan, gan) {
        const g = ctx.createGain();
        g.gain.value = gan;
        let nodo = g;
        if (ctx.createStereoPanner) {
            const p = ctx.createStereoPanner();
            p.pan.value = pan;
            g.connect(p);
            nodo = p;
        }
        nodo.connect(bus);
        return g;
    }

    // Envolvente de volumen: subida rápida, bajada suave.
    function env(param, t, pico, ataque, dur, caida) {
        param.setValueAtTime(0.0001, t);
        param.exponentialRampToValueAtTime(pico, t + ataque);
        param.setValueAtTime(pico, t + Math.max(ataque, dur - caida));
        param.exponentialRampToValueAtTime(0.0001, t + dur);
    }

    function osc(tipo, f, t, fin) {
        const o = ctx.createOscillator();
        o.type = tipo;
        o.frequency.setValueAtTime(f, t);
        o.start(t);
        o.stop(fin + 0.05);
        return o;
    }

    function filtro(tipo, f, q) {
        const b = ctx.createBiquadFilter();
        b.type = tipo;
        b.frequency.value = f;
        b.Q.value = q;
        return b;
    }

    // ---------- Voces de los animales (devuelven su duración en s) ----------
    const SINTE = {
        pajaro(t, out) {
            const notas = Math.floor(rnd(2, 6));
            const base = rnd(2600, 4200);
            const estilo = Math.random();
            let tt = t;
            for (let i = 0; i < notas; i++) {
                const dur = rnd(0.06, 0.13);
                const o = osc('sine', base * rnd(0.9, 1.15), tt, tt + dur);
                const subida = estilo < 0.5 ? rnd(1.2, 1.6) : rnd(0.6, 0.85);
                o.frequency.exponentialRampToValueAtTime(base * subida, tt + dur);
                const vib = osc('sine', rnd(25, 45), tt, tt + dur);
                const vg = ctx.createGain();
                vg.gain.value = base * 0.04;
                vib.connect(vg).connect(o.frequency);
                const g = ctx.createGain();
                env(g.gain, tt, 0.22, 0.012, dur, dur * 0.6);
                o.connect(g).connect(out);
                tt += dur + rnd(0.03, 0.1);
            }
            return tt - t;
        },
        guacamaya(t, out) {
            const veces = Math.random() < 0.5 ? 1 : 2;
            let tt = t;
            for (let i = 0; i < veces; i++) {
                const dur = rnd(0.3, 0.45);
                const o = osc('sawtooth', 650, tt, tt + dur);
                o.frequency.linearRampToValueAtTime(rnd(1000, 1250), tt + dur * 0.35);
                o.frequency.linearRampToValueAtTime(rnd(700, 850), tt + dur);
                const bp = filtro('bandpass', 1600, 1.8);
                const g = ctx.createGain();
                env(g.gain, tt, 0.16, 0.02, dur, dur * 0.4);
                o.connect(bp).connect(g).connect(out);
                const r = ruidoCorto();
                const rb = filtro('bandpass', 2200, 1.2);
                const rg = ctx.createGain();
                env(rg.gain, tt, 0.05, 0.02, dur, dur * 0.4);
                r.connect(rb).connect(rg).connect(out);
                r.start(tt);
                r.stop(tt + dur + 0.05);
                tt += dur + rnd(0.12, 0.25);
            }
            return tt - t;
        },
        gallina(t, out) {
            const golpes = Math.floor(rnd(3, 6));
            let tt = t;
            for (let i = 0; i < golpes; i++) {
                const largo = i === golpes - 1 && Math.random() < 0.6;
                const dur = largo ? rnd(0.28, 0.4) : rnd(0.06, 0.09);
                const f = rnd(380, 470);
                const o = osc('sawtooth', f, tt, tt + dur);
                if (largo) o.frequency.linearRampToValueAtTime(f * 1.45, tt + dur * 0.5);
                const bp = filtro('bandpass', largo ? 1300 : 950, 3);
                const g = ctx.createGain();
                env(g.gain, tt, 0.2, 0.008, dur, dur * 0.5);
                o.connect(bp).connect(g).connect(out);
                tt += dur + rnd(0.07, 0.14);
            }
            return tt - t;
        },
        pato(t, out) {
            const veces = Math.floor(rnd(1, 4));
            let tt = t;
            for (let i = 0; i < veces; i++) {
                const dur = rnd(0.16, 0.22);
                const f = rnd(210, 250);
                const bp = filtro('bandpass', 1100, 4);
                const g = ctx.createGain();
                env(g.gain, tt, 0.3, 0.01, dur, dur * 0.7);
                [1, 1.012].forEach((k) => {
                    const o = osc('sawtooth', f * k, tt, tt + dur);
                    o.frequency.exponentialRampToValueAtTime(f * k * 0.8, tt + dur);
                    o.connect(bp);
                });
                bp.connect(g).connect(out);
                tt += dur + rnd(0.08, 0.16);
            }
            return tt - t;
        },
        oveja(t, out) {
            const dur = rnd(0.75, 1.05);
            const f = rnd(290, 340);
            const o = osc('sawtooth', f, t, t + dur);
            o.frequency.linearRampToValueAtTime(f * 0.92, t + dur);
            const vib = osc('sine', rnd(6, 7.5), t, t + dur);
            const vg = ctx.createGain();
            vg.gain.value = f * 0.045;
            vib.connect(vg).connect(o.frequency);
            const trem = ctx.createGain();
            trem.gain.value = 0.7;
            const tg = ctx.createGain();
            tg.gain.value = 0.3;
            vib.connect(tg).connect(trem.gain);
            const f1 = filtro('bandpass', 850, 2.5);
            const f2 = filtro('bandpass', 2300, 4);
            const g = ctx.createGain();
            env(g.gain, t, 0.22, 0.05, dur, 0.25);
            o.connect(trem);
            trem.connect(f1).connect(g);
            trem.connect(f2).connect(g);
            g.connect(out);
            return dur;
        },
        vaca(t, out) {
            const dur = rnd(1.3, 1.8);
            const f = rnd(110, 130);
            const o = osc('sawtooth', f, t, t + dur);
            o.frequency.linearRampToValueAtTime(f * 1.06, t + dur * 0.3);
            o.frequency.linearRampToValueAtTime(f * 0.8, t + dur);
            const sub = osc('sine', f / 2, t, t + dur);
            const lp = filtro('lowpass', 280, 3);
            lp.frequency.setValueAtTime(280, t);
            lp.frequency.linearRampToValueAtTime(950, t + dur * 0.35);
            lp.frequency.linearRampToValueAtTime(380, t + dur);
            const g = ctx.createGain();
            env(g.gain, t, 0.35, 0.25, dur, 0.45);
            const gs = ctx.createGain();
            gs.gain.value = 0.4;
            o.connect(lp).connect(g);
            sub.connect(gs).connect(g);
            g.connect(out);
            return dur;
        },
        burro(t, out) {
            const ciclos = Math.floor(rnd(2, 4));
            let tt = t;
            for (let i = 0; i < ciclos; i++) {
                const durI = rnd(0.25, 0.32);
                const oI = osc('sawtooth', rnd(520, 580), tt, tt + durI);
                const bpI = filtro('bandpass', 1400, 2);
                const gI = ctx.createGain();
                env(gI.gain, tt, 0.16, 0.03, durI, 0.08);
                oI.connect(bpI).connect(gI).connect(out);
                tt += durI + 0.03;
                const durA = rnd(0.38, 0.5);
                const oA = osc('sawtooth', rnd(230, 260), tt, tt + durA);
                oA.frequency.linearRampToValueAtTime(200, tt + durA);
                const bpA = filtro('bandpass', 800, 1.5);
                const gA = ctx.createGain();
                env(gA.gain, tt, 0.24, 0.03, durA, 0.12);
                oA.connect(bpA).connect(gA).connect(out);
                tt += durA + 0.05;
            }
            return tt - t;
        },
        garza(t, out) {
            const dur = rnd(0.3, 0.42);
            const o = osc('sawtooth', rnd(170, 200), t, t + dur);
            o.frequency.linearRampToValueAtTime(140, t + dur);
            const r = ruidoCorto();
            const bp = filtro('bandpass', 700, 1.5);
            const g = ctx.createGain();
            env(g.gain, t, 0.22, 0.015, dur, 0.15);
            const rg = ctx.createGain();
            rg.gain.value = 0.35;
            o.connect(bp);
            r.connect(rg).connect(bp);
            bp.connect(g).connect(out);
            r.start(t);
            r.stop(t + dur + 0.05);
            return dur;
        },
        grillo(t, out) {
            const trinos = Math.floor(rnd(2, 5));
            const f = rnd(4200, 5200);
            let tt = t;
            for (let i = 0; i < trinos; i++) {
                const dur = rnd(0.12, 0.2);
                const o = osc('sine', f, tt, tt + dur);
                const am = osc('square', rnd(28, 40), tt, tt + dur);
                const amg = ctx.createGain();
                amg.gain.value = 0.5;
                // 0.5 ± 0.5 con onda cuadrada: corta el tono en pulsos (el "cri-cri").
                const g = ctx.createGain();
                g.gain.value = 0.5;
                const env2 = ctx.createGain();
                env(env2.gain, tt, 0.05, 0.01, dur, 0.04);
                am.connect(amg).connect(g.gain);
                o.connect(g).connect(env2).connect(out);
                tt += dur + rnd(0.15, 0.35);
            }
            return tt - t;
        },
    };

    // ---------- Elegir qué animal suena ----------
    function candidatos() {
        let lista = [];
        try { lista = animales() || []; } catch (e) { lista = []; }
        const porVoz = {};
        lista.forEach((a) => {
            const voz = VOZ_DE[a.nombre];
            if (!voz) return;
            (porVoz[voz] = porVoz[voz] || []).push(a.o);
        });
        // Los grillos no tienen modelo: siempre pueden sonar, sin lugar fijo.
        porVoz.grillo = [null];
        if (Object.keys(porVoz).length === 1) {
            // Sin datos del mapa: un ambiente de campo genérico.
            ['pajaro', 'gallina', 'oveja', 'vaca', 'pato'].forEach((v) => { porVoz[v] = [null]; });
        }
        return porVoz;
    }

    function sortear(porVoz) {
        const voces = Object.keys(porVoz);
        const total = voces.reduce((s, v) => s + (PESO[v] || 1), 0);
        let r = Math.random() * total;
        for (const v of voces) {
            r -= PESO[v] || 1;
            if (r <= 0) return v;
        }
        return voces[0];
    }

    function sonarAnimal() {
        if (!ctx || pausado || ctx.state !== 'running' || voces >= MAX_VOCES) return;
        const porVoz = candidatos();
        const voz = sortear(porVoz);
        // Prefiere un ejemplar cercano a la cámara; si no, uno cualquiera.
        const ejemplares = porVoz[voz].map((o) => ({ o, ...ubicar(o) }));
        ejemplares.sort((a, b) => (a.dist || 999) - (b.dist || 999));
        const cerca = ejemplares.filter((e) => !e.dist || e.dist < 70);
        const quien = cerca.length && Math.random() < 0.75 ? elegir(cerca) : elegir(ejemplares);
        const nivel = voz === 'grillo' ? rnd(0.4, 0.7) : quien.gan;
        const out = salida(voz === 'grillo' ? rnd(-0.8, 0.8) : quien.pan, nivel);
        let dur = 1;
        try { dur = SINTE[voz](ctx.currentTime + 0.05, out); } catch (e) { console.warn('[ambiente]', voz, e); }
        voces += 1;
        setTimeout(() => {
            voces = Math.max(0, voces - 1);
            try { out.disconnect(); } catch (e) { /* noop */ }
        }, (dur + 0.6) * 1000);
    }

    function programarAnimal(seg) {
        clearTimeout(timerAnimal);
        if (destruido) return;
        timerAnimal = setTimeout(() => {
            sonarAnimal();
            // A veces un pájaro contesta enseguida; si no, una pausa natural.
            programarAnimal(Math.random() < 0.25 ? rnd(0.4, 1.2) : rnd(2, 5.5));
        }, seg * 1000);
    }

    // ---------- API ----------
    return {
        // Se llama en cada cuadro: guarda la cámara y baja el ambiente si hablan.
        actualizar(camera, hablando) {
            camara = camera || camara;
            const objetivo = hablando ? DUCK_HABLANDO : 1;
            if (objetivo === duck) return;
            duck = objetivo;
            if (ctx && master && !pausado) {
                master.gain.setTargetAtTime(VOLUMEN * duck, ctx.currentTime, hablando ? 0.25 : 1.2);
            }
        },
        // Al entrar a una experiencia: silencio (la experiencia tiene su audio).
        pausar() {
            pausado = true;
            if (!ctx || !master) return;
            master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
            setTimeout(() => {
                if (pausado && ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
            }, 900);
        },
        reanudar() {
            if (!pausado) return;
            pausado = false;
            arrancar();
        },
        destruir() {
            destruido = true;
            clearTimeout(timerAnimal);
            clearTimeout(timerRafaga);
            ['pointerdown', 'touchend', 'keydown'].forEach((ev) => document.removeEventListener(ev, alGesto, true));
            document.removeEventListener('visibilitychange', alVisibilidad);
            if (ctx) {
                const c = ctx;
                ctx = null;
                try { master.gain.setTargetAtTime(0, c.currentTime, 0.15); } catch (e) { /* noop */ }
                setTimeout(() => { c.close().catch(() => {}); }, 500);
            }
        },
    };
}
