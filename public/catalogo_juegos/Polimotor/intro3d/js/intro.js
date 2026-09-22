const CONFIG = window.INTRO_CONFIG;

if (document.getElementById('intro3d-root')) {
    window.addEventListener('intro3d-start', iniciarIntro, { once: true });
} else {
    iniciarIntro();
}

function iniciarIntro() {
    let dialogo = null;
    let personajesListos = false;
    let dialogoActivo = false;
    let salidaPedida = false;
    let listoParaContinuar = false;
    let omitiendo = false;

    const scene = new Phaser.Scene('VictoryIntro');

    scene.create = function () {
        const { width, height } = this.scale;
        const phaser = this;

        this.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x071021,
            0.06
        );

        const flash = this.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0xffffff,
            0.65
        );

        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 650,
            ease: 'Quad.easeOut'
        });

        // ==========================================
        // NUBE SOBRE EL PERSONAJE QUE HABLA
        // ==========================================

        const burbujaAnchoMax = Math.min(340, width * 0.38);
        const burbuja = this.add.container(width * 0.25, height * 0.28).setVisible(false).setAlpha(0);

        const burbujaFondo = this.add.graphics();
        const burbujaPlaca = this.add.graphics();
        const burbujaNombre = this.add.text(0, 0, '', {
            fontFamily: 'Fredoka, Arial',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#1a1204'
        }).setOrigin(0, 0.5);

        const burbujaTexto = this.add.text(0, 0, '', {
            fontFamily: 'Fredoka, Arial',
            fontSize: Math.max(16, Math.min(22, width * 0.018)) + 'px',
            fontStyle: 'bold',
            color: '#203040',
            align: 'left',
            wordWrap: { width: burbujaAnchoMax - 44 }
        }).setOrigin(0.5, 0);

        burbuja.add([
            burbujaFondo,
            burbujaPlaca,
            burbujaNombre,
            burbujaTexto
        ]);

        let burbujaPersonaje = null;
        let burbujaColor = '#f0c14d';
        let burbujaAncho = burbujaAnchoMax;
        let burbujaAlto = 120;

        function colorNumero(hex) {
            return parseInt(String(hex || '#f0c14d').replace('#', ''), 16);
        }

        function dibujarBurbuja(colorHex) {
            const color = colorNumero(colorHex);
            const padX = 22;
            const padY = 18;
            const wrapW = burbujaAnchoMax - padX * 2;
            burbujaTexto.setStyle({
                wordWrap: { width: wrapW }
            });
            burbujaTexto.setWordWrapWidth(wrapW, true);

            const cajaW = burbujaAnchoMax;
            const cajaH = Math.max(96, burbujaTexto.height + padY * 2 + 12);
            burbujaAncho = cajaW;
            burbujaAlto = cajaH;

            burbujaFondo.clear();
            burbujaFondo.fillStyle(0xffffff, 0.96);
            burbujaFondo.lineStyle(4, color, 1);
            burbujaFondo.fillRoundedRect(-cajaW / 2, -cajaH, cajaW, cajaH, 18);
            burbujaFondo.strokeRoundedRect(-cajaW / 2, -cajaH, cajaW, cajaH, 18);
            burbujaFondo.fillStyle(0xffffff, 0.96);
            burbujaFondo.fillTriangle(-14, -4, 14, -4, 0, 18);

            const placaW = Math.max(96, burbujaNombre.width + 28);
            burbujaPlaca.clear();
            burbujaPlaca.fillStyle(color, 1);
            burbujaPlaca.fillRoundedRect(-cajaW / 2 + 14, -cajaH - 16, placaW, 32, 10);

            burbujaNombre.setPosition(-cajaW / 2 + 28, -cajaH);
            burbujaTexto.setPosition(0, -cajaH + padY);
        }

        function anclarBurbuja(personajeId) {
            burbujaPersonaje = personajeId || null;
            actualizarAnclaBurbuja(true);
        }

        function actualizarAnclaBurbuja(forzar) {
            if (!burbuja.visible && !forzar) return;
            if (!burbujaPersonaje) return;

            let x = width * (burbujaPersonaje === 'zoe' ? 0.72 : 0.28);
            let y = height * 0.30;

            if (typeof window.__intro3dHeadScreen === 'function') {
                const punto = window.__intro3dHeadScreen(burbujaPersonaje);
                if (punto) {
                    x = punto.x;
                    y = punto.y - 95;
                }
            }

            const margen = 20;
            const mitad = burbujaAncho / 2;
            x = Phaser.Math.Clamp(x, margen + mitad, width - margen - mitad);
            y = Phaser.Math.Clamp(y, burbujaAlto + 44, height * 0.36);

            burbuja.setPosition(x, y);
        }

        this.events.on('update', () => {
            if (dialogoActivo) actualizarAnclaBurbuja(false);
        });

        // ==========================================
        // PANTALLA CONTINUAR: HTML (clic fiable + icono)
        // ==========================================

        const panelContinuarHtml = document.getElementById('intro3d-continuar');
        const btnContinuarHtml = document.getElementById('btn-continuar-intro3d');

        if (btnContinuarHtml) {
            btnContinuarHtml.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                if (!listoParaContinuar) return;
                window.dispatchEvent(new CustomEvent('victory-continue'));
            });
        }

        let lineaActual = 0;
        let escribiendo = false;
        let textoCompleto = '';
        let timerTexto = null;
        let timerPausa = null;
        let frameAvance = -1;
        let escrituraLista = false;
        let vozLista = false;
        let lineaToken = 0;

        function limpiarTimers() {
            if (timerTexto) {
                timerTexto.remove(false);
                timerTexto = null;
            }
            if (timerPausa) {
                timerPausa.remove(false);
                timerPausa = null;
            }
        }

        function personajeVoz(linea) {
            const id = String(
                (linea && (linea.personaje || linea.nombre)) || 'zoe'
            ).toLowerCase();
            return id.indexOf('zeus') >= 0 ? 'zeus' : 'zoe';
        }

        function tieneVoz() {
            return typeof window.TextoVoz !== 'undefined' &&
                typeof window.TextoVoz.hablar === 'function';
        }

        function detenerVoz() {
            if (tieneVoz()) TextoVoz.detener();
        }

        function intentarAvanceAuto() {
            if (!dialogoActivo || escribiendo) return;
            if (!escrituraLista || !vozLista) return;

            if (timerPausa) {
                timerPausa.remove(false);
                timerPausa = null;
            }

            timerPausa = phaser.time.delayedCall(
                dialogo.pausaAlTerminar || 900,
                avanzarLinea
            );
        }

        function hablarLinea(linea, token) {
            vozLista = !tieneVoz();
            if (!tieneVoz()) {
                intentarAvanceAuto();
                return;
            }

            TextoVoz.hablar(linea.texto || '', personajeVoz(linea))
                .then(() => {
                    if (token !== lineaToken || !dialogoActivo) return;
                    vozLista = true;
                    intentarAvanceAuto();
                })
                .catch(() => {
                    if (token !== lineaToken || !dialogoActivo) return;
                    vozLista = true;
                    intentarAvanceAuto();
                });
        }

        function mostrarBurbuja(linea) {
            burbujaColor = linea.color || '#f0c14d';
            burbujaNombre.setText(linea.nombre || linea.personaje || '');
            burbujaTexto.setText('');
            dibujarBurbuja(burbujaColor);
            anclarBurbuja(linea.personaje);
            burbuja.setVisible(true);
            burbuja.setAlpha(0);
            burbuja.setScale(0.82);
            phaser.tweens.add({
                targets: burbuja,
                alpha: 1,
                scale: 1,
                duration: 280,
                ease: 'Back.easeOut'
            });
        }

        function ocultarBurbuja(done) {
            phaser.tweens.add({
                targets: burbuja,
                alpha: 0,
                scale: 0.9,
                duration: 220,
                onComplete: () => {
                    burbuja.setVisible(false);
                    if (done) done();
                }
            });
        }

        function mostrarLinea(indice) {
            const linea = dialogo.lineas[indice];
            if (!linea) {
                cerrarDialogo();
                return;
            }

            limpiarTimers();
            detenerVoz();

            escribiendo = true;
            escrituraLista = false;
            vozLista = false;
            lineaToken += 1;
            const token = lineaToken;

            textoCompleto = linea.texto || '';
            mostrarBurbuja(linea);

            window.dispatchEvent(new CustomEvent('dialogue-line', {
                detail: { personaje: linea.personaje }
            }));

            hablarLinea(linea, token);

            let indiceLetra = 0;
            const velocidad = dialogo.velocidadTexto || 32;

            if (!textoCompleto.length) {
                terminarEscritura();
                return;
            }

            timerTexto = phaser.time.addEvent({
                delay: velocidad,
                repeat: Math.max(0, textoCompleto.length - 1),
                callback: () => {
                    if (token !== lineaToken) return;
                    burbujaTexto.text += textoCompleto[indiceLetra] || '';
                    indiceLetra += 1;
                    dibujarBurbuja(burbujaColor);
                    actualizarAnclaBurbuja(true);
                    if (indiceLetra >= textoCompleto.length) {
                        terminarEscritura();
                    }
                }
            });
        }

        function terminarEscritura() {
            if (!escribiendo) return;
            escribiendo = false;
            escrituraLista = true;
            burbujaTexto.setText(textoCompleto);
            dibujarBurbuja(burbujaColor);
            actualizarAnclaBurbuja(true);
            if (timerTexto) {
                timerTexto.remove(false);
                timerTexto = null;
            }
            intentarAvanceAuto();
        }

        function avanzarLinea() {
            if (!dialogoActivo) return;
            if (escribiendo) {
                terminarEscritura();
                return;
            }
            if (frameAvance === phaser.game.loop.frame) return;
            frameAvance = phaser.game.loop.frame;

            limpiarTimers();
            detenerVoz();
            lineaActual += 1;
            if (!dialogo || lineaActual >= dialogo.lineas.length) {
                cerrarDialogo();
                return;
            }
            mostrarLinea(lineaActual);
        }

        function pedirSalida(motivo) {
            if (salidaPedida) return;
            salidaPedida = true;
            detenerVoz();
            window.dispatchEvent(new CustomEvent('characters-exit', {
                detail: { motivo: motivo || 'dialogo' }
            }));
        }

        function cerrarDialogo() {
            if (!dialogoActivo && salidaPedida) return;
            dialogoActivo = false;
            limpiarTimers();
            detenerVoz();
            ocultarBurbuja(() => pedirSalida('dialogo'));
        }

        function omitirIntro() {
            if (omitiendo || listoParaContinuar) return;

            // Si ya iban saliendo (fin de diálogo), al llegar al origen entran al juego.
            if (salidaPedida) {
                omitiendo = true;
                const omitirBtn = document.getElementById('btn-omitir-intro3d');
                if (omitirBtn) {
                    omitirBtn.disabled = true;
                    omitirBtn.style.opacity = '0.55';
                }
                return;
            }

            omitiendo = true;
            dialogoActivo = false;
            limpiarTimers();
            detenerVoz();

            const omitirBtn = document.getElementById('btn-omitir-intro3d');
            if (omitirBtn) {
                omitirBtn.disabled = true;
                omitirBtn.style.opacity = '0.55';
            }

            burbuja.setVisible(false);
            burbuja.setAlpha(0);
            pedirSalida('omitir');
        }

        function abrirDialogo() {
            if (omitiendo || salidaPedida) return;
            if (!CONFIG.dialogo.mostrar || !dialogo || !dialogo.lineas.length) {
                pedirSalida('dialogo');
                return;
            }

            dialogoActivo = true;
            lineaActual = 0;
            mostrarLinea(0);
        }

        function intentarDialogo() {
            if (omitiendo || salidaPedida) return;
            if (!personajesListos || !dialogo) return;
            abrirDialogo();
        }

        function precargarDialogoVoz(datos) {
            if (!tieneVoz() || !datos || !datos.lineas) return;
            TextoVoz.encolarFrases(datos.lineas.map((linea) => ({
                texto: linea.texto,
                personaje: personajeVoz(linea)
            })));
        }

        function cargarDialogoDesdeConfig() {
            const cfg = CONFIG.dialogo || {};
            dialogo = {
                velocidadTexto: cfg.velocidadTexto || 28,
                pausaAlTerminar: cfg.pausaAlTerminar || 900,
                lineas: Array.isArray(cfg.lineas) ? cfg.lineas.slice() : []
            };
            precargarDialogoVoz(dialogo);
            intentarDialogo();
        }

        function mostrarContinuar() {
            if (listoParaContinuar || omitiendo) return;
            listoParaContinuar = true;

            const omitir = document.getElementById('btn-omitir-intro3d');
            if (omitir) omitir.style.display = 'none';

            burbuja.setVisible(false);
            burbuja.setAlpha(0);

            if (panelContinuarHtml) {
                panelContinuarHtml.hidden = false;
            }
        }

        this.input.on('pointerdown', (pointer, currentlyOver) => {
            if (!dialogoActivo || omitiendo) return;
            if (currentlyOver && currentlyOver.length) return;
            avanzarLinea();
        });

        window.addEventListener('intro3d-omitir', omitirIntro);

        window.addEventListener('characters-ready', () => {
            if (omitiendo) return;
            personajesListos = true;
            intentarDialogo();
        });

        window.addEventListener('characters-exited', () => {
            burbuja.setVisible(false);
            burbuja.setAlpha(0);

            if (omitiendo) {
                window.dispatchEvent(new CustomEvent('victory-continue'));
                return;
            }

            mostrarContinuar();
        });

        cargarDialogoDesdeConfig();
    };

    window.__introPhaser = new Phaser.Game({
        type: Phaser.CANVAS,
        parent: 'phaser-container',
        width: window.innerWidth,
        height: window.innerHeight,
        transparent: true,
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene
    });

    requestAnimationFrame(() => {
        if (window.__introPhaser && window.__introPhaser.scale) {
            window.__introPhaser.scale.resize(
                window.innerWidth,
                window.innerHeight
            );
        }
    });
}
