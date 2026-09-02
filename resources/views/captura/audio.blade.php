<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Audio</title>
    <link rel="stylesheet" href="{{ asset('assets/utilidades/captura.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/utilidades/audio.css') }}">
</head>
<body>
<div class="contenedor">
    <div class="card">
        <div class="titulo">🎙️ Grabar audio</div>
        <div class="subtitulo">Presione iniciar para comenzar la grabación.</div>
        <button id="btnGrabarAudio" class="btn-audio" type="button">🎙️ Iniciar grabación</button>
        <button id="btnDetenerAudio" class="btn-detener" type="button" disabled>⏹️ Detener grabación</button>
        <div id="contadorAudio">00:00</div>
        <div id="estadoAudio" class="estado">Listo para grabar</div>
    </div>
</div>
<div id="modalPreview" class="modal">
    <div class="modal-contenido">
        <div class="modal-titulo">🎙️ Vista previa</div>
        <audio id="audioPreview" class="modal-media" controls></audio>
        <div id="infoAudio" class="info"></div>
        <button id="btnGuardar" class="btn-guardar" type="button">💾 Guardar audio</button>
        <button id="btnCerrarPreview" class="btn-cancelar" type="button">🗑️ Descartar y grabar otro</button>
    </div>
</div>
<script src="{{ asset('assets/js/jquery-4.0.0.min.js') }}"></script>
<script src="{{ asset('assets/utilidades/audio.js') }}"></script>
</body>
</html>
