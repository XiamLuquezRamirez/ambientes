/**
 * recorrido-camino-3d.js — Camino lineal del kiosco en 3D (Three.js).
 *
 * Reemplaza visualmente al mapa 2D (recorrido-camino.js) pero conserva EXACTAMENTE
 * la misma lógica del kiosco:
 *   - Lee #rn-camino (paradas de la Clase del docente: modulo→eje→tematica→info→experiencia).
 *   - Expone window.KioscoCamino.boot(ctx) con la misma firma; el kiosco no cambia.
 *   - Reusa los modales del kiosco: #rnCaminoModal (info/video) y el player VistaNino
 *     (experiencia real). NO duplica esa lógica.
 *   - Al LLEGAR a cada estación abre el modal automáticamente (video en modulo/eje si
 *     lo hay; la experiencia en su modal). Al cerrarlo se resalta la siguiente parada.
 *
 * Three.js se carga como módulo ES (importmap en el layout). Este archivo se carga
 * como <script type="module">.
 */
import * as THREE from 'three';

(function () {
    'use strict';

    // ---- Estado (misma semántica que recorrido-camino.js) ----
    let ctx = {};
    let camino = { paradas: [], puntos: [] };
    let indiceActual = 0;
    let indiceMaximoVisitado = 0;
    let caminando = false;
    let recorridoIniciado = false;
    let experienciaCargada = false;
    let indiceModal = null;

    // ---- Three.js refs ----
    let renderer, scene, camera, curva, personaje, cuerpo, sol;
    let brazoIzq, brazoDer, pieIzq, pieDer, boca, cabeza, piernaIzq, piernaDer;
    let estaciones = [], progresoMesh = null;
    let lagoCentro = null, lagoRadio = 8; // zona del lago a evitar por la vegetación
    let nubes = []; // nubes del cielo (se mueven en el loop)
    let ultimoNow = 0; // timestamp previo del loop (para delta time)
    let colorAmbiente = new THREE.Color('#0ea5e9');
    let rafId = null;
    let N = 0;

    const $ = window.jQuery;

    function escapar(s) {
        return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ===================== Voz de niño (Web Speech API) =====================
    // No hay voz "infantil" nativa; se simula con una voz española y un pitch
    // alto (agudo) + velocidad algo más lenta, que suena a vocecita de niño.
    let vozNino = null, vozLista = false;
    function prepararVoz() {
        if (!('speechSynthesis' in window)) return;
        const elegir = () => {
            const vs = speechSynthesis.getVoices();
            if (!vs.length) return;
            const es = vs.filter(v => /^es/i.test(v.lang));
            // preferir femenina (más creíble como niño al subir el tono)
            vozNino = es.find(v => /helena|laura|sabina|paulina|mónica|monica|female|mujer/i.test(v.name))
                   || es[0] || vs.find(v => v.default) || vs[0];
            vozLista = true;
        };
        elegir();
        if (!vozLista) speechSynthesis.onvoiceschanged = elegir;
    }
    function hablar(texto, alTerminar) {
        if (!('speechSynthesis' in window) || !texto) { if (alTerminar) alTerminar(); return; }
        try {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(texto);
            if (vozNino) u.voice = vozNino;
            u.lang = (vozNino && vozNino.lang) || 'es-ES';
            u.pitch = 2.0;   // tono MUY agudo → vocecita de niño (máximo de la API)
            u.rate = 0.80;   // más lento, muy claro para primera infancia
            u.volume = 1;
            if (alTerminar) { u.onend = alTerminar; u.onerror = alTerminar; }
            speechSynthesis.speak(u);
        } catch (e) { if (alTerminar) alTerminar(); }
    }

    // Label de una parada: "N. Nombre real" (ej. "1. Exploro mi cuerpo").
    // El conteo empieza en MÓDULO = 1 (inicio no cuenta). inicio/fin sin número.
    function etiquetaParada(par, i) {
        if (par.id === 'inicio' || par.id === 'fin') return (par.etiqueta || par.titulo || '');
        return i + '. ' + (par.titulo || par.etiqueta || '');   // módulo(idx1)→"1", eje(idx2)→"2"...
    }
    // Número que va dentro del medallón 3D.
    function numeroParada(par, i) {
        if (par.id === 'inicio') return '▶';
        if (par.id === 'fin') return '★';
        return String(i);   // módulo=1, eje=2, temática=3, experiencia=4
    }

    // ===================== Ruido fractal (terreno) =====================
    function hash(x, y) { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
    function suavizar(t) { return t * t * (3 - 2 * t); }
    function ruido(x, y) {
        const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
        const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
        const u = suavizar(xf), v = suavizar(yf);
        return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    }
    function ruidoFractal(x, y) {
        let val = 0, amp = 1, frec = 1, norm = 0;
        for (let o = 0; o < 4; o++) { val += ruido(x * frec, y * frec) * amp; norm += amp; amp *= 0.5; frec *= 2; }
        return val / norm;
    }

    // ===================== Construcción de la escena =====================
    const ALTURA_MAX = 9, ANCHO_CAMINO = 4, ZONA_LIMPIA = 9.5, TAM = 140, SEG = 90;

    function alturaBase(x, z) { return (ruidoFractal(x * 0.035 + 10, z * 0.035 + 10) - 0.35) * ALTURA_MAX; }
    function distanciaAlCamino(x, z) {
        let min = Infinity;
        for (let i = 0; i <= 120; i++) {
            const p = curva.getPoint(i / 120), dx = p.x - x, dz = p.z - z, d = dx * dx + dz * dz;
            if (d < min) min = d;
        }
        return Math.sqrt(min);
    }
    // La zona plana (Y=0) debe cubrir TODO el ancho del sendero + borde + halo
    // (ANCHO_CAMINO + 3.6). Si no, el pasto con relieve tapa la carretera.
    // También se aplana el disco del lago para que no salga "incompleto"
    // (las lomas lo enterraban por un lado).
    function alturaTerreno(x, z) {
        const d = distanciaAlCamino(x, z);
        const PLANO = ANCHO_CAMINO + 4.2;      // borde exterior del camino
        if (d < PLANO) return 0;
        // zona plana del lago (radio un poco mayor que la orilla)
        if (lagoCentro) {
            const dl = Math.hypot(x - lagoCentro.x, z - lagoCentro.z);
            const PLANO_LAGO = 8.4;
            if (dl < PLANO_LAGO) return 0;
            const tl = Math.min(1, (dl - PLANO_LAGO) / 10);
            const base = alturaBase(x, z) * suavizar(tl);
            const t = Math.min(1, (d - PLANO) / 12);
            return base * suavizar(t);
        }
        const t = Math.min(1, (d - PLANO) / 12);
        return alturaBase(x, z) * suavizar(t);
    }

    // Define el centro del lago (junto al tramo u=0.42) ANTES de construir el
    // terreno, para que su zona quede aplanada y el lago no salga incompleto.
    function calcularLagoCentro() {
        const pl = curva.getPoint(0.42), tl = curva.getTangent(0.42).normalize();
        const nl = new THREE.Vector3(-tl.z, 0, tl.x).normalize();
        lagoCentro = pl.clone().addScaledVector(nl, ZONA_LIMPIA + 3.5);
    }

    function construirCurva() {
        const pts = [];
        for (let i = 0; i < N; i++) {
            const t = i / (N - 1);
            const x = (t - 0.5) * 90;
            // Amplitud menor y frecuencia más baja: curvas más abiertas cuyo radio
            // supera el ancho del camino, evitando que los bordes se auto-intersequen
            // (eso producía el "abanico" de líneas negras donde asomaba el suelo).
            const z = Math.sin(t * Math.PI * 2.0) * 11;
            pts.push(new THREE.Vector3(x, 0, z));
        }
        curva = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    }

    function construirTerreno() {
        // El terreno se hace MÁS GRANDE que TAM para que el suelo verde llegue
        // hasta detrás del anillo de montañas (que está a radio TAM*0.62 + base);
        // así ninguna montaña queda flotando sobre el azul del fondo.
        const TAM_TERRENO = TAM * 1.7, SEG_TERRENO = Math.round(SEG * 1.7);
        const geo = new THREE.PlaneGeometry(TAM_TERRENO, TAM_TERRENO, SEG_TERRENO, SEG_TERRENO);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position, cols = [];
        // Paleta plana tipo ilustración de cuento: verde vivo y luminoso, muy
        // uniforme (poca variación entre valle y loma) para el look pastel plano.
        const cVerdeBajo = new THREE.Color('#8bc34a'), cVerdeAlto = new THREE.Color('#a5d165');
        const cTierra = new THREE.Color('#9ecb58'), cRoca = new THREE.Color('#b3d977');
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i), y = alturaTerreno(x, z);
            pos.setY(i, y);
            let c; const h = y / ALTURA_MAX;
            if (h < 0.05) c = cVerdeBajo;
            else if (h < 0.4) c = cVerdeBajo.clone().lerp(cVerdeAlto, h / 0.4);
            else if (h < 0.7) c = cVerdeAlto.clone().lerp(cTierra, (h - 0.4) / 0.3);
            else c = cTierra.clone().lerp(cRoca, (h - 0.7) / 0.3);
            cols.push(c.r, c.g, c.b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
        mesh.receiveShadow = true;
        scene.add(mesh);
    }

    function construirCalzada(hasta01, ancho, alturaY) {
        ancho = ancho || ANCHO_CAMINO;
        alturaY = (alturaY === undefined) ? 0.05 : alturaY;
        const M = 200, verts = [], idx = [], uvs = [];
        const hastaIdx = Math.floor(M * hasta01);
        for (let i = 0; i <= hastaIdx; i++) {
            const u = i / M, p = curva.getPoint(u), tang = curva.getTangent(u).normalize();
            const normal = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
            const izq = p.clone().addScaledVector(normal, ancho);
            const der = p.clone().addScaledVector(normal, -ancho);
            verts.push(izq.x, alturaY, izq.z); verts.push(der.x, alturaY, der.z);
            uvs.push(0, u * 20); uvs.push(1, u * 20);
        }
        for (let i = 0; i < hastaIdx; i++) {
            const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
            idx.push(a, b, c, b, d, c);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        g.setIndex(idx); g.computeVertexNormals();
        return g;
    }

    // Textura de tierra ESTILO ILUSTRACIÓN PLANA (tipo mapa de cuento): base clara
    // y uniforme, con motas y rodadas MUY sutiles. Sin piedras ni brillos marcados,
    // para bajar la intensidad y que se lea como un dibujo, no como tierra realista.
    function texturaTierra(base, moteado, opts) {
        opts = opts || {};
        const c = document.createElement('canvas'); c.width = c.height = 512;
        const g = c.getContext('2d');
        g.fillStyle = base; g.fillRect(0, 0, 512, 512);

        // rodadas suaves: dos bandas apenas insinuadas, sin canal oscuro fuerte
        if (opts.rodadas) {
            [180, 332].forEach(cx => {
                const gr = g.createLinearGradient(cx - 40, 0, cx + 40, 0);
                gr.addColorStop(0, 'rgba(255,255,255,0)');
                gr.addColorStop(0.5, 'rgba(150,120,70,.14)');
                gr.addColorStop(1, 'rgba(255,255,255,0)');
                g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(cx - 40, 0, 80, 512);
            });
        }

        // motas orgánicas escasas y tenues (solo para que no sea 100% plano)
        for (let i = 0; i < 420; i++) {
            const x = Math.random() * 512, y = Math.random() * 512, r = Math.random() * 6 + 1.5;
            g.fillStyle = moteado[(Math.random() * moteado.length) | 0];
            g.globalAlpha = 0.06 + Math.random() * 0.12;
            g.beginPath(); g.ellipse(x, y, r, r * (0.6 + Math.random() * 0.5), Math.random() * 6, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1;
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 8;
        return tex;
    }

    // polygonOffset empuja el polígono en el z-buffer para que gane SIEMPRE el
    // test de profundidad contra el terreno y contra las capas de abajo, sin
    // z-fighting (las líneas negras que aparecían al ras del suelo). Cada capa
    // superior recibe un offset mayor (más negativo) que la de abajo.
    function matSuelo(params, orden) {
        params.side = THREE.DoubleSide; // red de seguridad: sin backfaces negros si un triángulo se invierte
        const m = new THREE.MeshStandardMaterial(params);
        m.polygonOffset = true;
        m.polygonOffsetFactor = -1 - orden;   // -1, -2, -3, -4
        m.polygonOffsetUnits = -2 - orden * 2; // -2, -4, -6, -8
        return m;
    }

    function construirCarretera() {
        // Estilo ILUSTRACIÓN PLANA (mapa de cuento): el camino es una banda de arena
        // lisa con un borde dorado suave que se difumina hacia el verde. Sin piedras,
        // sin huellas marcadas, sin capas oscuras: baja intensidad, look de dibujo.

        // CAPA 0 — borde de tierra oscura (más ancho): transición café→pasto.
        const texBorde = texturaTierra('#7a4a28', ['#8a5732', '#6b3f22']);
        texBorde.repeat.set(1, 12);
        const matBorde = matSuelo({ map: texBorde, roughness: 1 }, 0);
        const borde = new THREE.Mesh(construirCalzada(1, ANCHO_CAMINO + 2.0, 0.04), matBorde);
        borde.receiveShadow = true; scene.add(borde);

        // CAPA 1 — sendero de TIERRA CAFÉ/MARRÓN, protagonista, con rodadas sutiles.
        const texCamino = texturaTierra('#9c6238', ['#ac7043', '#8a5530', '#b57c4c'], { rodadas: true });
        texCamino.repeat.set(1, 10);
        const matTierra = matSuelo({ map: texCamino, roughness: 1 }, 1);
        const calzada = new THREE.Mesh(construirCalzada(1, ANCHO_CAMINO + 1.4, 0.12), matTierra);
        calzada.receiveShadow = true; scene.add(calzada);

        // Progreso: mismo sendero, café un poco más cálido/claro (recorrido hecho).
        const texProg = texturaTierra('#a86e40', ['#ba7f4d', '#996036']);
        texProg.repeat.set(1, 12);
        const matProg = matSuelo({ map: texProg, roughness: 1, emissive: new THREE.Color('#5a3418'), emissiveIntensity: 0.08 }, 2);
        progresoMesh = new THREE.Mesh(construirCalzada(0.0001, ANCHO_CAMINO + 1.4, 0.14), matProg);
        progresoMesh.position.y = 0; progresoMesh.userData.mat = matProg;
        scene.add(progresoMesh);

        // Piedritas a ambos lados del sendero (estilo low-poly plano), justo en el
        // borde exterior del camino, para delimitarlo como sendero de cuento.
        const geoPiedra = new THREE.DodecahedronGeometry(0.4, 0);
        const colPiedra = ['#b7ad9c', '#a89c88', '#c4bbab'];
        for (let i = 0; i < 46; i++) {
            const u = i / 46, p = curva.getPoint(u), tang = curva.getTangent(u).normalize();
            const normal = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
            [1, -1].forEach(lado => {
                if (Math.random() < 0.4) return; // no en todos, para que sea natural
                const piedra = new THREE.Mesh(geoPiedra, new THREE.MeshStandardMaterial({
                    color: colPiedra[(Math.random() * colPiedra.length) | 0], roughness: 1, flatShading: true }));
                const desv = (Math.random() - 0.5) * 0.6; // pequeña variación lateral
                piedra.position.copy(p).addScaledVector(normal, lado * (ANCHO_CAMINO + 2.0 + desv));
                piedra.position.y = 0.16; piedra.rotation.set(Math.random(), Math.random(), Math.random());
                piedra.scale.setScalar(0.45 + Math.random() * 0.6);
                piedra.castShadow = true; piedra.receiveShadow = false; // receiveShadow=false evita shadow-acne
                scene.add(piedra);
            });
        }
    }

    function actualizarProgreso() {
        const mat = progresoMesh.userData.mat;
        const hasta = indiceMaximoVisitado / (N - 1);
        scene.remove(progresoMesh);
        progresoMesh.geometry.dispose();
        progresoMesh = new THREE.Mesh(construirCalzada(Math.max(0.0001, hasta), ANCHO_CAMINO + 1.4, 0.16), mat);
        progresoMesh.position.y = 0; progresoMesh.userData.mat = mat;
        if (indiceMaximoVisitado > 0) scene.add(progresoMesh);
    }

    // Textura del cartel: círculo de color con el número/símbolo y un aro blanco.
    function texturaCartel(texto, colorFondo, colorBorde) {
        const c = document.createElement('canvas'); c.width = c.height = 256;
        const g = c.getContext('2d');
        g.clearRect(0, 0, 256, 256);
        // aro exterior
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
        // borde de color
        g.fillStyle = colorBorde; g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.fill();
        // disco de color
        g.fillStyle = colorFondo; g.beginPath(); g.arc(128, 128, 96, 0, Math.PI * 2); g.fill();
        // brillo superior
        const grad = g.createRadialGradient(96, 84, 8, 128, 128, 110);
        grad.addColorStop(0, 'rgba(255,255,255,.55)'); grad.addColorStop(.5, 'rgba(255,255,255,0)');
        g.fillStyle = grad; g.beginPath(); g.arc(128, 128, 96, 0, Math.PI * 2); g.fill();
        // número
        g.font = 'bold 150px "Fredoka One", system-ui, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = '#ffffff'; g.strokeStyle = colorBorde; g.lineWidth = 8;
        g.strokeText(texto, 128, 140); g.fillText(texto, 128, 140);
        const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8;
        return tex;
    }

    function construirEstaciones() {
        estaciones = [];
        const grupo = new THREE.Group(); scene.add(grupo);
        const matMadera = new THREE.MeshStandardMaterial({ color: '#8a5a2b', roughness: .9, flatShading: true });
        camino.paradas.forEach((par, i) => {
            const p = curva.getPoint(i / (N - 1));
            const g = new THREE.Group(); g.position.set(p.x, 0, p.z);

            // poste de madera (cilindro liso). Sin base cónica (causaba artefactos
            // de líneas en la estación activa por las aristas rasantes al suelo).
            const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3, 12), matMadera);
            poste.position.y = 1.5; poste.castShadow = true; g.add(poste);

            const colorMed = par.id === 'inicio' ? '#facc15' : (par.id === 'fin' ? '#ec4899' : '#f59e0b');
            const colorBorde = par.id === 'inicio' ? '#a16207' : (par.id === 'fin' ? '#9d174d' : '#b45309');

            // cartel: plano circular con el número, siempre de cara a la cámara (billboard)
            const texCartel = texturaCartel(numeroParada(par, i), colorMed, colorBorde);
            const matCartel = new THREE.MeshBasicMaterial({ map: texCartel, transparent: true, depthWrite: true });
            const medallon = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), matCartel);
            medallon.position.y = 3.4; medallon.userData.baseY = 3.4;
            medallon.castShadow = false; medallon.receiveShadow = false;
            g.add(medallon);

            // aro luminoso para la estación siguiente
            const aro = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.13, 12, 32),
                new THREE.MeshBasicMaterial({ color: '#fde047' }));
            aro.position.y = 3.4; aro.visible = false; g.add(aro);

            // En la parada de INICIO el niño está de pie ahí mismo: ocultamos su
            // poste y medallón para que no le tapen la cara.
            if (par.id === 'inicio') { poste.visible = false; medallon.visible = false; }

            grupo.add(g);
            estaciones.push({ grupo: g, medallon, aro, parada: par, indice: i, colorBase: colorMed, colorBorde });
        });
    }

    function construirVegetacion() {
        const grupo = new THREE.Group(); scene.add(grupo);
        const tonos = ['#3f7a4b', '#4b8c57', '#356b41', '#5a9c63', '#2f6b3f'];
        // lagoCentro ya fue definido en calcularLagoCentro() (antes del terreno).
        if (!lagoCentro) calcularLagoCentro();
        // pino cónico (2-3 capas)
        function pino(x, y, z, tint) {
            const g = new THREE.Group();
            const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.4, 6),
                new THREE.MeshStandardMaterial({ color: '#6b4f2a', roughness: 1, flatShading: true }));
            tronco.position.y = 0.7; tronco.castShadow = true; g.add(tronco);
            const capas = 2 + (Math.random() * 2 | 0);
            for (let c = 0; c < capas; c++) {
                const copa = new THREE.Mesh(new THREE.ConeGeometry(1.5 - c * 0.35, 1.6, 7),
                    new THREE.MeshStandardMaterial({ color: tint, roughness: 1, flatShading: true }));
                copa.position.y = 1.9 + c * 1.0; copa.castShadow = true; g.add(copa);
            }
            g.position.set(x, y, z); g.scale.setScalar(0.7 + Math.random() * 0.8); return g;
        }
        // árbol de copa redonda
        function frondoso(x, y, z, tint) {
            const g = new THREE.Group();
            const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.6, 6),
                new THREE.MeshStandardMaterial({ color: '#7a5a30', roughness: 1, flatShading: true }));
            tronco.position.y = 0.8; tronco.castShadow = true; g.add(tronco);
            const copa = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1),
                new THREE.MeshStandardMaterial({ color: tint, roughness: 1, flatShading: true }));
            copa.position.y = 2.6; copa.castShadow = true; copa.scale.y = 0.9; g.add(copa);
            g.position.set(x, y, z); g.scale.setScalar(0.7 + Math.random() * 0.7); return g;
        }
        function arbusto(x, y, z, tint) {
            const g = new THREE.Group();
            for (let b = 0; b < 3; b++) {
                const bola = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.3, 0),
                    new THREE.MeshStandardMaterial({ color: tint, roughness: 1, flatShading: true }));
                bola.position.set((Math.random() - .5) * 0.7, 0.4 + Math.random() * 0.2, (Math.random() - .5) * 0.7);
                bola.castShadow = true; g.add(bola);
            }
            g.position.set(x, y, z); return g;
        }
        function flor(x, y, z) {
            const g = new THREE.Group();
            const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4),
                new THREE.MeshStandardMaterial({ color: '#3f7a4b' }));
            tallo.position.y = 0.25; g.add(tallo);
            const colFlor = ['#f87171', '#fbbf24', '#f472b6', '#a78bfa', '#60a5fa'][Math.random() * 5 | 0];
            const petalos = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0),
                new THREE.MeshStandardMaterial({ color: colFlor, roughness: .7 }));
            petalos.position.y = 0.55; g.add(petalos);
            g.position.set(x, y, z); return g;
        }
        function roca(x, y, z) {
            const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + Math.random() * 0.6, 0),
                new THREE.MeshStandardMaterial({ color: '#8a8175', roughness: 1, flatShading: true }));
            m.position.set(x, y + 0.3, z); m.rotation.set(Math.random(), Math.random(), Math.random());
            m.castShadow = true; m.receiveShadow = true; return m;
        }
        let intentos = 0, colocados = 0;
        while (colocados < 130 && intentos < 1400) {
            intentos++;
            const x = (Math.random() - 0.5) * TAM * 0.92, z = (Math.random() - 0.5) * TAM * 0.92;
            const d = distanciaAlCamino(x, z);
            if (d < ZONA_LIMPIA) continue;
            // no invadir el lago
            if (lagoCentro && Math.hypot(x - lagoCentro.x, z - lagoCentro.z) < lagoRadio) continue;
            const y = alturaTerreno(x, z);
            const tint = tonos[(Math.random() * tonos.length) | 0];
            const r = Math.random();
            let obj;
            if (r < 0.42) obj = pino(x, y, z, tint);
            else if (r < 0.62) obj = frondoso(x, y, z, tint);
            else if (r < 0.78) obj = arbusto(x, y, z, tint);
            else if (r < 0.90) obj = flor(x, y, z);      // flores pueden acercarse un poco más
            else obj = roca(x, y, z);
            grupo.add(obj); colocados++;
        }

        // Montañas lejanas en el horizonte (anillo de conos grandes, sin sombra)
        const matMonte = new THREE.MeshStandardMaterial({ color: '#5b7c6a', roughness: 1, flatShading: true });
        const matNieve = new THREE.MeshStandardMaterial({ color: '#e8eef2', roughness: 1, flatShading: true });
        const nMontes = 14, R = TAM * 0.62;
        for (let i = 0; i < nMontes; i++) {
            const ang = (i / nMontes) * Math.PI * 2 + Math.random() * 0.2;
            const mx = Math.cos(ang) * R, mz = Math.sin(ang) * R;
            const h = 16 + Math.random() * 14;
            const monte = new THREE.Mesh(new THREE.ConeGeometry(9 + Math.random() * 5, h, 6), matMonte);
            monte.position.set(mx, h / 2 - 2, mz); monte.rotation.y = Math.random(); grupo.add(monte);
            const nieve = new THREE.Mesh(new THREE.ConeGeometry(3.2, h * 0.28, 6), matNieve);
            nieve.position.set(mx, h - h * 0.14 - 2, mz); nieve.rotation.y = monte.rotation.y; grupo.add(nieve);
        }

        construirLago(grupo);
    }

    // Lago/estanque azul decorativo, plano, junto al recorrido en una zona visible.
    function construirLago(grupo) {
        const centro = lagoCentro || curva.getPoint(0.5);
        const lago = new THREE.Group();
        lago.position.set(centro.x, 0, centro.z);

        // Orilla (tierra/arena húmeda) — anillo más grande bajo el agua.
        const orilla = new THREE.Mesh(new THREE.CircleGeometry(7.4, 40),
            (function () { const m = new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 1 });
                m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -2; return m; })());
        orilla.rotation.x = -Math.PI / 2; orilla.position.y = 0.05; orilla.scale.set(1, 0.72, 1);
        orilla.receiveShadow = true; lago.add(orilla);

        // Agua — dos anillos: azul claro exterior y azul más vivo interior.
        function agua(radio, color, y, offset) {
            const m = new THREE.MeshStandardMaterial({
                color, roughness: 0.25, metalness: 0.0,
                emissive: new THREE.Color(color), emissiveIntensity: 0.18 });
            m.polygonOffset = true; m.polygonOffsetFactor = -2 - offset; m.polygonOffsetUnits = -4 - offset * 2;
            const malla = new THREE.Mesh(new THREE.CircleGeometry(radio, 40), m);
            malla.rotation.x = -Math.PI / 2; malla.position.y = y; malla.scale.set(1, 0.72, 1);
            return malla;
        }
        lago.add(agua(6.4, '#5fb3e6', 0.08, 0));  // agua exterior (más clara)
        lago.add(agua(4.6, '#3f9fe0', 0.10, 1));  // centro (más profundo/vivo)

        // Brillo/reflejo: media luna clara en un borde.
        const brillo = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24),
            (function () { const m = new THREE.MeshBasicMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.35, depthWrite: false });
                return m; })());
        brillo.rotation.x = -Math.PI / 2; brillo.position.set(-2.0, 0.12, -1.4); brillo.scale.set(1, 0.5, 1);
        lago.add(brillo);

        grupo.add(lago);
    }

    // Nubes low-poly (grupos de esferas blancas achatadas) flotando en el cielo.
    // Se desplazan lentamente en el loop (animarNubes) y reaparecen por el otro lado.
    function construirNubes() {
        nubes = [];
        const grupo = new THREE.Group(); scene.add(grupo);
        const matNube = new THREE.MeshStandardMaterial({
            color: 0xffffff, roughness: 1, flatShading: true,
            transparent: true, opacity: 0.95 });
        const N_NUBES = 10;
        for (let i = 0; i < N_NUBES; i++) {
            const nube = new THREE.Group();
            const bolas = 3 + (Math.random() * 3 | 0);
            for (let b = 0; b < bolas; b++) {
                const r = 1.4 + Math.random() * 1.6;   // esferas más pequeñas
                const bola = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), matNube);
                bola.position.set((b - bolas / 2) * 1.9 + (Math.random() - .5) * 1.1,
                                  (Math.random() - .5) * 0.9, (Math.random() - .5) * 1.6);
                bola.scale.y = 0.6; // achatada
                nube.add(bola);
            }
            const escala = 0.55 + Math.random() * 0.6;  // nubes pequeñas
            nube.scale.setScalar(escala);
            // Visibles en el cielo del FONDO (hacia el horizonte, Z negativo, donde
            // mira la cámara) y a media altura para que se vean, pero SIEMPRE detrás
            // del recorrido para no cruzar por delante del personaje/carretera.
            nube.position.set((Math.random() - 0.5) * TAM * 1.0,
                              16 + Math.random() * 12,                    // altura visible
                              -TAM * 0.30 - Math.random() * TAM * 0.30);  // al fondo (lejos, detrás)
            grupo.add(nube);
            // velocidad de deriva (unidades/seg) — lenta y variada
            nubes.push({ obj: nube, vel: 1.0 + Math.random() * 1.6 });
        }
    }
    // Mueve las nubes y las hace reaparecer por el lado opuesto (bucle infinito).
    function animarNubes(dtSeg) {
        const limite = TAM * 0.6;
        for (const n of nubes) {
            n.obj.position.x += n.vel * dtSeg;
            if (n.obj.position.x > limite) n.obj.position.x = -limite;
        }
    }

    // Niño low-poly: pelo castaño, polo azul, mochila roja, shorts rojos, tenis.
    // Conserva las refs que anima el loop (cuerpo, brazoIzq/Der, pieIzq/Der) y
    // añade boca + cabeza + piernas para gesticular al hablar y caminar.
    function construirPersonaje() {
        personaje = new THREE.Group();
        const cPiel = '#ffcfa3', cPelo = '#6b4423', cPolo = '#4f7bd0', cShort = '#b23a2d',
              cTenis = '#d4d8de', cMochila = '#c23e30';
        const mat = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r === undefined ? .6 : r, flatShading: true });
        // piel de la cara con emisivo alto para que NUNCA se apague en sombra
        // (el sol viene de atrás y dejaba la cara oscura).
        const matPielCara = new THREE.MeshStandardMaterial({ color: cPiel, roughness: .9, flatShading: false, emissive: new THREE.Color('#c98d5e'), emissiveIntensity: 0.5 });

        // sombra falsa (disco oscuro plano) bajo el personaje
        const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.85, 24),
            new THREE.MeshBasicMaterial({ color: 0x1a2e1a, transparent: true, opacity: 0.22, depthWrite: false }));
        sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.06; personaje.add(sombra);

        // ---- PIERNAS (shorts + piernas) — pivotan desde la cadera para caminar ----
        const matShort = mat(cShort, .8), matPiel = mat(cPiel, .8);
        function pierna(signo) {
            const g = new THREE.Group(); g.position.set(0.3 * signo, 0.95, 0);
            const short = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.35, 4, 8), matShort);
            short.position.y = -0.1; g.add(short);
            const espinilla = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.5, 8), matPiel);
            espinilla.position.y = -0.55; g.add(espinilla);
            return g;
        }
        piernaIzq = pierna(-1); personaje.add(piernaIzq);
        piernaDer = pierna(1);  personaje.add(piernaDer);
        // tenis (referenciados como pieIzq/Der para la animación de pasos)
        const matTenis = mat(cTenis, .5), matSuela = mat('#7a7f88', .6);
        function tenis() {
            const g = new THREE.Group();
            const z = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.5), matTenis); z.position.z = 0.08; g.add(z);
            const s = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.54), matSuela); s.position.set(0, -0.11, 0.1); g.add(s);
            return g;
        }
        pieIzq = tenis(); pieIzq.position.set(-0.3, 0.24, 0.05); personaje.add(pieIzq);
        pieDer = tenis(); pieDer.position.set(0.3, 0.24, 0.05); personaje.add(pieDer);

        // ---- TORSO (polo azul) — es "cuerpo" para el idle de respiración ----
        cuerpo = new THREE.Group(); cuerpo.position.y = 1.55; personaje.add(cuerpo);
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.5, 6, 12), mat(cPolo, .55));
        torso.scale.set(1.05, 1, 0.8); cuerpo.add(torso);
        // cuellito del polo
        const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.12, 10), mat('#ffffff', .5));
        cuello.position.y = 0.42; cuerpo.add(cuello);

        // ---- MOCHILA roja (a la espalda) ----
        const mochila = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.28), mat(cMochila, .6));
        mochila.position.set(0, 1.55, -0.42); mochila.castShadow = true; personaje.add(mochila);
        [-0.22, 0.22].forEach(dx => { // tirantes
            const t = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.06), mat(cMochila, .6));
            t.position.set(dx, 1.6, 0.34); personaje.add(t);
        });

        // ---- BRAZOS (piel) — pivotan desde el hombro para balancear al caminar ----
        function brazo(signo) {
            const g = new THREE.Group(); g.position.set(0.5 * signo, 1.9, 0);
            const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.55, 4, 8), matPiel);
            b.position.y = -0.32; g.add(b);
            const mano = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), matPiel);
            mano.position.y = -0.62; g.add(mano);
            return g;
        }
        brazoIzq = brazo(-1); personaje.add(brazoIzq);
        brazoDer = brazo(1);  personaje.add(brazoDer);

        // ---- CABEZA (piel) + pelo castaño + cara ----
        cabeza = new THREE.Group(); cabeza.position.y = 2.42; personaje.add(cabeza);
        const craneo = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 16), matPielCara);
        craneo.scale.set(1, 1.05, .95); cabeza.add(craneo);
        // orejas
        [-0.48, 0.48].forEach(dx => {
            const o = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), matPielCara);
            o.position.set(dx, 0, 0); cabeza.add(o);
        });
        // naricita
        const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), matPielCara);
        nariz.position.set(0, -0.04, 0.5); cabeza.add(nariz);
        // pelo castaño (casquete + mechón puntiagudo)
        const matPelo = mat(cPelo, .7);
        const pelo = new THREE.Mesh(new THREE.SphereGeometry(0.54, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), matPelo);
        pelo.position.y = 0.08; cabeza.add(pelo);
        for (let i = 0; i < 5; i++) { // mechones tipo púas
            const mech = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 5), matPelo);
            mech.position.set(-0.3 + i * 0.15, 0.42 + (i % 2) * 0.08, 0.05);
            mech.rotation.z = (i - 2) * 0.18; cabeza.add(mech);
        }
        // mejillas
        const matMejilla = new THREE.MeshStandardMaterial({ color: '#f2937a', roughness: .9, transparent: true, opacity: .55 });
        [-0.28, 0.28].forEach(dx => {
            const me = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), matMejilla);
            me.position.set(dx, -0.08, 0.44); cabeza.add(me);
        });
        // ojos (blanco + pupila + brillo)
        const matOjo = new THREE.MeshStandardMaterial({ color: '#fff', roughness: .3 });
        const matPup = new THREE.MeshStandardMaterial({ color: '#3a2415', roughness: .3 });
        [-0.19, 0.19].forEach(dx => {
            const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), matOjo);
            ojo.position.set(dx, 0.06, 0.4); ojo.scale.set(1, 1.15, .6); cabeza.add(ojo);
            const pup = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), matPup);
            pup.position.set(dx, 0.06, 0.5); cabeza.add(pup);
            const brillo = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), matOjo);
            brillo.position.set(dx + 0.03, 0.11, 0.55); cabeza.add(brillo);
            // cejas
            const ceja = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.04), matPelo);
            ceja.position.set(dx, 0.24, 0.42); cabeza.add(ceja);
        });
        // BOCA (se anima al hablar: escala en Y)
        boca = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10),
            new THREE.MeshStandardMaterial({ color: '#7a2e2e', roughness: .6 }));
        boca.position.set(0, -0.2, 0.44); boca.scale.set(1.3, 0.5, 0.5); cabeza.add(boca);

        personaje.scale.setScalar(1.5); // personaje más grande / protagonista
        scene.add(personaje);
        colocarPersonajeEn(0);
    }
    function colocarPersonajeEn(i) {
        const p = curva.getPoint(i / (N - 1));
        personaje.position.set(p.x, 0, p.z);
    }

    function construirLuces() {
        // Iluminación SUAVE tipo ilustración: sol tenue + mucha luz ambiental
        // hemisférica, para bajar el contraste y las sombras duras (look plano).
        sol = new THREE.DirectionalLight(0xfff4e0, 1.25);
        sol.position.set(-40, 60, 30); sol.castShadow = true;
        sol.shadow.mapSize.set(2048, 2048);
        sol.shadow.camera.left = -60; sol.shadow.camera.right = 60;
        sol.shadow.camera.top = 42; sol.shadow.camera.bottom = -42;
        sol.shadow.camera.near = 1; sol.shadow.camera.far = 220;
        sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.08; sol.shadow.radius = 4;
        scene.add(sol);
        // Hemisférica fuerte y clara: aplana el sombreado y da el aire pastel.
        scene.add(new THREE.HemisphereLight(0xeaf3ff, 0x9fc46a, 1.55));
        const relleno = new THREE.DirectionalLight(0xffffff, 0.25);
        relleno.position.set(40, 30, -30); scene.add(relleno);
    }

    function aplicarColorAmbiente() {
        // Cielo AZUL claro tipo ilustración: celeste vivo con un toque del color
        // del ambiente. La niebla, del mismo azul y lejana, funde el horizonte.
        const cielo = new THREE.Color('#7ec8f0')
            .lerp(colorAmbiente, 0.12).lerp(new THREE.Color('#ffffff'), 0.12);
        scene.background = cielo;
        scene.fog = new THREE.Fog(cielo.getHex(), 120, 230);
    }

    // ===================== Cámara =====================
    const camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
    function actualizarCamara(inmediato) {
        const p = personaje.position;
        // Encuadra al personaje Y la próxima estación: el foco es un punto
        // intermedio, así el niño siempre ve a dónde debe ir.
        let foco = p.clone();
        const idxSig = indiceActual + 1;
        if (recorridoIniciado && idxSig < N && estaciones[idxSig]) {
            const ps = estaciones[idxSig].grupo.position;
            foco = p.clone().lerp(ps, 0.42);
        }
        // Cámara 3/4 MÁS alejada: se ve más camino y el mapa en general.
        const deseadaPos = new THREE.Vector3(foco.x - 9, 34, foco.z + 48);
        const deseadaTgt = new THREE.Vector3(foco.x + 2, 2, foco.z - 6);
        const k = inmediato ? 1 : 0.05;
        camPos.lerp(deseadaPos, k); camTarget.lerp(deseadaTgt, k);
        camera.position.copy(camPos); camera.lookAt(camTarget);
    }

    // ===================== Estados de estaciones =====================
    function refrescarEstaciones() {
        estaciones.forEach((e, i) => {
            const esSiguiente = recorridoIniciado && i === indiceActual + 1 && indiceActual < N - 1 && !caminando;
            const visitada = i < indiceMaximoVisitado && e.parada.id !== 'inicio' && e.parada.id !== 'fin';
            e.aro.visible = esSiguiente;
            const cara = e.medallon.material;
            let fondo = e.colorBase, borde = e.colorBorde, texto = numeroParada(e.parada, i);
            if (visitada) { fondo = '#22c55e'; borde = '#15803d'; texto = '✓'; }
            else if (esSiguiente) { fondo = '#fde047'; borde = '#ca8a04'; }
            if (cara.map) cara.map.dispose();
            cara.map = texturaCartel(texto, fondo, borde);
            cara.needsUpdate = true;
            e.grupo.scale.setScalar(esSiguiente ? 1.18 : 1);
        });
    }

    // ===================== Interacción =====================
    let raycaster, puntero;
    function alTocar(clientX, clientY) {
        if (caminando || !recorridoIniciado) return;
        puntero.x = (clientX / window.innerWidth) * 2 - 1;
        puntero.y = -(clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(puntero, camera);
        const objetos = [];
        estaciones.forEach(e => e.grupo.traverse(o => { if (o.isMesh) { o.userData.estIdx = e.indice; objetos.push(o); } }));
        const hit = raycaster.intersectObjects(objetos, false)[0];
        if (!hit) return;
        const idx = hit.object.userData.estIdx;
        // tocar la actual reabre su modal; tocar la siguiente avanza
        if (idx === indiceActual && idx <= indiceMaximoVisitado) abrirModalParada(idx);
        else if (idx === indiceActual + 1) caminarA(idx);
    }

    // ===================== Avance guiado =====================
    let animInicio = 0, animDesde = 0, animHasta = 0, animDur = 0, alLlegarCb = null;
    function caminarA(idx, alLlegar) {
        if (caminando || idx <= indiceActual) { if (alLlegar) alLlegar(); return; }
        if (idx > indiceActual + 1 || idx > indiceMaximoVisitado + 1) return;
        cerrarModal();
        caminando = true; ocultarEtiqueta();
        animDesde = indiceActual / (N - 1); animHasta = idx / (N - 1);
        const p0 = curva.getPoint(animDesde), p1 = curva.getPoint(animHasta);
        animDur = Math.max(1400, p0.distanceTo(p1) * 85); // caminar más pausado
        animInicio = performance.now(); indiceActual = idx; alLlegarCb = alLlegar || null;
        actualizarHud(true);
    }
    function terminarAvance() {
        caminando = false;
        indiceMaximoVisitado = Math.max(indiceMaximoVisitado, indiceActual);
        actualizarProgreso(); refrescarEstaciones(); actualizarHud(false);
        const cb = alLlegarCb; alLlegarCb = null;
        // AUTOMÁTICO al llegar: abrir el modal de la parada (video/info) o la experiencia
        const p = camino.paradas[indiceActual];
        if (p && p.id === 'experiencia') {
            abrirExperiencia();
        } else if (p && p.id !== 'inicio' && p.id !== 'fin') {
            abrirModalParada(indiceActual);
        } else if (p && p.id === 'fin') {
            narrarParada(p); // felicita al terminar (aunque el fin no abre modal)
        }
        if (cb) cb();
    }

    // Frase que el personaje "dice" al llegar a cada estación, según su tipo.
    function fraseParada(p) {
        if (!p) return '';
        const t = p.titulo || '';
        switch (p.id) {
            case 'modulo':      return '¡Mira! Nuestro módulo es: ' + t + '. Veamos el video.';
            case 'eje':         return 'Ahora seguimos con el eje: ' + t + '.';
            case 'tematica':    return 'La temática de hoy es: ' + t + '.';
            case 'experiencia': return '¡Llegamos a la experiencia: ' + t + '! ¿La hacemos juntos?';
            case 'fin':         return '¡Lo lograste! Terminamos la aventura. ¡Muy bien!';
            default:            return t;
        }
    }
    function narrarParada(p) { hablar(fraseParada(p)); }

    // ===================== MODALES — reusa el DOM del kiosco =====================
    function htmlModalFooter(p) {
        if (p.id === 'fin') return '<button type="button" class="rn-camino-btn rn-camino-btn--pri" id="rnModalSalirKiosco">Salir</button>';
        if (p.id === 'experiencia') {
            return '<button type="button" class="rn-camino-btn rn-camino-btn--sec" data-accion="cerrar">Cerrar</button>'
                + '<button type="button" class="rn-camino-btn rn-camino-btn--pri" data-accion="iniciar-experiencia">Iniciar experiencia</button>';
        }
        // módulo / eje / temática / info: botón "Continuar" cierra y deja resaltada la siguiente
        return '<button type="button" class="rn-camino-btn rn-camino-btn--pri" data-accion="cerrar">¡Seguir!</button>';
    }
    function abrirModalParada(indice) {
        const p = camino.paradas[indice];
        if (!p || indice > indiceMaximoVisitado) return;
        indiceModal = indice;
        const tieneVideo = !!(p.video_url || p.videoUrl);
        $('#rnModalEtiqueta').text(p.etiqueta || '');
        $('#rnModalTitulo').text(p.titulo || '');
        const cuerpoTexto = escapar(p.texto || '').replace(/\n\n/g, '</p><p class="rn-camino-modal__texto">');
        if (p.icono) {
            $('#rnModalBody').html('<p class="rn-camino-modal__icono" aria-hidden="true">' + escapar(p.icono) + '</p>'
                + '<p class="rn-camino-modal__texto">' + cuerpoTexto + '</p>');
        } else {
            $('#rnModalBody').html('<p class="rn-camino-modal__texto">' + cuerpoTexto + '</p>');
        }
        // Video (módulo / eje) — el kiosco ya tiene el contenedor #rnModalVideo
        if (tieneVideo) {
            const url = p.video_url || p.videoUrl;
            $('#rnModalVideo').prop('hidden', false).html(
                '<video src="' + escapar(url) + '" controls autoplay playsinline style="width:100%;border-radius:12px;"></video>'
            );
        } else {
            $('#rnModalVideo').prop('hidden', true).empty();
        }
        $('#rnModalFooter').html(htmlModalFooter(p));
        $('#rnCaminoModal').prop('hidden', false);
        narrarParada(p); // el personaje anuncia la estación con voz de niño
    }
    function cerrarModal() {
        const $v = $('#rnModalVideo');
        const vid = $v.find('video')[0]; if (vid) { try { vid.pause(); } catch (e) {} }
        $v.prop('hidden', true).empty();
        $('#rnCaminoModal').prop('hidden', true).removeClass('rn3d-modal-exp');
        indiceModal = null;
    }

    // ===================== Experiencia — reusa VistaNino =====================
    function urlExperiencia(id) { return String(ctx.urlExperienciaTpl || '').replace('__ID__', String(id)); }
    function indiceParadaExperiencia() { return camino.paradas.findIndex(p => p.id === 'experiencia'); }
    function cerrarPlayer() {
        if (window.VistaNino && typeof window.VistaNino.detener === 'function') window.VistaNino.detener();
        const $player = ctx.$player;
        if ($player && $player.length) $player.prop('hidden', true).removeClass('rn-player--camino-overlay').attr('aria-hidden', 'true');
        $('#rnCaminoModalPlayer').prop('hidden', true);
        experienciaCargada = false;
    }
    function abrirExperiencia() {
        cerrarModal();
        const idxExp = indiceParadaExperiencia();
        if (idxExp < 0 || indiceActual !== idxExp) return;
        const p = camino.paradas[idxExp];
        const expId = p?.experiencia_id || camino.experiencia_id;
        if (!expId) return;
        // Modal-tarjeta festivo de la experiencia con su nombre y botón "Iniciar"
        indiceModal = idxExp;
        $('#rnModalEtiqueta').text(p.etiqueta || 'Experiencia');
        $('#rnModalTitulo').text(p.titulo || 'Experiencia');
        const cuerpoTexto = escapar(p.texto || '').replace(/\n\n/g, '</p><p class="rn-camino-modal__texto">');
        $('#rnModalVideo').prop('hidden', true).empty();
        $('#rnModalBody').html(
            '<div class="rn3d-exp-fiesta" aria-hidden="true">'
            + '<span class="rn3d-exp-estrella">🌟</span>'
            + '<span class="rn3d-confeti rn3d-confeti--1"></span><span class="rn3d-confeti rn3d-confeti--2"></span>'
            + '<span class="rn3d-confeti rn3d-confeti--3"></span><span class="rn3d-confeti rn3d-confeti--4"></span>'
            + '<span class="rn3d-confeti rn3d-confeti--5"></span><span class="rn3d-confeti rn3d-confeti--6"></span>'
            + '</div>'
            + '<p class="rn-camino-modal__texto">' + cuerpoTexto + '</p>'
        );
        $('#rnModalFooter').html(htmlModalFooter(p));
        $('#rnCaminoModal').addClass('rn3d-modal-exp').prop('hidden', false);
        narrarParada(p); // anuncia la experiencia con voz de niño
    }
    function iniciarExperiencia() {
        cerrarModal();
        const idxExp = indiceParadaExperiencia();
        const p = camino.paradas[idxExp];
        const expId = p?.experiencia_id || camino.experiencia_id;
        if (!expId) return;
        const $player = ctx.$player;
        $player.prop('hidden', false).attr('aria-hidden', 'false').addClass('rn-player--camino-overlay');
        $('#rnCaminoModalPlayer').prop('hidden', false);
        if (experienciaCargada) return;
        $.ajax({ url: urlExperiencia(expId), method: 'GET', dataType: 'json' }).done(function (res) {
            const data = res?.data;
            if (!data?.bloques) { alert('No se pudo cargar la experiencia.'); cerrarPlayer(); return; }
            experienciaCargada = true;
            if (window.VistaNino && typeof window.VistaNino.iniciar === 'function') {
                window.VistaNino.iniciar({
                    bloques: data.bloques, mediaBase: data.media_base || '',
                    experienciaNombre: data.experiencia?.nombre || 'Experiencia', poll: false,
                });
            }
        }).fail(function (xhr) {
            alert(xhr?.responseJSON?.message || 'No se pudo cargar la experiencia.'); cerrarPlayer();
        });
    }

    // ===================== HUD + etiqueta (overlay 2D sobre el canvas) =====================
    let elFill, elPaso, elHint, elEtiqueta, elIniciar, elBocadillo;
    let mostrandoBocadillo = false; // true solo mientras el personaje "habla" al inicio
    function actualizarHud(enMov) {
        if (!elFill) return;
        const pct = Math.round((indiceMaximoVisitado / (N - 1)) * 100);
        elFill.style.width = pct + '%';
        const p = camino.paradas[indiceActual];
        elPaso.textContent = p ? etiquetaParada(p, indiceActual) : ('Paso ' + (indiceActual + 1));
        elHint.textContent = enMov ? 'Caminando…'
            : (!recorridoIniciado ? 'Toca ¡Iniciar! para empezar la aventura'
                : (indiceActual < N - 1 ? 'Toca la siguiente parada que brilla' : '¡Completaste el recorrido!'));
    }
    function ocultarEtiqueta() { if (elEtiqueta) elEtiqueta.style.display = 'none'; }
    function actualizarEtiquetaSiguiente() {
        const idx = indiceActual + 1;
        if (!recorridoIniciado || caminando || idx >= N) { ocultarEtiqueta(); return; }
        const e = estaciones[idx]; if (!e) { ocultarEtiqueta(); return; }
        const v = new THREE.Vector3(); e.medallon.getWorldPosition(v); v.y += 1.4; v.project(camera);
        if (v.z > 1) { ocultarEtiqueta(); return; }
        elEtiqueta.style.display = 'block';
        elEtiqueta.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
        elEtiqueta.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
        elEtiqueta.textContent = etiquetaParada(e.parada, idx);
    }

    // Inyecta la estructura de modales del kiosco (antes la generaba el JS 2D).
    // Reusa las clases .rn-camino-modal* que siguen en recorrido-camino.css.
    function construirModales() {
        if (document.getElementById('rnCaminoModal')) return; // ya existe
        const wrap = document.createElement('div');
        wrap.innerHTML = ''
            + '<div class="rn-camino-modal" id="rnCaminoModal" hidden role="dialog" aria-modal="true">'
            +   '<div class="rn-camino-modal__backdrop" data-accion="cerrar"></div>'
            +   '<div class="rn-camino-modal__panel">'
            +     '<header class="rn-camino-modal__header">'
            +       '<p class="rn-camino-modal__etiqueta" id="rnModalEtiqueta"></p>'
            +       '<h2 class="rn-camino-modal__titulo" id="rnModalTitulo"></h2>'
            +     '</header>'
            +     '<div class="rn-camino-modal__video" id="rnModalVideo" hidden aria-hidden="true"></div>'
            +     '<div class="rn-camino-modal__body" id="rnModalBody"></div>'
            +     '<footer class="rn-camino-modal__footer" id="rnModalFooter"></footer>'
            +   '</div>'
            + '</div>'
            + '<div class="rn-camino-modal rn-camino-modal--player" id="rnCaminoModalPlayer" hidden role="dialog" aria-modal="true">'
            +   '<div class="rn-camino-modal__backdrop"></div>'
            + '</div>';
        while (wrap.firstChild) ctx.$paso[0].appendChild(wrap.firstChild);
    }

    function construirOverlay() {
        const raiz = document.createElement('div');
        raiz.className = 'rn3d-overlay';
        raiz.innerHTML = ''
            + '<div class="rn3d-hud"><div class="rn3d-hud__bar"><span class="rn3d-hud__fill" id="rn3dFill"></span></div>'
            + '<div class="rn3d-hud__paso" id="rn3dPaso"></div><div class="rn3d-hud__hint" id="rn3dHint"></div></div>'
            // Bocadillo tipo NUBE (CSS) centrado sobre el personaje. Oculto al inicio.
            + '<div class="rn3d-bocadillo rn3d-oculto" id="rn3dBocadillo">'
            +   '<div class="rn3d-bocadillo__nube">'
            +     '<p class="rn3d-bocadillo__texto">¡Hola! 👋<br>Bienvenido a esta aventura. Yo te voy a acompañar. ¡Vamos juntos!</p>'
            +     '<span class="rn3d-bocadillo__pico"></span>'
            +   '</div>'
            + '</div>'
            // Botón "Iniciar" ABAJO: es lo ÚNICO visible al arrancar. Su toque es el
            // gesto del niño que desbloquea el audio en la tablet.
            + '<button class="rn3d-comenzar" id="rn3dIniciar"><span>¡Iniciar!</span><span class="rn3d-flecha">▶</span></button>'
            + '<div class="rn3d-etiqueta" id="rn3dEtiqueta"></div>';
        ctx.$paso[0].appendChild(raiz);
        elFill = raiz.querySelector('#rn3dFill');
        elPaso = raiz.querySelector('#rn3dPaso');
        elHint = raiz.querySelector('#rn3dHint');
        elEtiqueta = raiz.querySelector('#rn3dEtiqueta');
        elBocadillo = raiz.querySelector('#rn3dBocadillo');
        const btnIniciar = raiz.querySelector('#rn3dIniciar');

        prepararVoz();
        const saludo = '¡Hola! Bienvenido a esta aventura. Yo te voy a acompañar. ¡Vamos juntos!';

        // FLUJO: [botón Iniciar] → (toque) → [nube: personaje hablando] →
        //        (fin del diálogo) → el personaje CAMINA solo. Sin botón "Comenzar".
        let dialogoEnCurso = false;

        // Al terminar el diálogo: cierra la nube (suave) y arranca a caminar.
        const terminarDialogo = () => {
            if (!dialogoEnCurso) return;
            dialogoEnCurso = false;
            mostrandoBocadillo = false;               // deja de anclarse al personaje
            elBocadillo.classList.add('rn3d-oculto');  // se cierra con transición
            recorridoIniciado = true; refrescarEstaciones();
            setTimeout(() => caminarA(1), 350);        // arranca tras el cierre de la nube
        };

        // Tiempo mínimo de lectura, por si en la tablet no hay voz o el audio falla:
        // así el diálogo siempre se ve un rato antes de que el personaje camine.
        const DUR_MIN_DIALOGO = 4800;

        btnIniciar.addEventListener('click', () => {
            // 1) desaparece el botón Iniciar (transición suave)
            btnIniciar.classList.add('rn3d-oculto');
            // 2) aparece la nube con el personaje "hablando"
            mostrandoBocadillo = true;
            elBocadillo.classList.remove('rn3d-oculto');
            dialogoEnCurso = true;
            const tIni = performance.now();
            // 3) habla; al terminar la voz (o al cumplirse el mínimo) → caminar
            const alFin = () => {
                const falta = DUR_MIN_DIALOGO - (performance.now() - tIni);
                if (falta > 0) setTimeout(terminarDialogo, falta);
                else terminarDialogo();
            };
            hablar(saludo, alFin);         // el gesto del botón desbloquea el audio
            // respaldo por si la voz no notifica nunca
            setTimeout(() => { if (dialogoEnCurso) terminarDialogo(); }, 9000);
        });
    }

    // Ancla el bocadillo sobre la cabeza del personaje (proyección 3D→2D), solo
    // mientras dura el diálogo de bienvenida (mostrandoBocadillo).
    function actualizarBocadillo() {
        if (!elBocadillo) return;
        if (!mostrandoBocadillo) { elBocadillo.style.display = 'none'; return; }
        // Punto de anclaje BIEN por encima de la cabeza (el niño mide ~3.6 con la
        // escala actual), así la nube queda arriba y no sobre el personaje.
        const v = new THREE.Vector3(); personaje.getWorldPosition(v); v.y += 5.4; v.project(camera);
        if (v.z > 1) { elBocadillo.style.display = 'none'; return; }
        elBocadillo.style.display = 'block';
        elBocadillo.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
        elBocadillo.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    }

    // ===================== Loop =====================
    function animar(now) {
        const dt = ultimoNow ? Math.min(0.1, (now - ultimoNow) / 1000) : 0.016;
        ultimoNow = now;
        animarNubes(dt);
        if (caminando) {
            const k = Math.min(1, (now - animInicio) / animDur);
            const ease = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            const u = animDesde + (animHasta - animDesde) * ease;
            const p = curva.getPoint(u), tang = curva.getTangent(u).normalize();
            personaje.position.set(p.x, 0, p.z);
            personaje.rotation.y = Math.atan2(tang.x, tang.z);
            // caminar: piernas y brazos pivotan en contrafase + saltito
            const paso = Math.sin(now / 110);
            personaje.position.y = Math.abs(Math.sin(now / 110)) * 0.14;
            if (piernaIzq) { piernaIzq.rotation.x = paso * 0.8; piernaDer.rotation.x = -paso * 0.8; }
            if (pieIzq) { pieIzq.position.z = 0.05 + paso * 0.35; pieDer.position.z = 0.05 - paso * 0.35; }
            if (brazoIzq) { brazoIzq.rotation.x = -paso * 0.7; brazoDer.rotation.x = paso * 0.7; }
            if (k >= 1) {
                personaje.position.y = 0;
                if (piernaIzq) { piernaIzq.rotation.x = 0; piernaDer.rotation.x = 0; }
                if (brazoIzq) { brazoIzq.rotation.x = 0; brazoDer.rotation.x = 0; }
                if (pieIzq) { pieIzq.position.z = 0.05; pieDer.position.z = 0.05; }
                terminarAvance();
            }
        } else {
            // idle: respiración leve + balanceo suave de brazos
            if (cuerpo) cuerpo.scale.y = 1 + Math.sin(now / 500) * 0.03;
            if (brazoIzq) { const b = Math.sin(now / 600) * 0.1; brazoIzq.rotation.z = b; brazoDer.rotation.z = -b; }
        }
        // "Hablar": la boca se abre/cierra mientras hay voz (o durante el diálogo).
        if (boca) {
            const hablando = ('speechSynthesis' in window && speechSynthesis.speaking) || mostrandoBocadillo;
            if (hablando) {
                const abrir = 0.5 + Math.abs(Math.sin(now / 90)) * 1.1; // boca articulando
                boca.scale.set(1.3, abrir, 0.5);
                if (cabeza) cabeza.rotation.z = Math.sin(now / 260) * 0.05; // gesto al hablar
            } else {
                boca.scale.set(1.3, 0.5, 0.5);
                if (cabeza) cabeza.rotation.z += (0 - cabeza.rotation.z) * 0.1;
            }
        }
        estaciones.forEach((e, i) => {
            const esSig = recorridoIniciado && i === indiceActual + 1 && !caminando;
            // Ocultar el número de la estación donde el personaje está parado ahora
            // (no caminando), para que el medallón no se sobreponga al niño.
            const esActual = recorridoIniciado && i === indiceActual && !caminando;
            e.medallon.visible = !esActual && e.parada.id !== 'inicio';
            // el cartel siempre mira a la cámara (billboard completo)
            e.medallon.lookAt(camera.position);
            if (esSig) {
                e.medallon.position.y = e.medallon.userData.baseY + Math.abs(Math.sin(now / 300)) * 0.5;
                e.aro.rotation.z += 0.05; e.aro.scale.setScalar(1 + Math.sin(now / 300) * 0.14);
                e.aro.position.y = e.medallon.position.y;
            } else {
                e.medallon.position.y += (e.medallon.userData.baseY - e.medallon.position.y) * 0.2;
            }
        });
        actualizarCamara(false); actualizarEtiquetaSiguiente(); actualizarBocadillo();
        renderer.render(scene, camera);
        rafId = requestAnimationFrame(animar);
    }

    // ===================== boot(ctx) — misma firma que el 2D =====================
    function boot(options) {
        ctx = options || {};
        try { camino = JSON.parse(document.getElementById('rn-camino')?.textContent || '{}'); }
        catch (e) { camino = { paradas: [], puntos: [] }; }
        if (!camino.paradas?.length) return false;

        N = camino.paradas.length;
        indiceActual = 0; indiceMaximoVisitado = 0; caminando = false; recorridoIniciado = false; experienciaCargada = false;
        lagoCentro = null; ultimoNow = 0; mostrandoBocadillo = false;

        // color del ambiente desde --rn-color
        const rc = getComputedStyle(ctx.$shell[0]).getPropertyValue('--rn-color').trim() || '#0ea5e9';
        try { colorAmbiente = new THREE.Color(rc); } catch (e) {}

        ctx.$shell.addClass('rn-shell--camino rn-shell--3d');
        ctx.$paso.attr('data-paso', 'camino').empty();

        // Canvas 3D
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.className = 'rn3d-canvas';
        ctx.$paso[0].appendChild(renderer.domElement);

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 400);

        construirCurva();
        calcularLagoCentro();   // antes del terreno, para aplanar la zona del lago
        aplicarColorAmbiente();
        construirTerreno();
        construirCarretera();
        construirEstaciones();
        construirVegetacion();
        construirNubes();
        construirPersonaje();
        construirLuces();

        camPos.set(-54, 34, 48); camTarget.set(-43, 2, -6); actualizarCamara(true);

        raycaster = new THREE.Raycaster(); puntero = new THREE.Vector2();
        renderer.domElement.addEventListener('click', e => alTocar(e.clientX, e.clientY));

        construirModales();
        construirOverlay();

        // Eventos de los modales (delegados en $paso, como el 2D)
        ctx.$paso.off('click.rn3d');
        ctx.$paso.on('click.rn3d', '[data-accion="cerrar"]', function (e) { e.preventDefault(); cerrarModal(); });
        ctx.$paso.on('click.rn3d', '[data-accion="iniciar-experiencia"]', function (e) { e.preventDefault(); iniciarExperiencia(); });
        ctx.$paso.on('click.rn3d', '#rnModalSalirKiosco', function (e) { e.preventDefault(); salirKiosco(); });
        $('#rnBtnSalirExperiencia').off('click.rn3d').on('click.rn3d', function (e) { e.preventDefault(); irAFinRecorrido(); });

        window.removeEventListener('resize', onResize);
        window.addEventListener('resize', onResize);

        refrescarEstaciones(); actualizarHud(false);
        rafId = requestAnimationFrame(animar);
        return true;
    }

    function onResize() {
        if (!camera) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function salirKiosco() { cerrarModal(); if (typeof ctx.onSalir === 'function') ctx.onSalir(); }

    function irAFinRecorrido() {
        cerrarPlayer(); cerrarModal();
        const idxFin = camino.paradas.findIndex(p => p.id === 'fin');
        if (idxFin < 0 || indiceActual === idxFin) return;
        caminarA(idxFin);
    }

    window.KioscoCamino = { boot: boot, irAFinRecorrido: irAFinRecorrido };
})();
