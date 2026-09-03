<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Video</title>
    <link rel="stylesheet" href="{{ asset('assets/utilidades/captura.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/utilidades/video.css') }}">
</head>
<body>
<div class="contenedor">
    <div class="card">
        <div class="titulo">🎥 Grabar video</div>
        <div class="subtitulo" id="subtituloVideo">Presione para grabar un video con la cámara.</div>
        <button id="btnGrabarVideo" class="btn-video" type="button">🎥 Grabar video</button>
        <input id="inputVideo" type="file" accept="video/*" capture="environment" hidden>
    </div>
</div>
<div id="modalPreview" class="modal">
    <div class="modal-contenido">
        <div class="modal-titulo">🎥 Vista previa</div>
        <video id="videoPreview" class="modal-media" controls playsinline webkit-playsinline></video>
        <div id="infoVideo" class="info"></div>
        <button id="btnGuardar" class="btn-guardar" type="button">💾 Guardar video</button>
        <button id="btnCerrarPreview" class="btn-cancelar" type="button">🗑️ Descartar y grabar otro</button>
    </div>
</div>
<script src="{{ asset('assets/js/jquery-4.0.0.min.js') }}"></script>
<script src="{{ asset('assets/utilidades/video.js') }}"></script>
</body>
</html>
