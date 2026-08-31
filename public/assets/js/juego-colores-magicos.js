/**
 * juego-colores-magicos.js — Juego de MEZCLA DE COLORES (web nativo).
 *   El niño combina primarios (rojo/azul/amarillo) para lograr un color
 *   objetivo. Enseña las mezclas básicas. Se monta dentro de un contenedor
 *   del banco de juegos.
 *
 * API (idéntica a los demás juegos web):
 *   window.JuegoColoresMagicos.montar(contenedorEl, {
 *       rondas: 4,                 // nº de colores a lograr
 *       onSalir: fn,               // volver a la galería
 *       onGanar: fn({aciertos, rondas, estrellas})
 *   }) → { destruir() }
 */
(function () {
    'use strict';

    // Primarios disponibles (hex para pintar).
    const PRIMARIOS = {
        rojo:     { nombre: 'Rojo',     hex: '#e23b3b' },
        azul:     { nombre: 'Azul',     hex: '#2f6fe0' },
        amarillo: { nombre: 'Amarillo', hex: '#f4c430' },
    };

    // Mezclas objetivo: combinación de 2 primarios → color secundario.
    // `clave` es el conjunto ordenado de primarios necesarios.
    const MEZCLAS = [
        { clave: ['azul', 'rojo'],      nombre: 'Morado',   emoji: '💜', hex: '#8e44c9' },
        { clave: ['amarillo', 'azul'],  nombre: 'Verde',    emoji: '💚', hex: '#3aa856' },
        { clave: ['amarillo', 'rojo'],  nombre: 'Naranja',  emoji: '🧡', hex: '#e8802b' },
    ];

    function barajar(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function montar(cont, opciones) {
        const opts = opciones || {};
        const onSalir = opts.onSalir || function () {};
        const onGanar = opts.onGanar || function () {};

        // Secuencia de objetivos (barajados, se repiten si rondas > 3).
        const nRondas = Math.max(1, opts.rondas || 4);
        const secuencia = [];
        while (secuencia.length < nRondas) {
            barajar(MEZCLAS.slice()).forEach((m) => { if (secuencia.length < nRondas) secuencia.push(m); });
        }

        let ronda = 0;           // índice de objetivo actual
        let aciertos = 0;
        let errores = 0;
        let mezcla = [];         // primarios añadidos al caldero (array de claves)
        let timers = [];

        function esperar(ms, fn) { const t = setTimeout(fn, ms); timers.push(t); return t; }
        function limpiarTimers() { timers.forEach(clearTimeout); timers = []; }

        // Color resultante de la mezcla actual (para pintar el caldero).
        // 0 primarios → gris; 1 → ese primario; 2 → color de mezcla si existe.
        function colorMezcla() {
            const set = [...new Set(mezcla)].sort();
            if (set.length === 0) return '#6b6b6b';
            if (set.length === 1) return PRIMARIOS[set[0]].hex;
            const m = MEZCLAS.find((x) => sonIguales(x.clave, set));
            return m ? m.hex : '#7a6f66'; // combinación no válida → marrón turbio
        }

        function sonIguales(a, b) {
            const sa = [...a].sort(), sb = [...b].sort();
            return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
        }

        function objetivo() { return secuencia[ronda]; }

        function render() {
            const obj = objetivo();
            cont.innerHTML = `
                <div class="jcm">
                    <div class="jcm-top">
                        <span class="jcm-stat">🎨 <b data-jcm-ronda>${ronda + 1}</b>/${nRondas}</span>
                        <span class="jcm-stat">⭐ <b data-jcm-aciertos>${aciertos}</b> logrados</span>
                    </div>
                    <div class="jcm-centro">
                        <div class="jcm-objetivo">
                            <span class="jcm-objetivo-label">Tienes que lograr</span>
                            <span class="jcm-objetivo-muestra" data-jcm-meta style="background:${obj.hex}"></span>
                            <span class="jcm-objetivo-nombre">${obj.emoji} ${obj.nombre}</span>
                        </div>
                        <div class="jcm-caldero-wrap">
                            <div class="jcm-caldero" data-jcm-caldero>
                                <div class="jcm-liquido" data-jcm-liquido style="background:#6b6b6b;height:0"></div>
                                <div class="jcm-caldero-vacio" data-jcm-vacio>Toca los frascos para echar pintura</div>
                            </div>
                            <div class="jcm-gotas" data-jcm-gotas></div>
                        </div>
                        <p class="jcm-mensaje" data-jcm-mensaje></p>
                    </div>
                    <div class="jcm-frascos">
                        ${Object.entries(PRIMARIOS).map(([k, p]) => `
                            <button type="button" class="jcm-frasco" data-jcm-primario="${k}">
                                <span class="jcm-frasco-bote" style="background:${p.hex}"></span>
                                <span class="jcm-frasco-nombre">${p.nombre}</span>
                            </button>`).join('')}
                    </div>
                    <div class="jcm-acciones">
                        <button type="button" class="jcm-btn jcm-btn-limpiar" data-jcm-limpiar>🧽 Limpiar</button>
                    </div>
                </div>`;

            cont.querySelectorAll('[data-jcm-primario]').forEach((b) => {
                b.addEventListener('click', () => añadir(b.dataset.jcmPrimario));
            });
            cont.querySelector('[data-jcm-limpiar]').addEventListener('click', limpiar);
        }

        function añadir(prim) {
            if (mezcla.length >= 3) return;   // límite razonable
            if (mezcla.includes(prim)) return; // no repetir el mismo primario
            mezcla.push(prim);
            pintarCaldero();
            // Comprobar automáticamente cuando hay 2+ primarios distintos.
            const distintos = [...new Set(mezcla)];
            if (distintos.length >= 2) esperar(350, comprobar);
        }

        function pintarCaldero() {
            const liq = cont.querySelector('[data-jcm-liquido]');
            const vacio = cont.querySelector('[data-jcm-vacio]');
            const gotas = cont.querySelector('[data-jcm-gotas]');
            const hay = mezcla.length > 0;
            if (liq) { liq.style.background = colorMezcla(); liq.style.height = hay ? '62%' : '0'; }
            if (vacio) vacio.style.display = hay ? 'none' : 'grid';
            if (gotas) gotas.textContent = mezcla.map((k) => PRIMARIOS[k].nombre).join(' + ');
        }

        function limpiar() {
            mezcla = [];
            pintarCaldero();
            msg('', '');
        }

        function comprobar() {
            const set = [...new Set(mezcla)].sort();
            const obj = objetivo();
            const cald = cont.querySelector('[data-jcm-caldero]');
            if (sonIguales(set, obj.clave)) {
                aciertos++;
                if (cald) { cald.classList.add('jcm-acierto'); esperar(600, () => cald.classList.remove('jcm-acierto')); }
                msg('¡' + obj.nombre + '! 🎉', 'bien');
                actualizarStats();
                esperar(950, siguiente);
            } else {
                errores++;
                if (cald) { cald.classList.add('jcm-error'); esperar(420, () => cald.classList.remove('jcm-error')); }
                msg('Casi… prueba otra mezcla', 'mal');
                esperar(900, limpiar);
            }
        }

        function siguiente() {
            ronda++;
            mezcla = [];
            if (ronda >= nRondas) { mostrarExito(); return; }
            render();
        }

        function msg(texto, tipo) {
            const el = cont.querySelector('[data-jcm-mensaje]');
            if (!el) return;
            el.textContent = texto;
            el.className = 'jcm-mensaje' + (tipo ? ' jcm-msg-' + tipo : '');
        }

        function actualizarStats() {
            const ea = cont.querySelector('[data-jcm-aciertos]');
            if (ea) ea.textContent = String(aciertos);
        }

        function calcularEstrellas() {
            if (errores === 0) return 3;
            if (errores <= nRondas) return 2;
            return 1;
        }

        function mostrarExito() {
            const estrellas = calcularEstrellas();
            const est = Array.from({ length: 3 }, (_, i) =>
                `<span class="jcm-estrella">${i < estrellas ? '⭐' : '☆'}</span>`).join('');
            const capa = document.createElement('div');
            capa.className = 'jcm-exito';
            capa.innerHTML = `
                <div class="jcm-exito-emoji" aria-hidden="true">🌈</div>
                <h2 class="jcm-exito-titulo">¡Eres un artista!</h2>
                <div class="jcm-estrellas" aria-label="${estrellas} de 3 estrellas">${est}</div>
                <p class="jcm-exito-sub">Lograste ${aciertos} colores mágicos</p>
                <div class="jcm-botones">
                    <button type="button" class="jcm-btn jcm-btn-jugar" data-jcm-otra>🔄 Jugar otra vez</button>
                    <button type="button" class="jcm-btn jcm-btn-volver" data-jcm-volver>Volver</button>
                </div>`;
            const raiz = cont.querySelector('.jcm');
            (raiz || cont).appendChild(capa);
            capa.querySelector('[data-jcm-otra]').addEventListener('click', reiniciar);
            capa.querySelector('[data-jcm-volver]').addEventListener('click', onSalir);
            try { onGanar({ aciertos, rondas: nRondas, estrellas }); } catch (e) { /* noop */ }
        }

        function reiniciar() {
            ronda = 0; aciertos = 0; errores = 0; mezcla = [];
            barajar(secuencia);
            limpiarTimers();
            render();
        }

        render();

        return { destruir() { limpiarTimers(); if (cont) cont.innerHTML = ''; } };
    }

    window.JuegoColoresMagicos = { montar };
})();
