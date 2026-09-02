$(document).ready(function () {
  let mediaRecorder = null;
  let audioStream = null;
  let audioChunks = [];
  let audioBlob = null;
  let audioUrl = null;
  let intervaloContador = null;
  let segundosGrabacion = 0;

  function hayNativo() { return typeof AndroidNativo !== "undefined"; }

  function abrirModal() { $("#modalPreview").addClass("activo"); }

  function cerrarModal(descartar) {
    $("#modalPreview").removeClass("activo");
    const preview = document.getElementById("audioPreview");
    preview.pause();
    if (descartar) {
      audioBlob = null;
      if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null; }
      preview.removeAttribute("src");
      preview.load();
      $("#infoAudio").empty();
      $("#estadoAudio").removeClass("exito error grabando").text("Listo para grabar");
      $("#contadorAudio").text("00:00").hide();
    }
  }

  function aplicarAudioDesdeBlob(blob, mime) {
    audioBlob = blob;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = URL.createObjectURL(audioBlob);
    $("#audioPreview").attr("src", audioUrl);
    $("#infoAudio").html(
      "🎙️ Audio grabado<br>Tamaño: " + Math.round(audioBlob.size / 1024) +
      " KB<br>Formato: " + (mime || audioBlob.type || "audio")
    );
    $("#estadoAudio").removeClass("grabando error").addClass("exito").text("✅ Grabación terminada");
    $("#btnGrabarAudio").prop("disabled", false);
    $("#btnDetenerAudio").prop("disabled", true);
    abrirModal();
  }

  window.audioNativoListo = function () {
    fetch("http://captura.nativo/audio.m4a?t=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error("El audio no está listo"); return r.blob(); })
      .then(function (blob) { aplicarAudioDesdeBlob(blob, "audio/mp4"); })
      .catch(function (e) { alert(e.message || "No se pudo leer el audio."); });
  };

  window.audioNativoIniciado = function () {
    $("#btnGrabarAudio").prop("disabled", true);
    $("#btnDetenerAudio").prop("disabled", false);
    $("#estadoAudio").removeClass("exito error").addClass("grabando").text("🔴 Grabando...");
    segundosGrabacion = 0;
    $("#contadorAudio").text("00:00").show();
    iniciarContador();
  };

  window.recibirAudioBase64 = function (b64, mime) {
    const tipo = mime || "audio/mp4";
    const dataUrl = (b64 && b64.indexOf("data:") === 0) ? b64 : ("data:" + tipo + ";base64," + b64);
    fetch(dataUrl).then(function (r) { return r.blob(); })
      .then(function (blob) { aplicarAudioDesdeBlob(blob, tipo); })
      .catch(function () { alert("No se pudo leer el audio."); });
  };

  window.errorNativo = function (mensaje) {
    alert(mensaje || "Error en la captura nativa.");
    $("#btnGrabarAudio").prop("disabled", false);
    $("#btnDetenerAudio").prop("disabled", true);
    detenerContador();
    $("#estadoAudio").removeClass("grabando exito").addClass("error").text("Error al grabar");
  };

  $("#btnGrabarAudio").on("click", async function () {
    try {
      if (hayNativo()) { AndroidNativo.iniciarAudio(); return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia no está disponible para el micrófono.");
      }
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      let opciones = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) opciones.mimeType = "audio/webm;codecs=opus";
      else if (MediaRecorder.isTypeSupported("audio/webm")) opciones.mimeType = "audio/webm";
      mediaRecorder = new MediaRecorder(audioStream, opciones);
      mediaRecorder.ondataavailable = function (e) { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = function () {
        aplicarAudioDesdeBlob(new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" }));
        if (audioStream) { audioStream.getTracks().forEach(function (t) { t.stop(); }); audioStream = null; }
        detenerContador();
      };
      mediaRecorder.start();
      $("#btnGrabarAudio").prop("disabled", true);
      $("#btnDetenerAudio").prop("disabled", false);
      $("#estadoAudio").removeClass("exito error").addClass("grabando").text("🔴 Grabando...");
      segundosGrabacion = 0;
      $("#contadorAudio").text("00:00").show();
      iniciarContador();
    } catch (error) {
      alert("No fue posible acceder al micrófono.\n\n" + (error.message || "Sin información adicional."));
    }
  });

  $("#btnDetenerAudio").on("click", function () {
    if (hayNativo()) {
      AndroidNativo.detenerAudio();
      detenerContador();
      $("#btnGrabarAudio").prop("disabled", false);
      $("#btnDetenerAudio").prop("disabled", true);
      return;
    }
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    detenerContador();
    $("#btnGrabarAudio").prop("disabled", false);
    $("#btnDetenerAudio").prop("disabled", true);
  });

  function iniciarContador() {
    detenerContador();
    intervaloContador = setInterval(function () {
      segundosGrabacion++;
      const minutos = Math.floor(segundosGrabacion / 60);
      const segundos = segundosGrabacion % 60;
      $("#contadorAudio").text(String(minutos).padStart(2, "0") + ":" + String(segundos).padStart(2, "0"));
    }, 1000);
  }

  function detenerContador() {
    if (intervaloContador) { clearInterval(intervaloContador); intervaloContador = null; }
  }

  $("#btnCerrarPreview").on("click", function () { cerrarModal(true); });

  $("#btnGuardar").on("click", function () {
    if (!audioBlob) { alert("Debe realizar una grabación de audio."); return; }
    console.log("AUDIO:", audioBlob);
    alert("Audio guardado correctamente.");
    cerrarModal(true);
  });

  $("#modalPreview").on("click", function (e) {
    if (e.target === this) cerrarModal(false);
  });

  window.addEventListener("beforeunload", function () {
    if (audioStream) audioStream.getTracks().forEach(function (t) { t.stop(); });
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  });

  window.tieneAudio = function () { return audioBlob !== null; };
  window.obtenerAudio = function () { return audioBlob; };
});
