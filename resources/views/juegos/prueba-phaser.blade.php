<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Prueba Phaser 4 — PedNia</title>
    {{-- Mismo vendor Phaser 4.2.1 que intro3d / catálogo. --}}
    <style>
        :root {
            --ink: #263b53;
            --bg: #e8eef5;
            --panel: #fff;
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: "Nunito", system-ui, sans-serif;
            color: var(--ink);
            background: linear-gradient(160deg, #dfeaf7 0%, var(--bg) 45%, #f7f3ea 100%);
            padding: 1.25rem;
        }

        h1 {
            margin: 0 0 0.35rem;
            font-size: 1.35rem;
        }

        .meta {
            margin: 0 0 1rem;
            font-size: 0.9rem;
            opacity: 0.85;
        }

        .layout {
            max-width: 860px;
            margin: 0 auto;
            display: grid;
            gap: 0.75rem;
        }

        .acciones {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            align-items: center;
        }

        button {
            font: inherit;
            font-weight: 700;
            border: 0;
            border-radius: 0.5rem;
            padding: 0.55rem 0.9rem;
            cursor: pointer;
            background: #263b53;
            color: #fff;
        }

        button.secundario { background: #64748b; }
        button.peligro { background: #b91c1c; }

        #phaser-estado {
            font-size: 0.85rem;
            font-weight: 700;
            margin-left: auto;
        }

        .stage {
            position: relative;
            background: var(--panel);
            border-radius: 0.75rem;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(38, 59, 83, 0.12);
            min-height: 450px;
        }

        #juego-phaser,
        #intro-phaser {
            width: 100%;
            min-height: 450px;
        }

        #intro-phaser {
            position: absolute;
            inset: 0;
            z-index: 2;
        }

        #juego-phaser canvas,
        #intro-phaser canvas {
            display: block;
            max-width: 100%;
        }

        #phaser-log {
            background: #0f172a;
            color: #e2e8f0;
            border-radius: 0.5rem;
            padding: 0.75rem 1rem;
            max-height: 9rem;
            overflow: auto;
            font-size: 0.8rem;
            font-family: ui-monospace, monospace;
        }

        #phaser-log p { margin: 0.2rem 0; }
    </style>
</head>

<body>
    <div class="layout">
        <header>
            <h1>Sandbox Phaser 4.2.1</h1>
            <p class="meta">
                Misma librería que el catálogo (<code>assets/vendor/phaser</code>).
                Flujo: intro simulada → destroy → gameplay → destroy.
                Lab GSAP: <a href="{{ url('/prueba-phaser4') }}">/prueba-phaser4</a>.
            </p>
        </header>

        <div class="acciones">
            <button type="button" id="btn-crear-intro">1. Crear intro</button>
            <button type="button" class="secundario" id="btn-gameplay">2. Pasar a gameplay</button>
            <button type="button" class="peligro" id="btn-destruir">3. Destruir todo</button>
            <span id="phaser-estado">Intro: — · Gameplay: —</span>
        </div>

        <div class="stage">
            <div id="juego-phaser" aria-label="Canvas de gameplay"></div>
            <div id="intro-phaser" hidden aria-label="Canvas de intro simulada"></div>
        </div>

        <div id="phaser-log" aria-live="polite"></div>
    </div>

    <script src="{{ asset('assets/vendor/phaser/phaser.min.js') }}"></script>
    <script src="{{ asset('catalogo_juegos/runtime/pednia-phaser-host.js') }}"></script>
    <script src="{{ asset('assets/js/juegos/prueba-phaser.js') }}"></script>
</body>

</html>
