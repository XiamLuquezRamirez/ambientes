/**
 * recorrido-camino-3d.js — Camino lineal del kiosco en 3D (Three.js).
 *   - Lee #rn-camino (paradas de la Clase del docente: modulo→eje→tematica→info→experiencia).
 *   - Reusa los modales del kiosco: #rnCaminoModal (info/video) y el player VistaNino
 *     (experiencia real). NO duplica esa lógica.
 *   - Al LLEGAR a cada estación abre el modal automáticamente (video en modulo/eje si
 *     lo hay; la experiencia en su modal). Al cerrarlo se resalta la siguiente parada.
 *
 * Three.js se carga como módulo ES (importmap en el layout). Este archivo se carga
 * como <script type="module">.
 */
import * as THREE from 'three';
import { crearNubes } from './recorrido3d/nubes.js';
import { crearAnimales } from './recorrido3d/animales.js';
import { crearFuegos } from './recorrido3d/fuegos.js';

(function () {
    'use strict';

    // ---- Estado del recorrido ----
    let ctx = {};
    let camino = { paradas: [], puntos: [] };
    let indiceActual = 0;
    let indiceMaximoVisitado = 0;
    // ---- Estado del grafo (ramificado) ----
    // nodos: { id: { parada, indice, siguientes:[id], padres:[id], rama:int } }
    let esRamificado = false;
    let nodos = {};
    let nodoActual = null;        // id string del nodo donde está el personaje
    let visitados = new Set();    // ids de nodos "completados" (experiencias hechas, y tronco atravesado)
    let ramasTotales = 0;         // nº de ramas (solo ramificado)
    let ramasCompletadas = new Set(); // índices de rama (1..ramasTotales) ya completadas
    let idModulo = null;          // id del nodo de bifurcación (rama 0, con >1 siguientes)
    let idFin = null;             // id del nodo fin
    // Curvas: en lineal, `curva` es la única. En ramificado, `curvaTronco` +
    // `curvasRama[ramaIdx]`. Cada nodo lleva su posición 3D en `nodos[id].pos`.
    let curvaTronco = null;
    let curvasRama = {};          // { ramaIdx: THREE.Curve }
    let caminando = false;
    let recorridoIniciado = false;
    let experienciaCargada = null;
    let indiceModal = null;

    // ---- Three.js refs ----
    let renderer, scene, camera, curva, personaje, cuerpo, sol;
    let brazoIzq, brazoDer, pieIzq, pieDer, boca, cabeza, piernaIzq, piernaDer;
    let estaciones = [], progresoMesh = null;
    let lagoCentro = null, lagoRadio = 8; // zona del lago a evitar por la vegetación
    let ctrlNubes = null;    // controlador del módulo de nubes (recorrido3d/nubes.js)
    let ctrlAnimales = null; // controlador del módulo de animales (pez + aves)
    let ctrlFuegos = null;   // controlador del módulo de fuegos pirotécnicos
    let vallas = {}; // { ramaIdx: THREE.Group } cerca que bloquea ramas no habilitadas
    let puertasCasa = {}; // { nodoId: THREE.Vector3 } posición de la puerta del destino
    let entrandoSaliendo = false; // true durante la animación de entrar/salir de la casa
    let casaInicioCentro = null;   // zona de la casa del inicio (a evitar por vegetación)
    let zonaJuegos = null;         // grupo 3D de la carpa de juegos (clicable)
    let zonaJuegosCartel = null;   // placa/cartel que hace billboard hacia la cámara
    let zonaJuegosCentro = null;   // zona de la carpa (a evitar por vegetación)
    let zonaJuegosParada = null;   // Vector3 donde el personaje se detiene ante la carpa
    let juegosAbiertos = false;    // true mientras la galería HTML está encima
    let caminandoLibre = false;    // caminata a un punto libre (no del grafo), p.ej. carpa
    let alLlegarLibre = null;      // callback al terminar una caminata libre
    let posAntesDeCarpa = null;    // posición del personaje antes de ir a la carpa (para volver)
    let ultimoNow = 0; // timestamp previo del loop (para delta time)
    let colorAmbiente = new THREE.Color('#0ea5e9');
    let ambienteSlug = '';
    let rafId = null;
    let equipoModesto = false; // tablet/móvil: recorta calidad para ganar fluidez
    let onCanvasClick = null;
    let N = 0;
    let audioNarracion = null;
    let narrando = false;
    let paradaVideoActual = null;
    let escuchandoEmbedVideo = false;

    const $ = window.jQuery;

    function escapar(s) {
        return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ===================== Voz (TTS del servidor, igual que el player) =====================
    function detenerNarracion() {
        narrando = false;
        if (!audioNarracion) return;
        try {
            audioNarracion.pause();
            audioNarracion.currentTime = 0;
        } catch (e) { /* noop */ }
        audioNarracion = null;
    }

    function hablar(texto, alTerminar) {
        if (!texto) {
            if (alTerminar) alTerminar();
            return;
        }
        const urlTts = String(ctx.$app?.data('url-tts') || '');
        if (!urlTts || !$) {
            if (alTerminar) alTerminar();
            return;
        }

        detenerNarracion();
        narrando = true;

        $.ajax({
            url: urlTts,
            method: 'GET',
            data: { texto },
            dataType: 'json',
        }).done(function (res) {
            const audioUrl = res?.data?.url;
            if (!audioUrl) {
                narrando = false;
                if (alTerminar) alTerminar();
                return;
            }
            audioNarracion = new Audio(audioUrl);
            audioNarracion.onended = function () {
                narrando = false;
                audioNarracion = null;
                if (alTerminar) alTerminar();
            };
            audioNarracion.onerror = function () {
                narrando = false;
                audioNarracion = null;
                if (alTerminar) alTerminar();
            };
            audioNarracion.play().catch(function () {
                narrando = false;
                audioNarracion = null;
                if (alTerminar) alTerminar();
            });
        }).fail(function () {
            narrando = false;
            if (alTerminar) alTerminar();
        });
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
        return String(i);   // módulo=1, eje=2, temática=3, experiencia=4...
    }

    function esParadaExperiencia(par) {
        if (!par || !par.id) return false;
        const id = String(par.id);
        return id === 'experiencia' || id.indexOf('experiencia-') === 0;
    }

    // ===================== Modelo de grafo (lineal o ramificado) =====================
    // Construye `nodos` a partir de camino.paradas usando `siguientes`. Si el
    // backend no envía `siguientes` (compat viejo), encadena por orden lineal.
    // Detecta esRamificado, idModulo (bifurcación), idFin y ramasTotales.
    function construirGrafo() {
        nodos = {};
        esRamificado = !!camino.ramificado;
        idModulo = null;
        idFin = null;
        ramasTotales = 0;
        curvaTronco = null;
        curvasRama = {};

        const paradas = camino.paradas || [];
        paradas.forEach((par, i) => {
            nodos[par.id] = {
                parada: par,
                indice: i,
                rama: (typeof par.rama === 'number') ? par.rama : 0,
                siguientes: Array.isArray(par.siguientes) ? par.siguientes.slice() : [],
                padres: [],
                pos: null,   // Vector3, asignado en construirCurva
                t: 0,        // parámetro 0..1 dentro de SU curva (tronco o rama)
            };
        });

        // Compat: si ninguna parada trae `siguientes`, encadenar linealmente.
        const traeSiguientes = paradas.some(p => Array.isArray(p.siguientes) && p.siguientes.length);
        if (!traeSiguientes) {
            for (let i = 0; i < paradas.length - 1; i++) {
                nodos[paradas[i].id].siguientes = [paradas[i + 1].id];
            }
        }

        // Rellenar padres.
        Object.values(nodos).forEach(n => {
            n.siguientes.forEach(sid => {
                if (nodos[sid]) nodos[sid].padres.push(n.parada.id);
            });
        });

        // Detectar módulo (bifurcación): nodo rama 0 con >1 siguientes.
        // Detectar fin: nodo id 'fin' o nodo sin siguientes.
        Object.values(nodos).forEach(n => {
            if (n.parada.id === 'fin') idFin = n.parada.id;
            if (esRamificado && n.rama === 0 && n.siguientes.length > 1 && idModulo === null) {
                idModulo = n.parada.id;
            }
        });
        if (idFin === null) {
            const sinSalida = Object.values(nodos).find(n => n.siguientes.length === 0);
            if (sinSalida) idFin = sinSalida.parada.id;
        }

        if (esRamificado) {
            // ramasTotales: preferir camino.ramas; si no, contar ramas distintas >0.
            if (typeof camino.ramas === 'number' && camino.ramas > 0) {
                ramasTotales = camino.ramas;
            } else {
                const set = new Set();
                Object.values(nodos).forEach(n => { if (n.rama > 0) set.add(n.rama); });
                ramasTotales = set.size;
            }
        } else {
            ramasTotales = 0;
        }
    }

    // Nodos de una rama (rama>0), ordenados por profundidad desde el módulo.
    function nodosDeRama(ramaIdx) {
        return Object.values(nodos)
            .filter(n => n.rama === ramaIdx)
            .sort((a, b) => a.indice - b.indice);   // el backend los emite en orden
    }
    // Nodos del tronco (rama 0), ordenados por índice: inicio, modulo, fin.
    function nodosDeTronco() {
        return Object.values(nodos)
            .filter(n => n.rama === 0)
            .sort((a, b) => a.indice - b.indice);
    }

    // El primer nodo (cabecera) de una rama: el hijo del módulo con esa rama.
    function cabeceraDeRama(ramaIdx) {
        if (!idModulo || !nodos[idModulo]) return null;
        const hijo = nodos[idModulo].siguientes.find(sid => nodos[sid] && nodos[sid].rama === ramaIdx);
        return hijo || null;
    }

    // La rama a la que pertenece un nodo (>0), o 0 si es tronco.
    function ramaDeNodo(id) {
        return nodos[id] ? nodos[id].rama : 0;
    }

    // ¿El nodo `id` es una cabecera de rama tocable ahora? (módulo actual, rama no completa)
    function esCabeceraDeRama(id) {
        if (!esRamificado) return false;
        const r = ramaDeNodo(id);
        if (r <= 0) return false;
        return cabeceraDeRama(r) === id;
    }

    // ¿Está el personaje en una experiencia de rama completada (puede volver al módulo)?
    function enExperienciaCompletada() {
        if (!esRamificado || !nodoActual) return false;
        const n = nodos[nodoActual];
        if (!n) return false;
        return esParadaExperiencia(n.parada) && ramasCompletadas.has(n.rama);
    }

    // Ramas aún pendientes (no completadas).
    function ramasPendientes() {
        const out = [];
        for (let r = 1; r <= ramasTotales; r++) if (!ramasCompletadas.has(r)) out.push(r);
        return out;
    }

    // Ids de los próximos nodos TOCABLES desde el nodo actual.
    function nodosTocables() {
        if (!recorridoIniciado || caminando) return [];
        if (!esRamificado) {
            // Lineal: el (único) hijo no visitado del nodo actual.
            const n = nodos[nodoActual];
            if (!n) return [];
            return n.siguientes.filter(sid => !visitados.has(sid));
        }
        // Ramificado:
        // - En el nodo de bifurcación (o de vuelta en él): SOLO la cabecera de la
        //   PRIMERA rama pendiente (una a la vez, para no confundir al niño);
        //   el fin si ya no quedan ramas.
        if (nodoActual === idModulo) {
            const pend = ramasPendientes();
            if (pend.length === 0) return idFin ? [idFin] : [];
            const cab = cabeceraDeRama(pend[0]); // solo la primera pendiente
            return cab ? [cab] : [];
        }
        // - En una experiencia completada: se puede VOLVER al módulo (si quedan
        //   ramas) o ir al fin (si era la última).
        if (enExperienciaCompletada()) {
            if (ramasPendientes().length > 0) return idModulo ? [idModulo] : [];
            return idFin ? [idFin] : [];
        }
        // - En medio de una rama: el siguiente nodo de la rama no visitado.
        const n = nodos[nodoActual];
        if (!n) return [];
        return n.siguientes.filter(sid => !visitados.has(sid));
    }

    // Actualiza la visibilidad de las vallas: la rama HABILITADA (o en curso, o ya
    // completada) queda abierta; las ramas pendientes bloqueadas muestran su valla.
    function actualizarVallas() {
        if (!esRamificado) return;
        // rama actualmente "abierta": la de la cabecera tocable, la del nodo actual,
        // o —si estamos en una experiencia hecha— la PRÓXIMA rama pendiente.
        let ramaAbierta = 0;
        const tocables = nodosTocables();
        if (tocables.length && nodos[tocables[0]]) ramaAbierta = nodos[tocables[0]].rama;
        if (!ramaAbierta && nodoActual && nodos[nodoActual]) ramaAbierta = nodos[nodoActual].rama;
        // Si el nodo actual es tronco/experiencia completada, abrir la próxima pendiente.
        const pend = ramasPendientes();
        const proxPendiente = pend.length ? pend[0] : 0;
        for (let r = 1; r <= ramasTotales; r++) {
            if (!vallas[r]) continue;
            const abierta = (r === ramaAbierta) || (r === proxPendiente) || ramasCompletadas.has(r);
            vallas[r].visible = !abierta;
        }
    }

    // ¿El id destino es tocable ahora?
    function esTocable(id) {
        return nodosTocables().indexOf(id) >= 0;
    }

    // Índice de estación (en `estaciones[]`) por id de nodo.
    function estacionPorId(id) {
        return estaciones.find(e => e.parada.id === id) || null;
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
        // Considera TODAS las curvas del recorrido (tronco + ramas + tramo-fin en
        // ramificado; la curva única en lineal) para aplanar el terreno bajo todas.
        const curvas = [];
        if (esRamificado && curvaTronco) {
            curvas.push(curvaTronco);
            for (let r = 1; r <= ramasTotales; r++) if (curvasRama[r]) curvas.push(curvasRama[r]);
            if (curvasRama[0]) curvas.push(curvasRama[0]);
        } else {
            curvas.push(curva);
        }
        let min = Infinity;
        for (const c of curvas) {
            for (let i = 0; i <= 80; i++) {
                const p = c.getPoint(i / 80), dx = p.x - x, dz = p.z - z, d = dx * dx + dz * dz;
                if (d < min) min = d;
            }
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
        if (esRamificado && idModulo) {
            construirCurvaRamificada();
            return;
        }
        // ---- Caso LINEAL (comportamiento original, sin cambios) ----
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
        // Modelo de grafo: en lineal, cada nodo mapea a i/(N-1) sobre esta curva.
        Object.values(nodos).forEach(n => {
            n.t = N > 1 ? n.indice / (N - 1) : 0;
            n.pos = curva.getPoint(n.t).clone();
        });
    }

    // Layout RAMIFICADO: el TRONCO recorre todos los nodos comunes (inicio →
    // modulo → [eje] → [tematica]) hasta el nodo de bifurcación (idModulo), y
    // desde ahí se abre una rama por cada experiencia. Se adapta a dónde bifurca.
    function construirCurvaRamificada() {
        // Nodos del tronco EN ORDEN, del inicio hasta la bifurcación (incluida),
        // excluyendo el fin.
        const troncoNodos = nodosDeTronco().filter(n => n.parada.id !== 'fin');
        // Asegurar orden por índice (inicio, modulo, eje, tematica...).
        troncoNodos.sort((a, b) => a.indice - b.indice);
        const fin = idFin ? nodos[idFin] : null;
        const bifurca = nodos[idModulo]; // último nodo común = punto de bifurcación

        // --- Tronco: avanza en X. Reparte los nodos comunes a lo largo. ---
        const X_INI = -48, X_BIF = -14;   // inicio → bifurcación
        const nT = troncoNodos.length;    // p.ej. 2 (inicio,modulo) o 3 (…,eje)
        const ptsTronco = [];
        for (let i = 0; i < nT; i++) {
            const t = nT > 1 ? i / (nT - 1) : 0;
            const x = X_INI + (X_BIF - X_INI) * t;
            const z = Math.sin(t * Math.PI) * 3;   // leve curva
            ptsTronco.push(new THREE.Vector3(x, 0, z));
        }
        if (ptsTronco.length < 2) ptsTronco.push(new THREE.Vector3(X_BIF, 0, 0));
        curvaTronco = new THREE.CatmullRomCurve3(ptsTronco, false, 'catmullrom', 0.5);
        curva = curvaTronco;   // curva "por defecto" (vegetación/lago/terreno)

        // Posición y t de cada nodo del tronco sobre curvaTronco.
        troncoNodos.forEach((n, i) => {
            n.t = nT > 1 ? i / (nT - 1) : 1;
            n.pos = curvaTronco.getPoint(n.t).clone();
        });

        // --- Ramas: se abren desde la BIFURCACIÓN en ángulos repartidos. ---
        const pBif = bifurca && bifurca.pos ? bifurca.pos.clone() : new THREE.Vector3(X_BIF, 0, 0);
        const pModulo = pBif; // alias usado más abajo (tramo al fin)
        const nRamas = Math.max(1, ramasTotales);
        // Reparto angular: de -maxAng a +maxAng respecto al eje +X.
        const maxAng = nRamas > 1 ? 0.62 : 0;   // ~35°
        for (let r = 1; r <= nRamas; r++) {
            const nodosR = nodosDeRama(r);        // eje, tematica, [info], experiencia
            if (!nodosR.length) continue;
            // ángulo de esta rama (0 si sola, repartido si varias)
            let ang = 0;
            if (nRamas > 1) ang = -maxAng + (2 * maxAng) * ((r - 1) / (nRamas - 1));
            const dir = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)).normalize();
            const perp = new THREE.Vector3(-dir.z, 0, dir.x);

            // Puntos: arrancan en el módulo y avanzan `paso` por nodo, con un leve
            // serpenteo lateral para que la rama no sea una recta rígida.
            const paso = 15;                       // separación entre nodos de la rama
            const ctrl = [pModulo.clone()];
            nodosR.forEach((n, k) => {
                const avance = paso * (k + 1);
                const lat = Math.sin((k + 1) * 0.9) * 3.2;   // serpenteo suave
                const p = pModulo.clone()
                    .addScaledVector(dir, avance)
                    .addScaledVector(perp, lat);
                ctrl.push(p);
            });
            const curvaR = new THREE.CatmullRomCurve3(ctrl, false, 'catmullrom', 0.5);
            curvasRama[r] = curvaR;

            // Posición y t de cada nodo de la rama sobre SU curva.
            // t=0 es el módulo; los nodos se reparten en (0,1].
            const M = ctrl.length - 1;   // nº de segmentos de control
            nodosR.forEach((n, k) => {
                n.t = (k + 1) / M;
                n.pos = curvaR.getPoint(n.t).clone();
            });
        }

        // --- Fin: más allá de la bifurcación, centrado (más lejos que las ramas). ---
        if (fin) {
            const X_FIN = pBif.x + 15 * 4 + 12;   // más lejos que la rama más larga
            fin.pos = new THREE.Vector3(X_FIN, 0, pBif.z);
            fin.t = 1;
            // Curva del tronco final (módulo→fin) para animar el tramo de cierre.
            curvasRama[0] = new THREE.CatmullRomCurve3([
                pModulo.clone(),
                pModulo.clone().lerp(fin.pos, 0.5),
                fin.pos.clone(),
            ], false, 'catmullrom', 0.5);
        }
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

    function construirCalzada(hasta01, ancho, alturaY, curvaUsar) {
        ancho = ancho || ANCHO_CAMINO;
        alturaY = (alturaY === undefined) ? 0.05 : alturaY;
        const c0 = curvaUsar || curva;                 // curva a recorrer (por defecto la global)
        const M = 200, verts = [], idx = [], uvs = [];
        const hastaIdx = Math.floor(M * hasta01);
        for (let i = 0; i <= hastaIdx; i++) {
            const u = i / M, p = c0.getPoint(u), tang = c0.getTangent(u).normalize();
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

    // Dibuja una calzada (borde + tierra) a lo largo de UNA curva, con piedritas
    // a los lados. Se llama una vez por tramo (tronco, cada rama, tramo-fin).
    function dibujarCalzadaEn(curvaUsar) {
        // CAPA 0 — borde de tierra oscura (más ancho): transición café→pasto.
        const texBorde = texturaTierra('#7a4a28', ['#8a5732', '#6b3f22']);
        texBorde.repeat.set(1, 12);
        const matBorde = matSuelo({ map: texBorde, roughness: 1 }, 0);
        const borde = new THREE.Mesh(construirCalzada(1, ANCHO_CAMINO + 2.0, 0.04, curvaUsar), matBorde);
        borde.receiveShadow = true; scene.add(borde);

        // CAPA 1 — sendero de TIERRA CAFÉ/MARRÓN, protagonista, con rodadas sutiles.
        const texCamino = texturaTierra('#9c6238', ['#ac7043', '#8a5530', '#b57c4c'], { rodadas: true });
        texCamino.repeat.set(1, 10);
        const matTierra = matSuelo({ map: texCamino, roughness: 1 }, 1);
        const calzada = new THREE.Mesh(construirCalzada(1, ANCHO_CAMINO + 1.4, 0.12, curvaUsar), matTierra);
        calzada.receiveShadow = true; scene.add(calzada);

        // Piedritas a ambos lados del sendero.
        const geoPiedra = new THREE.DodecahedronGeometry(0.4, 0);
        const colPiedra = ['#b7ad9c', '#a89c88', '#c4bbab'];
        for (let i = 0; i < 40; i++) {
            const u = i / 40, p = curvaUsar.getPoint(u), tang = curvaUsar.getTangent(u).normalize();
            const normal = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
            [1, -1].forEach(lado => {
                if (Math.random() < 0.4) return;
                const piedra = new THREE.Mesh(geoPiedra, new THREE.MeshStandardMaterial({
                    color: colPiedra[(Math.random() * colPiedra.length) | 0], roughness: 1, flatShading: true }));
                const desv = (Math.random() - 0.5) * 0.6;
                piedra.position.copy(p).addScaledVector(normal, lado * (ANCHO_CAMINO + 2.0 + desv));
                piedra.position.y = 0.16; piedra.rotation.set(Math.random(), Math.random(), Math.random());
                piedra.scale.setScalar(0.45 + Math.random() * 0.6);
                piedra.castShadow = true; piedra.receiveShadow = false;
                scene.add(piedra);
            });
        }
    }

    function construirCarretera() {
        // Estilo ILUSTRACIÓN PLANA (mapa de cuento): banda de tierra café.
        if (esRamificado && curvaTronco) {
            // Tronco (inicio→módulo) + cada rama (módulo→…→experiencia) + tramo-fin.
            dibujarCalzadaEn(curvaTronco);
            for (let r = 1; r <= ramasTotales; r++) {
                if (curvasRama[r]) dibujarCalzadaEn(curvasRama[r]);
            }
            if (curvasRama[0]) dibujarCalzadaEn(curvasRama[0]); // módulo→fin
        } else {
            dibujarCalzadaEn(curva);
        }

        // Progreso: mesh que se repinta con actualizarProgreso() según el avance.
        const texProg = texturaTierra('#a86e40', ['#ba7f4d', '#996036']);
        texProg.repeat.set(1, 12);
        const matProg = matSuelo({ map: texProg, roughness: 1, emissive: new THREE.Color('#5a3418'), emissiveIntensity: 0.08 }, 2);
        progresoMesh = new THREE.Group();
        progresoMesh.userData.mat = matProg;
        scene.add(progresoMesh);
    }

    // Pinta el progreso (dorado) sobre los tramos ya recorridos. Funciona tanto
    // en lineal (una curva) como en ramificado (tronco + ramas + tramo-fin).
    function actualizarProgreso() {
        const mat = progresoMesh.userData.mat;
        // Limpiar hijos previos del grupo de progreso.
        while (progresoMesh.children.length) {
            const c = progresoMesh.children.pop();
            if (c.geometry) c.geometry.dispose();
        }
        const pintarTramo = (curvaUsar, hasta01) => {
            if (!curvaUsar || hasta01 <= 0) return;
            const m = new THREE.Mesh(construirCalzada(Math.min(1, hasta01), ANCHO_CAMINO + 1.4, 0.16, curvaUsar), mat);
            progresoMesh.add(m);
        };

        if (esRamificado && curvaTronco) {
            // Tronco recorrido si ya se pasó el módulo (módulo visitado).
            if (idModulo && visitados.has(idModulo)) pintarTramo(curvaTronco, 1);
            // Cada rama: pintar hasta el nodo más avanzado alcanzado en ella.
            for (let r = 1; r <= ramasTotales; r++) {
                const nodosR = nodosDeRama(r);
                if (!nodosR.length) continue;
                let maxT = 0;
                nodosR.forEach(n => {
                    if ((visitados.has(n.parada.id) || n.parada.id === nodoActual) && (n.t || 0) > maxT) {
                        maxT = n.t;
                    }
                });
                if (maxT > 0) pintarTramo(curvasRama[r], maxT);
            }
            // Tramo módulo→fin cuando el fin fue alcanzado.
            if (idFin && (visitados.has(idFin) || nodoActual === idFin) && curvasRama[0]) {
                pintarTramo(curvasRama[0], 1);
            }
        } else {
            // Lineal: progreso como fracción hasta el nodo actual.
            const nAct = nodoActual ? nodos[nodoActual] : null;
            const hasta = nAct ? (nAct.t || 0) : 0;
            pintarTramo(curva, hasta);
        }
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
            const nodo = nodos[par.id];
            const p = (nodo && nodo.pos) ? nodo.pos : curva.getPoint(i / (N - 1));
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

    // Casita low-poly de cuento (base + techo + puerta + ventana + chimenea).
    // Más GRANDE, para que sea un destino claro al final de la ruta.
    function crearCasita(colorPared, colorTecho) {
        const g = new THREE.Group();
        const mat = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r === undefined ? .85 : r, flatShading: true });
        // base (más ancha y alta)
        const base = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.4, 4.4), mat(colorPared));
        base.position.y = 1.7; base.castShadow = true; base.receiveShadow = true; g.add(base);
        // techo (pirámide)
        const techo = new THREE.Mesh(new THREE.ConeGeometry(4, 2.4, 4), mat(colorTecho));
        techo.position.y = 4.6; techo.rotation.y = Math.PI / 4; techo.castShadow = true; g.add(techo);
        // puerta (a ras de suelo, mirando al camino)
        const puerta = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.1, 0.15), mat('#6b4226'));
        puerta.position.set(0, 1.05, 2.22); g.add(puerta);
        const pomo = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat('#f5d94a', .4));
        pomo.position.set(0.4, 1.1, 2.3); g.add(pomo);
        // ventanas
        const matVent = mat('#bfe6ff', .3);
        [-1.35, 1.35].forEach(dx => {
            const v = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.08), matVent);
            v.position.set(dx, 2.3, 2.24); g.add(v);
            const marco = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 0.05), mat('#ffffff', .6));
            marco.position.set(dx, 2.3, 2.2); g.add(marco);
        });
        // chimenea
        const chim = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 0.6), mat('#9c5b3b'));
        chim.position.set(1.3, 5.2, -0.6); chim.castShadow = true; g.add(chim);
        return g;
    }

    // Meta especial: CASTILLO GRANDE con torres, murallas, portón y banderas.
    // El frente (portón) mira hacia +Z (se orienta luego con rotation.y).
    function crearMeta(colorAmb) {
        const g = new THREE.Group();
        const mat = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r === undefined ? .85 : r, flatShading: true });
        const piedra = '#cbb998', piedra2 = '#b8a582', techoT = colorAmb || '#c0392b';

        // almenas sobre un muro (cuadraditos a lo largo de X)
        const ponerAlmenas = (anchoX, y, z, n) => {
            for (let i = 0; i < n; i++) {
                const a = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1, 1.1), mat(piedra2));
                a.position.set(-anchoX / 2 + 0.9 + i * (anchoX - 1.8) / (n - 1), y, z);
                a.castShadow = true; g.add(a);
            }
        };
        // una torre con techo cónico y bandera
        const ponerTorre = (x, z, radio, alto) => {
            const t = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio * 1.1, alto, 10), mat(piedra));
            t.position.set(x, alto / 2, z); t.castShadow = true; t.receiveShadow = true; g.add(t);
            const cono = new THREE.Mesh(new THREE.ConeGeometry(radio * 1.35, radio * 2.4, 10), mat(techoT));
            cono.position.set(x, alto + radio * 1.2, z); cono.castShadow = true; g.add(cono);
            // asta + banderín
            const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 6), mat('#6b6b6b', .5));
            asta.position.set(x, alto + radio * 2.4 + 1.2, z); g.add(asta);
            const ban = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3),
                new THREE.MeshStandardMaterial({ color: techoT, roughness: .7, side: THREE.DoubleSide }));
            ban.position.set(x + 1.1, alto + radio * 2.4 + 1.7, z); g.add(ban);
        };

        // --- Cuerpo central (torreón principal, alto) ---
        const cuerpoC = new THREE.Mesh(new THREE.BoxGeometry(7, 9, 6), mat(piedra));
        cuerpoC.position.y = 4.5; cuerpoC.castShadow = true; cuerpoC.receiveShadow = true; g.add(cuerpoC);
        ponerAlmenas(7, 9.5, 2.6, 5);   // almenas frontales del torreón
        ponerAlmenas(7, 9.5, -2.6, 5);  // almenas traseras

        // --- Muralla frontal (más baja) con portón ---
        const muro = new THREE.Mesh(new THREE.BoxGeometry(13, 5, 1.6), mat(piedra2));
        muro.position.set(0, 2.5, 4.6); muro.castShadow = true; muro.receiveShadow = true; g.add(muro);
        ponerAlmenas(13, 5.8, 4.6, 8);

        // --- Torres en las esquinas ---
        ponerTorre(-6.5, 4.6, 1.6, 8);   // frontal izquierda
        ponerTorre(6.5, 4.6, 1.6, 8);    // frontal derecha
        ponerTorre(-4, -3.2, 1.4, 10);   // trasera izq (más alta)
        ponerTorre(4, -3.2, 1.4, 10);    // trasera der

        // --- Portón grande (arco oscuro) en la muralla ---
        const porton = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.6, 0.4), mat('#4a3520'));
        porton.position.set(0, 1.8, 5.45); g.add(porton);
        const arco = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.4, 12, 1, false, 0, Math.PI), mat('#4a3520'));
        arco.rotation.z = Math.PI; arco.position.set(0, 3.6, 5.45); arco.rotation.x = Math.PI / 2; g.add(arco);

        return g;
    }

    // ===================== Casa temática del ambiente (inicio) =====================
    // Casa GRANDE característica según el ambiente, colocada junto al inicio.
    function crearCasaAmbiente(slug) {
        const mat = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r === undefined ? .85 : r, flatShading: true });
        const g = new THREE.Group();

        // Config por ambiente: colores de pared/techo + emoji del rótulo + detalle.
        const temas = {
            'expresion-artistica': { pared: '#f4d35e', techo: '#e63946', emoji: '🎨', detalle: 'arte' },
            'polimotor':           { pared: '#8ecae6', techo: '#3a86ff', emoji: '⚽', detalle: 'deporte' },
            'multisaberes':        { pared: '#e9c46a', techo: '#8a5a2b', emoji: '📚', detalle: 'libros' },
            'multisensorial':      { pared: '#a8dadc', techo: '#457b9d', emoji: '✋', detalle: 'sentidos' },
            'tecnologia':          { pared: '#cdd7e0', techo: '#e76f51', emoji: '🤖', detalle: 'tech' },
        };
        const t = temas[slug] || { pared: '#e8c07d', techo: '#c0392b', emoji: '🏠', detalle: 'default' };

        // ---- Cuerpo GRANDE de la casa (más ancho y alto) ----
        const AW = 8, AH = 6, AD = 7;                 // ancho, alto, profundidad
        const FZ = AD / 2;                             // z de la fachada
        const base = new THREE.Mesh(new THREE.BoxGeometry(AW, AH, AD), mat(t.pared));
        base.position.y = AH / 2; base.castShadow = true; base.receiveShadow = true; g.add(base);
        // zócalo (base de piedra) para dar detalle
        const zocalo = new THREE.Mesh(new THREE.BoxGeometry(AW + 0.4, 0.8, AD + 0.4), mat('#9a9187'));
        zocalo.position.y = 0.4; zocalo.receiveShadow = true; g.add(zocalo);
        // esquineros (pilares en las 4 aristas verticales frontales)
        [[-AW/2, FZ], [AW/2, FZ]].forEach(([px, pz]) => {
            const pil = new THREE.Mesh(new THREE.BoxGeometry(0.5, AH, 0.5), mat('#ffffff', .7));
            pil.position.set(px, AH / 2, pz); g.add(pil);
        });

        // ---- Techo a dos aguas (prisma) con alero y borde ----
        const techoAlto = 3.2;
        const techo = new THREE.Mesh(new THREE.ConeGeometry(AW * 0.82, techoAlto, 4), mat(t.techo));
        techo.position.y = AH + techoAlto / 2 - 0.2; techo.rotation.y = Math.PI / 4; techo.castShadow = true; g.add(techo);
        // alero/borde del techo (disco fino oscuro bajo el cono)
        const alero = new THREE.Mesh(new THREE.CylinderGeometry(AW * 0.86, AW * 0.86, 0.35, 4), mat('#5a3a22'));
        alero.position.y = AH - 0.05; alero.rotation.y = Math.PI / 4; g.add(alero);
        // remate del techo (bolita)
        const remate = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), mat('#f5d94a', .4));
        remate.position.y = AH + techoAlto - 0.2; g.add(remate);

        // ---- Puerta con marco y escalón ----
        const marcoP = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.6, 0.15), mat('#ffffff', .7));
        marcoP.position.set(0, 1.8, FZ + 0.02); g.add(marcoP);
        const puerta = new THREE.Mesh(new THREE.BoxGeometry(2, 3.2, 0.2), mat('#6b4226'));
        puerta.position.set(0, 1.6, FZ + 0.08); g.add(puerta);
        const pomo = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), mat('#f5d94a', .4));
        pomo.position.set(0.7, 1.6, FZ + 0.2); g.add(pomo);
        const escalon = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 1.2), mat('#b8b0a4'));
        escalon.position.set(0, 0.2, FZ + 0.7); g.add(escalon);

        // ---- Ventanas con marco, cruz y alféizar ----
        [-2.6, 2.6].forEach(dx => {
            const marco = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 0.1), mat('#ffffff', .7));
            marco.position.set(dx, 3.6, FZ + 0.02); g.add(marco);
            const v = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.08), mat('#bfe6ff', .3));
            v.position.set(dx, 3.6, FZ + 0.06); g.add(v);
            // cruceta
            const cv = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.1), mat('#ffffff', .7));
            cv.position.set(dx, 3.6, FZ + 0.1); g.add(cv);
            const ch = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.1), mat('#ffffff', .7));
            ch.position.set(dx, 3.6, FZ + 0.1); g.add(ch);
            // alféizar
            const alf = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 0.4), mat('#e0d7c8'));
            alf.position.set(dx, 2.75, FZ + 0.18); g.add(alf);
        });

        // ---- Chimenea con humo ----
        const chim = new THREE.Mesh(new THREE.BoxGeometry(1, 2.6, 1), mat('#9c5b3b'));
        chim.position.set(2.4, AH + 1.6, -1); chim.castShadow = true; g.add(chim);
        const bocaCh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.2), mat('#6b4226'));
        bocaCh.position.set(2.4, AH + 2.9, -1); g.add(bocaCh);

        // ---- Rótulo temático (círculo con emoji), en el TÍMPANO del techo, arriba
        //      de las ventanas y por debajo de la punta, sin que lo tape el techo ----
        const c = document.createElement('canvas'); c.width = c.height = 160;
        const ctx2 = c.getContext('2d');
        ctx2.fillStyle = '#ffffff'; ctx2.beginPath(); ctx2.arc(80, 80, 76, 0, Math.PI * 2); ctx2.fill();
        ctx2.strokeStyle = t.techo; ctx2.lineWidth = 10; ctx2.beginPath(); ctx2.arc(80, 80, 74, 0, Math.PI * 2); ctx2.stroke();
        ctx2.font = '92px serif'; ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
        ctx2.fillText(t.emoji, 80, 88);
        const tex = new THREE.CanvasTexture(c);
        // Colgado por delante del alero (billboard-ish), a la altura de la fachada
        // alta, SIN que el techo lo tape: bien adelante (z > fachada) y a media altura.
        const cartel = new THREE.Mesh(new THREE.CircleGeometry(1.6, 28),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: true }));
        cartel.position.set(0, AH - 1.2, FZ + 0.15); g.add(cartel);
        // soporte del cartel (dos cuerdecitas hacia el alero)
        [-0.8, 0.8].forEach(dx => {
            const cuerda = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 4), mat('#5a3a22'));
            cuerda.position.set(dx, AH - 0.3, FZ + 0.1); cuerda.rotation.z = dx > 0 ? -0.3 : 0.3; g.add(cuerda);
        });

        // Detalle extra 3D delante de la casa según el ambiente (a un costado del
        // escalón, en z ≈ FZ+2 para no chocar con la puerta).
        const DZ = FZ + 2.2;
        if (t.detalle === 'arte') {
            // caballete con lienzo pintado + botes de pintura
            const madera = mat('#8a5a2b');
            [-0.5, 0.5].forEach(dx => { const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 6), madera); pata.position.set(2.6 + dx, 1.5, DZ); pata.rotation.x = 0.25; g.add(pata); });
            const pataAtras = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 6), madera); pataAtras.position.set(2.6, 1.5, DZ - 0.7); pataAtras.rotation.x = -0.4; g.add(pataAtras);
            const lienzo = new THREE.Mesh(new THREE.BoxGeometry(2, 1.7, 0.12), mat('#ffffff', .6));
            lienzo.position.set(2.6, 2.3, DZ); g.add(lienzo);
            [['#e63946', -0.4, 0.2], ['#457b9d', 0.3, -0.1], ['#2a9d8f', 0, 0.4]].forEach(([col, ox, oy]) => {
                const trazo = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.14), mat(col));
                trazo.position.set(2.6 + ox, 2.3 + oy, DZ + 0.02); g.add(trazo);
            });
            // paleta redonda con manchas
            const paleta = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 16), mat('#c9a56a'));
            paleta.position.set(-2.6, 0.6, DZ); paleta.rotation.x = Math.PI / 2.2; g.add(paleta);
            ['#e63946', '#3a86ff', '#ffd166'].forEach((col, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mat(col)); m.position.set(-2.6 + Math.cos(i*2)*0.35, 0.72, DZ + Math.sin(i*2)*0.35); g.add(m); });
        } else if (t.detalle === 'deporte') {
            const pelota = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 12), mat('#ffffff', .5));
            pelota.position.set(2.6, 0.9, DZ); g.add(pelota);
            // pentágonos de la pelota
            [[0,0.9,0.9],[0.5,0.9,0.6],[-0.5,0.9,0.6]].forEach(([x,y,z]) => { const p = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 5), mat('#222')); p.position.set(2.6+x*0.6, y, DZ+z*0.4-0.4); g.add(p); });
            // canasta con aro
            const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 8), mat('#888')); poste.position.set(-2.8, 2, DZ - 0.4); g.add(poste);
            const tablero = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.1), mat('#ffffff', .6)); tablero.position.set(-2.8, 3.4, DZ - 0.4); g.add(tablero);
            const aro = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.09, 8, 20), mat('#e76f51')); aro.position.set(-2.8, 3, DZ); aro.rotation.x = Math.PI / 2; g.add(aro);
        } else if (t.detalle === 'libros') {
            // pila de libros grande + globo terráqueo
            ['#e63946', '#457b9d', '#2a9d8f', '#f4a261'].forEach((col, i) => {
                const libro = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 1.4), mat(col));
                libro.position.set(2.4, 0.5 + i * 0.55, DZ); libro.rotation.y = i * 0.12; g.add(libro);
            });
            const globo = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 12), mat('#3a86ff'));
            globo.position.set(-2.6, 1, DZ); g.add(globo);
            const cont = new THREE.Mesh(new THREE.SphereGeometry(0.82, 8, 6), mat('#2a9d8f', .9)); cont.scale.set(0.6,1,0.6); cont.position.set(-2.6, 1, DZ); g.add(cont);
            const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2, 6), mat('#888')); eje.position.set(-2.6, 1, DZ); eje.rotation.z = 0.4; g.add(eje);
        } else if (t.detalle === 'sentidos') {
            // formas grandes de colores
            const cir = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 12), mat('#e63946')); cir.position.set(-2.6, 0.8, DZ); g.add(cir);
            const cub = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), mat('#2a9d8f')); cub.position.set(0, 0.65, DZ + 0.6); cub.rotation.y = 0.4; g.add(cub);
            const con = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.5, 10), mat('#f4a261')); con.position.set(2.6, 0.75, DZ); g.add(con);
            const cil = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 12), mat('#8e44ad')); cil.position.set(1.4, 0.6, DZ + 0.8); g.add(cil);
        } else if (t.detalle === 'tech') {
            // robot pequeño + antena + panel
            const robCuerpo = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.9), mat('#adb5bd')); robCuerpo.position.set(2.6, 1.2, DZ); g.add(robCuerpo);
            const robCabeza = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.8), mat('#ced4da')); robCabeza.position.set(2.6, 2.3, DZ); g.add(robCabeza);
            [-0.22, 0.22].forEach(dx => { const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), mat('#4dff88', .3)); ojo.position.set(2.6 + dx, 2.35, DZ + 0.4); g.add(ojo); });
            const antena = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6), mat('#555')); antena.position.set(2.6, 3, DZ); g.add(antena);
            const antBola = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), mat('#e76f51')); antBola.position.set(2.6, 3.4, DZ); g.add(antBola);
            // panel de control
            const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.15), mat('#1d3557')); panel.position.set(-2.6, 1.2, DZ); g.add(panel);
            [-0.4, 0, 0.4].forEach((dx, i) => [0.3, -0.3].forEach(dy => { const led = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.06), mat(['#4dff88','#ffd166','#ff4d4d'][i%3], .3)); led.position.set(-2.6 + dx, 1.2 + dy, DZ + 0.1); g.add(led); }));
        }

        return g;
    }

    // Árbol frondoso simple (tronco + copa redonda) para decorar la casa inicial.
    function crearArbolSimple(tint) {
        const g = new THREE.Group();
        const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.6, 6),
            new THREE.MeshStandardMaterial({ color: '#7a5a30', roughness: 1, flatShading: true }));
        tronco.position.y = 0.8; tronco.castShadow = true; g.add(tronco);
        const copa = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1),
            new THREE.MeshStandardMaterial({ color: tint, roughness: 1, flatShading: true }));
        copa.position.y = 2.6; copa.scale.y = 0.9; copa.castShadow = true; g.add(copa);
        return g;
    }

    // Arbusto (grupo de bolas verdes bajas).
    function crearArbusto(tint) {
        const g = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: tint, roughness: 1, flatShading: true });
        for (let b = 0; b < 3; b++) {
            const bola = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + (b % 2) * 0.22, 0), mat);
            bola.position.set((b - 1) * 0.55, 0.45 + (b % 2) * 0.12, (b % 2 ? 0.2 : -0.2));
            bola.castShadow = true; g.add(bola);
        }
        return g;
    }

    // Flor (tallo + pétalos de color).
    function crearFlor(colFlor) {
        const g = new THREE.Group();
        const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 5),
            new THREE.MeshStandardMaterial({ color: '#3f7a4b', roughness: 1 }));
        tallo.position.y = 0.3; g.add(tallo);
        const centro = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8),
            new THREE.MeshStandardMaterial({ color: '#ffd166', roughness: .7 }));
        centro.position.y = 0.62; g.add(centro);
        // 5 pétalos alrededor
        const matPet = new THREE.MeshStandardMaterial({ color: colFlor, roughness: .7 });
        for (let i = 0; i < 5; i++) {
            const ang = (i / 5) * Math.PI * 2;
            const pet = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), matPet);
            pet.position.set(Math.cos(ang) * 0.18, 0.62, Math.sin(ang) * 0.18);
            pet.scale.set(1.4, 0.6, 1); g.add(pet);
        }
        return g;
    }

    // Banquito de madera (asiento + patas + respaldo).
    function crearBanco() {
        const g = new THREE.Group();
        const madera = new THREE.MeshStandardMaterial({ color: '#a9764a', roughness: .9, flatShading: true });
        const asiento = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.8), madera);
        asiento.position.y = 0.7; asiento.castShadow = true; g.add(asiento);
        // patas
        [[-0.9, 0.3], [0.9, 0.3], [-0.9, -0.3], [0.9, -0.3]].forEach(([px, pz]) => {
            const pata = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), madera);
            pata.position.set(px, 0.35, pz); g.add(pata);
        });
        // respaldo (dos listones)
        [1.05, 1.4].forEach(y => {
            const list = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.12), madera);
            list.position.set(0, y, -0.32); g.add(list);
        });
        [-0.9, 0.9].forEach(px => {
            const sop = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.9, 0.14), madera);
            sop.position.set(px, 1.05, -0.32); g.add(sop);
        });
        return g;
    }

    // Coloca la casa del ambiente junto al INICIO (a un lado del personaje),
    // con una arboleda a su IZQUIERDA para enmarcarla.
    function construirCasaInicio() {
        const inicio = nodos['inicio'];
        if (!inicio || !inicio.pos) return;
        const bx = inicio.pos.x - 5, bz = inicio.pos.z - 14; // base de la casa
        // reservar la zona de la casa (cuerpo) para que la vegetación no la invada
        casaInicioCentro = { x: bx, z: bz, r: 7 };
        const casa = crearCasaAmbiente(ambienteSlug);
        casa.position.set(bx, 0, bz);
        casa.rotation.y = Math.PI * 0.18;
        scene.add(casa);

        // Arboleda a la izquierda de la casa (X más negativo).
        const tonos = ['#3f7a4b', '#4b8c57', '#356b41', '#5a9c63', '#2f6b3f'];
        const spots = [
            [-8, -3], [-10, 2], [-7, 4], [-11, -5], [-9, -8],
            [-13, 0], [-6, 8], [-12, 6], [-8, 10],
        ];
        spots.forEach(([ox, oz], i) => {
            const a = crearArbolSimple(tonos[i % tonos.length]);
            a.position.set(bx + ox, 0, bz + oz);
            a.scale.setScalar(0.7 + ((i * 7) % 5) * 0.12); // variación determinista
            scene.add(a);
        });

        // Arbustos alrededor de la casa (evitando la zona del banco y el caminito).
        const arbSpots = [[-6, 3], [-5.5, -2], [5, 2], [-4.5, 6], [5.5, 6], [-7, -1]];
        arbSpots.forEach(([ox, oz], i) => {
            const arb = crearArbusto(tonos[(i + 2) % tonos.length]);
            arb.position.set(bx + ox, 0, bz + oz);
            arb.scale.setScalar(0.9 + (i % 3) * 0.2);
            scene.add(arb);
        });

        // Flores de colores bordeando el caminito de piedra a la puerta.
        const colFlores = ['#e63946', '#ffd166', '#f472b6', '#a78bfa', '#4dabf7'];
        const florSpots = [[-1.6, 5.2], [1.6, 5.2], [-1.8, 6.5], [1.8, 6.5], [-4.2, 4.8],
            [4.2, 4.4], [-1.4, 7.8], [1.4, 7.8], [-5, 2], [5.2, 2.5]];
        florSpots.forEach(([ox, oz], i) => {
            const fl = crearFlor(colFlores[i % colFlores.length]);
            fl.position.set(bx + ox, 0, bz + oz);
            fl.scale.setScalar(0.9 + (i % 2) * 0.3);
            scene.add(fl);
        });

        // Camino de PIEDRA (losas irregulares) desde la PUERTA hasta el PERSONAJE
        // (punto de inicio). Curva Catmull-Rom para que zigzaguee suave.
        const matLosa = new THREE.MeshStandardMaterial({ color: '#c2bcae', roughness: 1, flatShading: true });
        const puerta3D = new THREE.Vector3(bx, 0, bz + 3.5);      // frente de la puerta
        const personaje3D = new THREE.Vector3(inicio.pos.x - 1, 0, inicio.pos.z + 0.5); // junto al niño
        const medio = puerta3D.clone().lerp(personaje3D, 0.5).add(new THREE.Vector3(1.2, 0, 0));
        const curvaPiedra = new THREE.CatmullRomCurve3([puerta3D, medio, personaje3D], false, 'catmullrom', 0.5);
        const nLosas = 11;
        for (let i = 0; i < nLosas; i++) {
            const t = i / (nLosas - 1);
            const p = curvaPiedra.getPoint(t);
            const losa = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.12, 6), matLosa);
            losa.position.set(p.x, 0.06, p.z);
            losa.rotation.y = i * 0.5; losa.scale.set(1, 1, 0.85 + (i % 2) * 0.2);
            losa.receiveShadow = true; scene.add(losa);
        }

        // Banquito en un lugar DESPEJADO: al frente-izquierda de la casa, mirándola.
        const banco = crearBanco();
        banco.position.set(bx - 5.5, 0, bz + 8);
        banco.rotation.y = Math.PI * 0.75;   // el respaldo hacia afuera, asiento a la casa
        scene.add(banco);
    }

    // ===================== Zona de JUEGOS (carpa clicable) =====================
    // Carpa de feria/juegos low-poly, SIEMPRE accesible, en un rincón despejado
    // cerca del inicio. Al tocarla se abre la galería de juegos (BancoJuegos).
    // Guarda su grupo en `zonaJuegos` para el raycast de alTocar().
    function construirZonaJuegos() {
        const inicio = nodos['inicio'];
        if (!inicio || !inicio.pos) return;
        const g = new THREE.Group();
        const mat = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r === undefined ? .85 : r, flatShading: true });

        const R = 4.2;         // radio de la carpa
        const HP = 3.4;        // alto de las paredes/columnas
        const HT = 3.2;        // alto del toldo cónico

        // Plataforma/tarima redonda
        const tarima = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.6, R + 0.9, 0.5, 16), mat('#c9b79c'));
        tarima.position.y = 0.25; tarima.receiveShadow = true; g.add(tarima);

        // Paredes bajas (cilindro) color crema
        const pared = new THREE.Mesh(new THREE.CylinderGeometry(R, R, HP, 16, 1, true), mat('#fff3e0', .9));
        pared.material.side = THREE.DoubleSide;
        pared.position.y = 0.5 + HP / 2; pared.castShadow = true; g.add(pared);

        // Toldo cónico a franjas: se logra alternando gajos de color con dos conos
        // superpuestos y una textura de canvas a rayas radiales.
        const lienzo = document.createElement('canvas'); lienzo.width = 256; lienzo.height = 64;
        const cx2 = lienzo.getContext('2d');
        const franjas = ['#e63946', '#ffffff', '#f4a261', '#ffffff', '#457b9d', '#ffffff', '#2a9d8f', '#ffffff'];
        const fw = lienzo.width / franjas.length;
        franjas.forEach((c, i) => { cx2.fillStyle = c; cx2.fillRect(i * fw, 0, fw + 1, lienzo.height); });
        const texToldo = new THREE.CanvasTexture(lienzo);
        texToldo.wrapS = THREE.RepeatWrapping; texToldo.repeat.set(1, 1);
        const toldo = new THREE.Mesh(new THREE.ConeGeometry(R + 0.8, HT, 16),
            new THREE.MeshStandardMaterial({ map: texToldo, roughness: .8, flatShading: true }));
        toldo.position.y = 0.5 + HP + HT / 2 - 0.1; toldo.castShadow = true; g.add(toldo);

        // Banderín/remate arriba
        const mastil = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), mat('#8a5a2b'));
        mastil.position.y = 0.5 + HP + HT + 0.4; g.add(mastil);
        const bandera = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 3), mat('#e63946', .6));
        bandera.rotation.z = -Math.PI / 2; bandera.position.set(0.35, 0.5 + HP + HT + 0.7, 0); g.add(bandera);

        // Entrada oscura (arco) al frente (+Z, mirando hacia el personaje).
        const arco = new THREE.Mesh(new THREE.BoxGeometry(2.4, HP * 0.8, 0.2), mat('#3a2b1a', 1));
        arco.position.set(0, 0.5 + HP * 0.4, R - 0.05); g.add(arco);

        // Cartel flotante con 🎮 y "JUEGOS" mirando a cámara (billboard).
        const cartel = crearCartelJuegos();
        cartel.position.set(0, 0.5 + HP + HT + 1.8, 0);
        cartel.userData.baseY = cartel.position.y;
        g.add(cartel);
        zonaJuegosCartel = cartel;

        // Posición: a la IZQUIERDA de la casa del inicio (X más negativo).
        // El camino recto llega bien aunque esté más lejos.
        const zx = inicio.pos.x - 20, zz = inicio.pos.z + 7;
        g.position.set(zx, 0, zz);
        // La entrada (arco) mira hacia el personaje: rotamos la carpa para que su
        // frente (+Z local) apunte hacia el punto de inicio.
        g.rotation.y = Math.atan2(inicio.pos.x - zx, inicio.pos.z - zz);
        scene.add(g);
        zonaJuegos = g;
        zonaJuegosCentro = { x: zx, z: zz, r: R + 1.5 }; // para que la vegetación la evite

        // Punto de PARADA frente a la carpa (donde se detiene el personaje al
        // caminar hacia ella). Sobre la recta inicio→carpa, a ~R+1 de su centro.
        const centro = new THREE.Vector3(zx, 0, zz);
        const inicioPos = new THREE.Vector3(inicio.pos.x, 0, inicio.pos.z);
        const dir = inicioPos.clone().sub(centro).setY(0).normalize();
        zonaJuegosParada = centro.clone().add(dir.clone().multiplyScalar(R + 1.2));

        // ---- Camino de PIEDRA RECTO desde el personaje hasta la carpa ----
        // Línea recta (sin curva) para evitar cualquier corte: interpolamos puntos
        // equiespaciados entre el inicio y el frente de la carpa.
        const matLosa = new THREE.MeshStandardMaterial({ color: '#c2bcae', roughness: 1, flatShading: true });
        const desde = new THREE.Vector3(inicio.pos.x - 1, 0, inicio.pos.z + 1.0); // junto al niño
        const hasta = centro.clone().add(dir.clone().multiplyScalar(R - 0.4));     // sobre el borde de la tarima
        const dist = desde.distanceTo(hasta);
        const nLosas = Math.max(10, Math.round(dist / 1.0)); // una losa cada ~1 unidad
        for (let i = 0; i <= nLosas; i++) {
            const p = desde.clone().lerp(hasta, i / nLosas);
            const losa = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 6), matLosa);
            losa.position.set(p.x, 0.06, p.z);
            losa.rotation.y = i * 0.7; losa.scale.set(1, 1, 0.9 + (i % 2) * 0.18);
            losa.receiveShadow = true; scene.add(losa);
        }
    }

    // Cartel low-poly (placa con emoji + texto) generado con CanvasTexture.
    function crearCartelJuegos() {
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
        const c = cv.getContext('2d');
        c.fillStyle = '#ffffff'; c.strokeStyle = '#2f8fd4'; c.lineWidth = 10;
        roundRect(c, 8, 8, 240, 112, 20); c.fill(); c.stroke();
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = '54px system-ui, sans-serif'; c.fillText('🎮', 128, 48);
        c.fillStyle = '#1f6ba3'; c.font = 'bold 30px system-ui, sans-serif'; c.fillText('JUEGOS', 128, 96);
        const tex = new THREE.CanvasTexture(cv);
        const placa = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
        placa.userData.esZonaJuegos = true; // para el raycast
        return placa;
    }

    // Helper: rectángulo redondeado en canvas 2D.
    function roundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }

    // Coloca un DESTINO al final de cada rama (casita) y en el fin (meta/castillo),
    // un poco más allá del medallón, para que la carretera "llegue a algo".
    function construirDestinos() {
        const grupo = new THREE.Group(); scene.add(grupo);
        const coloresCasa = [
            ['#e8c07d', '#c0392b'], ['#a9d18e', '#7d5a3c'],
            ['#f4b6c2', '#8e44ad'], ['#9fd3e0', '#2c7a7b'],
        ];

        // Dibuja un tramo de calzada RECTA entre dos puntos (sendero de entrada
        // a la casa) para que el camino se combine con la casita.
        const matEntrada = matSuelo({
            map: (function () { const t = texturaTierra('#9c6238', ['#ac7043', '#8a5530']); t.repeat.set(1, 4); return t; })(),
            roughness: 1
        }, 1);
        const dibujarEntrada = (a, b) => {
            const curvaE = new THREE.CatmullRomCurve3([
                a.clone(), a.clone().lerp(b, 0.5), b.clone()
            ], false, 'catmullrom', 0.5);
            const m = new THREE.Mesh(construirCalzada(1, ANCHO_CAMINO + 0.6, 0.13, curvaE), matEntrada);
            m.receiveShadow = true; grupo.add(m);
        };

        // Coloca una casita al final de una rama/curva, conectada por un sendero.
        const ponerCasa = (exp, curvaR, idxColor) => {
            if (!exp || !exp.pos || !curvaR) return;
            const tang = curvaR.getTangent(0.999).normalize();
            const destino = exp.pos.clone().addScaledVector(tang, 6.5); // casa grande, algo más lejos
            const casa = crearCasita(...(coloresCasa[idxColor % coloresCasa.length]));
            casa.position.set(destino.x, 0, destino.z);
            casa.rotation.y = Math.atan2(-tang.x, -tang.z); // puerta mirando al camino
            casa.scale.setScalar(1.1);
            grupo.add(casa);
            // sendero de entrada: desde la experiencia hasta la puerta de la casa
            const puerta = destino.clone().addScaledVector(tang, -2.6); // frente de la casa
            dibujarEntrada(exp.pos.clone(), puerta);
            // guardar la posición de la puerta para la animación de entrar/salir
            puertasCasa[exp.parada.id] = puerta.clone();
        };

        // Coloca el CASTILLO GRANDE más allá del fin, con el portón mirando al
        // camino y un sendero de entrada que lo conecta con la carretera.
        const ponerMeta = (fin, tang) => {
            if (!fin || !fin.pos) return;
            const meta = crearMeta('#' + colorAmbiente.getHexString());
            const destino = fin.pos.clone().addScaledVector(tang, 12); // castillo grande → más lejos
            meta.position.set(destino.x, 0, destino.z);
            // el portón del castillo está en +Z local; orientarlo hacia el camino (−tang)
            meta.rotation.y = Math.atan2(-tang.x, -tang.z);
            grupo.add(meta);
            // sendero de entrada desde el fin hasta el portón
            const portonPos = destino.clone().addScaledVector(tang, -6);
            dibujarEntrada(fin.pos.clone(), portonPos);
        };

        if (esRamificado) {
            // Casita al final de cada rama (nodo experiencia).
            for (let r = 1; r <= ramasTotales; r++) {
                const exp = nodosDeRama(r).find(n => esParadaExperiencia(n.parada));
                ponerCasa(exp, curvasRama[r], r - 1);
            }
            // Castillo en el fin (el camino al fin viene por el tramo curvasRama[0]).
            const fin = idFin ? nodos[idFin] : null;
            const tangFin = curvasRama[0] ? curvasRama[0].getTangent(0.999).normalize()
                : new THREE.Vector3(1, 0, 0);
            ponerMeta(fin, tangFin);
        } else {
            // LINEAL: casita en la experiencia + castillo en el fin.
            const exp = Object.values(nodos).find(n => esParadaExperiencia(n.parada));
            ponerCasa(exp, curva, 0);
            const fin = idFin ? nodos[idFin] : null;
            const tang = curva.getTangent(0.999).normalize();
            ponerMeta(fin, tang);
        }

        construirVallas();
    }

    // Cerca/valla low-poly (postes + travesaños) que cruza la entrada de una rama.
    function crearValla() {
        const g = new THREE.Group();
        const madera = new THREE.MeshStandardMaterial({ color: '#a9764a', roughness: .9, flatShading: true });
        const ancho = (ANCHO_CAMINO + 1.4) * 2; // cubre el ancho del sendero
        // postes verticales
        for (let i = 0; i <= 4; i++) {
            const x = -ancho / 2 + (ancho / 4) * i;
            const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 2.2, 8), madera);
            poste.position.set(x, 1.1, 0); poste.castShadow = true; g.add(poste);
            // remate del poste
            const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), madera);
            cap.position.set(x, 2.2, 0); g.add(cap);
        }
        // travesaños horizontales (2)
        [0.75, 1.5].forEach(y => {
            const trav = new THREE.Mesh(new THREE.BoxGeometry(ancho, 0.22, 0.3), madera);
            trav.position.set(0, y, 0); trav.castShadow = true; g.add(trav);
        });
        // cartelito "🚧" simbólico (aspa de aviso) al centro
        const aspa = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.08),
            new THREE.MeshStandardMaterial({ color: '#e0a83a', roughness: .7 }));
        aspa.position.set(0, 2.6, 0.05); g.add(aspa);
        return g;
    }

    // Coloca una valla cruzando la entrada de CADA rama (entre la bifurcación y la
    // cabecera). Su visibilidad se controla en el loop: solo la rama habilitada se
    // abre. Solo en ramificado.
    function construirVallas() {
        vallas = {};
        if (!esRamificado || !idModulo || !nodos[idModulo] || !nodos[idModulo].pos) return;
        const pBif = nodos[idModulo].pos;
        for (let r = 1; r <= ramasTotales; r++) {
            const cab = cabeceraDeRama(r);
            if (!cab || !nodos[cab] || !nodos[cab].pos || !curvasRama[r]) continue;
            // punto a ~35% del tramo bifurcación→cabecera, mirando a lo largo de la rama
            const pEntrada = pBif.clone().lerp(nodos[cab].pos, 0.5);
            const tang = curvasRama[r].getTangent(0.15).normalize();
            const v = crearValla();
            v.position.set(pEntrada.x, 0, pEntrada.z);
            v.rotation.y = Math.atan2(tang.x, tang.z); // perpendicular al camino
            scene.add(v);
            vallas[r] = v;
        }
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
            // no invadir la casa del inicio (evita árboles dentro de la casa)
            if (casaInicioCentro && Math.hypot(x - casaInicioCentro.x, z - casaInicioCentro.z) < casaInicioCentro.r) continue;
            // no invadir la carpa de la zona de juegos
            if (zonaJuegosCentro && Math.hypot(x - zonaJuegosCentro.x, z - zonaJuegosCentro.z) < zonaJuegosCentro.r) continue;
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
    // Nubes: delegado en el módulo recorrido3d/nubes.js.
    function construirNubes() { ctrlNubes = crearNubes(scene, TAM); }
    function animarNubes(dtSeg) { if (ctrlNubes) ctrlNubes.animar(dtSeg); }

    // ===================== Animales — delegado en recorrido3d/animales.js =====
    function construirAnimales() { ctrlAnimales = crearAnimales(scene, lagoCentro, equipoModesto); }
    function animarAnimales(now, dtSeg) { if (ctrlAnimales) ctrlAnimales.animar(now, dtSeg); }

    // ===================== Fuegos — delegado en recorrido3d/fuegos.js =========
    function iniciarFuegos() {
        if (!ctrlFuegos) ctrlFuegos = crearFuegos(scene);
        const fin = idFin ? nodos[idFin] : null;
        ctrlFuegos.iniciar(fin && fin.pos ? fin.pos : null);
    }
    function animarFuegos(dtSeg) { if (ctrlFuegos) ctrlFuegos.animar(dtSeg); }

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
        // sin castShadow: el personaje se mueve y las sombras del sol están
        //  congeladas (autoUpdate=false); su sombra la da el disco falso del suelo.
        mochila.position.set(0, 1.55, -0.42); personaje.add(mochila);
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
    // Coloca el personaje sobre un nodo (por id) o, en compat, por índice.
    function colocarPersonajeEn(idOrIdx) {
        let p = null;
        if (typeof idOrIdx === 'string' && nodos[idOrIdx] && nodos[idOrIdx].pos) {
            p = nodos[idOrIdx].pos;
        } else if (typeof idOrIdx === 'number') {
            const par = camino.paradas[idOrIdx];
            if (par && nodos[par.id] && nodos[par.id].pos) p = nodos[par.id].pos;
            else p = curva.getPoint(idOrIdx / (N - 1));
        }
        if (!p) p = curva.getPoint(0);
        personaje.position.set(p.x, 0, p.z);
    }

    function construirLuces() {
        // Iluminación SUAVE tipo ilustración: sol tenue + mucha luz ambiental
        // hemisférica, para bajar el contraste y las sombras duras (look plano).
        sol = new THREE.DirectionalLight(0xfff4e0, 1.25);
        sol.position.set(-40, 60, 30); sol.castShadow = true;
        // Shadow map más pequeño en tablet (1024) que en desktop (2048): 4x menos
        //  texels que sombrear, apenas perceptible con estas sombras suaves.
        const smSize = equipoModesto ? 1024 : 2048;
        sol.shadow.mapSize.set(smSize, smSize);
        sol.shadow.camera.left = -60; sol.shadow.camera.right = 60;
        sol.shadow.camera.top = 42; sol.shadow.camera.bottom = -42;
        sol.shadow.camera.near = 1; sol.shadow.camera.far = 220;
        sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.08; sol.shadow.radius = 4;
        scene.add(sol);
        // El sol NO se mueve y la escena (casas, árboles, terreno) es estática: la
        //  sombra se calcula una sola vez y se congela. Esto evita re-renderizar el
        //  shadow map en cada frame → gran ahorro de GPU en tablet.
        //  (El personaje camina, pero su sombra es un disco falso, no de shadow map.)
        renderer.shadowMap.autoUpdate = false;
        renderer.shadowMap.needsUpdate = true; // fuerza el cálculo en el primer frame
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
        if (recorridoIniciado) {
            const tocables = nodosTocables();
            const est = tocables.length ? estacionPorId(tocables[0]) : null;
            if (est) foco = p.clone().lerp(est.grupo.position, 0.42);
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
        const tocables = nodosTocables();
        estaciones.forEach((e, i) => {
            const id = e.parada.id;
            const esSiguiente = tocables.indexOf(id) >= 0;
            const visitada = visitados.has(id) && id !== 'inicio' && id !== 'fin' && id !== nodoActual;
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
        actualizarVallas();
    }

    // ===================== Interacción =====================
    let raycaster, puntero;
    function alTocar(clientX, clientY) {
        if (caminando || juegosAbiertos) return;
        puntero.x = (clientX / window.innerWidth) * 2 - 1;
        puntero.y = -(clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(puntero, camera);

        // 1) ¿Tocó la ZONA DE JUEGOS? El personaje CAMINA hasta la carpa y, al
        //    llegar, se abre la galería. (Accesible aun sin iniciar el recorrido.)
        if (zonaJuegos) {
            const objJuegos = [];
            zonaJuegos.traverse(o => { if (o.isMesh) objJuegos.push(o); });
            if (raycaster.intersectObjects(objJuegos, false)[0]) {
                caminarACarpa();
                return;
            }
        }

        // 2) Estaciones (solo con el recorrido ya iniciado)
        if (!recorridoIniciado) return;
        const objetos = [];
        estaciones.forEach(e => e.grupo.traverse(o => { if (o.isMesh) { o.userData.estId = e.parada.id; objetos.push(o); } }));
        const hit = raycaster.intersectObjects(objetos, false)[0];
        if (!hit) return;
        const id = hit.object.userData.estId;
        if (id === nodoActual && visitados.has(id)) {
            // reabrir el modal de la estación actual
            const est = estacionPorId(id);
            if (est) abrirModalParada(est.indice);
        } else if (esTocable(id)) {
            caminarA(id);
        }
    }

    // El personaje CAMINA (línea recta) desde donde esté hasta el frente de la
    // carpa y, al llegar, abre la galería. Reutiliza el motor de caminata del loop.
    function caminarACarpa() {
        if (caminando || entrandoSaliendo || juegosAbiertos || !zonaJuegosParada || !personaje) return;
        const origen = personaje.position.clone(); origen.y = 0;
        const destino = zonaJuegosParada.clone(); destino.y = 0;
        // Recordar dónde estaba el personaje para devolverlo al cerrar la galería,
        // así el recorrido continúa desde donde iba.
        posAntesDeCarpa = { pos: origen.clone(), rotY: personaje.rotation.y };
        if (origen.distanceTo(destino) < 0.6) { abrirZonaJuegos(); return; } // ya está al lado
        // Curva recta (2 puntos) que el loop recorre igual que las del grafo.
        animCurva = new THREE.CatmullRomCurve3([origen, destino], false, 'catmullrom', 0.5);
        animT0 = 0; animT1 = 1;
        caminando = true; caminandoLibre = true;
        alLlegarLibre = function () { abrirZonaJuegos(); };
        personaje.visible = true; ocultarEtiqueta();
        animDur = Math.max(1200, origen.distanceTo(destino) * 85);
        animInicio = performance.now();
    }

    // Abre la galería de juegos (HTML) por encima del canvas 3D, reutilizando
    // window.BancoJuegos. El 3D sigue vivo detrás; al volver, solo se cierra.
    function abrirZonaJuegos() {
        if (juegosAbiertos || !window.BancoJuegos) return;
        juegosAbiertos = true;
        // Contenedor propio para no pisar el HUD/canvas del recorrido.
        const cont = document.createElement('div');
        cont.className = 'rn3d-juegos-capa';
        ctx.$paso[0].appendChild(cont);
        const color = (camino && camino.ambiente && camino.ambiente.color_hex) || '';
        window.BancoJuegos.abrir({
            $paso: window.jQuery(cont),
            color,
            onVolver: function () {
                juegosAbiertos = false;
                cont.remove();
                // Devolver el personaje a donde estaba antes de ir a la carpa.
                if (posAntesDeCarpa && personaje) {
                    personaje.position.copy(posAntesDeCarpa.pos);
                    personaje.rotation.y = posAntesDeCarpa.rotY;
                    posAntesDeCarpa = null;
                }
            },
        });
    }

    // ===================== Avance guiado (por GRAFO) =====================
    // La animación recorre una curva concreta entre t0 y t1 (puede ser reversa).
    let animInicio = 0, animDur = 0, alLlegarCb = null;
    let animCurva = null, animT0 = 0, animT1 = 1, animDestinoId = null;

    // Devuelve { curva, t0, t1 } para animar del nodo `origen` al nodo `destino`.
    // Ambos deben ser adyacentes en el layout (tronco, misma rama, o módulo↔fin).
    function tramoEntre(origenId, destinoId) {
        const o = nodos[origenId], d = nodos[destinoId];
        if (!o || !d) return null;
        const ro = o.rama, rd = d.rama;

        if (esRamificado && curvaTronco) {
            // Ambos en el TRONCO (rama 0, no el fin) → mover sobre curvaTronco.
            const oTronco = ro === 0 && origenId !== idFin;
            const dTronco = rd === 0 && destinoId !== idFin;
            if (oTronco && dTronco) {
                return { curva: curvaTronco, t0: o.t || 0, t1: d.t || 0 };
            }
            // Hacia el fin (desde bifurcación o experiencia) → tramo curvasRama[0].
            if (destinoId === idFin && curvasRama[0]) {
                return { curva: curvasRama[0], t0: 0, t1: 1 };
            }
            // Dentro de una rama, bifurcación→cabecera, o experiencia→bifurcación.
            const rama = rd > 0 ? rd : ro;
            if (rama > 0 && curvasRama[rama]) {
                const t0 = (origenId === idModulo) ? 0 : (o.t || 0);
                const t1 = (destinoId === idModulo) ? 0 : (d.t || 0);
                return { curva: curvasRama[rama], t0, t1 };
            }
        }
        // LINEAL: curva única, t por nodo.
        return { curva: curva, t0: o.t || 0, t1: d.t || 0 };
    }

    // Mueve al personaje al nodo `destinoId` SIN validar (uso interno / automático).
    function caminarAForzado(destinoId, alLlegar) {
        if (caminando || entrandoSaliendo || !destinoId || destinoId === nodoActual) { if (alLlegar) alLlegar(); return; }
        const tramo = tramoEntre(nodoActual, destinoId);
        if (!tramo) { if (alLlegar) alLlegar(); return; }
        personaje.visible = true; // por si venía de estar dentro de una casa

        cerrarModal();
        caminando = true; ocultarEtiqueta();
        animCurva = tramo.curva; animT0 = tramo.t0; animT1 = tramo.t1;
        animDestinoId = destinoId; alLlegarCb = alLlegar || null;

        const p0 = animCurva.getPoint(animT0), p1 = animCurva.getPoint(animT1);
        animDur = Math.max(1400, p0.distanceTo(p1) * 85);
        animInicio = performance.now();
        const est = estacionPorId(destinoId);
        if (est) indiceActual = est.indice;
        actualizarHud(true);
    }

    // Camina hacia el nodo `destinoId` (string) si es TOCABLE. `alLlegar` opcional.
    function caminarA(destinoId, alLlegar) {
        if (typeof destinoId === 'number') {
            destinoId = (camino.paradas[destinoId] || {}).id;
        }
        if (caminando || !destinoId || destinoId === nodoActual) { if (alLlegar) alLlegar(); return; }
        if (!esTocable(destinoId)) { if (alLlegar) alLlegar(); return; }
        caminarAForzado(destinoId, alLlegar);
    }

    // Retorno AUTOMÁTICO al fin tras la última experiencia: camina de vuelta al
    // módulo y luego por el tramo hasta el castillo, sin saltarse ningún tramo.
    let regresandoAlFin = false;
    function irAlFinAutomatico() {
        if (regresandoAlFin || !idFin) return;
        regresandoAlFin = true;
        const pasoAlModulo = () => {
            // si ya estamos en el módulo (o no es ramificado), ir directo al fin
            if (!esRamificado || nodoActual === idModulo) { pasoAlFin(); return; }
            caminarAForzado(idModulo, () => setTimeout(pasoAlFin, 300));
        };
        const pasoAlFin = () => {
            caminarAForzado(idFin, () => { regresandoAlFin = false; });
        };
        pasoAlModulo();
    }
    // ---- Entrar / salir de la casa (animación en el loop) ----
    // Anima al personaje: camina un poco hacia la puerta y se encoge/hunde (entra),
    // o reaparece en la puerta y crece caminando de vuelta (sale). onFin al terminar.
    let animCasa = null; // { modo:'entrar'|'salir', ini, dur, desde, puerta, base, onFin }
    function animarEntradaSalida(now) {
        if (!animCasa) return;
        const a = animCasa;
        const k = Math.min(1, (now - a.ini) / a.dur);
        const ease = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        if (a.modo === 'entrar') {
            personaje.position.lerpVectors(a.desde, a.puerta, ease);
            const s = 1 - ease;                       // se encoge al entrar
            personaje.scale.setScalar(a.base * Math.max(0.001, s));
            personaje.visible = ease < 0.98;
            // pasitos rápidos mientras entra
            const paso = Math.sin(now / 80);
            if (piernaIzq) { piernaIzq.rotation.x = paso * 0.7; piernaDer.rotation.x = -paso * 0.7; }
        } else { // salir
            personaje.visible = true;
            personaje.position.lerpVectors(a.puerta, a.desde, ease);
            const s = ease;                           // crece al salir
            personaje.scale.setScalar(a.base * Math.max(0.001, s));
            const paso = Math.sin(now / 80);
            if (piernaIzq) { piernaIzq.rotation.x = paso * 0.7; piernaDer.rotation.x = -paso * 0.7; }
        }
        if (k >= 1) {
            personaje.scale.setScalar(a.base);
            if (piernaIzq) { piernaIzq.rotation.x = 0; piernaDer.rotation.x = 0; }
            if (a.modo === 'entrar') personaje.visible = false;
            else personaje.visible = true;
            const fin = a.onFin; animCasa = null; entrandoSaliendo = false;
            if (fin) fin();
        }
    }

    function entrarACasa(onFin) {
        const puerta = puertasCasa[nodoActual];
        if (!puerta) { if (onFin) onFin(); return; }   // sin casa (no debería pasar en exp)
        entrandoSaliendo = true;
        animCasa = {
            modo: 'entrar', ini: performance.now(), dur: 900,
            desde: personaje.position.clone(),
            puerta: new THREE.Vector3(puerta.x, 0, puerta.z),
            base: personaje.scale.x, onFin: onFin || null,
        };
    }
    function salirDeCasa(onFin) {
        const puerta = puertasCasa[nodoActual];
        if (!puerta) { personaje.visible = true; if (onFin) onFin(); return; }
        entrandoSaliendo = true;
        // el destino de salida es la estación de la experiencia (donde estaba)
        const est = estacionPorId(nodoActual);
        const destino = est ? est.grupo.position.clone() : personaje.position.clone();
        animCasa = {
            modo: 'salir', ini: performance.now(), dur: 900,
            desde: new THREE.Vector3(destino.x, 0, destino.z),
            puerta: new THREE.Vector3(puerta.x, 0, puerta.z),
            base: personaje.scale.x, onFin: onFin || null,
        };
    }

    function terminarAvance() {
        caminando = false;
        // El personaje llegó al nodo destino.
        nodoActual = animDestinoId || nodoActual;
        visitados.add(nodoActual);
        indiceMaximoVisitado = Math.max(indiceMaximoVisitado, indiceActual);

        const p = nodos[nodoActual] ? nodos[nodoActual].parada : camino.paradas[indiceActual];

        // Si llegó a una experiencia, su rama queda COMPLETADA.
        if (p && esParadaExperiencia(p)) {
            const r = ramaDeNodo(nodoActual);
            if (r > 0) ramasCompletadas.add(r);
        }

        actualizarProgreso(); refrescarEstaciones(); actualizarHud(false);
        const cb = alLlegarCb; alLlegarCb = null;

        // AUTOMÁTICO al llegar: en experiencia → ENTRA a la casa y luego abre el
        // modal; en otras paradas, abre su modal directo.
        if (p && esParadaExperiencia(p)) {
            entrarACasa(() => abrirExperiencia());
        } else if (p && p.id !== 'inicio' && p.id !== 'fin') {
            abrirModalParada(indiceActual);
        } else if (p && p.id === 'fin') {
            narrarParada(p);
            iniciarFuegos();          // ¡fuegos pirotécnicos sobre el castillo!
            mostrarCelebracionFin();  // overlay de celebración (confeti + mensaje)
        }
        if (cb) cb();
    }

    function fraseMediaParada(p) {
        const tipo = tipoMediaParada(p);
        if (tipo === 'video') return ' Veamos el video.';
        if (tipo === 'imagen') return ' Mira esta imagen.';
        return '';
    }

    // Frase que el personaje "dice" al llegar a cada estación, según su tipo.
    function fraseParada(p) {
        if (!p) return '';
        const t = p.titulo || '';
        switch (p.id) {
            case 'modulo':      return '¡Mira! Nuestro módulo es: ' + t + '.' + fraseMediaParada(p);
            case 'eje':         return 'Ahora seguimos con el eje: ' + t + '.' + fraseMediaParada(p);
            case 'tematica':    return 'La temática de hoy es: ' + t + '.';
            case 'fin':         return '¡Lo lograste! Terminamos la aventura. ¡Muy bien!';
            default:
                if (esParadaExperiencia(p)) {
                    return '¡Llegamos a la experiencia: ' + t + '! ¿La hacemos juntos?';
                }
                return t;
        }
    }
    function narrarParada(p, alTerminar) { hablar(fraseParada(p), alTerminar); }

    function tipoMediaParada(p) {
        if (!p) return 'ninguno';
        return p.tipo_media || (p.imagen_url ? 'imagen' : (p.video_url || p.videoUrl ? 'video' : 'ninguno'));
    }

    function esVideoParada(p) {
        return tipoMediaParada(p) === 'video';
    }

    function esImagenParada(p) {
        return tipoMediaParada(p) === 'imagen';
    }

    function esMediaFullscreenParada(p) {
        return esVideoParada(p) || esImagenParada(p);
    }

    function datosVideoParada(p) {
        const embed = p.media_embed || 'directo';
        const embedUrl = p.embed_url || p.media_url || p.video_url || p.videoUrl || '';
        return { embed, embedUrl };
    }

    function mostrarOverlayVideo(tipoMedia) {
        const $fs = $('#rn3dVideoFs');
        const $btn = $('#rn3dMediaFsCerrar');
        const esImg = tipoMedia === 'imagen';
        if ($btn.length) {
            $btn.prop('hidden', !esImg).attr('aria-hidden', esImg ? 'false' : 'true');
        }
        $fs.prop('hidden', false).attr('aria-hidden', 'false').addClass('rn3d-video-fs--activo');
        document.body.classList.add('rn3d-video-reproduciendo');
    }

    function ocultarOverlayVideo() {
        const $fs = $('#rn3dVideoFs');
        const $btn = $('#rn3dMediaFsCerrar');
        if ($btn.length) {
            $btn.prop('hidden', true).attr('aria-hidden', 'true');
        }
        $fs.prop('hidden', true).attr('aria-hidden', 'true').removeClass('rn3d-video-fs--activo');
        document.body.classList.remove('rn3d-video-reproduciendo');
    }

    function desactivarEscuchaEmbedVideo() {
        if (!escuchandoEmbedVideo) return;
        escuchandoEmbedVideo = false;
        window.removeEventListener('message', onMensajeEmbedVideo);
    }

    function onMensajeEmbedVideo(e) {
        if (!paradaVideoActual) return;
        const embed = paradaVideoActual.media_embed || 'directo';

        if (embed === 'youtube' && String(e.origin || '').includes('youtube.com')) {
            try {
                const d = JSON.parse(e.data);
                const finYoutube = (d.event === 'infoDelivery' && d.info && d.info.playerState === 0)
                    || (d.event === 'onStateChange' && d.info === 0);
                if (finYoutube) finalizarVideoParada();
            } catch (err) { /* noop */ }
        }

        if (embed === 'vimeo' && String(e.origin || '').includes('vimeo.com')) {
            try {
                const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                if (d && d.event === 'finish') finalizarVideoParada();
            } catch (err) { /* noop */ }
        }
    }

    function activarEscuchaEmbedVideo() {
        if (escuchandoEmbedVideo) return;
        escuchandoEmbedVideo = true;
        window.addEventListener('message', onMensajeEmbedVideo);
    }

    function mostrarVolverAVerVideo() {
        const $v = $('#rnModalVideo');
        $v.prop('hidden', false).attr('aria-hidden', 'false').html(
            '<div class="rn3d-video-replay">'
            + '<button type="button" class="rn3d-video-replay__btn" data-accion="rever-video">'
            + '<i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Volver a ver'
            + '</button></div>'
        );
    }

    function finalizarVideoParada() {
        const $fs = $('#rn3dVideoFs');
        const vid = $fs.find('video')[0];
        if (vid) {
            try { vid.pause(); } catch (e) { /* noop */ }
        }
        $fs.find('iframe').each(function () { this.src = ''; });
        $('#rn3dVideoFsInner').empty();
        ocultarOverlayVideo();
        desactivarEscuchaEmbedVideo();
        if (paradaVideoActual) mostrarVolverAVerVideo();
    }

    function detenerVideoParada() {
        paradaVideoActual = null;
        const $fs = $('#rn3dVideoFs');
        const vid = $fs.find('video')[0];
        if (vid) {
            try { vid.pause(); } catch (e) { /* noop */ }
        }
        $fs.find('iframe').each(function () { this.src = ''; });
        $('#rn3dVideoFsInner').empty();
        ocultarOverlayVideo();
        desactivarEscuchaEmbedVideo();
        $('#rnModalVideo').prop('hidden', true).attr('aria-hidden', 'true').empty();
    }

    function reproducirImagenParada(p) {
        if (!p || !esImagenParada(p)) return;

        paradaVideoActual = p;
        const url = p.imagen_url || p.media_url;
        if (!url) return;

        const $inner = $('#rn3dVideoFsInner');
        $inner.empty();
        $('#rnModalVideo').prop('hidden', true).attr('aria-hidden', 'true').empty();

        const img = document.createElement('img');
        img.className = 'rn3d-media-fs__img';
        img.src = url;
        img.alt = p.titulo || 'Imagen';
        $inner[0].appendChild(img);

        mostrarOverlayVideo('imagen');
    }

    function reproducirVideoParada(p) {
        if (!p || !esVideoParada(p)) return;

        paradaVideoActual = p;
        const { embed, embedUrl } = datosVideoParada(p);
        if (!embedUrl) return;

        const $fs = $('#rn3dVideoFs');
        const $inner = $('#rn3dVideoFsInner');
        $inner.empty();
        $('#rnModalVideo').prop('hidden', true).empty();

        if (embed === 'youtube' || embed === 'vimeo') {
            let src = p.embed_url || embedUrl;
            src += (src.indexOf('?') >= 0 ? '&' : '?') + 'autoplay=1&playsinline=1';
            if (embed === 'youtube') src += '&enablejsapi=1&rel=0';
            if (embed === 'vimeo') src += '&autopause=0';

            const iframe = document.createElement('iframe');
            iframe.src = src;
            iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
            iframe.setAttribute('allowfullscreen', 'true');
            iframe.setAttribute('title', p.titulo || 'Video');
            iframe.addEventListener('load', function () {
                try {
                    iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
                } catch (err) { /* noop */ }
            });
            $inner[0].appendChild(iframe);
            activarEscuchaEmbedVideo();
            mostrarOverlayVideo('video');
            return;
        }

        const video = document.createElement('video');
        video.src = embedUrl;
        video.playsInline = true;
        video.autoplay = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        $inner[0].appendChild(video);

        const alFinDirecto = function () { finalizarVideoParada(); };
        video.addEventListener('ended', alFinDirecto, { once: true });
        video.addEventListener('error', alFinDirecto, { once: true });

        mostrarOverlayVideo('video');
        video.play().catch(function () {
            finalizarVideoParada();
        });
    }

    // ===================== MODALES — reusa el DOM del kiosco =====================
    function htmlModalFooter(p) {
        if (p.id === 'fin') return '<button type="button" class="rn-camino-btn rn-camino-btn--pri" id="rnModalSalirKiosco">Salir</button>';
        if (esParadaExperiencia(p)) {
            return '<button type="button" class="rn-camino-btn rn-camino-btn--sec" data-accion="cerrar-exp">Cerrar</button>'
                + '<button type="button" class="rn-camino-btn rn-camino-btn--pri" data-accion="iniciar-experiencia">Iniciar experiencia</button>';
        }
        // módulo / eje / temática / info: botón "Continuar" cierra y deja resaltada la siguiente
        return '<button type="button" class="rn-camino-btn rn-camino-btn--pri" data-accion="cerrar">¡Seguir!</button>';
    }
    function renderMediaParada(p) {
        const $v = $('#rnModalVideo');
        const tipo = tipoMediaParada(p);

        if (tipo === 'video' || tipo === 'imagen') {
            $v.prop('hidden', true).attr('aria-hidden', 'true').empty();
            return;
        }

        $v.prop('hidden', true).attr('aria-hidden', 'true').empty();
    }

    function abrirModalParada(indice) {
        const p = camino.paradas[indice];
        if (!p || indice > indiceMaximoVisitado) return;
        detenerVideoParada();
        indiceModal = indice;
        paradaVideoActual = esMediaFullscreenParada(p) ? p : null;
        $('#rnModalEtiqueta').text(p.etiqueta || '');
        $('#rnModalTitulo').text(p.titulo || '');
        const cuerpoTexto = escapar(p.texto || '').replace(/\n\n/g, '</p><p class="rn-camino-modal__texto">');
        if (p.icono) {
            $('#rnModalBody').html('<p class="rn-camino-modal__icono" aria-hidden="true">' + escapar(p.icono) + '</p>'
                + '<p class="rn-camino-modal__texto">' + cuerpoTexto + '</p>');
        } else {
            $('#rnModalBody').html('<p class="rn-camino-modal__texto">' + cuerpoTexto + '</p>');
        }
        renderMediaParada(p);
        $('#rnModalFooter').html(htmlModalFooter(p));
        $('#rnCaminoModal').prop('hidden', false);

        if (esVideoParada(p)) {
            narrarParada(p, function () { reproducirVideoParada(p); });
        } else if (esImagenParada(p)) {
            narrarParada(p, function () { reproducirImagenParada(p); });
        } else {
            narrarParada(p);
        }
    }
    // Cierre genérico del modal (usado internamente al caminar, abrir otro modal,
    // etc.). NO dispara salidas de casa ni retornos automáticos.
    function cerrarModal() {
        detenerVideoParada();
        $('#rnCaminoModal').prop('hidden', true).removeClass('rn3d-modal-exp');
        indiceModal = null;
    }

    // Cierre EXPLÍCITO de la tarjeta de experiencia (botón "Cerrar"): el niño sale
    // de la casa y, si ya completó todas las ramas, arranca el retorno al fin.
    function cerrarTarjetaExperiencia() {
        cerrarModal();
        const p = nodoActual ? (nodos[nodoActual] && nodos[nodoActual].parada) : null;
        const esExp = p && esParadaExperiencia(p);
        const dentroDeCasa = esExp && !personaje.visible && !caminando && !entrandoSaliendo;

        const trasCerrar = () => {
            if (esExp && !caminando && !regresandoAlFin
                && ramasPendientes().length === 0 && nodoActual !== idFin
                && !visitados.has(idFin)) {
                setTimeout(irAlFinAutomatico, 250);
            }
        };

        if (dentroDeCasa) {
            salirDeCasa(() => { refrescarEstaciones(); actualizarHud(false); trasCerrar(); });
        } else {
            trasCerrar();
        }
    }

    // ===================== Experiencia — reusa VistaNino =====================
    function urlExperiencia(id) { return String(ctx.urlExperienciaTpl || '').replace('__ID__', String(id)); }
    function cerrarPlayer() {
        detenerNarracion();
        if (window.VistaNino && typeof window.VistaNino.detener === 'function') window.VistaNino.detener();
        const $player = ctx.$player;
        if ($player && $player.length) {
            $player.prop('hidden', true).removeClass('rn-player--camino-overlay').attr('aria-hidden', 'true');
        }
        if (ctx.$shell && ctx.$shell.length) {
            ctx.$shell.prop('hidden', false).attr('aria-hidden', 'false');
        }
        if (renderer && renderer.domElement) renderer.domElement.hidden = false;
        $('#rnCaminoModalPlayer').prop('hidden', true);
        $('body').removeClass('rn-player-activo');
        experienciaCargada = null;
    }

    function volverAlMapaDesdeExperiencia() {
        cerrarPlayer();
        // El personaje SALE de la casa (si estaba dentro).
        if (!personaje.visible || puertasCasa[nodoActual]) {
            salirDeCasa(() => { refrescarEstaciones(); actualizarHud(false); });
        } else {
            refrescarEstaciones(); actualizarHud(false);
        }
    }

    function opcionesVistaNino(bloques, mediaBase, nombre) {
        return {
            bloques,
            mediaBase: mediaBase || '',
            experienciaNombre: nombre || 'Experiencia',
            estudianteSexo: String($('#rnApp').data('estudiante-sexo') || ''),
            alTerminarExperiencia: volverAlMapaDesdeExperiencia,
        };
    }

    function abrirExperiencia() {
        cerrarModal();
        const p = camino.paradas[indiceActual];
        if (!esParadaExperiencia(p)) return;
        const expId = p.experiencia_id || camino.experiencia_id;
        if (!expId) return;
        indiceModal = indiceActual;
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
        narrarParada(p);
    }
    function iniciarExperiencia() {
        cerrarModal();
        const idxExp = indiceModal !== null ? indiceModal : indiceActual;
        const p = camino.paradas[idxExp];
        if (!esParadaExperiencia(p)) return;
        const expId = p?.experiencia_id || camino.experiencia_id;
        if (!expId) return;

        if (experienciaCargada && experienciaCargada.id && Number(experienciaCargada.id) !== Number(expId)) {
            experienciaCargada = null;
        }

        const $player = ctx.$player;
        if (!$player || !$player.length) {
            alert('No se encontró el reproductor de la experiencia.');
            return;
        }

        if (ctx.$shell && ctx.$shell.length) ctx.$shell.prop('hidden', true).attr('aria-hidden', 'true');
        if (renderer && renderer.domElement) renderer.domElement.hidden = true;

        $player.prop('hidden', false).attr('aria-hidden', 'false').addClass('rn-player--camino-overlay');
        $('body').addClass('rn-player-activo');

        if (experienciaCargada) {
            if (window.VistaNino && typeof window.VistaNino.iniciar === 'function') {
                window.VistaNino.iniciar(opcionesVistaNino(
                    experienciaCargada.bloques,
                    experienciaCargada.mediaBase,
                    experienciaCargada.nombre
                ));
            }
            return;
        }

        $.ajax({
            url: urlExperiencia(expId),
            method: 'GET',
            dataType: 'json',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).done(function (res) {
            if (!res?.success) {
                alert(res?.message || 'No se pudo cargar la experiencia.');
                cerrarPlayer();
                return;
            }
            const data = res?.data;
            if (!data?.bloques?.length) {
                alert(res?.message || 'La experiencia no tiene bloques activos.');
                cerrarPlayer();
                return;
            }
            experienciaCargada = {
                id: expId,
                bloques: data.bloques,
                mediaBase: data.media_base || '',
                nombre: data.experiencia?.nombre || 'Experiencia',
            };
            if (window.VistaNino && typeof window.VistaNino.iniciar === 'function') {
                window.VistaNino.iniciar(opcionesVistaNino(
                    experienciaCargada.bloques,
                    experienciaCargada.mediaBase,
                    experienciaCargada.nombre
                ));
                return;
            }
            alert('El reproductor no está disponible. Recarga la página.');
            cerrarPlayer();
        }).fail(function (xhr) {
            const msg = xhr?.responseJSON?.message
                || xhr?.responseJSON?.mensaje
                || 'No se pudo cargar la experiencia.';
            alert(msg);
            cerrarPlayer();
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
            + '</div>'
            + '<div class="rn3d-video-fs" id="rn3dVideoFs" hidden aria-hidden="true">'
            +   '<div class="rn3d-video-fs__inner" id="rn3dVideoFsInner"></div>'
            +   '<button type="button" class="rn3d-media-fs__cerrar" id="rn3dMediaFsCerrar" data-accion="cerrar-media-fs" hidden aria-hidden="true">'
            +     '<i class="fa-solid fa-check" aria-hidden="true"></i> Continuar'
            +   '</button>'
            + '</div>';
        while (wrap.firstChild) ctx.$paso[0].appendChild(wrap.firstChild);
    }

    // Overlay 2D de celebración al llegar al fin: confeti + mensaje festivo.
    function mostrarCelebracionFin() {
        if (document.getElementById('rn3dCelebracion')) return;
        const cont = document.createElement('div');
        cont.id = 'rn3dCelebracion';
        cont.className = 'rn3d-celebracion';
        let confeti = '';
        const cols = ['#ff4d4d', '#ffd24d', '#4dff88', '#4db8ff', '#e04dff', '#ff8f4d'];
        for (let i = 0; i < 60; i++) {
            const c = cols[i % cols.length];
            const left = Math.random() * 100;
            const delay = (Math.random() * 2).toFixed(2);
            const dur = (2.5 + Math.random() * 2).toFixed(2);
            const rot = (Math.random() * 360) | 0;
            confeti += '<span class="rn3d-confeti-p" style="left:' + left + '%;background:' + c +
                ';animation-delay:' + delay + 's;animation-duration:' + dur + 's;transform:rotate(' + rot + 'deg)"></span>';
        }
        cont.innerHTML = '<div class="rn3d-celebracion__confeti">' + confeti + '</div>'
            + '<div class="rn3d-celebracion__msg">🎉 ¡Lo lograste! 🎉<br><small>Completaste toda la aventura</small></div>';
        ctx.$paso[0].appendChild(cont);
        // Desvanecer y quitar tras ~8s.
        setTimeout(() => { cont.classList.add('rn3d-cel-ocultar'); }, 7500);
        setTimeout(() => { if (cont.parentNode) cont.parentNode.removeChild(cont); }, 8200);
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
        animarFuegos(dt);
        animarAnimales(now, dt);
        animarEntradaSalida(now);
        if (caminando && animCurva) {
            const k = Math.min(1, (now - animInicio) / animDur);
            const ease = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            const u = animT0 + (animT1 - animT0) * ease;
            const p = animCurva.getPoint(u);
            let tang = animCurva.getTangent(u).normalize();
            if (animT1 < animT0) tang.multiplyScalar(-1); // caminando en reversa (volver)
            personaje.position.set(p.x, 0, p.z);
            personaje.rotation.y = Math.atan2(tang.x, tang.z);
            // ---- Animación de CAMINAR más natural ----
            const ciclo = now / 95;                    // velocidad del ciclo de paso
            const paso = Math.sin(ciclo);              // fase del paso (contrafase piernas)
            const rebote = Math.abs(Math.sin(ciclo));  // sube en cada apoyo
            personaje.position.y = rebote * 0.16;      // saltito rítmico
            // piernas pivotan desde la cadera, zancada amplia
            if (piernaIzq) { piernaIzq.rotation.x = paso * 0.95; piernaDer.rotation.x = -paso * 0.95; }
            // los tenis acompañan con avance/retroceso y un leve levantar
            if (pieIzq) {
                pieIzq.position.z = 0.05 + paso * 0.4;
                pieDer.position.z = 0.05 - paso * 0.4;
                pieIzq.position.y = 0.24 + Math.max(0, -paso) * 0.18;
                pieDer.position.y = 0.24 + Math.max(0, paso) * 0.18;
            }
            // brazos en oposición a las piernas + leve flexión al balancear
            if (brazoIzq) {
                brazoIzq.rotation.x = -paso * 0.85; brazoDer.rotation.x = paso * 0.85;
                brazoIzq.rotation.z = 0.12; brazoDer.rotation.z = -0.12;
            }
            // balanceo del cuerpo: leve inclinación lateral + torsión al ritmo del paso
            if (cuerpo) { cuerpo.rotation.z = paso * 0.06; cuerpo.rotation.y = paso * 0.08; cuerpo.scale.y = 1; }
            if (cabeza) { cabeza.rotation.z = -paso * 0.04; }
            personaje.rotation.z = Math.sin(ciclo * 2) * 0.02; // micro-vaivén
            if (k >= 1) {
                personaje.position.y = 0; personaje.rotation.z = 0;
                if (piernaIzq) { piernaIzq.rotation.x = 0; piernaDer.rotation.x = 0; }
                if (brazoIzq) { brazoIzq.rotation.x = 0; brazoDer.rotation.x = 0; brazoIzq.rotation.z = 0; brazoDer.rotation.z = 0; }
                if (pieIzq) { pieIzq.position.z = 0.05; pieDer.position.z = 0.05; pieIzq.position.y = 0.24; pieDer.position.y = 0.24; }
                if (cuerpo) { cuerpo.rotation.z = 0; cuerpo.rotation.y = 0; }
                if (cabeza) cabeza.rotation.z = 0;
                caminando = false; animCurva = null;
                if (caminandoLibre) {
                    // Caminata a un punto libre (carpa): ejecuta su callback, NO el
                    // flujo del grafo (terminarAvance marca nodos/abre modales).
                    caminandoLibre = false;
                    const cb = alLlegarLibre; alLlegarLibre = null;
                    if (cb) cb();
                } else {
                    terminarAvance();
                }
            }
        } else {
            // idle: respiración leve + balanceo suave de brazos
            if (cuerpo) cuerpo.scale.y = 1 + Math.sin(now / 500) * 0.03;
            if (brazoIzq) { const b = Math.sin(now / 600) * 0.1; brazoIzq.rotation.z = b; brazoDer.rotation.z = -b; }
        }
        // "Hablar": la boca se abre/cierra mientras hay voz (o durante el diálogo).
        if (boca) {
            const hablando = narrando || mostrandoBocadillo;
            if (hablando) {
                const abrir = 0.5 + Math.abs(Math.sin(now / 90)) * 1.1; // boca articulando
                boca.scale.set(1.3, abrir, 0.5);
                if (cabeza) cabeza.rotation.z = Math.sin(now / 260) * 0.05; // gesto al hablar
            } else {
                boca.scale.set(1.3, 0.5, 0.5);
                if (cabeza) cabeza.rotation.z += (0 - cabeza.rotation.z) * 0.1;
            }
        }
        const tocablesLoop = (!caminando && recorridoIniciado) ? nodosTocables() : [];
        estaciones.forEach((e, i) => {
            const esSig = tocablesLoop.indexOf(e.parada.id) >= 0;
            // Ocultar el número de la estación donde el personaje está parado ahora
            // (no caminando), para que el medallón no se sobreponga al niño.
            const esActual = recorridoIniciado && e.parada.id === nodoActual && !caminando;
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
        // Cartel de la zona de juegos: billboard hacia la cámara + leve flotar.
        if (zonaJuegosCartel) {
            const cy = zonaJuegosCartel.userData.baseY;
            zonaJuegosCartel.position.y = cy + Math.sin(now / 600) * 0.18;
            // lookAt con la posición MUNDIAL de la cámara pero conservando la altura
            // del cartel (para que no se incline hacia arriba/abajo).
            const w = new THREE.Vector3(); zonaJuegosCartel.getWorldPosition(w);
            zonaJuegosCartel.lookAt(camera.position.x, w.y, camera.position.z);
        }
        actualizarCamara(false); actualizarEtiquetaSiguiente(); actualizarBocadillo();
        renderer.render(scene, camera);
        rafId = requestAnimationFrame(animar);
    }

    // ===================== boot(ctx) — misma firma que el 2D =====================
    function boot(options) {
        destroy();
        ctx = options || {};
        try { camino = JSON.parse(document.getElementById('rn-camino')?.textContent || '{}'); }
        catch (e) { camino = { paradas: [], puntos: [] }; }
        if (!camino.paradas?.length) return false;

        N = camino.paradas.length;
        ambienteSlug = (camino.ambiente && camino.ambiente.slug) ? String(camino.ambiente.slug) : '';
        indiceActual = 0; indiceMaximoVisitado = 0; caminando = false; recorridoIniciado = false; experienciaCargada = null;
        lagoCentro = null; ultimoNow = 0; mostrandoBocadillo = false;
        // Estado de grafo
        construirGrafo();
        nodoActual = camino.paradas[0] ? camino.paradas[0].id : null; // arranca en 'inicio'
        visitados = new Set();
        ramasCompletadas = new Set(); regresandoAlFin = false;
        ctrlFuegos = null; vallas = {};
        puertasCasa = {}; entrandoSaliendo = false;
        ctrlNubes = null; ctrlAnimales = null; casaInicioCentro = null;
        zonaJuegos = null; zonaJuegosCartel = null; zonaJuegosCentro = null; juegosAbiertos = false;
        zonaJuegosParada = null; caminandoLibre = false; alLlegarLibre = null; posAntesDeCarpa = null;

        // color del ambiente desde --rn-color
        const rc = getComputedStyle(ctx.$shell[0]).getPropertyValue('--rn-color').trim() || '#0ea5e9';
        try { colorAmbiente = new THREE.Color(rc); } catch (e) {}

        ctx.$shell.addClass('rn-shell--camino rn-shell--3d');
        ctx.$paso.attr('data-paso', 'camino').empty();

        // Canvas 3D
        // --- Detección de tablet/dispositivo modesto para bajar la carga gráfica ---
        //  El coste principal en tablet es el nº de píxeles (pixelRatio alto) y el
        //  antialias MSAA. En pantallas de mucha densidad (DPR>=2) casi no se nota
        //  la diferencia visual bajando el pixelRatio, y el rendimiento sube mucho.
        const esTactil = (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
        const dpr = window.devicePixelRatio || 1;
        equipoModesto = esTactil || dpr >= 2;
        renderer = new THREE.WebGLRenderer({
            antialias: !equipoModesto,          // MSAA solo en desktop
            powerPreference: 'high-performance',
            stencil: false,
        });
        // Techo de pixelRatio: 1.5 en tablet (menos píxeles = más fluido), 2 en desktop.
        renderer.setPixelRatio(Math.min(dpr, equipoModesto ? 1.5 : 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        // Sombras: PCFSoft (suaves) en desktop; PCF simple en tablet. Además se
        //  calculan una sola vez (el sol es fijo) → ver `shadowMap.autoUpdate=false`.
        renderer.shadowMap.type = equipoModesto ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
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
        construirDestinos();
        construirCasaInicio();
        construirZonaJuegos();
        construirVegetacion();
        construirNubes();
        construirAnimales();
        construirPersonaje();
        construirLuces();

        camPos.set(-54, 34, 48); camTarget.set(-43, 2, -6); actualizarCamara(true);

        raycaster = new THREE.Raycaster(); puntero = new THREE.Vector2();
        onCanvasClick = function (e) { alTocar(e.clientX, e.clientY); };
        renderer.domElement.addEventListener('click', onCanvasClick);

        construirModales();
        construirOverlay();

        // Eventos de los modales (delegados en $paso, como el 2D)
        ctx.$paso.off('click.rn3d');
        ctx.$paso.on('click.rn3d', '[data-accion="cerrar"]', function (e) { e.preventDefault(); cerrarModal(); });
        ctx.$paso.on('click.rn3d', '[data-accion="cerrar-exp"]', function (e) { e.preventDefault(); cerrarTarjetaExperiencia(); });
        ctx.$paso.on('click.rn3d', '[data-accion="rever-video"]', function (e) {
            e.preventDefault();
            if (!paradaVideoActual) return;
            if (esVideoParada(paradaVideoActual)) reproducirVideoParada(paradaVideoActual);
            else if (esImagenParada(paradaVideoActual)) reproducirImagenParada(paradaVideoActual);
        });
        ctx.$paso.on('click.rn3d', '[data-accion="cerrar-media-fs"]', function (e) {
            e.preventDefault();
            finalizarVideoParada();
        });
        ctx.$paso.on('click.rn3d', '[data-accion="iniciar-experiencia"]', function (e) { e.preventDefault(); iniciarExperiencia(); });
        ctx.$paso.on('click.rn3d', '#rnModalSalirKiosco', function (e) { e.preventDefault(); salirKiosco(); });

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

    function destroy() {
        detenerNarracion();
        detenerVideoParada();
        cerrarPlayer();
        cerrarModal();

        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }

        if (renderer) {
            if (renderer.domElement && onCanvasClick) {
                renderer.domElement.removeEventListener('click', onCanvasClick);
            }
            try { renderer.dispose(); } catch (e) { /* noop */ }
            if (renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
            renderer = null;
        }
        onCanvasClick = null;

        window.removeEventListener('resize', onResize);
        if (ctx.$paso && ctx.$paso.length) ctx.$paso.off('click.rn3d');

        scene = null;
        camera = null;
        estaciones = [];
        ctrlNubes = null; ctrlAnimales = null; ctrlFuegos = null;
        caminando = false;
        recorridoIniciado = false;
        experienciaCargada = null;
        indiceActual = 0;
        indiceMaximoVisitado = 0;
        indiceModal = null;
    }

    function salirKiosco() { cerrarModal(); if (typeof ctx.onSalir === 'function') ctx.onSalir(); }

    function irAFinRecorrido() {
        volverAlMapaDesdeExperiencia();
    }

    window.KioscoCamino = { boot: boot, destroy: destroy, irAFinRecorrido: irAFinRecorrido };
})();
