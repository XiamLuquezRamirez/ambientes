<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Lab Phaser 4 + GSAP — PedNia</title>
    {{-- Lab Phaser 4 + GSAP. El vendor Phaser es el mismo del catálogo. --}}

    <style>
        :root {
            --ink: #1e3a2f;
            --bg: #e7f0ea;
            --panel: #fff;
            --accent: #0f766e;
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: "Nunito", system-ui, sans-serif;
            color: var(--ink);
            background: linear-gradient(155deg, #d5e8de 0%, var(--bg) 48%, #f3f0e6 100%);
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
            background: var(--accent);
            color: #fff;
        }

        button.secundario { background: #64748b; }
        button.peligro { background: #b91c1c; }

        #lab-estado {
            font-size: 0.85rem;
            font-weight: 700;
            margin-left: auto;
        }

        .stage {
            position: relative;
            background: var(--panel);
            border-radius: 0.75rem;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(30, 58, 47, 0.12);
            min-height: 420px;
        }

        #juego-phaser4 {
            width: 100%;
            min-height: 420px;
        }

        #juego-phaser4 canvas {
            display: block;
            max-width: 100%;
        }

        #hud-gsap {
            position: absolute;
            top: 0.75rem;
            left: 0.75rem;
            z-index: 2;
            padding: 0.45rem 0.75rem;
            border-radius: 0.5rem;
            background: rgba(15, 118, 110, 0.92);
            color: #fff;
            font-weight: 800;
            transform: translateY(-120%);
            opacity: 0;
            pointer-events: none;
        }

        #lab-log {
            background: #0f172a;
            color: #e2e8f0;
            border-radius: 0.5rem;
            padding: 0.75rem 1rem;
            max-height: 9rem;
            overflow: auto;
            font-size: 0.8rem;
            font-family: ui-monospace, monospace;
        }

        #lab-log p { margin: 0.2rem 0; }
    </style>
</head>

<body>
    <div class="layout">
        <header>
            <h1>Lab Phaser 4.2.1 + GSAP</h1>
            <p class="meta">
                Vendors: <code>assets/vendor/phaser</code> (4.2.1) y <code>assets/vendor/gsap</code>.
                Ciclo de vida sin GSAP: <a href="{{ url('/prueba-phaser') }}">/prueba-phaser</a>.
            </p>

        </header>

        <div class="acciones">
            <button type="button" id="btn-crear">1. Crear juego</button>
            <button type="button" class="secundario" id="btn-hud">2. Animar HUD (GSAP)</button>
            <button type="button" class="peligro" id="btn-destruir">3. Destruir</button>
            <span id="lab-estado">Phaser: — · GSAP: —</span>
        </div>

        <div class="stage">
            <div id="hud-gsap" aria-hidden="true">HUD GSAP</div>
            <div id="juego-phaser4" aria-label="Canvas Phaser 4"></div>
        </div>

        <div id="lab-log" aria-live="polite"></div>
    </div>

    @include('partials._scripts-lab-phaser4-gsap')
    <script src="{{ asset('assets/js/juegos/prueba-phaser4.js') }}"></script>
</body>

</html>
