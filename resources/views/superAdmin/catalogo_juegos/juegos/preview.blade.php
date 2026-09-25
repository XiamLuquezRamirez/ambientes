<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview — {{ $juego->nombre }} — PedNia</title>
    <style>
        html, body { margin: 0; height: 100%; background: #0b1220; color: #e8eefc; font-family: system-ui, sans-serif; }
        .barra {
            display: flex; align-items: center; justify-content: space-between; gap: 12px;
            padding: 10px 16px; background: #121a2b; border-bottom: 1px solid #24304a;
        }
        .barra strong { font-size: 0.95rem; }
        .barra small { opacity: 0.7; }
        .barra a { color: #9ec1ff; text-decoration: none; }
        iframe { width: 100%; height: calc(100% - 48px); border: 0; background: #fff; }
    </style>
</head>
<body>
    {{--
      Contrato de inyección para paquetes del banco (cuando el juego lo consuma):
      - window.parent.__PEDNIA_PERFIL__ o window.__PEDNIA_PERFIL__
      - Merge esperado sobre config.accesibilidad del paquete
    --}}
    <script>
        window.__PEDNIA_PERFIL__ = @json($perfilPayload);
    </script>

    <div class="barra">
        <div>
            <strong>{{ $juego->nombre }}</strong>
            <small> · perfil {{ $perfilPayload['perfil_clave'] ?? 'estandar' }} (inyectado; el paquete aún puede ignorarlo)</small>
        </div>
        <a href="{{ route('superadmin.catalogo_juegos.index') }}">Volver al catálogo</a>
    </div>

    <iframe
        id="juegoFrame"
        title="{{ $juego->nombre }}"
        src="{{ $urlPaquete }}"
        allow="autoplay; fullscreen"
    ></iframe>

    <script>
        (function () {
            const frame = document.getElementById('juegoFrame');
            const perfil = window.__PEDNIA_PERFIL__;
            frame.addEventListener('load', function () {
                try {
                    if (frame.contentWindow) {
                        frame.contentWindow.__PEDNIA_PERFIL__ = perfil;
                        frame.contentWindow.postMessage({
                            type: 'pednia:perfil',
                            perfil: perfil,
                        }, window.location.origin);
                    }
                } catch (e) {
                    // cross-origin no aplica en mismo host; silenciar
                }
            });
        })();
    </script>
</body>
</html>
