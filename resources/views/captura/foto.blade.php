<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Fotografía</title>
    <link rel="stylesheet" href="{{ asset('assets/utilidades/captura.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/utilidades/foto.css') }}">
</head>

<body>
    <div class="contenedor">
        <div class="card">
            <div class="titulo">📷 Tomar fotografía</div>
            <div class="subtitulo" id="subtituloFoto">Utilice la cámara para tomar una fotografía.</div>
            <button id="btnAbrirCamara" class="btn-camara" type="button">📷 Abrir cámara</button>
            <video id="video" autoplay muted playsinline webkit-playsinline></video>
            <button id="btnTomarFoto" class="btn-foto" type="button" disabled>📸 Tomar foto</button>
            <canvas id="canvas"></canvas>
        </div>
    </div>
    <div id="modalPreview" class="modal">
        <div class="modal-contenido">
            <div class="modal-titulo">📷 Vista previa</div>
            <img id="fotoPreview" class="modal-media" alt="Vista previa de fotografía">
            <div id="infoFoto" class="info"></div>
            <button id="btnGuardar" class="btn-guardar" type="button">💾 Guardar fotografía</button>
            <button id="btnCerrarPreview" class="btn-cancelar" type="button">🔄 Tomar otra foto</button>
        </div>
    </div>
    <script src="{{ asset('assets/js/jquery-4.0.0.min.js') }}"></script>
    <script src="{{ asset('assets/utilidades/foto.js') }}"></script>
</body>

</html>
