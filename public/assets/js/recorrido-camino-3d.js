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
import { armarMundo, cargarPersonaje, clonarEstacion, clonarCastillo, clonarParque, animarPuerta, iniciarLoops, CLIP_QUIETO, CLIP_CAMINAR, CLIP_CORRER, CLIP_SALUDAR, CLIP_HABLAR } from './mapa-mundo.js?v=20261002m';

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
    let curvaExtra = null;        // tramo dibujado más allá del GLB, hacia el castillo
    let grupoRamas = null;        // cintas de tierra de los desvíos
    let grupoCasas = null;        // estación al final de cada experiencia
    let casasPorId = {};          // parada id → grupo de la estación
    let castilloGrupo = null;
    let parqueGrupo = null;
    let caminando = false;
    let recorridoIniciado = false;
    let experienciaCargada = null;
    let indiceModal = null;

    // ---- Three.js refs ----
    let renderer, scene, camera, curva, personaje;
    let estaciones = [];
    let fuegos = [], fuegosActivos = false; // partículas de fuegos pirotécnicos (fin)
    let puertasCasa = {}; // { nodoId: THREE.Vector3 } posición de la puerta del destino
    let entrandoSaliendo = false; // true durante la animación de entrar/salir de la casa
    let zonaJuegos = null;         // grupo 3D de la carpa de juegos (clicable)
    let zonaJuegosCartel = null;   // placa/cartel que hace billboard hacia la cámara
    let zonaJuegosCentro = null;   // zona de la carpa (a evitar por vegetación)
    let zonaJuegosParada = null;   // Vector3 donde el personaje se detiene ante la carpa
    let juegosAbiertos = false;    // true mientras la galería HTML está encima
    let caminandoLibre = false;    // caminata a un punto libre (no del grafo), p.ej. carpa
    let alLlegarLibre = null;      // callback al terminar una caminata libre
    let alLlegarPuente = null;     // tramo intermedio que no cambia de parada
    let posAntesDeCarpa = null;    // posición del personaje antes de ir a la carpa (para volver)
    let ultimoNow = 0; // timestamp previo del loop (para delta time)
    let ambienteSlug = '';
    let rafId = null;
    let equipoModesto = false; // tablet/móvil: recorta calidad para ganar fluidez
    let usaMapaGlb = false;
    let mundo = null;
    let cargaId = 0;
    let mixer = null;
    let accionesPersonaje = null;
    let clipActual = '';
    let clipMovimiento = CLIP_CAMINAR;
    let personajeCual = 'nino';
    // auto: <=3 años. puntos: 4 y 5 (toque en la parada). botones: 6 o más.
    // null = sin fecha de nacimiento en la sesión: se queda en puntos.
    let modoNav = 'puntos';
    let moviendoStick = false;
    let orbitaStick = 0;
    let alturaStick = 0;
    let autoToken = 0;
    let limitesMapa = null;
    const sticks = { mover: { x: 0, y: 0 }, camara: { x: 0, y: 0 } };
    let eligiendoPersonaje = false;
    let enHablaEleccion = false;
    let candidatosPersonaje = null;
    let salidaPersonaje = null;
    let pasoAlCentro = null;
    let sueloEleccion = null;
    let viajeEntrada = null;
    let viajeDetras = null;
    let saludoYaDicho = false;
    let timersEleccion = [];
    let cambiandoPersonaje = false;
    let zoomCam = 1;
    let grupoCaminoParque = null;
    let entradaParque = null;
    let cancelarArranque = 0;
    let focoManual = null;
    let posXCasa = [0, 0, 0];
    let posYCasa = [0, 0, 0];
    const PASO_AJUSTE = 0.3;
    let onCanvasClick = null;
    let N = 0;
    let audioNarracion = null;
    let narrando = false;
    let paradaVideoActual = null;
    let escuchandoEmbedVideo = false;

    const $ = window.jQuery;


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
                pos: null,   // Vector3, asignado al colocar el camino
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
        // Al terminar una experiencia se vuelve al paso 3. El fin no se cruza
        // desde la casa: se toma el sendero que sigue de largo, ya de vuelta.
        if (enExperienciaCompletada()) {
            return idModulo ? [idModulo] : [];
        }
        // - En medio de una rama: el siguiente nodo de la rama no visitado.
        const n = nodos[nodoActual];
        if (!n) return [];
        return n.siguientes.filter(sid => !visitados.has(sid));
    }

    // ¿El id destino es tocable ahora?
    function esTocable(id) {
        return nodosTocables().indexOf(id) >= 0;
    }

    // Índice de estación (en `estaciones[]`) por id de nodo.
    function estacionPorId(id) {
        return estaciones.find(e => e.parada.id === id) || null;
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
            const cNodo = (nodo && nodo.curvaLocal) ? nodo.curvaLocal : curva;
            const t = (nodo && typeof nodo.tLocal === 'number') ? nodo.tLocal
                : ((nodo && typeof nodo.t === 'number') ? nodo.t : (N > 1 ? i / (N - 1) : 0));
            const p = cNodo.getPoint(t);
            // Siempre al mismo lado del sendero (izquierda del sentido de avance),
            // fuera de la calzada. El niño sigue caminando por el centro.
            const tang = cNodo.getTangent(t);
            const lado = new THREE.Vector3(-tang.z, 0, tang.x);
            if (lado.lengthSq() < 1e-6) lado.set(0, 0, 1);
            // La casa de la experiencia ocupa el final del sendero (~9 m).
            // El marcador se aparta para no quedar dentro del muro.
            lado.normalize().multiplyScalar(esParadaExperiencia(par) ? 7.2 : 3.8);
            const g = new THREE.Group();
            g.position.set(p.x + lado.x, p.y || 0, p.z + lado.z);

            // poste de madera (cilindro liso). Sin base cónica (causaba artefactos
            // de líneas en la estación activa por las aristas rasantes al suelo).
            // Poste hasta casi el borde inferior del medallón (centro 5.35, radio 1.15).
            const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.05, 12), matMadera);
            poste.position.y = 2.025; poste.castShadow = true; g.add(poste);

            const colorMed = par.id === 'inicio' ? '#facc15' : (par.id === 'fin' ? '#ec4899' : '#f59e0b');
            const colorBorde = par.id === 'inicio' ? '#a16207' : (par.id === 'fin' ? '#9d174d' : '#b45309');

            // cartel: plano circular con el número, siempre de cara a la cámara (billboard)
            const texCartel = texturaCartel(numeroParada(par, i), colorMed, colorBorde);
            const matCartel = new THREE.MeshBasicMaterial({ map: texCartel, transparent: true, depthWrite: true });
            const medallon = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), matCartel);
            medallon.position.y = 5.35; medallon.userData.baseY = 5.35;
            medallon.castShadow = false; medallon.receiveShadow = false;
            g.add(medallon);

            // aro luminoso para la estación siguiente
            const aro = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.13, 12, 32),
                new THREE.MeshBasicMaterial({ color: '#fde047' }));
            aro.position.y = 5.35; aro.visible = false; g.add(aro);

            // En la parada de INICIO el niño está de pie ahí mismo: ocultamos su
            // poste y medallón para que no le tapen la cara.
            if (par.id === 'inicio') { poste.visible = false; medallon.visible = false; }

            grupo.add(g);
            estaciones.push({ grupo: g, medallon, aro, parada: par, indice: i, colorBase: colorMed, colorBorde });
        });
    }

    // ===================== Fuegos pirotécnicos (fin) =====================
    const COLORES_FUEGO = ['#ff4d4d', '#ffd24d', '#4dff88', '#4db8ff', '#e04dff', '#ff8f4d', '#ffffff'];
    // Lanza una explosión de partículas en (x,y,z): muchas esferitas que salen
    // radialmente, con gravedad y desvanecimiento. Se animan en animarFuegos().
    function lanzarExplosion(x, y, z) {
        const color = new THREE.Color(COLORES_FUEGO[(Math.random() * COLORES_FUEGO.length) | 0]);
        const nPart = 26 + (Math.random() * 14 | 0);
        const geo = new THREE.SphereGeometry(0.22, 6, 6);
        const grupo = new THREE.Group();
        grupo.position.set(x, y, z);
        scene.add(grupo);
        const parts = [];
        for (let i = 0; i < nPart; i++) {
            const mat = new THREE.MeshBasicMaterial({ color: color.clone(), transparent: true, opacity: 1, depthWrite: false });
            const m = new THREE.Mesh(geo, mat);
            // velocidad radial aleatoria en esfera
            const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
            const spd = 6 + Math.random() * 7;
            const v = new THREE.Vector3(
                Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)
            ).multiplyScalar(spd);
            grupo.add(m);
            parts.push({ m, v });
        }
        fuegos.push({ grupo, parts, vida: 0, dur: 1.6 });
    }

    // Programa una salva de fuegos sobre el castillo del fin durante unos segundos.
    function iniciarFuegos() {
        if (fuegosActivos) return;
        fuegosActivos = true;
        const fin = idFin ? nodos[idFin] : null;
        const base = fin && fin.pos ? fin.pos.clone() : new THREE.Vector3(0, 0, 0);
        let lanzadas = 0;
        const total = 14;
        const salva = () => {
            if (!fuegosActivos || lanzadas >= total) { return; }
            lanzadas++;
            const ex = base.x + 4 + (Math.random() - 0.5) * 18;
            const ey = 12 + Math.random() * 8;
            const ez = base.z + (Math.random() - 0.5) * 18;
            lanzarExplosion(ex, ey, ez);
            setTimeout(salva, 350 + Math.random() * 300);
        };
        salva();
        // dejar de programar nuevas tras ~7s (las existentes terminan solas)
        setTimeout(() => { fuegosActivos = false; }, 7000);
    }

    function animarFuegos(dtSeg) {
        if (!fuegos.length) return;
        const G = 9; // gravedad
        for (let i = fuegos.length - 1; i >= 0; i--) {
            const f = fuegos[i];
            f.vida += dtSeg;
            const k = f.vida / f.dur;
            for (const p of f.parts) {
                p.v.y -= G * dtSeg;
                p.m.position.addScaledVector(p.v, dtSeg);
                p.m.material.opacity = Math.max(0, 1 - k);
            }
            if (f.vida >= f.dur) {
                scene.remove(f.grupo);
                f.parts.forEach(p => p.m.material.dispose());
                fuegos.splice(i, 1);
            }
        }
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
        personaje.position.set(p.x, p.y || 0, p.z);
    }

    function ponerClip(nombre) {
        if (!mixer || !accionesPersonaje || !nombre || clipActual === nombre) return;
        const siguiente = accionesPersonaje[nombre];
        if (!siguiente) return;
        const previa = accionesPersonaje[clipActual];
        if (previa) previa.fadeOut(0.2);
        siguiente.reset().fadeIn(0.2).play();
        clipActual = nombre;
    }

    function duracionCaminata(dist) {
        if (!usaMapaGlb) return Math.max(1400, dist * 85);
        const corriendo = dist > 14;
        clipMovimiento = corriendo ? CLIP_CORRER : CLIP_CAMINAR;
        const vel = corriendo ? 6.5 : 3.0;
        return Math.max(800, (dist / vel) * 1000);
    }


    // ===================== Cámara =====================
    const camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
    const _frenteCam = new THREE.Vector3();
    const _posCand = new THREE.Vector3();
    const _lookCand = new THREE.Vector3();
    const _cabezaCam = new THREE.Vector3();
    const _miraSig = new THREE.Vector3();
    const _deseadaPos = new THREE.Vector3();
    const _deseadaTgt = new THREE.Vector3();
    const _puntoSig = new THREE.Vector3();
    const _ndcCam = new THREE.Vector3();
    const camProbe = new THREE.PerspectiveCamera(48, 1, 0.5, 1500);
    let mezclaHabla = 0;
    let seguimientoActivo = false;
    let rumboCamino = 0;
    let orbitaAplicada = 0;
    let distLejosAplicada = 0;
    let acopleDetras = 0;
    let yawObjetivo = null;
    let angLadeo = 0;
    let signoLadeo = 1;
    let yawCamSuave = null;
    const offsetAcople = new THREE.Vector3();
    const posAcoplePrev = new THREE.Vector3();
    const _ejeCasa = new THREE.Vector3();
    // Metros caminados para pasar del plano actual al de detrás. Más alto = giro más lento.
    const ACOPLAR_METROS = 46;
    // Qué tan rápido se acerca y se aleja la cámara al hablar.
    // Más alto = más rápido. 0.012 es lento; 0.05 es brusco.
    const VELOCIDAD_CAMARA_HABLA = 0.052;

    function puntoSiguienteVisible() {
        if (caminando && caminandoLibre) return zonaJuegosParada || null;
        let id = null;
        if (caminando && animDestinoId) id = animDestinoId;
        else if (!caminando && recorridoIniciado) {
            const toc = nodosTocables();
            if (toc.length) id = toc[0];
        }
        if (!id) return null;
        const est = estacionPorId(id);
        if (est && est.medallon) return est.medallon.getWorldPosition(_puntoSig);
        if (est && est.grupo) return est.grupo.position;
        if (nodos[id] && nodos[id].pos) return nodos[id].pos;
        return null;
    }

    function cabeEnVista(camPosicion, look, punto, margen) {
        camProbe.fov = camera.fov;
        camProbe.aspect = camera.aspect || 1;
        camProbe.near = camera.near;
        camProbe.far = camera.far;
        camProbe.position.copy(camPosicion);
        camProbe.up.set(0, 1, 0);
        camProbe.lookAt(look);
        camProbe.updateMatrixWorld(true);
        camProbe.updateProjectionMatrix();
        _ndcCam.copy(punto).project(camProbe);
        if (_ndcCam.z < -1 || _ndcCam.z > 1) return false;
        const m = margen == null ? 0.08 : margen;
        return Math.abs(_ndcCam.x) <= 1 - m && Math.abs(_ndcCam.y) <= 1 - m;
    }

    function posicionDetras(origen, frente, angulo, dist, alt) {
        const detrasX = -frente.x;
        const detrasZ = -frente.z;
        const c = Math.cos(angulo);
        const s = Math.sin(angulo);
        _posCand.set(
            origen.x + (detrasX * c - detrasZ * s) * dist,
            origen.y + alt,
            origen.z + (detrasX * s + detrasZ * c) * dist
        );
        return _posCand;
    }

    function miraSeguimiento(origen, ojoY, siguiente, peso) {
        _lookCand.set(origen.x, origen.y + ojoY, origen.z);
        if (siguiente && peso > 0) {
            _miraSig.set(siguiente.x, siguiente.y, siguiente.z);
            _lookCand.lerp(_miraSig, peso);
        }
        return _lookCand;
    }

    // Elige el menor giro y el menor alejamiento que dejen al personaje y al
    // punto siguiente dentro del encuadre. El giro se queda detrás: no da la vuelta.
    function encuadrarSiguiente(origen, frente, distBase, alt, ojoY, siguiente, pesosForzados) {
        if (!siguiente) return { ang: 0, dist: distBase, peso: 0 };
        const angulos = [0, 0.16, 0.34, 0.55, 0.8, 1.05];
        const dists = [distBase, distBase * 1.2, distBase * 1.45, distBase * 1.75];
        const pesos = pesosForzados || [0.16, 0.32];
        _cabezaCam.set(origen.x, origen.y + ojoY, origen.z);
        for (let ai = 0; ai < angulos.length; ai++) {
            const signos = angulos[ai] === 0 ? [1] : [1, -1];
            for (let si = 0; si < signos.length; si++) {
                const ang = angulos[ai] * signos[si];
                for (let di = 0; di < dists.length; di++) {
                    const dist = dists[di];
                    const altD = alt * (dist / distBase);
                    for (let pi = 0; pi < pesos.length; pi++) {
                        const look = miraSeguimiento(origen, ojoY, siguiente, pesos[pi]);
                        const pos = posicionDetras(origen, frente, ang, dist, altD);
                        if (cabeEnVista(pos, look, _cabezaCam, 0.2) && cabeEnVista(pos, look, siguiente, 0.05)) {
                            return { ang: ang, dist: dist, peso: pesos[pi] };
                        }
                    }
                }
            }
        }
        const dx = siguiente.x - origen.x;
        const dz = siguiente.z - origen.z;
        const cruz = frente.x * dz - frente.z * dx;
        const punto = frente.x * dx + frente.z * dz;
        let ang = Math.atan2(cruz, punto);
        const angMax = 1.05;
        ang = Math.max(-angMax, Math.min(angMax, -ang));
        return { ang: ang, dist: distBase * 1.75, peso: 0.34 };
    }

    function poseDetras(yawExtra) {
        const dist = usaMapaGlb ? 9 : 12;
        const alt = usaMapaGlb ? 5.6 : 7.2;
        const yaw = personaje.rotation.y + (yawExtra || 0);
        let x = personaje.position.x - Math.sin(yaw) * dist;
        let z = personaje.position.z - Math.cos(yaw) * dist;
        const casas = [];
        if (mundo && mundo.casaInicio && typeof mundo.casaInicio.punto === 'function') {
            const c = mundo.casaInicio.punto();
            if (c && Number.isFinite(c.x) && Number.isFinite(c.z)) casas.push(c);
        }
        Object.keys(puertasCasa).forEach((id) => {
            const c = puertasCasa[id];
            if (c && Number.isFinite(c.x) && Number.isFinite(c.z)) casas.push(c);
        });
        casas.forEach((c) => {
            const d = Math.hypot(x - c.x, z - c.z);
            if (d >= 8) return;
            const empuje = 11 - d;
            x += -Math.cos(yaw) * empuje;
            z += Math.sin(yaw) * empuje;
        });
        const dx = x - personaje.position.x;
        const dz = z - personaje.position.z;
        const len = Math.hypot(dx, dz);
        if (len < dist && len > 0.001) {
            x = personaje.position.x + (dx / len) * dist;
            z = personaje.position.z + (dz / len) * dist;
        }
        const fx = Math.sin(yaw);
        const fz = Math.cos(yaw);
        const vx = x - personaje.position.x;
        const vz = z - personaje.position.z;
        if (vx * fx + vz * fz > 0) {
            x = personaje.position.x - vx;
            z = personaje.position.z - vz;
        }
        const ojo = usaMapaGlb ? 1.5 : 2.1;
        return {
            pos: new THREE.Vector3(x, personaje.position.y + alt, z),
            mira: new THREE.Vector3(personaje.position.x, personaje.position.y + ojo, personaje.position.z),
        };
    }

    let yawSigue = null;

    function seguirDetrasManual(inmediato) {
        const meta = personaje.rotation.y;
        if (yawSigue == null || inmediato) yawSigue = meta;
        else {
            let d = meta - yawSigue;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            const tope = 0.045;
            if (d > tope) d = tope;
            else if (d < -tope) d = -tope;
            yawSigue += d;
        }
        const pose = poseDetras(yawSigue - personaje.rotation.y);
        const k = inmediato ? 1 : 0.16;
        camPos.lerp(pose.pos, k);
        camTarget.lerp(pose.mira, k);
        camera.position.copy(camPos);
        camera.lookAt(camTarget);
    }

    function irDetrasDelPersonaje() {
        if (modoNav !== 'botones' || !personaje || !personaje.visible || !camera || entrandoSaliendo) return;
        orbitaStick = 0;
        alturaStick = 0;
        yawSigue = personaje.rotation.y;
        const pose = poseDetras(0);
        viajeDetras = {
            t0: performance.now(),
            dur: 1100,
            desde: camera.position.clone(),
            hasta: pose.pos,
            miraDesde: camTarget.clone(),
            miraHasta: pose.mira,
        };
    }

    function reengancharCamara() {
        acopleDetras = 0;
        angLadeo = 0;
        if (!personaje) return;
        offsetAcople.copy(camPos).sub(personaje.position);
        if (offsetAcople.lengthSq() < 1) offsetAcople.set(0, usaMapaGlb ? 8 : 12, usaMapaGlb ? 16 : 22);
        posAcoplePrev.copy(personaje.position);
        yawCamSuave = Math.atan2(offsetAcople.x, offsetAcople.z);
    }

    // Tras el diálogo en la casa: la cámara se corre al lado hacia el que dobla
    // el regreso al punto 3, para no tener que girar de golpe al salir.
    function prepararLadeoSalida() {
        signoLadeo = 1;
        const puerta = nodoActual && puertasCasa[nodoActual];
        const mid = nodoActual && nodos[nodoActual] && nodos[nodoActual].pos;
        const meta = (typeof posPunto3 === 'function') ? posPunto3() : null;
        if (puerta && mid && meta) {
            const s1x = mid.x - puerta.x;
            const s1z = mid.z - puerta.z;
            const s2x = meta.x - mid.x;
            const s2z = meta.z - mid.z;
            const giro = s1x * s2z - s1z * s2x;
            if (Math.abs(giro) > 0.4) signoLadeo = giro > 0 ? 1 : -1;
        }
        angLadeo = 0;
    }

    function avanzarAcople(pos) {
        const moviendo = caminando || moviendoStick || (entrandoSaliendo && animCasa && animCasa.modo === 'salir');
        if (moviendo && acopleDetras < 1) {
            const paso = Math.hypot(pos.x - posAcoplePrev.x, pos.z - posAcoplePrev.z);
            if (paso < 2.5) {
                const metros = moviendoStick ? Math.max(paso, 1.1) : paso;
                acopleDetras = Math.min(1, acopleDetras + metros / ACOPLAR_METROS);
            }
        }
        posAcoplePrev.copy(pos);
    }

    // No deja la cámara del otro lado de la puerta: al salir se quedaría detrás de la casa.
    function frenarDetrasDeCasa(pos, origen) {
        const ids = Object.keys(puertasCasa);
        for (let i = 0; i < ids.length; i++) {
            const puerta = puertasCasa[ids[i]];
            if (!puerta) continue;
            _ejeCasa.set(puerta.x - origen.x, 0, puerta.z - origen.z);
            const distP = _ejeCasa.length();
            if (distP < 0.8 || distP > 36) continue;
            _ejeCasa.multiplyScalar(1 / distP);
            const pesoCasa = distP <= 10 ? 1 : Math.max(0, 1 - (distP - 10) / 24);
            const t = (pos.x - origen.x) * _ejeCasa.x + (pos.z - origen.z) * _ejeCasa.z;
            const limite = distP - 2.2;
            if (t > limite && pesoCasa > 0) {
                const exceso = (t - limite) * pesoCasa;
                pos.x -= _ejeCasa.x * exceso;
                pos.z -= _ejeCasa.z * exceso;
            }
        }
        return pos;
    }

    function orientarAlSiguiente() {
        if (!idModulo || nodoActual !== idModulo || !personaje) return;
        const toc = nodosTocables();
        if (!toc.length) { yawObjetivo = null; return; }
        const est = estacionPorId(toc[0]);
        const dest = (est && est.grupo) ? est.grupo.position : (nodos[toc[0]] && nodos[toc[0]].pos);
        if (!dest) { yawObjetivo = null; return; }
        yawObjetivo = Math.atan2(dest.x - personaje.position.x, dest.z - personaje.position.z);
    }

    function aplicarMiradaSiguiente() {
        if (yawObjetivo == null || !personaje || caminando || entrandoSaliendo) return;
        if (!idModulo || nodoActual !== idModulo) { yawObjetivo = null; return; }
        let delta = yawObjetivo - personaje.rotation.y;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        personaje.rotation.y += delta * 0.08;
    }

    function voltearHaciaCamara(deseadaPos) {
        if (!personaje) return;
        const dx = deseadaPos.x - personaje.position.x;
        const dz = deseadaPos.z - personaje.position.z;
        if (dx * dx + dz * dz < 0.25) return;
        const meta = Math.atan2(dx, dz);
        let delta = meta - personaje.rotation.y;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        personaje.rotation.y += delta * 0.12;
    }

    function actualizarCamara(inmediato) {
        if (pasoAlCentro) return;
        if (viajeEntrada) {
            const k = Math.min(1, (performance.now() - viajeEntrada.t0) / viajeEntrada.dur);
            const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            camera.position.lerpVectors(viajeEntrada.desde, viajeEntrada.hasta, e);
            const mira = viajeEntrada.miraDesde.clone().lerp(viajeEntrada.miraHasta, e);
            camera.lookAt(mira);
            camPos.copy(camera.position);
            camTarget.copy(mira);
            if (k >= 1 && viajeEntrada.alFin) {
                const fin = viajeEntrada.alFin;
                viajeEntrada = null;
                fin();
            }
            return;
        }
        if (viajeDetras) {
            const k = Math.min(1, (performance.now() - viajeDetras.t0) / viajeDetras.dur);
            const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            camera.position.lerpVectors(viajeDetras.desde, viajeDetras.hasta, e);
            const mira = viajeDetras.miraDesde.clone().lerp(viajeDetras.miraHasta, e);
            camera.lookAt(mira);
            camPos.copy(camera.position);
            camTarget.copy(mira);
            if (k >= 1) {
                viajeDetras = null;
                seguimientoActivo = true;
                reengancharCamara();
            }
            return;
        }
        if (eligiendoPersonaje) {
            encuadrarCandidatos();
            return;
        }
        if (!personaje) return;
        if (focoManual && !caminando && !entrandoSaliendo) {
            const vista = vistaDelFoco();
            if (!vista) { focoManual = null; }
            else {
                const mira = vista.mira.clone();
                mira.y += 1.5;
                const deseada = vista.mira.clone().addScaledVector(vista.frente, 14);
                deseada.y = vista.mira.y + 4.5;
                const kF = inmediato ? 1 : 0.12;
                camPos.lerp(deseada, kF);
                camTarget.lerp(mira, kF);
                camera.position.copy(camPos);
                camera.lookAt(camTarget);
                return;
            }
        }
        const p = personaje.position;
        if (modoNav === 'botones' && seguimientoActivo && !mostrandoBocadillo && !narrando && !caminando && !entrandoSaliendo && !eligiendoPersonaje) {
            seguirDetrasManual(inmediato);
            return;
        }
        if ((caminando || entrandoSaliendo) && !seguimientoActivo) {
            seguimientoActivo = true;
            reengancharCamara();
        }

        if (!seguimientoActivo) {
            const paradaActual = nodoActual && nodos[nodoActual] ? nodos[nodoActual].parada : null;
            const enExperiencia = !!(paradaActual && esParadaExperiencia(paradaActual));
            const acercarHabla = (narrando || mostrandoBocadillo) && !enExperiencia;
            mezclaHabla += ((acercarHabla ? 1 : 0) - mezclaHabla) * (inmediato ? 1 : VELOCIDAD_CAMARA_HABLA);
            if (mezclaHabla < 0.001) mezclaHabla = 0;
            if (mezclaHabla > 0.999) mezclaHabla = 1;

            let foco = p.clone();
            if (recorridoIniciado && mezclaHabla < 1) {
                const tocables = nodosTocables();
                const est = tocables.length ? estacionPorId(tocables[0]) : null;
                if (est) foco = p.clone().lerp(est.grupo.position, 0.42);
            }
            const z0 = zoomCam;
            const plano = encuadreArranque(foco, z0);
            const posLejos = plano.pos;
            const tgtLejos = plano.mira;

            const yaw = personaje.rotation.y;
            const frente0 = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
            const dist0 = usaMapaGlb ? 14 : 18;
            const posCerca = p.clone().addScaledVector(frente0, dist0);
            posCerca.y = p.y + (usaMapaGlb ? 5.5 : 8);
            const tgtCerca = new THREE.Vector3(p.x, p.y + (usaMapaGlb ? 1.45 : 2.4), p.z);

            const deseadaPos0 = posLejos.lerp(posCerca, mezclaHabla);
            const deseadaTgt0 = tgtLejos.lerp(tgtCerca, mezclaHabla);
            const k0 = inmediato ? 1 : 0.05;
            camPos.lerp(deseadaPos0, k0); camTarget.lerp(deseadaTgt0, k0);
            camera.position.copy(camPos); camera.lookAt(camTarget);
            return;
        }

        if (caminando || moviendoStick || (entrandoSaliendo && (!animCasa || animCasa.modo !== 'girar'))) {
            rumboCamino = personaje.rotation.y;
        }
        const hablandoAhora = narrando || mostrandoBocadillo;
        const paradaAqui = nodoActual && nodos[nodoActual] ? nodos[nodoActual].parada : null;
        const enExperiencia = !!(paradaAqui && esParadaExperiencia(paradaAqui));
        const enCruce = !!(idModulo && nodoActual === idModulo && !caminando && !entrandoSaliendo);
        const enfocarSiguiente = enCruce && !hablandoAhora && yawObjetivo != null;
        if (enfocarSiguiente) {
            let dRumbo = personaje.rotation.y - rumboCamino;
            while (dRumbo > Math.PI) dRumbo -= Math.PI * 2;
            while (dRumbo < -Math.PI) dRumbo += Math.PI * 2;
            rumboCamino += dRumbo * 0.016;
        }
        avanzarAcople(p);

        const quiereCerca = !enfocarSiguiente && !enExperiencia && !caminando && !entrandoSaliendo
            && !hablaSinVoltear && hablandoAhora;
        mezclaHabla += ((quiereCerca ? 1 : 0) - mezclaHabla) * (inmediato ? 1 : VELOCIDAD_CAMARA_HABLA);
        if (mezclaHabla < 0.001) mezclaHabla = 0;
        if (mezclaHabla > 0.999) mezclaHabla = 1;

        const z = zoomCam;
        const distBase = (usaMapaGlb ? 22 : 28) * z;
        const altBase = (usaMapaGlb ? 8 : 11) * z;
        const distCerca = (usaMapaGlb ? 12 : 15) * z;
        const altCerca = (usaMapaGlb ? 4.2 : 5.6) * z;
        const ojo = usaMapaGlb ? 1.55 : 2.35;
        const ojoMirada = (enExperiencia && hablandoAhora) ? ojo + 1.35 : (ojo + mezclaHabla * 0.15);
        _frenteCam.set(Math.sin(rumboCamino), 0, Math.cos(rumboCamino));
        const siguiente = (enExperiencia || hablandoAhora)
            ? null
            : ((mezclaHabla < 0.85 || enfocarSiguiente) ? puntoSiguienteVisible() : null);
        const enc = encuadrarSiguiente(
            p, _frenteCam, distBase, altBase, ojo, siguiente,
            enfocarSiguiente ? [0.46, 0.62] : null
        );
        const angMeta = enc.ang * (1 - mezclaHabla);
        const distLejosMeta = enc.dist;
        const kEnc = inmediato ? 1 : 0.025;
        orbitaAplicada += (angMeta - orbitaAplicada) * kEnc;
        distLejosAplicada += (distLejosMeta - distLejosAplicada) * kEnc;
        const altLejos = altBase * (distLejosAplicada / distBase);
        const peso = (enfocarSiguiente ? Math.max(enc.peso, 0.46) : enc.peso) * (1 - mezclaHabla);
        posicionDetras(p, _frenteCam, orbitaAplicada, distLejosAplicada, altLejos);
        const dxD = _posCand.x - p.x;
        const dzD = _posCand.z - p.z;
        const yawDetras = Math.atan2(dxD, dzD);
        const yawDesde = Math.atan2(offsetAcople.x, offsetAcople.z);
        let dYaw = yawDetras - yawDesde;
        while (dYaw > Math.PI) dYaw -= Math.PI * 2;
        while (dYaw < -Math.PI) dYaw += Math.PI * 2;
        const ladeoQuieto = enExperiencia && !caminando && !entrandoSaliendo && !hablandoAhora;
        const ladeoMeta = ladeoQuieto ? signoLadeo * 0.48 : 0;
        angLadeo += (ladeoMeta - angLadeo) * (inmediato ? 1 : 0.035);
        let yawCam = yawDesde + dYaw * acopleDetras + angLadeo;
        const volviendo = acopleDetras < 0.995 && (caminando || (entrandoSaliendo && animCasa && animCasa.modo === 'salir'));
        if (yawCamSuave == null || inmediato) yawCamSuave = yawCam;
        else {
            let pasoYaw = yawCam - yawCamSuave;
            while (pasoYaw > Math.PI) pasoYaw -= Math.PI * 2;
            while (pasoYaw < -Math.PI) pasoYaw += Math.PI * 2;
            const tope = volviendo ? 0.01 : 0.035;
            if (pasoYaw > tope) pasoYaw = tope;
            else if (pasoYaw < -tope) pasoYaw = -tope;
            yawCamSuave += pasoYaw;
        }
        yawCam = yawCamSuave;
        const distDesde = Math.max(0.5, Math.hypot(offsetAcople.x, offsetAcople.z));
        const distDetras = Math.max(0.5, Math.hypot(dxD, dzD));
        let distCam = THREE.MathUtils.lerp(distDesde, distDetras, acopleDetras);
        let altCam = THREE.MathUtils.lerp(offsetAcople.y, _posCand.y - p.y, acopleDetras);
        if (mezclaHabla > 0) {
            distCam = THREE.MathUtils.lerp(distCam, distCerca, mezclaHabla);
            altCam = THREE.MathUtils.lerp(altCam, altCerca, mezclaHabla);
        }
        const deseadaPos = frenarDetrasDeCasa(
            _deseadaPos.set(p.x + Math.sin(yawCam) * distCam, p.y + altCam, p.z + Math.cos(yawCam) * distCam),
            p
        );
        const deseadaTgt = _deseadaTgt.copy(miraSeguimiento(p, ojoMirada, siguiente, peso));
        if (quiereCerca) voltearHaciaCamara(deseadaPos);

        let k = inmediato ? 1 : 0.04;
        if (!inmediato && enfocarSiguiente) k = 0.028;
        else if (!inmediato && caminando && acopleDetras > 0.98) k = 0.12;
        const kMirada = (!inmediato && enExperiencia && hablandoAhora) ? 0.07 : k;
        camPos.lerp(deseadaPos, k); camTarget.lerp(deseadaTgt, kMirada);
        camera.position.copy(camPos); camera.lookAt(camTarget);
    }

    const ZOOM_MIN = 0.55;
    const ZOOM_MAX = 1.75;
    const ZOOM_PASO = 0.38;
    // Plano de arranque, antes de caminar y al pulsar Volver al inicio.
    // 1 es la distancia base. Más alto aleja la cámara; más bajo la acerca.
    const ZOOM_INICIAL = 1.35;
    zoomCam = ZOOM_INICIAL;

    function encuadreArranque(foco, z) {
        const parque = parqueGrupo && parqueGrupo.position
            ? parqueGrupo.position
            : zonaJuegosParada;
        if (!usaMapaGlb || !parque) {
            return {
                pos: usaMapaGlb
                    ? new THREE.Vector3(foco.x - 16 * z, foco.y + 18 * z, foco.z + 22 * z)
                    : new THREE.Vector3(foco.x - 9 * z, 34 * z, foco.z + 48 * z),
                mira: usaMapaGlb
                    ? new THREE.Vector3(foco.x + 6, foco.y + 1.6, foco.z - 4)
                    : new THREE.Vector3(foco.x + 2, 2, foco.z - 6),
            };
        }
        const medio = foco.clone().lerp(parque, 0.42);
        medio.y = foco.y;
        const dx = parque.x - foco.x;
        const dz = parque.z - foco.z;
        const largo = Math.max(1, Math.hypot(dx, dz));
        const lado = new THREE.Vector3(-dz / largo, 0, dx / largo);
        if (lado.dot(new THREE.Vector3(-1, 0, 1)) < 0) lado.negate();
        const dist = Math.max(26, largo * 0.78) * z;
        const alt = Math.max(16, largo * 0.42) * z;
        const pos = medio.clone().addScaledVector(lado, dist);
        pos.y = medio.y + alt;
        return { pos, mira: new THREE.Vector3(medio.x, medio.y + 1.6, medio.z) };
    }

    function ajustarZoom(delta) {
        zoomCam = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomCam + delta));
        const btnCerca = document.getElementById('rn3dMenuAcercar');
        const btnLejos = document.getElementById('rn3dMenuAlejar');
        if (btnCerca) btnCerca.disabled = zoomCam <= ZOOM_MIN + 0.001;
        if (btnLejos) btnLejos.disabled = zoomCam >= ZOOM_MAX - 0.001;
    }

    async function cambiarPersonaje() {
        if (eligiendoPersonaje || cambiandoPersonaje || !scene || !personaje) return;
        cambiandoPersonaje = true;
        const btn = document.getElementById('rn3dMenuPersonaje');
        if (btn) btn.disabled = true;
        const otro = personajeCual === 'nina' ? 'nino' : 'nina';
        try {
            const pj = await cargarPersonaje(scene, otro);
            const pos = personaje.position.clone();
            const rotY = personaje.rotation.y;
            const visible = personaje.visible;
            if (mixer) mixer.stopAllAction();
            scene.remove(personaje);
            personaje = pj.objeto;
            mixer = pj.mixer;
            accionesPersonaje = pj.acciones;
            clipActual = '';
            personajeCual = pj.cual;
            personaje.position.copy(pos);
            personaje.rotation.y = rotY;
            personaje.visible = visible;
            ponerClip(CLIP_QUIETO);
        } catch (err) {
            console.error(err);
        }
        cambiandoPersonaje = false;
        if (btn) btn.disabled = false;
    }

    function volverAlInicio() {
        detenerNarracion();
        if (window.KioscoNav && typeof window.KioscoNav.ir === 'function') {
            window.KioscoNav.ir('/inicio', true);
            return;
        }
        window.location.href = '/inicio';
    }

    function volverPersonajeAlInicio() {
        cancelarArranque++;
        saludoYaDicho = false;
        dialogoToken++;
        const fiesta = document.getElementById('rn3dCelebracion');
        if (fiesta) fiesta.remove();
        detenerNarracion();
        cerrarModal();
        soltarFoco();
        const capa = document.querySelector('.rn3d-juegos-capa');
        if (capa) capa.remove();
        juegosAbiertos = false;
        posAntesDeCarpa = null;
        caminando = false;
        caminandoLibre = false;
        entrandoSaliendo = false;
        animCasa = null;
        animCurva = null;
        alLlegarCb = null;
        alLlegarLibre = null;
        alLlegarPuente = null;
        mostrandoBocadillo = false;
        narrando = false;
        if (elBocadillo) elBocadillo.classList.add('rn3d-oculto');
        pintarOpcionesDialogo(null);
        if (personaje) {
            personaje.visible = true;
            colocarPersonajeEn('inicio');
            ponerClip(CLIP_QUIETO);
        }
        nodoActual = (camino && camino.paradas[0] && camino.paradas[0].id) || 'inicio';
        seguimientoActivo = false;
        mezclaHabla = 0;
        yawCamSuave = null;
        zoomCam = ZOOM_INICIAL;
        ajustarZoom(0);
        actualizarCamara(true);
        if (!recorridoIniciado && elIniciar) elIniciar.classList.remove('rn3d-oculto');
        refrescarEstaciones();
        actualizarHud(false);
    }

    function pedirSalir() {
        mostrarDialogo('¿Quieres salir?', null, [
            { texto: 'Sí', tono: 'si', accion: function () { volverAlInicio(); } },
            { texto: 'No', tono: 'no', accion: function () {} },
        ]);
    }

    function construirMenuLateral(raiz) {
        const menu = document.createElement('aside');
        menu.className = 'rn3d-menu is-cerrado';
        menu.id = 'rn3dMenu';
        menu.innerHTML = ''
            + '<button type="button" class="rn3d-menu__toggle" id="rn3dMenuToggle" aria-expanded="false" aria-controls="rn3dMenuPanel" aria-label="Abrir menú">'
            +   '<i class="fa-solid fa-bars" aria-hidden="true"></i>'
            + '</button>'
            + '<div class="rn3d-menu__panel" id="rn3dMenuPanel">'
            +   '<button type="button" class="rn3d-menu__btn" id="rn3dMenuPersonaje">'
            +     '<i class="fa-solid fa-user" aria-hidden="true"></i><span>Cambiar personaje</span>'
            +   '</button>'
            +   '<button type="button" class="rn3d-menu__btn" id="rn3dMenuInicio">'
            +     '<i class="fa-solid fa-house" aria-hidden="true"></i><span>Volver al inicio</span>'
            +   '</button>'
            +   '<button type="button" class="rn3d-menu__btn" id="rn3dMenuSalir">'
            +     '<i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i><span>Salir</span>'
            +   '</button>'
            +   '<div class="rn3d-menu__zoom">'
            +     '<button type="button" class="rn3d-menu__btn rn3d-menu__btn--icono" id="rn3dMenuAcercar" aria-label="Acercar cámara">'
            +       '<i class="fa-solid fa-plus" aria-hidden="true"></i>'
            +     '</button>'
            +     '<span class="rn3d-menu__zoom-txt">Cámara</span>'
            +     '<button type="button" class="rn3d-menu__btn rn3d-menu__btn--icono" id="rn3dMenuAlejar" aria-label="Alejar cámara">'
            +       '<i class="fa-solid fa-minus" aria-hidden="true"></i>'
            +     '</button>'
            +   '</div>'
            + '</div>';
        raiz.appendChild(menu);

        const toggle = menu.querySelector('#rn3dMenuToggle');
        toggle.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const abierto = menu.classList.toggle('is-cerrado') === false;
            toggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
            toggle.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
            const ico = toggle.querySelector('i');
            if (ico) ico.className = abierto ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
        });
        menu.querySelector('#rn3dMenuPersonaje').addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            cambiarPersonaje();
        });
        menu.querySelector('#rn3dMenuInicio').addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            volverPersonajeAlInicio();
        });
        menu.querySelector('#rn3dMenuSalir').addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            pedirSalir();
        });
        menu.querySelector('#rn3dMenuAcercar').addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            ajustarZoom(-ZOOM_PASO);
        });
        menu.querySelector('#rn3dMenuAlejar').addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            ajustarZoom(ZOOM_PASO);
        });
    }

    function aplicarPoseEstacion(casa) {
        const idx = (casa.userData.modelo || 1) - 1;
        const tang = casa.userData.tang;
        const puesto = casa.userData.base.clone();
        puesto.x += posXCasa[idx] || 0;
        puesto.z += posYCasa[idx] || 0;
        puesto.y = (mundo ? mundo.altura(puesto.x, puesto.z) : puesto.y) + (casa.userData.altura || 0);
        casa.position.copy(puesto);
        if (tang) casa.rotation.y = Math.atan2(-tang.x, -tang.z) + (casa.userData.giro || 0);
        casa.updateMatrixWorld(true);
        const umbral = new THREE.Vector3();
        const nodoPuerta = casa.getObjectByName('puerta');
        if (nodoPuerta) nodoPuerta.getWorldPosition(umbral);
        else umbral.copy(puesto);
        const dentro = umbral.clone().addScaledVector(tang || new THREE.Vector3(0, 0, 1), 1.6 * (casa.scale.x || 1));
        dentro.y = mundo ? mundo.altura(dentro.x, dentro.z) : umbral.y;
        if (casa.userData.paradaId) puertasCasa[casa.userData.paradaId] = dentro;
    }

    function muestrasColaDesde(curva, metros) {
        if (!curva || typeof curva.getPoint !== 'function') return [];
        const n = 36;
        const pts = [];
        for (let s = 0; s <= n; s++) pts.push(curva.getPoint(s / n));
        const muestras = [[pts[0].x, pts[0].z]];
        let acc = 0;
        for (let i = 0; i < n; i++) {
            acc += pts[i].distanceTo(pts[i + 1]);
            muestras.push([pts[i + 1].x, pts[i + 1].z]);
            if (acc >= metros) break;
        }
        return muestras;
    }

    function muestrasCola(curva, metros) {
        if (!curva || typeof curva.getPoint !== 'function') return [];
        const n = 36;
        const pts = [];
        for (let s = 0; s <= n; s++) pts.push(curva.getPoint(s / n));
        const muestras = [[pts[n].x, pts[n].z]];
        let acc = 0;
        for (let i = n; i > 0; i--) {
            acc += pts[i].distanceTo(pts[i - 1]);
            muestras.push([pts[i - 1].x, pts[i - 1].z]);
            if (acc >= metros) break;
        }
        return muestras;
    }

    function despejarFloresEntrada(punto, casa) {
        if (!mundo || typeof mundo.despejarEntrada !== 'function' || !punto) return;
        const frente = new THREE.Vector3(0, 0, 1);
        if (casa) frente.applyQuaternion(casa.quaternion);
        frente.y = 0;
        if (frente.lengthSq() < 1e-6) frente.set(0, 0, 1);
        frente.normalize();
        const muestras = [];
        for (let d = 0; d <= 16; d += 1.4) {
            muestras.push([punto.x + frente.x * d, punto.z + frente.z * d]);
        }
        mundo.despejarEntrada(muestras, 12);
    }

    /**
     * El ramal completo de cada experiencia queda sin flores, arbustos ni piedras.
     * El sendero principal las conserva. Del parque solo se limpia la boca.
     */
    function despejarEntradasCaminos() {
        if (!mundo || typeof mundo.quitarEstorbos !== 'function') return;
        const delRamal = [];
        const deLaBoca = [];
        const vistos = new Set();
        const muestrear = (curva, destino, metros) => {
            if (!curva || typeof curva.getPoint !== 'function' || vistos.has(curva)) return;
            vistos.add(curva);
            const n = 48;
            const pts = [];
            for (let s = 0; s <= n; s++) pts.push(curva.getPoint(s / n));
            destino.push([pts[0].x, pts[0].z]);
            let acc = 0;
            for (let i = 0; i < n; i++) {
                acc += pts[i].distanceTo(pts[i + 1]);
                destino.push([pts[i + 1].x, pts[i + 1].z]);
                if (metros != null && acc >= metros) break;
            }
        };
        Object.values(nodos).forEach((n) => {
            if (!n || !n.spur || !esParadaExperiencia(n.parada)) return;
            muestrear(n.spur, delRamal, null);
        });
        if (delRamal.length) mundo.quitarEstorbos(delRamal, 5.6);
        vistos.clear();
        if (entradaParque && entradaParque.spur) muestrear(entradaParque.spur, deLaBoca, 7);
        if (deLaBoca.length) mundo.quitarEstorbos(deLaBoca, 3.4);
    }

    function vistaFrenteEstacion(casa) {
        casa.updateMatrixWorld(true);
        const mira = new THREE.Vector3();
        const puerta = casa.getObjectByName('puerta');
        if (puerta) puerta.getWorldPosition(mira);
        else casa.getWorldPosition(mira);
        const frente = new THREE.Vector3(0, 0, 1).applyQuaternion(casa.quaternion);
        frente.y = 0;
        if (frente.lengthSq() < 1e-6) frente.set(0, 0, 1);
        frente.normalize();
        return { mira, frente };
    }

    function vistaDelFoco() {
        if (!focoManual) return null;
        if (focoManual.inicio && mundo && mundo.casaInicio && mundo.casaInicio.frente) {
            const frente = mundo.casaInicio.frente();
            if (frente.lengthSq() < 1e-6) frente.set(0, 0, 1);
            frente.normalize();
            return { mira: mundo.casaInicio.punto(), frente };
        }
        if (focoManual.casa && focoManual.casa.parent) return vistaFrenteEstacion(focoManual.casa);
        return null;
    }

    function soltarFoco() {
        focoManual = null;
        document.querySelectorAll('#rn3dMenuEstaciones .is-activo').forEach((b) => b.classList.remove('is-activo'));
        const panel = document.getElementById('rn3dMenuAjuste');
        if (panel) panel.hidden = true;
    }

    function pintarAjuste(titulo, leer, fijar) {
        let panel = document.getElementById('rn3dMenuAjuste');
        const caja = document.getElementById('rn3dMenuEstaciones');
        if (!caja) return;
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'rn3dMenuAjuste';
            panel.className = 'rn3d-menu__ajuste';
            caja.appendChild(panel);
        }
        panel.hidden = false;
        const v = leer();
        panel.innerHTML = ''
            + '<p class="rn3d-menu__titulo">' + titulo + '</p>'
            + filaAjuste('X', v.x)
            + filaAjuste('Y', v.y)
            + '<button type="button" class="rn3d-menu__btn" data-accion="soltar-foco">Listo</button>';
        panel.querySelectorAll('[data-eje]').forEach((btn) => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                const eje = btn.getAttribute('data-eje');
                const dir = Number(btn.getAttribute('data-dir'));
                const actual = leer();
                const sig = {
                    x: eje === 'x' ? Math.round((actual.x + dir * PASO_AJUSTE) * 10) / 10 : actual.x,
                    y: eje === 'y' ? Math.round((actual.y + dir * PASO_AJUSTE) * 10) / 10 : actual.y,
                };
                fijar(sig);
                pintarAjuste(titulo, leer, fijar);
            });
        });
        const soltar = panel.querySelector('[data-accion="soltar-foco"]');
        if (soltar) {
            soltar.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                soltarFoco();
            });
        }
    }

    function filaAjuste(nombre, valor) {
        const t = (Number(valor) || 0).toFixed(1);
        return ''
            + '<div class="rn3d-menu__fila">'
            +   '<button type="button" class="rn3d-menu__btn rn3d-menu__btn--mini" data-eje="' + nombre.toLowerCase() + '" data-dir="-1" aria-label="Menos ' + nombre + '">−</button>'
            +   '<span>' + nombre + ' ' + t + '</span>'
            +   '<button type="button" class="rn3d-menu__btn rn3d-menu__btn--mini" data-eje="' + nombre.toLowerCase() + '" data-dir="1" aria-label="Más ' + nombre + '">+</button>'
            + '</div>';
    }

    function enfocarCasa(destino, boton, titulo, leer, fijar) {
        if (!destino) return;
        focoManual = destino;
        document.querySelectorAll('#rn3dMenuEstaciones .rn3d-menu__btn').forEach((b) => b.classList.remove('is-activo'));
        if (boton) boton.classList.add('is-activo');
        pintarAjuste(titulo, leer, fijar);
        actualizarCamara(true);
    }

    function llenarMenuEstaciones() {
        const caja = document.getElementById('rn3dMenuEstaciones');
        if (!caja) return;
        caja.innerHTML = '<p class="rn3d-menu__titulo">Enfocar para ajustar</p>';
        if (mundo && mundo.casaInicio) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'rn3d-menu__btn';
            b.innerHTML = '<i class="fa-solid fa-house" aria-hidden="true"></i><span>Casa de inicio</span>';
            b.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                enfocarCasa(
                    { inicio: true },
                    b,
                    'Casa de inicio',
                    mundo.casaInicio.leer,
                    function (sig) { mundo.casaInicio.fijar(sig.x, sig.y); }
                );
            });
            caja.appendChild(b);
        }
        const casas = Object.keys(casasPorId).map((id) => casasPorId[id]).filter(Boolean);
        casas.sort((a, b) => (a.userData.indice || 0) - (b.userData.indice || 0));
        casas.forEach((casa) => {
            const idx = (casa.userData.modelo || 1) - 1;
            const num = casa.userData.numeroLabel || String(casa.userData.modelo);
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'rn3d-menu__btn';
            b.innerHTML = '<i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>Estación ' + num + '</span>';
            b.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                const leer = () => ({ x: posXCasa[idx] || 0, y: posYCasa[idx] || 0 });
                const fijar = (sig) => {
                    posXCasa[idx] = sig.x;
                    posYCasa[idx] = sig.y;
                    casas.forEach((otra) => {
                        if ((otra.userData.modelo || 1) - 1 === idx) aplicarPoseEstacion(otra);
                    });
                };
                enfocarCasa({ casa }, b, 'Estación ' + num + ' · modelo ' + casa.userData.modelo, leer, fijar);
            });
            caja.appendChild(b);
        });
    }

    // ===================== Estados de estaciones =====================
    function refrescarEstaciones() {
        const tocables = nodosTocables();
        estaciones.forEach((e, i) => {
            const id = e.parada.id;
            const esSiguiente = tocables.indexOf(id) >= 0;
            // Verde solo cuando ya llegó y siguió de largo. Mientras está parado ahí, el pin se queda.
            const visitada = visitados.has(id) && id !== 'inicio' && id !== 'fin'
                && (id !== nodoActual || caminando);
            e.aro.visible = esSiguiente;
            const cara = e.medallon.material;
            let fondo = e.colorBase, borde = e.colorBorde, texto = numeroParada(e.parada, i);
            if (visitada) { fondo = '#22c55e'; borde = '#15803d'; }
            else if (esSiguiente) { fondo = '#fde047'; borde = '#ca8a04'; }
            if (cara.map) cara.map.dispose();
            cara.map = texturaCartel(texto, fondo, borde);
            cara.needsUpdate = true;
            e.grupo.scale.setScalar(esSiguiente ? 1.18 : 1);
        });
    }

    // ===================== Interacción =====================
    let raycaster, puntero;
    function edadNino() {
        if (location.pathname.indexOf('__preview-camino') >= 0) {
            const q = new URLSearchParams(location.search).get('edad');
            if (q !== null && q !== '' && Number.isFinite(Number(q))) return Math.trunc(Number(q));
        }
        const perfil = window.PedniaPerfil;
        if (!perfil || perfil.edad === null || perfil.edad === undefined || perfil.edad === '') return null;
        const n = Number(perfil.edad);
        return Number.isFinite(n) ? Math.trunc(n) : null;
    }

    function fijarModoNavegacion() {
        const edad = edadNino();
        if (edad === null) modoNav = 'puntos';
        else if (edad <= 3) modoNav = 'auto';
        else if (edad <= 5) modoNav = 'puntos';
        else modoNav = 'botones';
    }

    function cajaDelMapa() {
        if (limitesMapa) return limitesMapa;
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        const toma = (x, z) => {
            if (!Number.isFinite(x) || !Number.isFinite(z)) return;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (z < minZ) minZ = z;
            if (z > maxZ) maxZ = z;
        };
        Object.keys(nodos).forEach((id) => {
            const p = nodos[id] && nodos[id].pos;
            if (p) toma(p.x, p.z);
        });
        if (curva && typeof curva.getPoint === 'function') {
            for (let i = 0; i <= 24; i++) {
                const p = curva.getPoint(i / 24);
                toma(p.x, p.z);
            }
        }
        if (!Number.isFinite(minX)) {
            limitesMapa = { minX: -40, maxX: 120, minZ: -40, maxZ: 80 };
            return limitesMapa;
        }
        const margen = 16;
        limitesMapa = { minX: minX - margen, maxX: maxX + margen, minZ: minZ - margen, maxZ: maxZ + margen };
        return limitesMapa;
    }

    function moverConStick(dt) {
        const ax = sticks.mover.x;
        const ay = sticks.mover.y;
        const gira = Math.abs(ax) >= 0.16;
        const anda = Math.abs(ay) >= 0.16;
        if ((!gira && !anda) || !personaje || !personaje.visible || caminando || entrandoSaliendo
            || eligiendoPersonaje || mostrandoBocadillo || juegosAbiertos || !recorridoIniciado || viajeDetras) {
            moviendoStick = false;
            return;
        }
        if (gira || anda) giroFrente = null;
        if (gira) personaje.rotation.y += ax * 2.1 * dt;
        rumboCamino = personaje.rotation.y;
        moviendoStick = anda;
        if (!anda) return;
        const fx = Math.sin(personaje.rotation.y);
        const fz = Math.cos(personaje.rotation.y);
        const vel = 3.4 * ay;
        const caja = cajaDelMapa();
        let nx = personaje.position.x + fx * vel * dt;
        let nz = personaje.position.z + fz * vel * dt;
        nx = Math.max(caja.minX, Math.min(caja.maxX, nx));
        nz = Math.max(caja.minZ, Math.min(caja.maxZ, nz));
        personaje.position.x = nx;
        personaje.position.z = nz;
        if (mundo) personaje.position.y = mundo.altura(nx, nz);
        if (!seguimientoActivo) {
            seguimientoActivo = true;
            reengancharCamara();
        }
        llegarSiCerca();
    }

    function llegarSiCerca() {
        if (!personaje || caminando || entrandoSaliendo || juegosAbiertos) return;
        if (zonaJuegosParada) {
            const dj = Math.hypot(personaje.position.x - zonaJuegosParada.x, personaje.position.z - zonaJuegosParada.z);
            if (dj < 3.4) { abrirZonaJuegos(); return; }
        }
        const toc = nodosTocables();
        if (!toc.length) return;
        const id = toc[0];
        const pos = nodos[id] && nodos[id].pos;
        if (!pos) return;
        if (Math.hypot(personaje.position.x - pos.x, personaje.position.z - pos.z) > 3.4) return;
        personaje.position.x = pos.x;
        personaje.position.z = pos.z;
        if (mundo) personaje.position.y = mundo.altura(pos.x, pos.z);
        moviendoStick = false;
        animDestinoId = id;
        terminarAvance();
    }

    const pulsos = { mover: new Set() };

    function recomponerControles() {
        let x = 0;
        let y = 0;
        pulsos.mover.forEach((b) => {
            x += Number(b.getAttribute('data-x')) || 0;
            y += Number(b.getAttribute('data-y')) || 0;
        });
        sticks.mover.x = Math.max(-1, Math.min(1, x));
        sticks.mover.y = Math.max(-1, Math.min(1, y));
    }

    function soltarControles() {
        pulsos.mover.forEach((b) => b.classList.remove('is-pulsado'));
        pulsos.mover.clear();
        recomponerControles();
        sticks.camara.x = 0;
        sticks.camara.y = 0;
    }

    function sincronizarControles() {
        const capa = document.getElementById('rn3dControles');
        if (!capa) return;
        const on = modoNav === 'botones' && recorridoIniciado && !eligiendoPersonaje && !juegosAbiertos
            && !document.body.classList.contains('rn-player-activo');
        if (capa.hidden === !on) return;
        capa.hidden = !on;
        if (!on) soltarControles();
    }

    function montarControles() {
        if (!ctx.$paso || !ctx.$paso[0] || document.getElementById('rn3dControles')) return;
        const flecha = (eje, x, y, icono, nombre) => ''
            + '<button type="button" class="rn3d-pad__btn" data-eje="' + eje + '" data-x="' + x + '" data-y="' + y + '" aria-label="' + nombre + '">'
            +   '<i class="fa-solid ' + icono + '" aria-hidden="true"></i>'
            + '</button>';
        const capa = document.createElement('div');
        capa.id = 'rn3dControles';
        capa.className = 'rn3d-controles';
        capa.hidden = true;
        capa.innerHTML = ''
            + '<div class="rn3d-pad rn3d-pad--izq">'
            +   '<span class="rn3d-pad__titulo">Caminar</span>'
            +   '<div class="rn3d-pad__cruz">'
            +     flecha('mover', 0, 1, 'fa-arrow-up', 'Adelante')
            +     flecha('mover', 1, 0, 'fa-arrow-left', 'Izquierda')
            +     flecha('mover', -1, 0, 'fa-arrow-right', 'Derecha')
            +     flecha('mover', 0, -1, 'fa-arrow-down', 'Atrás')
            +   '</div>'
            + '</div>';
        ctx.$paso[0].appendChild(capa);
        capa.querySelectorAll('.rn3d-pad__btn').forEach(function (btn) {
            let pid = null;
            const soltar = function (e) {
                if (e && e.pointerId !== pid) return;
                pid = null;
                pulsos.mover.delete(btn);
                btn.classList.remove('is-pulsado');
                recomponerControles();
            };
            btn.addEventListener('pointerdown', function (e) {
                if (pid !== null) return;
                pid = e.pointerId;
                try { btn.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
                pulsos.mover.add(btn);
                btn.classList.add('is-pulsado');
                recomponerControles();
                e.preventDefault();
                e.stopPropagation();
            });
            btn.addEventListener('pointerup', soltar);
            btn.addEventListener('pointercancel', soltar);
        });
    }

    function programarAuto() {
        if (modoNav !== 'auto') return;
        const token = ++autoToken;
        setTimeout(function () {
            if (token !== autoToken || modoNav !== 'auto') return;
            if (caminando || entrandoSaliendo || regresandoAlFin || esperarParaFin) return;
            if (!recorridoIniciado || mostrandoBocadillo || juegosAbiertos) return;
            if (document.body.classList.contains('rn-player-activo')) return;
            if (document.body.classList.contains('rn3d-video-reproduciendo')) return;
            const toc = nodosTocables();
            if (!toc.length || toc[0] === nodoActual) return;
            caminarA(toc[0]);
        }, 700);
    }

    function alTocar(clientX, clientY) {
        if (eligiendoPersonaje || caminando || juegosAbiertos || mostrandoBocadillo || entrandoSaliendo) return;
        if (modoNav === 'botones') return;
        puntero.x = (clientX / window.innerWidth) * 2 - 1;
        puntero.y = -(clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(puntero, camera);

        // 1) ¿Tocó la ZONA DE JUEGOS? El personaje CAMINA hasta la carpa y, al
        //    llegar, se abre la galería. (Accesible aun sin iniciar el recorrido.)
        if (zonaJuegos) {
            const objJuegos = [];
            zonaJuegos.traverse(o => { if (o.isMesh) objJuegos.push(o); });
            if (parqueGrupo) parqueGrupo.traverse(o => { if (o.isMesh) objJuegos.push(o); });
            if (raycaster.intersectObjects(objJuegos, false)[0]) {
                caminarACarpa();
                return;
            }
        }

        // 2) Estaciones (solo con el recorrido ya iniciado). En automático no se tocan.
        if (!recorridoIniciado || modoNav === 'auto') return;
        const objetos = [];
        estaciones.forEach(e => e.grupo.traverse(o => { if (o.isMesh) { o.userData.estId = e.parada.id; objetos.push(o); } }));
        const hit = raycaster.intersectObjects(objetos, false)[0];
        if (!hit) return;
        const id = hit.object.userData.estId;
        if (id === nodoActual && visitados.has(id)) {
            const est = estacionPorId(id);
            if (!est || est.parada.id === 'inicio') return;
            if (esParadaExperiencia(est.parada)) {
                entrarYHablarExperiencia(est.parada);
            } else if (est.parada.id !== 'fin') {
                decirAlLlegar(est.parada);
            }
        } else if (esTocable(id)) {
            caminarA(id);
        }
    }

    // El personaje CAMINA (línea recta) desde donde esté hasta el frente de la
    // carpa y, al llegar, abre la galería. Reutiliza el motor de caminata del loop.
    function caminarACarpa() {
        if (caminando || entrandoSaliendo || juegosAbiertos || !zonaJuegosParada || !personaje) return;
        const origen = personaje.position.clone();
        const destino = zonaJuegosParada.clone();
        if (mundo) {
            origen.y = mundo.altura(origen.x, origen.z);
            destino.y = mundo.altura(destino.x, destino.z);
        }
        // Recordar dónde estaba el personaje para devolverlo al cerrar la galería,
        // así el recorrido continúa desde donde iba.
        posAntesDeCarpa = { pos: origen.clone(), rotY: personaje.rotation.y };
        if (origen.distanceTo(destino) < 0.6) { abrirZonaJuegos(); return; } // ya está al lado
        // Curva recta (2 puntos) que el loop recorre igual que las del grafo.
        animCurva = new THREE.CatmullRomCurve3([origen, destino], false, 'catmullrom', 0.5);
        animT0 = 0; animT1 = 1;
        caminando = true; caminandoLibre = true; yawObjetivo = null;
        soltarFoco();
        alLlegarLibre = function () { abrirZonaJuegos(); };
        personaje.visible = true; ocultarEtiqueta();
        animDur = duracionCaminata(origen.distanceTo(destino));
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
        if (usaMapaGlb) {
            const spur = (o.spur && d.spur && o.spur === d.spur) ? o.spur
                : (d.spur && (origenId === idModulo || origenId === d.boca)) ? d.spur
                : (o.spur && (destinoId === idModulo || destinoId === o.boca)) ? o.spur
                : null;
            if (spur) {
                const t0 = (o.spur === spur) ? o.tLocal : 0;
                const t1 = (d.spur === spur) ? d.tLocal : 0;
                return { curva: spur, t0, t1 };
            }
            if (o.spur || d.spur) return null;
            return { curva, t0: o.t || 0, t1: d.t || 0 };
        }
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

    function caminarPuente(curvaP, t0, t1, alLlegar) {
        if (!personaje || !curvaP) { if (alLlegar) alLlegar(); return; }
        const p0 = curvaP.getPoint(t0);
        const p1 = curvaP.getPoint(t1);
        if (p0.distanceTo(p1) < 0.8) { if (alLlegar) alLlegar(); return; }
        personaje.visible = true;
        cerrarModal();
        yawObjetivo = null;
        soltarFoco();
        caminando = true;
        ocultarEtiqueta();
        animCurva = curvaP;
        animT0 = t0;
        animT1 = t1;
        animDestinoId = nodoActual;
        alLlegarPuente = alLlegar || null;
        animDur = duracionCaminata(p0.distanceTo(p1));
        animInicio = performance.now();
    }

    function empezarTramo(destinoId, alLlegar) {
        const tramo = tramoEntre(nodoActual, destinoId);
        if (!tramo) { if (alLlegar) alLlegar(); return; }
        personaje.visible = true;
        cerrarModal();
        yawObjetivo = null;
        soltarFoco();
        caminando = true; ocultarEtiqueta();
        refrescarEstaciones();
        animCurva = tramo.curva; animT0 = tramo.t0; animT1 = tramo.t1;
        animDestinoId = destinoId; alLlegarCb = alLlegar || null;
        const p0 = animCurva.getPoint(animT0), p1 = animCurva.getPoint(animT1);
        animDur = duracionCaminata(p0.distanceTo(p1));
        animInicio = performance.now();
        const est = estacionPorId(destinoId);
        if (est) indiceActual = est.indice;
        actualizarHud(true);
    }

    // Mueve al personaje al nodo `destinoId` SIN validar (uso interno / automático).
    function caminarAForzado(destinoId, alLlegar) {
        if (caminando || entrandoSaliendo || !destinoId || destinoId === nodoActual) { if (alLlegar) alLlegar(); return; }
        const aqui = nodos[nodoActual];
        const dest = nodos[destinoId];
        // Del paso 3 a la experiencia: primero el sendero hasta la Y, después el desvío.
        if (dest && dest.spur && dest.boca === nodoActual && typeof dest.tUnion === 'number') {
            caminarPuente(curva, aqui.t || 0, dest.tUnion, function () {
                empezarTramo(destinoId, alLlegar);
            });
            return;
        }
        // Al salir de esa experiencia: desvío hasta la Y y luego el sendero, sin saltar al paso 3.
        if (aqui && aqui.spur && aqui.boca && destinoId !== aqui.boca && typeof aqui.tUnion === 'number') {
            const union = aqui.tUnion;
            const tDest = dest && !dest.spur ? (dest.t || 0) : union;
            caminarPuente(aqui.spur, aqui.tLocal != null ? aqui.tLocal : 1, 0, function () {
                caminarPuente(curva, union, tDest, function () {
                    animDestinoId = destinoId;
                    alLlegarCb = alLlegar || null;
                    terminarAvance();
                });
            });
            return;
        }
        empezarTramo(destinoId, alLlegar);
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
    let esperarParaFin = false;
    let esperaFinDesde = 0;
    function irAlFinPasandoPorTres() {
        if (regresandoAlFin || !idFin || visitados.has(idFin)) return;
        regresandoAlFin = true;
        const aqui = nodos[nodoActual];
        const boca = aqui && aqui.boca;
        const alFin = function () {
            caminarAForzado(idFin, function () { regresandoAlFin = false; });
        };
        if (boca && nodoActual !== boca) {
            caminarAForzado(boca, alFin);
            return;
        }
        alFin();
    }

    function irAlFinAutomatico() {
        if (regresandoAlFin || esperarParaFin || !idFin || visitados.has(idFin)) return;
        if (!esRamificado) {
            irAlFinPasandoPorTres();
            return;
        }
        if (nodoActual === idModulo) {
            pedirSalidaAlFin();
            return;
        }
        regresandoAlFin = true;
        caminarAForzado(idModulo, function () {
            regresandoAlFin = false;
            pedirSalidaAlFin();
        });
    }
    function pedirSalidaAlFin() {
        if (esperarParaFin || regresandoAlFin || !idFin || visitados.has(idFin)) return;
        esperarParaFin = true;
        esperaFinDesde = performance.now();
        if (nodoActual === idModulo) orientarAlSiguiente();
    }
    function camaraMirandoAlSiguiente() {
        if (!personaje || yawObjetivo == null) return false;
        let d = yawObjetivo - personaje.rotation.y;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        if (Math.abs(d) > 0.45) return false;
        const toc = nodosTocables();
        const id = toc.length ? toc[0] : idFin;
        const est = id ? estacionPorId(id) : null;
        const dest = (est && est.grupo) ? est.grupo.position : (id && nodos[id] ? nodos[id].pos : null);
        if (!dest) return true;
        const ang = Math.atan2(dest.x - camPos.x, dest.z - camPos.z);
        const angC = Math.atan2(camTarget.x - camPos.x, camTarget.z - camPos.z);
        let diff = ang - angC;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return Math.abs(diff) < 0.5;
    }
    function pulsarSalidaAlFin(now) {
        if (!esperarParaFin || caminando || entrandoSaliendo || regresandoAlFin) return;
        if (idModulo && nodoActual !== idModulo) return;
        if (nodoActual === idModulo) orientarAlSiguiente();
        if (now - esperaFinDesde < 1200) return;
        if (!camaraMirandoAlSiguiente() && now - esperaFinDesde < 5200) return;
        esperarParaFin = false;
        if (!idFin || visitados.has(idFin)) return;
        regresandoAlFin = true;
        caminarAForzado(idFin, function () { regresandoAlFin = false; });
    }
    // ---- Entrar / salir de la casa (animación en el loop) ----
    // Anima al personaje: camina un poco hacia la puerta y se encoge/hunde (entra),
    // o reaparece en la puerta y crece caminando de vuelta (sale). onFin al terminar.
    let animCasa = null; // { modo:'entrar'|'salir', ini, dur, desde, puerta, base, onFin }
    function animarEntradaSalida(now) {
        if (!animCasa || !personaje) return;
        const a = animCasa;
        const k = Math.min(1, (now - a.ini) / a.dur);
        const ease = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        personaje.visible = true;
        personaje.scale.setScalar(a.base);
        if (a.modo === 'girar') {
            // Giro en el sitio, adentro: no se desplaza ni se sale del muro.
            personaje.position.copy(a.ancla);
            if (mundo) personaje.position.y = mundo.altura(a.ancla.x, a.ancla.z);
            let delta = a.rot1 - a.rot0;
            while (delta > Math.PI) delta -= Math.PI * 2;
            while (delta < -Math.PI) delta += Math.PI * 2;
            personaje.rotation.y = a.rot0 + delta * ease;
        } else {
            const desde = a.modo === 'entrar' ? a.desde : a.puerta;
            const hacia = a.modo === 'entrar' ? a.puerta : a.desde;
            personaje.position.lerpVectors(desde, hacia, ease);
            if (mundo) personaje.position.y = mundo.altura(personaje.position.x, personaje.position.z);
            const dx = hacia.x - desde.x;
            const dz = hacia.z - desde.z;
            if (dx * dx + dz * dz > 0.04) {
                personaje.rotation.y = Math.atan2(dx, dz);
                rumboCamino = personaje.rotation.y;
            }
        }
        if (k >= 1) {
            if (a.modo === 'girar') {
                personaje.position.copy(a.ancla);
                if (mundo) personaje.position.y = mundo.altura(a.ancla.x, a.ancla.z);
                personaje.rotation.y = a.rot1;
            } else {
                const hacia = a.modo === 'entrar' ? a.puerta : a.desde;
                personaje.position.copy(hacia);
                if (mundo) personaje.position.y = mundo.altura(hacia.x, hacia.z);
            }
            personaje.scale.setScalar(a.base);
            personaje.visible = true;
            const fin = a.onFin;
            animCasa = null;
            entrandoSaliendo = false;
            if (fin) fin();
        }
    }

    function entrarACasa(onFin) {
        const puerta = puertasCasa[nodoActual];
        const casa = casasPorId[nodoActual];
        if (!puerta || !personaje) { if (onFin) onFin(); return; }
        const caminar = () => {
            if (!personaje || !puertasCasa[nodoActual]) { if (onFin) onFin(); return; }
            entrandoSaliendo = true;
            const desde = personaje.position.clone();
            const meta = puertasCasa[nodoActual];
            const dist = Math.hypot(meta.x - desde.x, meta.z - desde.z);
            animCasa = {
                modo: 'entrar',
                ini: performance.now(),
                dur: Math.max(1800, (dist / 1.6) * 1000),
                desde: desde,
                puerta: meta.clone(),
                base: personaje.scale.x || 1,
                onFin: function () {
                    entrandoSaliendo = true;
                    const dest = casasPorId[nodoActual];
                    const luego = () => {
                        entrandoSaliendo = false;
                        if (onFin) onFin();
                    };
                    if (dest) animarPuerta(dest, false).then(luego);
                    else luego();
                },
            };
        };
        entrandoSaliendo = true;
        if (casa) animarPuerta(casa, true).then(caminar);
        else caminar();
    }
    // Posición del punto 3 (temática / cruce). Ahí vuelve al salir de la casa.
    function posPunto3() {
        if (idModulo && nodos[idModulo] && nodos[idModulo].pos) return nodos[idModulo].pos.clone();
        const est = estacionPorId(nodoActual);
        return est && est.grupo ? est.grupo.position.clone() : null;
    }

    function salirDeCasa(onFin) {
        const puerta = puertasCasa[nodoActual];
        const casa = casasPorId[nodoActual];
        if (!puerta || !personaje) { if (personaje) personaje.visible = true; if (onFin) onFin(); return; }
        const irse = (alAfuera) => {
            if (!personaje || !puertasCasa[nodoActual]) { if (alAfuera) alAfuera(); return; }
            entrandoSaliendo = true;
            const ancla = puertasCasa[nodoActual].clone();
            if (mundo) ancla.y = mundo.altura(ancla.x, ancla.z);
            personaje.position.copy(ancla);
            reengancharCamara();
            const mira = posPunto3() || ancla;
            const rot0 = personaje.rotation.y;
            let rot1 = Math.atan2(mira.x - ancla.x, mira.z - ancla.z);
            let delta = rot1 - rot0;
            while (delta > Math.PI) delta -= Math.PI * 2;
            while (delta < -Math.PI) delta += Math.PI * 2;
            rot1 = rot0 + delta;
            const base = personaje.scale.x || 1;
            const camino = (nodos[nodoActual] && nodos[nodoActual].pos)
                ? nodos[nodoActual].pos.clone()
                : ancla.clone();
            if (mundo) camino.y = mundo.altura(camino.x, camino.z);
            const caminarDeVuelta = function () {
                const dist = Math.hypot(camino.x - ancla.x, camino.z - ancla.z);
                if (dist < 0.35) { if (alAfuera) alAfuera(); return; }
                entrandoSaliendo = true;
                animCasa = {
                    modo: 'salir',
                    ini: performance.now(),
                    dur: Math.max(900, (dist / 2.2) * 1000),
                    desde: camino,
                    puerta: ancla.clone(),
                    base: base,
                    onFin: alAfuera || null,
                };
            };
            if (Math.abs(delta) < 0.12) {
                caminarDeVuelta();
                return;
            }
            animCasa = {
                modo: 'girar',
                ini: performance.now(),
                dur: Math.max(450, Math.abs(delta) / Math.PI * 700),
                ancla: ancla,
                rot0: rot0,
                rot1: rot1,
                base: base,
                onFin: caminarDeVuelta,
            };
        };
        const alAfuera = () => {
            entrandoSaliendo = true;
            const dest = casasPorId[nodoActual];
            const luego = () => {
                entrandoSaliendo = false;
                if (onFin) onFin();
            };
            if (dest) animarPuerta(dest, false).then(luego);
            else luego();
        };
        entrandoSaliendo = true;
        if (casa) animarPuerta(casa, true).then(() => irse(alAfuera));
        else irse(onFin);
    }

    function entrarYHablarExperiencia(p) {
        entrarACasa(function () {
            hablaSinVoltear = true;
            decirAlLlegar(p, function () {
                hablaSinVoltear = false;
                prepararLadeoSalida();
                iniciarExperiencia();
            });
        });
    }

    function terminarAvance() {
        caminando = false;
        // Volver a un cruce ya visto no reabre su ficha.
        const destinoYaVisitado = !!(animDestinoId && visitados.has(animDestinoId));
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

        refrescarEstaciones(); actualizarHud(false);
        if (idModulo && nodoActual === idModulo && destinoYaVisitado) orientarAlSiguiente();
        const cb = alLlegarCb; alLlegarCb = null;

        if (destinoYaVisitado && p && !esParadaExperiencia(p)) {
            if (cb) cb();
            // Última experiencia ya hecha: primero gira la cámara al final y después camina.
            if (nodoActual === idModulo && ramasPendientes().length === 0
                && idFin && !visitados.has(idFin) && !regresandoAlFin) {
                pedirSalidaAlFin();
            } else if (!cb) {
                programarAuto();
            }
            return;
        }

        // En la experiencia voltea hacia la casa, camina unos pasos y se queda
        // adentro. La frase suena ya dentro; después empieza la actividad.
        if (idModulo && nodoActual === idModulo) {
            decirAlLlegar(p, function () { orientarAlSiguiente(); });
        } else if (p && esParadaExperiencia(p)) {
            entrarYHablarExperiencia(p);
        } else if (p && p.id !== 'inicio' && p.id !== 'fin') {
            decirAlLlegar(p);
        } else if (p && p.id === 'fin') {
            if (castilloGrupo) iniciarLoops(castilloGrupo);
            hablar(fraseParada(p));
            iniciarFuegos();
            mostrarCelebracionFin();
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

    // Misma nube del saludo: el texto que se lee es el que se escucha.
    // Se queda un mínimo para poder leerla si la voz falla, y no corta una frase corta.
    let dialogoToken = 0;
    let alCerrarVideo = null;
    let preguntandoVideo = false;

    function pintarOpcionesDialogo(opciones, alElegir) {
        const caja = elBocadillo.querySelector('.rn3d-bocadillo__opciones');
        if (!caja) return;
        caja.innerHTML = '';
        if (!opciones || !opciones.length) {
            caja.hidden = true;
            return;
        }
        caja.hidden = false;
        opciones.forEach(function (op) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'rn3d-bocadillo__op rn3d-bocadillo__op--' + (op.tono || 'no');
            b.textContent = op.texto;
            b.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                detenerNarracion();
                if (alElegir) alElegir(op);
            });
            caja.appendChild(b);
        });
    }

    let giroFrente = null;

    function mirarAlFrente() {
        if (!personaje || hablaSinVoltear) return;
        let delta = rumboCamino - personaje.rotation.y;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        if (Math.abs(delta) < 0.08) return;
        giroFrente = {
            t0: performance.now(),
            dur: Math.max(900, Math.abs(delta) / Math.PI * 1600),
            rot0: personaje.rotation.y,
            rot1: personaje.rotation.y + delta,
        };
    }

    function aplicarGiroFrente(now) {
        if (!giroFrente || !personaje || caminando) {
            if (caminando) giroFrente = null;
            return;
        }
        const k = Math.min(1, (now - giroFrente.t0) / giroFrente.dur);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        personaje.rotation.y = giroFrente.rot0 + (giroFrente.rot1 - giroFrente.rot0) * e;
        if (k >= 1) giroFrente = null;
    }

    function mostrarDialogo(texto, alTerminar, opciones) {
        if (!elBocadillo) {
            if (alTerminar) alTerminar();
            return;
        }
        const textoEl = elBocadillo.querySelector('.rn3d-bocadillo__texto');
        if (textoEl) textoEl.textContent = texto || '';
        mostrandoBocadillo = true;
        elBocadillo.classList.remove('rn3d-oculto');
        const token = ++dialogoToken;
        const tIni = performance.now();
        const durMin = 4800;
        const esperaRespuesta = !!(opciones && opciones.length);
        let cerrado = false;
        const cerrar = function () {
            if (cerrado || token !== dialogoToken) return;
            cerrado = true;
            mostrandoBocadillo = false;
            elBocadillo.classList.add('rn3d-oculto');
            pintarOpcionesDialogo(null);
            mirarAlFrente();
            if (alTerminar) alTerminar();
            irDetrasDelPersonaje();
        };
        if (esperaRespuesta) {
            pintarOpcionesDialogo(opciones, function (op) {
                if (cerrado || token !== dialogoToken) return;
                cerrado = true;
                mostrandoBocadillo = false;
                elBocadillo.classList.add('rn3d-oculto');
                pintarOpcionesDialogo(null);
                mirarAlFrente();
                if (op && op.accion) op.accion();
                irDetrasDelPersonaje();
            });
            hablar(texto);
            return;
        }
        pintarOpcionesDialogo(null);
        hablar(texto, function () {
            const falta = durMin - (performance.now() - tIni);
            if (falta > 0) setTimeout(cerrar, falta);
            else cerrar();
        });
        setTimeout(cerrar, 14000);
    }

    function soltarTrasVideo() {
        paradaVideoActual = null;
        preguntandoVideo = false;
        const cb = alCerrarVideo;
        alCerrarVideo = null;
        if (cb) cb();
    }

    function preguntarSiReverVideo() {
        if (preguntandoVideo || !paradaVideoActual) return;
        preguntandoVideo = true;
        const p = paradaVideoActual;
        mostrarDialogo('¿Lo quieres ver de nuevo?', null, [
            {
                texto: 'Sí',
                tono: 'si',
                accion: function () {
                    preguntandoVideo = false;
                    reproducirVideoParada(p);
                },
            },
            {
                texto: 'No',
                tono: 'no',
                accion: function () { soltarTrasVideo(); },
            },
        ]);
    }

    function decirAlLlegar(p, alTerminar) {
        const fin = function () {
            if (alTerminar) alTerminar();
            programarAuto();
        };
        mostrarDialogo(fraseParada(p), function () {
            if (esVideoParada(p)) {
                alCerrarVideo = fin;
                const empezo = reproducirVideoParada(p);
                if (!empezo) soltarTrasVideo();
                return;
            }
            if (esImagenParada(p)) {
                reproducirImagenParada(p);
                if (modoNav === 'auto') {
                    alCerrarVideo = fin;
                    setTimeout(function () {
                        if (paradaVideoActual !== p) return;
                        finalizarVideoParada(false);
                    }, 7000);
                    return;
                }
            }
            fin();
        });
    }

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


    function datosVideoParada(p) {
        const embed = p.media_embed || 'directo';
        const embedUrl = p.embed_url || p.media_url || p.video_url || p.videoUrl || '';
        return { embed, embedUrl };
    }

    function mostrarOverlayVideo(tipoMedia, medio) {
        const $fs = $('#rn3dVideoFs');
        const $btn = $('#rn3dMediaFsCerrar');
        const esImg = tipoMedia === 'imagen';
        if ($btn.length) {
            $btn.prop('hidden', !esImg).attr('aria-hidden', esImg ? 'false' : 'true');
        }
        ticketSalida++;
        saliendoNube = false;
        $fs.removeClass('rn3d-video-fs--sale');
        $fs.prop('hidden', false).attr('aria-hidden', 'false').addClass('rn3d-video-fs--activo');
        document.body.classList.add('rn3d-video-reproduciendo');
        prepararEntradaMedia(medio || null);
    }

    function prepararEntradaMedia(medio) {
        const inner = document.getElementById('rn3dVideoFsInner');
        if (!inner) return;
        inner.classList.remove('rn3d-media-entra', 'rn3d-media-sale');
        let ya = false;
        const arrancar = function () {
            if (ya || !inner.isConnected) return;
            ya = true;
            inner.classList.add('rn3d-media-entra');
        };
        if (!medio) {
            requestAnimationFrame(arrancar);
            return;
        }
        if (medio.tagName === 'IMG') {
            if (medio.complete) arrancar();
            else {
                medio.addEventListener('load', arrancar, { once: true });
                medio.addEventListener('error', arrancar, { once: true });
            }
            return;
        }
        if (medio.tagName === 'VIDEO') {
            if (medio.readyState >= 2) arrancar();
            else {
                medio.addEventListener('loadeddata', arrancar, { once: true });
                medio.addEventListener('error', arrancar, { once: true });
            }
            return;
        }
        medio.addEventListener('load', arrancar, { once: true });
        window.setTimeout(arrancar, 280);
    }

    function ocultarOverlayVideo() {
        const $fs = $('#rn3dVideoFs');
        const $btn = $('#rn3dMediaFsCerrar');
        if ($btn.length) {
            $btn.prop('hidden', true).attr('aria-hidden', 'true');
        }
        const inner = document.getElementById('rn3dVideoFsInner');
        if (inner) inner.classList.remove('rn3d-media-entra', 'rn3d-media-sale');
        $fs.prop('hidden', true).attr('aria-hidden', 'true').removeClass('rn3d-video-fs--activo rn3d-video-fs--sale');
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
                if (finYoutube) finalizarVideoParada(true);
            } catch (err) { /* noop */ }
        }

        if (embed === 'vimeo' && String(e.origin || '').includes('vimeo.com')) {
            try {
                const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                if (d && d.event === 'finish') finalizarVideoParada(true);
            } catch (err) { /* noop */ }
        }
    }

    function activarEscuchaEmbedVideo() {
        if (escuchandoEmbedVideo) return;
        escuchandoEmbedVideo = true;
        window.addEventListener('message', onMensajeEmbedVideo);
    }


    let generacionVideo = 0;
    let saliendoNube = false;
    let ticketSalida = 0;

    function salirNube(alTerminar) {
        const fs = document.getElementById('rn3dVideoFs');
        const inner = document.getElementById('rn3dVideoFsInner');
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const visible = fs && !fs.hidden && inner && inner.childElementCount;
        if (!visible || reduce) {
            saliendoNube = false;
            ocultarOverlayVideo();
            if (alTerminar) alTerminar();
            return;
        }
        saliendoNube = true;
        const ticket = ++ticketSalida;
        fs.classList.add('rn3d-video-fs--sale');
        let listo = false;
        const fin = function () {
            if (listo || ticket !== ticketSalida) return;
            listo = true;
            saliendoNube = false;
            ocultarOverlayVideo();
            if (alTerminar) alTerminar();
        };
        inner.addEventListener('animationend', function onEnd(ev) {
            if (ev.animationName !== 'rn3d-media-sale') return;
            inner.removeEventListener('animationend', onEnd);
            fin();
        });
        window.setTimeout(fin, 1100);
    }

    function finalizarVideoParada(preguntar) {
        if (saliendoNube) return;
        generacionVideo++;
        const $fs = $('#rn3dVideoFs');
        const vid = $fs.find('video')[0];
        if (vid) {
            try { vid.pause(); } catch (e) { /* noop */ }
        }
        $fs.find('iframe').each(function () {
            try {
                this.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
            } catch (err) { /* noop */ }
        });
        const preguntarAlSalir = !!(preguntar && modoNav !== 'auto' && paradaVideoActual && esVideoParada(paradaVideoActual));
        salirNube(function () {
            $fs.find('iframe').each(function () { this.src = ''; });
            $('#rn3dVideoFsInner').empty();
            desactivarEscuchaEmbedVideo();
            if (preguntarAlSalir) preguntarSiReverVideo();
            else if (modoNav === 'auto' && alCerrarVideo) soltarTrasVideo();
        });
    }

    function detenerVideoParada() {
        ticketSalida++;
        saliendoNube = false;
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
        preguntandoVideo = false;
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

        mostrarOverlayVideo('imagen', img);
    }

    function reproducirVideoParada(p) {
        if (!p || !esVideoParada(p)) return false;

        paradaVideoActual = p;
        const { embed, embedUrl } = datosVideoParada(p);
        if (!embedUrl) return false;

        const gen = ++generacionVideo;
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
            mostrarOverlayVideo('video', iframe);
            return true;
        }

        const video = document.createElement('video');
        video.src = embedUrl;
        video.playsInline = true;
        video.autoplay = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        $inner[0].appendChild(video);

        const alFinDirecto = function () {
            if (gen !== generacionVideo) return;
            finalizarVideoParada(true);
        };
        video.addEventListener('ended', alFinDirecto, { once: true });
        video.addEventListener('error', function () {
            if (gen !== generacionVideo) return;
            finalizarVideoParada(false);
            soltarTrasVideo();
        }, { once: true });

        mostrarOverlayVideo('video', video);
        const juego = video.play();
        if (juego && typeof juego.catch === 'function') {
            juego.catch(function () {
                if (gen !== generacionVideo) return;
                finalizarVideoParada(false);
                soltarTrasVideo();
            });
        }
        return true;
    }

    // ===================== MODALES — reusa el DOM del kiosco =====================

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
        // Sale de la casa y camina solo hasta la temática. Si ya no queda ninguna
        // experiencia, desde ahí sigue solo hasta el final: el marcador queda
        // detrás y no se puede tocar.
        const alSalir = () => {
            refrescarEstaciones();
            actualizarHud(false);
            if (esRamificado && idModulo && nodoActual !== idModulo && enExperienciaCompletada()) {
                caminarAForzado(idModulo);
                return;
            }
            if (!esRamificado && idFin && nodoActual !== idFin && !visitados.has(idFin) && !regresandoAlFin) {
                irAlFinPasandoPorTres();
            }
        };
        if (!personaje.visible || puertasCasa[nodoActual]) {
            salirDeCasa(alSalir);
        } else {
            alSalir();
        }
    }

    function opcionesVistaNino(bloques, mediaBase, nombre, expId) {
        return {
            bloques,
            mediaBase: mediaBase || '',
            experienciaNombre: nombre || 'Experiencia',
            experienciaId: expId || null,
            estudianteSexo: String($('#rnApp').data('estudiante-sexo') || ''),
            estudianteNombre: String($('#rnApp').data('estudiante-nombre') || ''),
            nivelEtario: String($('#rnApp').data('nivel-etario') || 'jardin'),
            alTerminarExperiencia: volverAlMapaDesdeExperiencia,
        };
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
                    experienciaCargada.nombre,
                    experienciaCargada.id
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
                    experienciaCargada.nombre,
                    experienciaCargada.id
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
    let mostrandoBocadillo = false; // true solo mientras el personaje "habla"
    let hablaSinVoltear = false;    // en la casa no se gira hacia la cámara
    function actualizarHud(enMov) {
        if (!elFill) return;
        const pct = Math.round((indiceMaximoVisitado / (N - 1)) * 100);
        elFill.style.width = pct + '%';
        const p = camino.paradas[indiceActual];
        elPaso.textContent = p ? etiquetaParada(p, indiceActual) : ('Paso ' + (indiceActual + 1));
        elHint.textContent = enMov ? 'Caminando…'
            : (!recorridoIniciado ? 'Toca ¡Iniciar! para empezar la aventura'
                : (indiceActual >= N - 1 ? '¡Completaste el recorrido!'
                    : (modoNav === 'auto' ? 'Yo te llevo a la siguiente parada'
                        : (modoNav === 'botones' ? 'Camina con las flechas de la izquierda'
                            : 'Toca la siguiente parada que brilla'))));
    }
    function ocultarEtiqueta() { if (elEtiqueta) elEtiqueta.style.display = 'none'; }
    function actualizarEtiquetaSiguiente() {
        if (!recorridoIniciado || caminando) { ocultarEtiqueta(); return; }
        const idSig = (nodosTocables()[0]) || null;
        const e = idSig ? estacionPorId(idSig) : null;
        if (!e || e.parada.id === 'inicio') { ocultarEtiqueta(); return; }
        const v = new THREE.Vector3(); e.medallon.getWorldPosition(v); v.y += 1.4; v.project(camera);
        if (v.z > 1) { ocultarEtiqueta(); return; }
        elEtiqueta.style.display = 'block';
        elEtiqueta.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
        elEtiqueta.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
        elEtiqueta.textContent = etiquetaParada(e.parada, e.indice);
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
            + '<div class="rn3d-celebracion__tarjeta">'
            +   '<p class="rn3d-celebracion__titulo">¡Lo lograste!</p>'
            +   '<p class="rn3d-celebracion__sub">Completaste toda la aventura</p>'
            +   '<button type="button" class="rn3d-celebracion__btn" id="rn3dFinInicio">Volver al inicio</button>'
            + '</div>';
        ctx.$paso[0].appendChild(cont);
        const btn = cont.querySelector('#rn3dFinInicio');
        if (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                volverPersonajeAlInicio();
            });
        }
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
            +     '<div class="rn3d-bocadillo__opciones" hidden></div>'
            +     '<span class="rn3d-bocadillo__pico"></span>'
            +   '</div>'
            + '</div>'
            // Botón "Iniciar" ABAJO: es lo ÚNICO visible al arrancar. Su toque es el
            // gesto del niño que desbloquea el audio en la tablet.
            + '<button class="rn3d-comenzar rn3d-oculto" id="rn3dIniciar"><span>¡Iniciar!</span><span class="rn3d-flecha">▶</span></button>'
            + '<div class="rn3d-etiqueta" id="rn3dEtiqueta"></div>';
        ctx.$paso[0].appendChild(raiz);
        montarControles();
        construirMenuLateral(raiz);
        elFill = raiz.querySelector('#rn3dFill');
        elPaso = raiz.querySelector('#rn3dPaso');
        elHint = raiz.querySelector('#rn3dHint');
        elEtiqueta = raiz.querySelector('#rn3dEtiqueta');
        elBocadillo = raiz.querySelector('#rn3dBocadillo');
        const btnIniciar = raiz.querySelector('#rn3dIniciar');
        elIniciar = btnIniciar;

        const saludo = '¡Hola! Bienvenido a esta aventura. Yo te voy a acompañar. ¡Vamos juntos!';

        // FLUJO: [botón Iniciar] → (toque) → [nube: personaje hablando] →
        //        (fin del diálogo) → el personaje CAMINA solo. Sin botón "Comenzar".
        let dialogoEnCurso = false;

        // Al terminar el diálogo: cierra la nube (suave) y arranca a caminar.
        let genArranque = 0;
        const terminarDialogo = () => {
            if (!dialogoEnCurso || genArranque !== cancelarArranque) return;
            dialogoEnCurso = false;
            mostrandoBocadillo = false;               // deja de anclarse al personaje
            elBocadillo.classList.add('rn3d-oculto');  // se cierra con transición
            recorridoIniciado = true; refrescarEstaciones();
            soltarAlCamino(350);
        };
        const soltarAlCamino = (espera) => {
            setTimeout(() => {
                if (modoNav === 'botones') {
                    sincronizarControles();
                    actualizarHud(false);
                    irDetrasDelPersonaje();
                    return;
                }
                caminarA(1);
            }, espera);
        };

        // Tiempo mínimo de lectura, por si en la tablet no hay voz o el audio falla:
        // así el diálogo siempre se ve un rato antes de que el personaje camine.
        const DUR_MIN_DIALOGO = 4800;

        btnIniciar.addEventListener('click', () => {
            const gen = genArranque = ++cancelarArranque;
            if (saludoYaDicho) {
                btnIniciar.classList.add('rn3d-oculto');
                recorridoIniciado = true;
                refrescarEstaciones();
                if (gen === cancelarArranque) soltarAlCamino(280);
                return;
            }
            // 1) desaparece el botón Iniciar (transición suave)
            btnIniciar.classList.add('rn3d-oculto');
            // 2) aparece la nube con el personaje "hablando"
            mostrandoBocadillo = true;
            elBocadillo.classList.remove('rn3d-oculto');
            dialogoEnCurso = true;
            const tIni = performance.now();
            const seguir = () => {
                if (gen !== cancelarArranque) return;
                terminarDialogo();
            };
            // 3) habla; al terminar la voz (o al cumplirse el mínimo) → caminar
            const alFin = () => {
                if (gen !== cancelarArranque) return;
                const falta = DUR_MIN_DIALOGO - (performance.now() - tIni);
                if (falta > 0) setTimeout(seguir, falta);
                else seguir();
            };
            hablar(saludo, alFin);         // el gesto del botón desbloquea el audio
            // respaldo por si la voz no notifica nunca
            setTimeout(() => { if (gen === cancelarArranque && dialogoEnCurso) seguir(); }, 9000);
        });
    }

    // Metros que se restan a la altura de la nube. Mayor la baja. 0 la deja donde está.
    const NUBE_BAJAR_NINO = 0;
    const NUBE_BAJAR_NINA = 0;

    // Ancla el bocadillo sobre la cabeza del personaje (proyección 3D→2D), solo
    // mientras dura el diálogo de bienvenida (mostrandoBocadillo).
    function actualizarBocadillo() {
        if (!elBocadillo) return;
        if (!mostrandoBocadillo) { elBocadillo.style.display = 'none'; return; }
        const bajarNube = personajeCual === 'nina' ? NUBE_BAJAR_NINA : NUBE_BAJAR_NINO;
        const sobrePies = (usaMapaGlb ? 3.6 : 5.4) - (Number.isFinite(bajarNube) ? bajarNube : 0);
        const v = new THREE.Vector3(); personaje.getWorldPosition(v); v.y += sobrePies; v.project(camera);
        if (v.z > 1) { elBocadillo.style.display = 'none'; return; }
        elBocadillo.style.display = 'block';
        const mx = 36;
        const ancho = elBocadillo.offsetWidth || 320;
        const alto = elBocadillo.offsetHeight || 140;
        let left = (v.x * 0.5 + 0.5) * window.innerWidth;
        let top = (-v.y * 0.5 + 0.5) * window.innerHeight;
        left = Math.max(mx + ancho * 0.5, Math.min(window.innerWidth - mx - ancho * 0.5, left));
        top = Math.max(mx + alto, Math.min(window.innerHeight - 48, top));
        elBocadillo.style.left = left + 'px';
        elBocadillo.style.top = top + 'px';
    }

    // ===================== Loop =====================
    function animar(now) {
        const dt = ultimoNow ? Math.min(0.1, (now - ultimoNow) / 1000) : 0.016;
        ultimoNow = now;
        if (mundo) mundo.actualizar(dt, now / 1000);
        if (grupoCasas) {
            for (let i = 0; i < grupoCasas.children.length; i++) {
                const mx = grupoCasas.children[i].userData.mixer;
                if (mx) mx.update(dt);
            }
        }
        animarFuegos(dt);
        animarEntradaSalida(now);
        let poseCamino = null;
        if (caminando && animCurva && personaje) {
            const k = Math.min(1, (now - animInicio) / animDur);
            const ease = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            const u = animT0 + (animT1 - animT0) * ease;
            const p = animCurva.getPoint(u);
            let tang = animCurva.getTangent(u).normalize();
            if (animT1 < animT0) tang.multiplyScalar(-1);
            poseCamino = { x: p.x, y: p.y, z: p.z, rot: Math.atan2(tang.x, tang.z), fin: k >= 1 };
        }
        if (eligiendoPersonaje && candidatosPersonaje && !pasoAlCentro) {
            candidatosPersonaje.forEach((c) => { if (c.mixer) c.mixer.update(dt); });
        }
        if (salidaPersonaje) {
            const s = salidaPersonaje;
            const k = Math.min(1, (now - s.t0) / s.dur);
            const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            s.pj.objeto.position.lerpVectors(s.desde, s.hasta, e);
            s.pj.objeto.rotation.y = s.yaw;
            if (s.pj.mixer) s.pj.mixer.update(dt);
            if (k >= 1) {
                soltarCandidato(s.pj);
                salidaPersonaje = null;
            }
        }
        if (pasoAlCentro) {
            const p = pasoAlCentro;
            const k = Math.min(1, (now - p.t0) / p.dur);
            const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            p.pj.objeto.position.lerpVectors(p.desde, p.hasta, e);
            let yaw = p.yawPaso;
            if (k > 0.62) {
                const u = (k - 0.62) / 0.38;
                let delta = p.yawCamino - p.yawPaso;
                while (delta > Math.PI) delta -= Math.PI * 2;
                while (delta < -Math.PI) delta += Math.PI * 2;
                yaw = p.yawPaso + delta * u;
            }
            p.pj.objeto.rotation.y = yaw;
            if (p.pj.mixer) p.pj.mixer.update(dt);
            if (k >= 1) {
                p.pj.objeto.position.copy(p.hasta);
                p.pj.objeto.rotation.y = p.yawCamino;
                const fin = p.alLlegar;
                pasoAlCentro = null;
                if (fin) fin();
            }
        }
        if (mixer) {
            const hablando = narrando || mostrandoBocadillo;
            const entrandoAndando = entrandoSaliendo && animCasa && animCasa.modo !== 'girar';
            const clip = (caminando || entrandoAndando || moviendoStick)
                ? (entrandoAndando ? CLIP_CAMINAR : clipMovimiento)
                : (hablando ? CLIP_HABLAR : CLIP_QUIETO);
            ponerClip(clip);
            mixer.update(dt);
        }
        if (poseCamino && personaje) {
            giroFrente = null;
            personaje.position.set(poseCamino.x, poseCamino.y, poseCamino.z);
            personaje.rotation.y = poseCamino.rot;
            rumboCamino = poseCamino.rot;
            if (poseCamino.fin) {
                caminando = false; animCurva = null;
                if (alLlegarPuente) {
                    const cb = alLlegarPuente; alLlegarPuente = null;
                    if (cb) cb();
                } else if (caminandoLibre) {
                    caminandoLibre = false;
                    const cb = alLlegarLibre; alLlegarLibre = null;
                    if (cb) cb();
                } else {
                    terminarAvance();
                }
            }
        }
        aplicarGiroFrente(now);
        aplicarMiradaSiguiente();
        const tocablesLoop = (!caminando && recorridoIniciado) ? nodosTocables() : [];
        estaciones.forEach((e, i) => {
            const esSig = tocablesLoop.indexOf(e.parada.id) >= 0;
            e.medallon.visible = e.parada.id !== 'inicio';
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
        if (modoNav === 'botones') moverConStick(dt);
        sincronizarControles();
        actualizarCamara(false); actualizarEtiquetaSiguiente(); actualizarBocadillo();
        pulsarSalidaAlFin(now);
        renderer.render(scene, camera);
        rafId = requestAnimationFrame(animar);
    }

    function luegoEleccion(fn, ms) {
        const id = setTimeout(fn, ms);
        timersEleccion.push(id);
    }

    function cortarTimersEleccion() {
        timersEleccion.forEach(clearTimeout);
        timersEleccion = [];
    }

    function quitarVentanaEleccion(opciones) {
        const capa = document.getElementById('rn3dElige');
        if (capa) capa.remove();
        const revelar = !opciones || opciones.revelar !== false;
        const menu = document.getElementById('rn3dMenu');
        const hud = document.querySelector('.rn3d-hud');
        if (revelar) {
            if (menu) menu.style.visibility = '';
            if (hud) hud.style.visibility = '';
        }
        const overlay = document.querySelector('.rn3d-overlay');
        if (overlay) overlay.classList.remove('is-sobre-elige');
        if (sueloEleccion) {
            if (sueloEleccion.parent) sueloEleccion.parent.remove(sueloEleccion);
            if (sueloEleccion.geometry) sueloEleccion.geometry.dispose();
            if (sueloEleccion.material) sueloEleccion.material.dispose();
            sueloEleccion = null;
        }
    }

    function soltarCandidato(pj) {
        if (!pj) return;
        if (pj.mixer) pj.mixer.stopAllAction();
        if (pj.objeto && pj.objeto.parent) pj.objeto.parent.remove(pj.objeto);
    }

    function apoyoEleccion() {
        const inicio = (nodos.inicio && nodos.inicio.pos)
            ? nodos.inicio.pos.clone()
            : (curva ? curva.getPoint(0).clone() : new THREE.Vector3());
        let yaw = 0;
        if (curva) {
            const t = (nodos.inicio && typeof nodos.inicio.t === 'number') ? nodos.inicio.t : 0;
            const tang = curva.getTangent(t);
            tang.y = 0;
            if (tang.lengthSq() > 1e-6) yaw = Math.atan2(tang.x, tang.z);
        }
        const frente = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const lado = new THREE.Vector3(-frente.z, 0, frente.x);
        return { inicio, yaw, frente, lado };
    }

    function plantarCandidatos() {
        if (!candidatosPersonaje || !candidatosPersonaje.length) return;
        const { inicio, yaw, lado } = apoyoEleccion();
        const n = candidatosPersonaje.length;
        candidatosPersonaje.forEach((c, i) => {
            if (n === 1) {
                c.objeto.position.set(inicio.x, inicio.y, inicio.z);
            } else {
                // lado apunta a la izquierda de la cámara. Niño queda bajo el botón de la izquierda.
                const desfase = i === 0 ? 1.7 : -1.7;
                const x = inicio.x + lado.x * desfase;
                const z = inicio.z + lado.z * desfase;
                const ySuelo = mundo ? mundo.altura(x, z) : inicio.y;
                c.objeto.position.set(x, ySuelo, z);
            }
            c.objeto.rotation.y = yaw;
        });
    }

    function empezarSalida(pj) {
        if (!pj || !pj.objeto) return;
        const { inicio, lado } = apoyoEleccion();
        const rel = pj.objeto.position.clone().sub(inicio);
        rel.y = 0;
        const dir = lado.clone();
        if (rel.dot(lado) < 0) dir.negate();
        const hasta = pj.objeto.position.clone().addScaledVector(dir, 16);
        if (mundo) hasta.y = mundo.altura(hasta.x, hasta.z);
        if (pj.acciones[CLIP_SALUDAR]) pj.acciones[CLIP_SALUDAR].stop();
        if (pj.acciones[CLIP_QUIETO]) pj.acciones[CLIP_QUIETO].stop();
        if (pj.acciones[CLIP_CAMINAR]) pj.acciones[CLIP_CAMINAR].reset().play();
        salidaPersonaje = {
            pj: pj,
            desde: pj.objeto.position.clone(),
            hasta: hasta,
            yaw: Math.atan2(dir.x, dir.z),
            t0: performance.now(),
            dur: 2600,
        };
    }

    function encuadrarCandidatos() {
        if (!camera || !candidatosPersonaje || !candidatosPersonaje.length) return;
        const foco = new THREE.Vector3();
        candidatosPersonaje.forEach((c) => foco.add(c.objeto.position));
        foco.multiplyScalar(1 / candidatosPersonaje.length);
        foco.y += 1.35;
        const yaw = candidatosPersonaje[0].objeto.rotation.y;
        const frente = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const varios = candidatosPersonaje.length > 1;
        const dist = varios ? 9.2 : 6.4;
        const alt = varios ? 2.2 : 1.6;
        const pos = foco.clone().addScaledVector(frente, dist);
        pos.y = (mundo ? mundo.altura(pos.x, pos.z) : foco.y) + alt + 1.2;
        if (enHablaEleccion) {
            camPos.lerp(pos, 0.07);
            camTarget.lerp(foco, 0.07);
            camera.position.copy(camPos);
            camera.lookAt(camTarget);
            return;
        }
        camera.position.copy(pos);
        camera.lookAt(foco);
        camPos.copy(pos);
        camTarget.copy(foco);
    }

    function mostrarEleccionPersonaje() {
        const gen = cargaId;
        eligiendoPersonaje = true;
        return Promise.all([
            cargarPersonaje(scene, 'nino'),
            cargarPersonaje(scene, 'nina'),
        ]).then(function (par) {
            if (gen !== cargaId || !scene) {
                par.forEach(soltarCandidato);
                return null;
            }
            candidatosPersonaje = par.map(function (pj) {
                const caja = new THREE.Box3().setFromObject(pj.objeto);
                const pies = caja.min.y - pj.objeto.position.y;
                const alto = Math.max(1.2, caja.max.y - caja.min.y);
                if (pj.acciones[CLIP_QUIETO]) pj.acciones[CLIP_QUIETO].stop();
                if (pj.acciones[CLIP_SALUDAR]) pj.acciones[CLIP_SALUDAR].reset().play();
                return { ...pj, pies, alto };
            });
            plantarCandidatos();
            const menu = document.getElementById('rn3dMenu');
            const hud = document.querySelector('.rn3d-hud');
            if (menu) menu.style.visibility = 'hidden';
            if (hud) hud.style.visibility = 'hidden';
            return esperarObraMinima().then(function () {
            if (gen !== cargaId || !scene) {
                (candidatosPersonaje || []).forEach(soltarCandidato);
                candidatosPersonaje = null;
                eligiendoPersonaje = false;
                return null;
            }
            const capa = document.createElement('div');
            capa.id = 'rn3dElige';
            capa.className = 'rn3d-elige';
            capa.innerHTML = ''
                + '<div class="rn3d-elige__marco">'
                +   '<h2 class="rn3d-elige__titulo">¿Con quién quieres ir?</h2>'
                +   '<div class="rn3d-elige__escena">'
                +     '<button type="button" class="rn3d-elige__btn" data-cual="nino"><span class="rn3d-elige__nombre rn3d-elige__nombre--zeus"><b>Zeus</b></span></button>'
                +     '<button type="button" class="rn3d-elige__btn" data-cual="nina"><span class="rn3d-elige__nombre rn3d-elige__nombre--zoe"><b>Zoe</b></span></button>'
                +   '</div>'
                + '</div>';
            ctx.$paso[0].appendChild(capa);
            quitarCarga();
            encuadrarCandidatos();
            if (!rafId) rafId = requestAnimationFrame(animar);
            const saludo = '¡Hola! Bienvenido a esta aventura. Yo te voy a acompañar. ¡Vamos juntos!';
            return new Promise(function (resolve) {
                let listo = false;
                capa.querySelectorAll('.rn3d-elige__btn').forEach(function (btn) {
                    btn.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (listo || gen !== cargaId) return;
                        listo = true;
                        const cual = btn.getAttribute('data-cual');
                        const elegido = candidatosPersonaje.find((c) => c.cual === cual) || candidatosPersonaje[0];
                        const otro = candidatosPersonaje.find((c) => c !== elegido);
                        candidatosPersonaje = [elegido];
                        if (otro) empezarSalida(otro);
                        enHablaEleccion = true;
                        capa.classList.add('rn3d-elige--habla');
                        personaje = elegido.objeto;
                        if (elegido.acciones[CLIP_SALUDAR]) elegido.acciones[CLIP_SALUDAR].fadeOut(0.2);
                        if (elegido.acciones[CLIP_HABLAR]) elegido.acciones[CLIP_HABLAR].reset().fadeIn(0.2).play();
                        const texto = elBocadillo && elBocadillo.querySelector('.rn3d-bocadillo__texto');
                        if (texto) texto.textContent = saludo;
                        const overlay = document.querySelector('.rn3d-overlay');
                        if (overlay) overlay.classList.add('is-sobre-elige');
                        mostrandoBocadillo = true;
                        if (elBocadillo) elBocadillo.classList.remove('rn3d-oculto');
                        saludoYaDicho = true;
                        const tIni = performance.now();
                        let hablo = false;
                        const viajar = function () {
                            if (hablo || gen !== cargaId) return;
                            hablo = true;
                            cortarTimersEleccion();
                            detenerNarracion();
                            mostrandoBocadillo = false;
                            if (elBocadillo) elBocadillo.classList.add('rn3d-oculto');
                            const overlayHabla = document.querySelector('.rn3d-overlay');
                            if (overlayHabla) overlayHabla.classList.remove('is-sobre-elige');
                            if (salidaPersonaje) {
                                soltarCandidato(salidaPersonaje.pj);
                                salidaPersonaje = null;
                            }
                            if (gen !== cargaId || !scene || !personaje) return;
                            const puesto = apoyoEleccion();
                            const desde = personaje.position.clone();
                            const hasta = puesto.inicio.clone();
                            if (mundo) hasta.y = mundo.altura(hasta.x, hasta.z);
                            const dx = hasta.x - desde.x;
                            const dz = hasta.z - desde.z;
                            const dist = Math.hypot(dx, dz);
                            const arrancarViaje = function () {
                                if (gen !== cargaId || !scene || !personaje) return;
                                enHablaEleccion = false;
                                eligiendoPersonaje = false;
                                candidatosPersonaje = null;
                                mixer = elegido.mixer;
                                accionesPersonaje = elegido.acciones;
                                personajeCual = elegido.cual || 'nino';
                                clipActual = '';
                                if (mixer) mixer.stopAllAction();
                                ponerClip(CLIP_QUIETO);
                                personaje.position.copy(hasta);
                                personaje.rotation.y = puesto.yaw;
                                rumboCamino = puesto.yaw;
                                construirCaminoAlParque();
                                zoomCam = ZOOM_INICIAL;
                                const plano = encuadreArranque(personaje.position.clone(), ZOOM_INICIAL);
                                quitarVentanaEleccion({ revelar: false });
                                viajeEntrada = {
                                    t0: performance.now(),
                                    dur: 1600,
                                    desde: camera.position.clone(),
                                    hasta: plano.pos.clone(),
                                    miraDesde: camTarget.clone(),
                                    miraHasta: plano.mira.clone(),
                                    alFin: function () {
                                        const menuFin = document.getElementById('rn3dMenu');
                                        const hudFin = document.querySelector('.rn3d-hud');
                                        if (menuFin) menuFin.style.visibility = '';
                                        if (hudFin) hudFin.style.visibility = '';
                                        elegido.entradaLista = true;
                                        if (gen === cargaId) resolve(elegido);
                                    },
                                };
                            };
                            if (dist < 0.25) {
                                arrancarViaje();
                                return;
                            }
                            if (elegido.acciones[CLIP_HABLAR]) elegido.acciones[CLIP_HABLAR].fadeOut(0.15);
                            if (elegido.acciones[CLIP_SALUDAR]) elegido.acciones[CLIP_SALUDAR].stop();
                            if (elegido.acciones[CLIP_QUIETO]) elegido.acciones[CLIP_QUIETO].stop();
                            if (elegido.acciones[CLIP_CAMINAR]) elegido.acciones[CLIP_CAMINAR].reset().fadeIn(0.15).play();
                            pasoAlCentro = {
                                pj: elegido,
                                desde: desde,
                                hasta: hasta,
                                yawPaso: Math.atan2(dx, dz),
                                yawCamino: puesto.yaw,
                                t0: performance.now(),
                                dur: Math.min(1500, Math.max(800, dist * 700)),
                                alLlegar: arrancarViaje,
                            };
                        };
                        const cerrarHabla = function () {
                            const falta = 4200 - (performance.now() - tIni);
                            if (falta > 0) luegoEleccion(viajar, falta);
                            else viajar();
                        };
                        hablar(saludo, cerrarHabla);
                        luegoEleccion(cerrarHabla, 9000);
                    });
                });
            });
            });
        });
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
        fijarModoNavegacion();
        moviendoStick = false; orbitaStick = 0; alturaStick = 0; yawSigue = null; autoToken++; limitesMapa = null;
        sticks.mover.x = 0; sticks.mover.y = 0; sticks.camara.x = 0; sticks.camara.y = 0;
        ultimoNow = 0; mostrandoBocadillo = false;
        seguimientoActivo = false; mezclaHabla = 0; rumboCamino = 0;
        orbitaAplicada = 0; distLejosAplicada = 0; acopleDetras = 0; yawObjetivo = null; giroFrente = null;
        focoManual = null;
        angLadeo = 0; yawCamSuave = null; signoLadeo = 1;
        // Estado de grafo
        construirGrafo();
        nodoActual = camino.paradas[0] ? camino.paradas[0].id : null; // arranca en 'inicio'
        visitados = new Set();
        ramasCompletadas = new Set(); regresandoAlFin = false; esperarParaFin = false; esperaFinDesde = 0;
        fuegos = []; fuegosActivos = false;
        casasPorId = {};
        castilloGrupo = null;
        parqueGrupo = null;
        puertasCasa = {}; entrandoSaliendo = false;
        zonaJuegos = null; zonaJuegosCartel = null; zonaJuegosCentro = null; juegosAbiertos = false;
        zonaJuegosParada = null; caminandoLibre = false; alLlegarLibre = null; alLlegarPuente = null; posAntesDeCarpa = null;

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
        camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.5, 1500);

        raycaster = new THREE.Raycaster(); puntero = new THREE.Vector2();
        onCanvasClick = function (e) { alTocar(e.clientX, e.clientY); };
        renderer.domElement.addEventListener('click', onCanvasClick);

        construirModales();
        construirOverlay();
        mostrarConstruccion();

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

        const token = ++cargaId;
        armarMundo(scene, {
            modesto: equipoModesto,
            ambiente: ambienteSlug,
            escalaCasaInicio: ESCALA_CASA_INICIO,
            posXCasaInicio: POS_X_CASA_INICIO,
            posYCasaInicio: POS_Y_CASA_INICIO,
        }).then(function (listo) {
            if (token !== cargaId || !scene) {
                listo.destruir();
                return null;
            }
            mundo = listo;
            usaMapaGlb = true;
            if (!mundo.curva) throw new Error('El camino del mapa no tiene eje.');
            curva = mundo.curva;
            asignarPosicionesSobreCamino();
            construirCaminosLaterales();
            construirEstaciones();
            colocarProxyCarpa();
            return colocarCasasExperiencia().then(function () {
                if (token !== cargaId || !scene) return null;
                return mostrarEleccionPersonaje();
            });
        }).then(function (pj) {
            if (!pj || token !== cargaId || !scene) {
                if (pj && pj.objeto) scene && scene.remove(pj.objeto);
                return;
            }
            personaje = pj.objeto;
            mixer = pj.mixer;
            accionesPersonaje = pj.acciones;
            personajeCual = pj.cual || 'nino';
            clipActual = accionesPersonaje[CLIP_QUIETO] ? CLIP_QUIETO : '';
            colocarPersonajeEn(nodoActual || 'inicio');
            construirCaminoAlParque();
            despejarEntradasCaminos();
            zoomCam = ZOOM_INICIAL;
            if (!pj.entradaLista) {
                camPos.copy(personaje.position).add(new THREE.Vector3(-16, 18, 22));
                camTarget.copy(personaje.position);
                actualizarCamara(true);
            }
            quitarCarga();
            if (elIniciar) elIniciar.classList.remove('rn3d-oculto');
            refrescarEstaciones();
            actualizarHud(false);
            if (!rafId) rafId = requestAnimationFrame(animar);
        }).catch(function (err) {
            if (token !== cargaId) return;
            console.error(err);
            mostrarCarga('No se pudo armar el mapa.');
        });

        return true;
    }

    const OBRA_MIN_MS = 3000;
    let obraDesde = 0;

    function esperarObraMinima() {
        const falta = OBRA_MIN_MS - (performance.now() - (obraDesde || performance.now()));
        if (falta <= 16) return Promise.resolve();
        return new Promise(function (resolve) { window.setTimeout(resolve, falta); });
    }

    function mostrarConstruccion() {
        obraDesde = performance.now();
        quitarCarga();
        if (!ctx.$paso || !ctx.$paso[0]) return;
        const el = document.createElement('div');
        el.id = 'rn3dCarga';
        el.className = 'rn3d-carga rn3d-carga--obra';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-label', 'Construyendo el mapa');
        el.innerHTML = ''
            + '<div class="rn3d-obra" aria-hidden="true">'
            + '<svg class="rn3d-obra__escena" viewBox="0 36 560 274" focusable="false">'
            + '<g class="rn3d-obra__sol"><circle cx="478" cy="62" r="26"/><circle cx="478" cy="62" r="36" fill="none" stroke="#ffe08a" stroke-width="6" opacity=".55"/></g>'
            + '<g class="rn3d-obra__nube rn3d-obra__nube--a"><ellipse cx="0" cy="8" rx="22" ry="14"/><ellipse cx="24" cy="4" rx="18" ry="12"/><ellipse cx="44" cy="10" rx="16" ry="10"/></g>'
            + '<g class="rn3d-obra__nube rn3d-obra__nube--b"><ellipse cx="0" cy="6" rx="16" ry="10"/><ellipse cx="18" cy="2" rx="14" ry="9"/><ellipse cx="34" cy="8" rx="12" ry="8"/></g>'
            + '<ellipse class="rn3d-obra__cesped" cx="280" cy="248" rx="236" ry="62"/>'
            + '<ellipse class="rn3d-obra__cesped-frente" cx="280" cy="268" rx="196" ry="34"/>'
            + '<path class="rn3d-obra__sendero" pathLength="100" d="M48 286 C 130 250, 168 236, 230 252 S 340 292, 430 246"/>'
            + '<g class="rn3d-obra__arbol rn3d-obra__arbol--1"><rect x="108" y="196" width="12" height="36" rx="3"/><circle cx="114" cy="176" r="26"/><circle cx="96" cy="190" r="16"/><circle cx="132" cy="188" r="15"/></g>'
            + '<g class="rn3d-obra__arbol rn3d-obra__arbol--2"><rect x="196" y="168" width="10" height="30" rx="3"/><polygon points="201,118 176,184 226,184"/></g>'
            + '<g class="rn3d-obra__arbol rn3d-obra__arbol--3"><rect x="318" y="176" width="10" height="28" rx="3"/><polygon points="323,128 300,190 346,190"/></g>'
            + '<g class="rn3d-obra__casa">'
            + '<g class="rn3d-obra__casa-cuerpo"><rect x="392" y="168" width="78" height="62" rx="6"/><rect x="418" y="196" width="22" height="34" rx="3"/><rect x="404" y="180" width="16" height="14" rx="2"/></g>'
            + '<polygon class="rn3d-obra__casa-techo" points="380,176 431,128 484,176"/>'
            + '</g>'
            + '</svg>'
            + '<p class="rn3d-obra__texto">Construyendo el mapa<span class="rn3d-obra__puntos"><i></i><i></i><i></i></span></p>'
            + '</div>';
        ctx.$paso[0].appendChild(el);
    }

    function mostrarCarga(texto) {
        quitarCarga();
        if (!ctx.$paso || !ctx.$paso[0]) return;
        const el = document.createElement('div');
        el.id = 'rn3dCarga';
        el.className = 'rn3d-carga';
        el.textContent = texto;
        ctx.$paso[0].appendChild(el);
    }

    function quitarCarga() {
        const el = document.getElementById('rn3dCarga');
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    // Reparte las paradas de la clase a lo largo del sendero ya modelado.
    // Tronco, luego cada rama, y el fin al final: así un tramo del grafo
    // es un tramo del mismo camino. El fin se alarga para dejar sitio al castillo.
    const METROS_EXTRA_FIN = 42;
    function tMasCercano(pos) {
        let mejor = 0;
        let dMin = Infinity;
        for (let i = 0; i <= 96; i++) {
            const p = curva.getPoint(i / 96);
            const d = (p.x - pos.x) ** 2 + (p.z - pos.z) ** 2;
            if (d < dMin) { dMin = d; mejor = i / 96; }
        }
        return mejor;
    }
    function prolongarFinal() {
        if (!curva || !mundo || !mundo.altura) return null;
        const vieja = curva;
        const pts = [];
        for (let i = 0; i <= 32; i++) pts.push(vieja.getPoint(i / 32).clone());
        const tang = vieja.getTangent(1);
        tang.y = 0;
        if (tang.lengthSq() < 1e-6) tang.set(1, 0, 0);
        tang.normalize();
        const cola = pts[pts.length - 1].clone();
        const extra = [];
        const solape = cola.clone().addScaledVector(tang, -2.5);
        solape.y = cola.y;
        extra.push(solape, cola.clone());
        const pasos = 6;
        for (let i = 1; i <= pasos; i++) {
            const p = cola.clone().addScaledVector(tang, METROS_EXTRA_FIN * i / pasos);
            p.y = mundo.altura(p.x, p.z) + 0.22;
            pts.push(p.clone());
            extra.push(p);
        }
        curva = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
        curvaExtra = new THREE.CatmullRomCurve3(extra, false, 'catmullrom', 0.1);
        return vieja;
    }
    function asignarPosicionesSobreCamino() {
        curvasRama = {};
        curvaExtra = null;
        const vieja = prolongarFinal();
        const base = vieja || curva;
        const tronco = esRamificado
            ? nodosDeTronco().map((n) => n.parada.id)
            : (camino.paradas || [])
                .filter((p) => !esParadaExperiencia(p))
                .map((p) => p.id);
        const n = tronco.length;
        tronco.forEach((id, i) => {
            if (!nodos[id]) return;
            const esFin = id === idFin;
            let pos;
            let t;
            if (esFin && vieja) {
                t = 1;
                pos = curva.getPoint(1).clone();
            } else {
                const tViejo = n <= 1 ? 0.5 : 0.04 + (0.92 * i / (n - 1));
                pos = base.getPoint(tViejo).clone();
                t = vieja ? tMasCercano(pos) : tViejo;
            }
            nodos[id].t = t;
            nodos[id].tLocal = t;
            nodos[id].curvaLocal = curva;
            nodos[id].spur = null;
            nodos[id].pos = pos;
        });
        if (esRamificado && idModulo && nodos[idModulo]) construirDesvios();
        else espolonesLineales();
        if (mundo && typeof mundo.aplanarAlrededor === 'function') {
            const curvasPlanas = [];
            Object.keys(curvasRama).forEach((k) => { if (curvasRama[k]) curvasPlanas.push(curvasRama[k]); });
            if (curvaExtra) curvasPlanas.push(curvaExtra);
            const soles = [];
            Object.values(nodos).forEach((n) => {
                if (!n.pos) return;
                if (esParadaExperiencia(n.parada) || n.parada.id === 'fin') soles.push(n.pos);
            });
            mundo.aplanarAlrededor(curvasPlanas, soles);
            const yCamino = 0.22;
            const tender = (c) => {
                if (!c || !c.points) return;
                c.points.forEach((p) => { p.y = yCamino; });
            };
            curvasPlanas.forEach(tender);
            tender(curva);
            Object.values(nodos).forEach((n) => {
                const c = n.spur || n.curvaLocal;
                if (!c || typeof n.tLocal !== 'number') return;
                n.pos = c.getPoint(n.tLocal).clone();
            });
        }
        if (mundo && typeof mundo.despejarArboles === 'function') {
            const curvas = [curva];
            Object.keys(curvasRama).forEach((k) => { if (curvasRama[k]) curvas.push(curvasRama[k]); });
            mundo.despejarArboles(curvas, 13);
        }
    }

    // Ángulos que salen del cruce sin pisar el sendero que sigue de largo
    // ni meter la casa dentro de un pino.
    function direccionesDesvio(origen, tang, ejeY, total) {
        const tFork = (nodos[idModulo] && nodos[idModulo].t) || 0;
        const choca = (x, z) => {
            const obs = (mundo && mundo.obstaculos) || [];
            for (let i = 0; i < obs.length; i++) {
                const ox = obs[i][0], oz = obs[i][1], r = obs[i][2];
                if (Math.hypot(x - ox, z - oz) < Math.max(3.4, r * 5)) return true;
            }
            return false;
        };
        const lejosDelTronco = (x, z) => {
            let mejor = Infinity;
            for (let s = 1; s <= 12; s++) {
                const p = curva.getPoint(Math.min(0.995, tFork + s * 0.02));
                mejor = Math.min(mejor, Math.hypot(x - p.x, z - p.z));
            }
            return mejor;
        };
        const validos = [];
        [1, -1].forEach((signo) => {
            [0.62, 1.0, 1.38, 1.75].forEach((ang) => {
                const dir = tang.clone().applyAxisAngle(ejeY, signo * ang).normalize();
                if (dir.dot(tang) < 0.25) return;
                const fin = origen.clone().addScaledVector(dir, 34);
                const medio = origen.clone().addScaledVector(dir, 16);
                if (choca(fin.x, fin.z) || choca(medio.x, medio.z)) return;
                const sep = lejosDelTronco(fin.x, fin.z);
                if (sep < 8) return;
                validos.push({ dir, sep, ang: signo * ang });
            });
        });
        validos.sort((a, b) => b.sep - a.sep);
        const elegidos = [];
        validos.forEach((v) => {
            if (elegidos.length >= total) return;
            if (elegidos.some((e) => Math.abs(e.ang - v.ang) < 0.34)) return;
            elegidos.push(v);
        });
        while (elegidos.length < total) {
            const i = elegidos.length;
            const signo = (i % 2 === 0) ? 1 : -1;
            const fila = Math.floor(i / 2);
            const ang = signo * (0.78 + fila * 0.42);
            elegidos.push({ dir: tang.clone().applyAxisAngle(ejeY, ang).normalize(), ang });
        }
        return elegidos.slice(0, total).map((e) => e.dir);
    }

    // Con una sola experiencia el grafo es una línea y esa parada no tenía
    // desvío: solo el marcador. Se le abre el mismo espolón que a las demás.
    function espolonesLineales() {
        const paradas = (camino && camino.paradas) || [];
        const ejeY = new THREE.Vector3(0, 1, 0);
        paradas.forEach((par, i) => {
            if (!esParadaExperiencia(par) || !nodos[par.id] || nodos[par.id].spur) return;
            const nodo = nodos[par.id];
            const boca = i > 0 ? paradas[i - 1].id : null;
            const ancla = boca && nodos[boca] && nodos[boca].pos ? nodos[boca] : null;
            if (!ancla) return;
            const origen = ancla.pos.clone();
            const tang = curva.getTangent(ancla.t || 0);
            tang.y = 0;
            if (tang.lengthSq() < 1e-6) tang.set(1, 0, 0);
            tang.normalize();
            const dir = direccionesDesvio(origen, tang, ejeY, 1)[0];
            const largo = 34;
            const crudo = [
                origen.clone(),
                origen.clone().addScaledVector(tang, 8).addScaledVector(dir, 5),
                origen.clone().addScaledVector(dir, largo * 0.62),
                origen.clone().addScaledVector(dir, largo),
            ];
            const pts = crudo.map((p) => {
                const ySuelo = mundo ? mundo.altura(p.x, p.z) : origen.y;
                return new THREE.Vector3(p.x, Math.max(origen.y, ySuelo) + 0.22, p.z);
            });
            const spur = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.35);
            curvasRama['lineal-' + par.id] = spur;
            nodo.spur = spur;
            nodo.tUnion = ancla.t || 0;
            nodo.tLocal = 1;
            nodo.t = 1;
            nodo.curvaLocal = spur;
            nodo.pos = spur.getPoint(1).clone();
            nodo.boca = boca;
        });
    }

    // Desde el paso 3 salen n cintas, una por experiencia. El GLB del camino
    // sigue de largo hasta el fin: ese es el camino n+1.
    function construirDesvios() {
        const origen = nodos[idModulo].pos.clone();
        const tang = curva.getTangent(nodos[idModulo].t);
        tang.y = 0;
        if (tang.lengthSq() < 1e-6) tang.set(1, 0, 0);
        tang.normalize();
        const ejeY = new THREE.Vector3(0, 1, 0);
        const ramas = [];
        for (let r = 1; r <= ramasTotales; r++) {
            const nodosR = nodosDeRama(r);
            if (nodosR.length) ramas.push({ r, nodosR });
        }
        const total = ramas.length;
        const dirs = direccionesDesvio(origen, tang, ejeY, total);
        ramas.forEach((rama, i) => {
            const dir = dirs[i];
            const largo = 34;
            const crudo = [
                origen.clone(),
                origen.clone().addScaledVector(tang, 8).addScaledVector(dir, 5),
                origen.clone().addScaledVector(dir, largo * 0.62),
                origen.clone().addScaledVector(dir, largo),
            ];
            const pts = crudo.map((p) => {
                const ySuelo = mundo ? mundo.altura(p.x, p.z) : origen.y;
                // Por encima del césped: si queda al ras, la cinta desaparece bajo el terreno.
                return new THREE.Vector3(p.x, Math.max(origen.y, ySuelo) + 0.22, p.z);
            });
            const spur = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.35);
            curvasRama[rama.r] = spur;
            rama.nodosR.forEach((nodo, k) => {
                const t = rama.nodosR.length === 1 ? 1 : 0.45 + 0.55 * (k / (rama.nodosR.length - 1));
                nodo.spur = spur;
                nodo.tLocal = t;
                nodo.t = t;
                nodo.curvaLocal = spur;
                nodo.pos = spur.getPoint(t).clone();
            });
        });
        if (total === 0) return;
    }

    function construirCaminosLaterales() {
        if (grupoRamas && grupoRamas.parent) grupoRamas.parent.remove(grupoRamas);
        grupoRamas = new THREE.Group();
        grupoRamas.name = 'desvios';
        scene.add(grupoRamas);
        const ids = Object.keys(curvasRama);
        if (!ids.length && !curvaExtra) return;
        const base = mundo && mundo.materialCamino;
        const mat = base
            ? base.clone()
            : new THREE.MeshStandardMaterial({ color: 0xa85225, roughness: 0.85, metalness: 0 });
        mat.side = THREE.DoubleSide;
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -2;
        mat.polygonOffsetUnits = -2;
        ids.forEach((key) => {
            const geo = mallaCinta(curvasRama[key], 4.2, 28);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.receiveShadow = true;
            mesh.castShadow = false;
            grupoRamas.add(mesh);
        });
        if (curvaExtra) {
            const geo = mallaCinta(curvaExtra, 4.2, 24);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.receiveShadow = true;
            mesh.castShadow = false;
            grupoRamas.add(mesh);
        }
    }

    function mallaCinta(spur, ancho, pasos) {
        const medio = ancho / 2;
        const pos = [];
        const uvs = [];
        const idx = [];
        for (let i = 0; i <= pasos; i++) {
            const t = i / pasos;
            const p = spur.getPoint(t);
            const tan = spur.getTangent(t);
            tan.y = 0;
            if (tan.lengthSq() < 1e-6) tan.set(1, 0, 0);
            tan.normalize();
            const lat = new THREE.Vector3(-tan.z, 0, tan.x);
            const y = p.y + 0.05;
            pos.push(p.x + lat.x * medio, y, p.z + lat.z * medio);
            pos.push(p.x - lat.x * medio, y, p.z - lat.z * medio);
            uvs.push(0, t * 4, 1, t * 4);
            if (i < pasos) {
                const a = i * 2;
                idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return geo;
    }

    // Casa del ambiente al inicio del camino. 1 = el tamaño del GLB en el mapa.
    // Mayor crece, menor encoge.
    const ESCALA_CASA_INICIO = 1.5;
    // Metros en el eje X del mundo. Positivo corre la casa hacia +X.
    const POS_X_CASA_INICIO = -1.5;
    // El otro eje del suelo (Z en la escena). Positivo corre hacia +Z.
    const POS_Y_CASA_INICIO = 0;

    async function colocarCasasExperiencia() {
        if (grupoCasas && grupoCasas.parent) grupoCasas.parent.remove(grupoCasas);
        grupoCasas = new THREE.Group();
        grupoCasas.name = 'casas-experiencia';
        casasPorId = {};
        if (scene) scene.add(grupoCasas);
        const tareas = [];
        // 0 = el frente del GLB (su +Z, donde está la puerta) mira al camino.
        // [0] = estacion1, [1] = estacion2, [2] = estacion3.
        const GIRO_CASA_GRADOS = [0, 0, 0];
        // Metros en vertical. Negativo baja la estación. La base del GLB ya queda en el suelo.
        const ALTURA_CASA = [-0.3, -0.3, -0.3];
        // Metros en el eje X del mundo. Positivo corre la estación hacia +X.
        // [0] = estacion1, [1] = estacion2, [2] = estacion3.
        const POS_X_CASA = [2.4, -0.8, 2.8];
        const POS_Y_CASA = [1.1, 3.0, 0.3];
        posXCasa = POS_X_CASA.slice();
        posYCasa = POS_Y_CASA.slice();
        // 1 = el tamaño del archivo. Mayor crece, menor encoge.
        const ESCALA_CASA = [1.5, 1.5, 1.5];
        const exps = Object.values(nodos)
            .filter((n) => n.spur && esParadaExperiencia(n.parada))
            .sort((a, b) => a.indice - b.indice);
        exps.forEach((nodo, iExp) => {
            const numero = (iExp % 3) + 1;
            tareas.push(clonarEstacion(ambienteSlug, numero).then((casa) => {
                if (!grupoCasas || !scene) return;
                const fin = nodo.spur.getPoint(1);
                const antes = nodo.spur.getPoint(0.92);
                const tang = fin.clone().sub(antes);
                tang.y = 0;
                if (tang.lengthSq() < 1e-6) tang.copy(nodo.spur.getTangent(1));
                tang.y = 0;
                if (tang.lengthSq() < 1e-6) tang.set(0, 0, 1);
                tang.normalize();
                const idx = numero - 1;
                const escala = Number.isFinite(ESCALA_CASA[idx]) ? ESCALA_CASA[idx] : 1;
                casa.scale.setScalar(escala);
                const frente = Number(casa.userData.frente);
                // La puerta queda en la punta del sendero. El cuerpo de la casa
                // sigue más allá; si avance es menor, la casa pisa el camino.
                const avance = (Number.isFinite(frente) && frente > 0.3 ? frente : 2.2) * escala;
                casa.userData.base = fin.clone().addScaledVector(tang, avance);
                casa.userData.tang = tang.clone();
                casa.userData.modelo = numero;
                casa.userData.paradaId = nodo.parada.id;
                casa.userData.indice = nodo.indice;
                casa.userData.numeroLabel = numeroParada(nodo.parada, nodo.indice);
                casa.userData.altura = ALTURA_CASA[idx] || 0;
                casa.userData.giro = (GIRO_CASA_GRADOS[idx] || 0) * Math.PI / 180;
                aplicarPoseEstacion(casa);
                casasPorId[nodo.parada.id] = casa;
                iniciarLoops(casa);
                grupoCasas.add(casa);
            }).catch((err) => { console.error(err); }));
        });
        tareas.push(colocarCastillo());
        tareas.push(colocarParque());
        await Promise.all(tareas);
        despejarEntradasCaminos();
    }

    async function colocarCastillo() {
        if (!grupoCasas || !curva) return;
        // 0 = el frente del modelo (su +Z) mira hacia el camino. Suma o resta 90 si queda de lado.
        const GIRO_CASTILLO_GRADOS = 0;
        // Metros en vertical. Negativo baja el castillo.
        const ALTURA_CASTILLO = 0;
        // 1 = el tamaño del archivo (~16 m).
        const ESCALA_CASTILLO = 1;
        let castillo;
        try {
            castillo = await clonarCastillo();
        } catch (err) {
            console.error(err);
            return;
        }
        if (!grupoCasas || !scene) return;
        const fin = curva.getPoint(1);
        const tang = curva.getTangent(1);
        tang.y = 0;
        if (tang.lengthSq() < 1e-6) tang.set(1, 0, 0);
        tang.normalize();
        const escala = Number.isFinite(ESCALA_CASTILLO) ? ESCALA_CASTILLO : 1;
        castillo.scale.setScalar(escala);
        const frente = Number(castillo.userData.frente);
        const alcance = (Number.isFinite(frente) && frente > 1) ? frente : 6;
        const puesto = fin.clone().addScaledVector(tang, alcance * escala);
        puesto.y = (mundo ? mundo.altura(puesto.x, puesto.z) : fin.y) + (ALTURA_CASTILLO || 0);
        castillo.position.copy(puesto);
        castillo.rotation.y = Math.atan2(-tang.x, -tang.z) + (GIRO_CASTILLO_GRADOS || 0) * Math.PI / 180;
        castilloGrupo = castillo;
        grupoCasas.add(castillo);
        if (mundo && typeof mundo.despejarArboles === 'function') {
            const lado = new THREE.Vector3(-tang.z, 0, tang.x);
            const r = alcance * escala;
            mundo.despejarArboles([
                [puesto.x, puesto.z],
                [puesto.x + tang.x * r, puesto.z + tang.z * r],
                [puesto.x - tang.x * r, puesto.z - tang.z * r],
                [puesto.x + lado.x * r, puesto.z + lado.z * r],
                [puesto.x - lado.x * r, puesto.z - lado.z * r],
            ], 11);
        }
    }

    async function colocarParque() {
        if (!grupoCasas || !mundo || !mundo.carpa) return;
        // Tamaño en metros. El GLB mide ~23 m; más de eso empieza a tapar el inicio.
        const ESCALA_PARQUE = 1;
        const META = 18;
        let parque;
        try {
            parque = await clonarParque(ambienteSlug);
        } catch (err) {
            console.error(err);
            return;
        }
        if (!grupoCasas || !scene) return;
        const c = mundo.carpa;
        const base = parque.userData.ancho || META;
        const escala = (META / base) * (Number.isFinite(ESCALA_PARQUE) ? ESCALA_PARQUE : 1);
        parque.scale.setScalar(escala);
        parque.userData.radioMundo = (base * escala) / 2;
        parque.position.set(c.x, mundo.altura(c.x, c.z), c.z);
        parqueGrupo = parque;
        grupoCasas.add(parque);
        construirCaminoAlParque();
    }

    function alejarDelTronco(p, minimo) {
        if (!curva) return p.clone();
        let mejor = 0;
        let dMin = Infinity;
        for (let i = 0; i <= 64; i++) {
            const q = curva.getPoint(i / 64);
            const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2;
            if (d < dMin) { dMin = d; mejor = i / 64; }
        }
        if (Math.sqrt(dMin) >= minimo) return p.clone();
        const q = curva.getPoint(mejor);
        const tang = curva.getTangent(mejor);
        tang.y = 0;
        if (tang.lengthSq() < 1e-6) tang.set(1, 0, 0);
        tang.normalize();
        const away = new THREE.Vector3(p.x - q.x, 0, p.z - q.z);
        if (away.lengthSq() < 0.04) away.set(-tang.z, 0, tang.x);
        away.normalize();
        const out = q.clone().addScaledVector(away, minimo);
        out.y = p.y;
        return out;
    }

    function acomodarFarolasInicio(tJunta) {
        if (!mundo || !mundo.colocarProp || !curva || !mundo.farolas) return;
        const inicio = curva.getPoint(0);
        const lista = [];
        mundo.farolas.forEach((f) => {
            let tMejor = 0;
            let dMin = Infinity;
            for (let i = 0; i <= 96; i++) {
                const p = curva.getPoint(i / 96);
                const d = (p.x - f.x) ** 2 + (p.z - f.z) ** 2;
                if (d < dMin) { dMin = d; tMejor = i / 96; }
            }
            const cercaDelInicio = Math.hypot(f.x - inicio.x, f.z - inicio.z) < 26;
            if (cercaDelInicio && Math.sqrt(dMin) < 3.2) lista.push({ f, t: tMejor });
        });
        lista.sort((a, b) => a.t - b.t);
        const radio = 3.3;
        lista.forEach((item, i) => {
            let t = item.t;
            if (Math.abs(t - tJunta) < 0.04) t = Math.min(0.96, tJunta + 0.06);
            const p = curva.getPoint(t);
            const tang = curva.getTangent(t);
            tang.y = 0;
            if (tang.lengthSq() < 1e-6) tang.set(1, 0, 0);
            tang.normalize();
            const lat = new THREE.Vector3(-tang.z, 0, tang.x);
            const signo = i % 2 === 0 ? 1 : -1;
            mundo.colocarProp(item.f, p.x + lat.x * signo * radio, p.z + lat.z * signo * radio);
        });
    }

    function construirCaminoAlParque() {
        if (!scene || !mundo || !parqueGrupo || !curva) return;
        const ini = (nodos.inicio && nodos.inicio.pos)
            ? nodos.inicio.pos.clone()
            : curva.getPoint(0).clone();
        const centro = parqueGrupo.position.clone();
        const hacia = ini.clone().sub(centro);
        hacia.y = 0;
        if (hacia.lengthSq() < 1) hacia.set(0, 0, 1);
        hacia.normalize();
        // El arco del modelo está en su +Z. Girarlo para que mire al inicio.
        parqueGrupo.rotation.y = Math.atan2(hacia.x, hacia.z);
        parqueGrupo.updateMatrixWorld(true);
        const alcance = (parqueGrupo.userData.frente || 9) * (parqueGrupo.scale.x || 1);
        const boca = centro.clone().addScaledVector(hacia, alcance * 0.6);
        const tIni = (nodos.inicio && typeof nodos.inicio.t === 'number') ? nodos.inicio.t : 0;
        const tang = curva.getTangent(tIni);
        tang.y = 0;
        if (tang.lengthSq() < 1e-6) tang.set(1, 0, 0);
        tang.normalize();
        const alParque = centro.clone().sub(ini);
        alParque.y = 0;
        if (alParque.lengthSq() < 1) alParque.copy(tang);
        alParque.normalize();
        let lado = new THREE.Vector3(-tang.z, 0, tang.x);
        if (lado.dot(alParque) < 0) lado.negate();
        // El principal mide 4.4 (mitad 2.2). Este sendero llega de punta:
        // el ancho de la cinta queda a lo largo del principal, no hacia él.
        // punta = 2.2 apoya el centro del corte en la orilla. Menos lo mete dentro.
        const mediaPrincipal = 2.2;
        const punta = 2.2;
        let tJunta = 0;
        let dJunta = Infinity;
        for (let i = 0; i <= 80; i++) {
            const q = curva.getPoint(i / 80);
            const d = (q.x - boca.x) ** 2 + (q.z - boca.z) ** 2;
            if (d < dJunta) { dJunta = d; tJunta = i / 80; }
        }
        const qJunta = curva.getPoint(tJunta);
        const tJuntaTan = curva.getTangent(tJunta);
        tJuntaTan.y = 0;
        if (tJuntaTan.lengthSq() > 1e-6) tJuntaTan.normalize();
        else tJuntaTan.copy(tang);
        lado.set(-tJuntaTan.z, 0, tJuntaTan.x);
        if (lado.dot(boca.clone().sub(qJunta)) < 0) lado.negate();
        const junta = qJunta.clone().addScaledVector(lado, punta);
        const salida = junta.clone().addScaledVector(lado, 3.5);
        const pasos = 6;
        const puntos = [];
        for (let s = 0; s <= pasos; s++) {
            const k = s / pasos;
            let p = s === 0 ? junta.clone() : salida.clone().lerp(boca, k);
            if (s > 0) p = alejarDelTronco(p, mediaPrincipal);
            // El principal ya vive en esta altura. mallaCinta suma 0.05, así que se resta aquí.
            puntos.push(new THREE.Vector3(p.x, qJunta.y - 0.05, p.z));
        }
        zonaJuegosParada = boca.clone();
        zonaJuegosParada.y = mundo.altura(boca.x, boca.z);
        acomodarFarolasInicio(tJunta);
        const spur = new THREE.CatmullRomCurve3(puntos, false, 'catmullrom', 0);
        if (grupoCaminoParque && grupoCaminoParque.parent) grupoCaminoParque.parent.remove(grupoCaminoParque);
        grupoCaminoParque = new THREE.Group();
        grupoCaminoParque.name = 'caminoParque';
        const base = mundo.materialCamino;
        const mat = base
            ? base.clone()
            : new THREE.MeshStandardMaterial({ color: 0xa85225, roughness: 0.85, metalness: 0 });
        mat.side = THREE.DoubleSide;
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -2;
        mat.polygonOffsetUnits = -2;
        const mesh = new THREE.Mesh(mallaCinta(spur, 4.2, 28), mat);
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        grupoCaminoParque.add(mesh);
        scene.add(grupoCaminoParque);
        if (typeof mundo.despejarArboles === 'function') {
            mundo.despejarArboles([spur], 7);
        }
        entradaParque = { spur, boca: boca.clone() };
    }

    function colocarProxyCarpa() {
        if (!mundo || !mundo.carpa) return;
        const c = mundo.carpa;
        const proxy = new THREE.Mesh(
            new THREE.BoxGeometry(6.2, 5.2, 6.4),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
        );
        proxy.position.set(c.x, c.y + 2.4, c.z);
        scene.add(proxy);
        zonaJuegos = proxy;
        let cerca = curva.getPoint(0);
        let mejor = Infinity;
        for (let i = 0; i <= 48; i++) {
            const p = curva.getPoint(i / 48);
            const d = (p.x - c.x) ** 2 + (p.z - c.z) ** 2;
            if (d < mejor) { mejor = d; cerca = p; }
        }
        const dir = new THREE.Vector3(cerca.x - c.x, 0, cerca.z - c.z);
        if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
        dir.normalize();
        zonaJuegosParada = new THREE.Vector3(c.x, c.y, c.z).addScaledVector(dir, 5.4);
        zonaJuegosParada.y = mundo.altura(zonaJuegosParada.x, zonaJuegosParada.z);
    }

    function onResize() {
        if (!camera) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function destroy() {
        cargaId++;
        focoManual = null;
        usaMapaGlb = false;
        detenerNarracion();
        detenerVideoParada();
        cerrarPlayer();
        cerrarModal();
        quitarCarga();
        cortarTimersEleccion();
        viajeEntrada = null;
        pasoAlCentro = null;
        enHablaEleccion = false;
        saludoYaDicho = false;
        if (salidaPersonaje) {
            soltarCandidato(salidaPersonaje.pj);
            salidaPersonaje = null;
        }
        quitarVentanaEleccion();
        if (candidatosPersonaje) {
            candidatosPersonaje.forEach(soltarCandidato);
            candidatosPersonaje = null;
        }
        eligiendoPersonaje = false;

        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        if (mixer) {
            mixer.stopAllAction();
            mixer = null;
        }
        accionesPersonaje = null;
        clipActual = '';
        if (mundo) {
            mundo.destruir();
            mundo = null;
        }
        if (personaje && personaje.parent) personaje.parent.remove(personaje);
        personaje = null;
        if (zonaJuegos && zonaJuegos.parent) zonaJuegos.parent.remove(zonaJuegos);
        zonaJuegos = null;
        if (grupoCaminoParque) {
            const matsP = new Set();
            grupoCaminoParque.traverse((o) => {
                if (o.geometry) o.geometry.dispose();
                if (o.material) matsP.add(o.material);
            });
            matsP.forEach((m) => m.dispose());
            if (grupoCaminoParque.parent) grupoCaminoParque.parent.remove(grupoCaminoParque);
            grupoCaminoParque = null;
        }
        if (grupoRamas) {
            const mats = new Set();
            grupoRamas.traverse((o) => {
                if (o.geometry) o.geometry.dispose();
                if (o.material) mats.add(o.material);
            });
            mats.forEach((m) => m.dispose());
            if (grupoRamas.parent) grupoRamas.parent.remove(grupoRamas);
            grupoRamas = null;
        }
        if (grupoCasas) {
            grupoCasas.children.forEach((casa) => {
                const mx = casa.userData && casa.userData.mixer;
                if (!mx) return;
                mx.stopAllAction();
                casa.userData.mixer = null;
            });
            if (grupoCasas.parent) grupoCasas.parent.remove(grupoCasas);
            grupoCasas = null;
        }
        casasPorId = {};
        castilloGrupo = null;
        parqueGrupo = null;

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
        const controlesViejos = document.getElementById('rn3dControles');
        if (controlesViejos) controlesViejos.remove();

        window.removeEventListener('resize', onResize);
        if (ctx.$paso && ctx.$paso.length) ctx.$paso.off('click.rn3d');

        scene = null;
        camera = null;
        estaciones = [];
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

    if (window.jQuery) {
        window.jQuery(document).on('vn:experiencia-recargada.rn3d', function (_e, payload) {
            if (!payload || !payload.id) return;
            experienciaCargada = {
                id: payload.id,
                bloques: payload.bloques,
                mediaBase: payload.mediaBase,
                nombre: payload.nombre,
            };
        });
    }
})();
