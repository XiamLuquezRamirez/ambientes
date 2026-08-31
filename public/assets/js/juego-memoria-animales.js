/**
 * juego-memoria-animales.js — Juego de MEMORIA (parejas de animales).
 *   Web nativo (sin dependencias). Se monta dentro de un contenedor del banco
 *   de juegos. Voltear dos cartas: si el animal coincide, quedan; si no, se
 *   voltean de nuevo. Al emparejar todas → pantalla de éxito.
 *
 * API:
 *   window.JuegoMemoriaAnimales.montar(contenedorEl, {
 *       parejas: 6,                 // nº de parejas (por defecto 6 → 12 cartas)
 *       onSalir: fn,                // volver a la galería
 *       onGanar: fn(datos)          // se llama al completar (datos: {intentos, parejas})
 *   })
 *   Devuelve { destruir() } para limpiar timers al cerrar.
 */
(function () {
    'use strict';

    // Animales disponibles (emoji). Se toman los primeros `parejas`.
    const ANIMALES = ['🐘', '🦁', '🐸', '🐵', '🦊', '🐼', '🐨', '🐧', '🐝', '🦋', '🐢', '🐬'];

    function escapar(s) {
        return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Baraja Fisher-Yates (in place) y devuelve el mismo array.
    function barajar(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function montar(cont, opciones) {
        const opts = opciones || {};
        const nParejas = Math.min(ANIMALES.length, Math.max(2, opts.parejas || 6));
        const onSalir = opts.onSalir || function () {};
        const onGanar = opts.onGanar || function () {};

        let primera = null;       // primera carta volteada (esperando comparación)
        let bloqueado = false;    // true mientras se comparan dos cartas
        let intentos = 0;         // nº de veces que se voltearon 2 cartas
        let logradas = 0;         // parejas encontradas
        let timers = [];          // timers pendientes (para limpiar al destruir)

        // nº de columnas: 4 por defecto (6 parejas → 4×3). Se ajusta si hay pocas
        // cartas para no dejar una fila casi vacía.
        const total = nParejas * 2;
        const cols = total <= 6 ? total : (total % 4 === 0 || total > 8 ? 4 : (total % 3 === 0 ? 3 : 4));

        // Construye el mazo: cada animal x2, barajado.
        const mazo = barajar(
            ANIMALES.slice(0, nParejas).flatMap((a) => [a, a])
        );

        function esperar(ms, fn) {
            const t = setTimeout(fn, ms);
            timers.push(t);
            return t;
        }

        function render() {
            cont.innerHTML = `
                <div class="jma">
                    <div class="jma-top">
                        <span class="jma-stat">🎯 <b data-jma-intentos>0</b> intentos</span>
                        <span class="jma-stat">🐾 <b data-jma-logradas>0</b>/${nParejas} parejas</span>
                    </div>
                    <div class="jma-tablero" data-jma-tablero
                         style="grid-template-columns:repeat(${cols},minmax(0,1fr));"></div>
                </div>`;
            const tablero = cont.querySelector('[data-jma-tablero]');
            mazo.forEach((animal, i) => {
                const carta = document.createElement('button');
                carta.type = 'button';
                carta.className = 'jma-carta';
                carta.dataset.animal = animal;
                carta.dataset.idx = String(i);
                carta.setAttribute('aria-label', 'Carta');
                carta.innerHTML = `
                    <span class="jma-carta-inner">
                        <span class="jma-cara jma-dorso" aria-hidden="true"></span>
                        <span class="jma-cara jma-frente">${escapar(animal)}</span>
                    </span>`;
                carta.addEventListener('click', () => voltear(carta));
                tablero.appendChild(carta);
            });
        }

        function voltear(carta) {
            if (bloqueado) return;
            if (carta.classList.contains('jma-volteada') || carta.classList.contains('jma-lograda')) return;

            carta.classList.add('jma-volteada');

            if (!primera) { primera = carta; return; }

            // segunda carta → comparar
            intentos++;
            actualizarStats();
            bloqueado = true;
            cont.querySelector('.jma').classList.add('jma-bloqueado');

            const a = primera, b = carta;
            if (a.dataset.animal === b.dataset.animal) {
                // ¡pareja!
                esperar(420, () => {
                    a.classList.add('jma-lograda');
                    b.classList.add('jma-lograda');
                    logradas++;
                    actualizarStats();
                    resetTurno();
                    if (logradas === nParejas) esperar(600, mostrarExito);
                });
            } else {
                // no coinciden → voltear de nuevo
                esperar(850, () => {
                    a.classList.remove('jma-volteada');
                    b.classList.remove('jma-volteada');
                    resetTurno();
                });
            }
        }

        function resetTurno() {
            primera = null;
            bloqueado = false;
            const j = cont.querySelector('.jma');
            if (j) j.classList.remove('jma-bloqueado');
        }

        function actualizarStats() {
            const ei = cont.querySelector('[data-jma-intentos]');
            const el = cont.querySelector('[data-jma-logradas]');
            if (ei) ei.textContent = String(intentos);
            if (el) el.textContent = String(logradas);
        }

        // Estrellas según eficiencia: ideal = nParejas intentos (sin errores).
        function calcularEstrellas() {
            if (intentos <= nParejas + 1) return 3;
            if (intentos <= nParejas * 2) return 2;
            return 1;
        }

        function mostrarExito() {
            const estrellas = calcularEstrellas();
            const est = Array.from({ length: 3 }, (_, i) =>
                `<span class="jma-estrella">${i < estrellas ? '⭐' : '☆'}</span>`).join('');
            const capa = document.createElement('div');
            capa.className = 'jma-exito';
            capa.innerHTML = `
                <div class="jma-exito-emoji" aria-hidden="true">🎉</div>
                <h2 class="jma-exito-titulo">¡Muy bien!</h2>
                <div class="jma-estrellas" aria-label="${estrellas} de 3 estrellas">${est}</div>
                <p class="jma-exito-sub">Encontraste todas las parejas en ${intentos} intentos</p>
                <div class="jma-botones">
                    <button type="button" class="jma-btn jma-btn-jugar" data-jma-otra>🔄 Jugar otra vez</button>
                    <button type="button" class="jma-btn jma-btn-volver" data-jma-volver>Volver</button>
                </div>`;
            cont.querySelector('.jma').appendChild(capa);
            capa.querySelector('[data-jma-otra]').addEventListener('click', reiniciar);
            capa.querySelector('[data-jma-volver]').addEventListener('click', onSalir);
            // Gancho para futura integración (evidencias/logros).
            try { onGanar({ intentos, parejas: nParejas, estrellas }); } catch (e) { /* noop */ }
        }

        function reiniciar() {
            // vuelve a barajar y reconstruye
            barajar(mazo);
            primera = null; bloqueado = false; intentos = 0; logradas = 0;
            limpiarTimers();
            render();
        }

        function limpiarTimers() {
            timers.forEach(clearTimeout);
            timers = [];
        }

        render();

        return {
            destruir() { limpiarTimers(); if (cont) cont.innerHTML = ''; },
        };
    }

    window.JuegoMemoriaAnimales = { montar };
})();
