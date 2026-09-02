$(document).ready(function () {
  let videoBlob = null;
  let videoUrl = null;

  function hayNativo() { return typeof AndroidNativo !== "undefined"; }

  function abrirModal() { $("#modalPreview").addClass("activo"); }

  function cerrarModal(descartar) {
    $("#modalPreview").removeClass("activo");
    const preview = document.getElementById("videoPreview");
    preview.pause();
    if (descartar) {
      videoBlob = null;
      if (videoUrl) { URL.revokeObjectURL(videoUrl); videoUrl = null; }
      preview.removeAttribute("src");
      preview.load();
      $("#infoVideo").empty();
      $("#btnGrabarVideo").text("🎥 Grabar video");
    }
  }

  function aplicarVideoDesdeBlob(blob, mime) {
    videoBlob = blob;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = URL.createObjectURL(videoBlob);
    const preview = document.getElementById("videoPreview");
    preview.src = videoUrl;
    preview.load();
    $("#infoVideo").html(
      "🎥 Video grabado<br>Tamaño: " + Math.round(videoBlob.size / 1024) +
      " KB<br>Formato: " + (mime || videoBlob.type || "video")
    );
    $("#btnGrabarVideo").text("🎥 Grabar otro video");
    abrirModal();
  }

  window.recibirVideoUrl = function (url) {
    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error("El video no está listo"); return r.blob(); })
      .then(function (blob) { aplicarVideoDesdeBlob(blob, blob.type || "video/mp4"); })
      .catch(function (e) { alert(e.message || "No se pudo leer el video."); });
  };

  window.recibirVideoBase64 = function (b64, mime) {
    const tipo = mime || "video/mp4";
    const dataUrl = (b64 && b64.indexOf("data:") === 0) ? b64 : ("data:" + tipo + ";base64," + b64);
    fetch(dataUrl).then(function (r) { return r.blob(); })
      .then(function (blob) { aplicarVideoDesdeBlob(blob, tipo); })
      .catch(function () { alert("No se pudo leer el video."); });
  };

  window.errorNativo = function (mensaje) { alert(mensaje || "Error en la captura nativa."); };

  if (hayNativo()) {
    $("#subtituloVideo").text("Se abrirá la cámara del teléfono para grabar (máx. 45 s).");
  }

  $("#btnGrabarVideo").on("click", function () {
    if (hayNativo()) { AndroidNativo.grabarVideo(); return; }
    document.getElementById("inputVideo").click();
  });

  $("#inputVideo").on("change", function () {
    const archivo = this.files && this.files[0];
    this.value = "";
    if (archivo) aplicarVideoDesdeBlob(archivo, archivo.type || "video/mp4");
  });

  $("#btnCerrarPreview").on("click", function () { cerrarModal(true); });

  $("#btnGuardar").on("click", function () {
    if (!videoBlob) { alert("Debe grabar un video."); return; }
    console.log("VIDEO:", videoBlob);
    alert("Video guardado correctamente.");
    cerrarModal(true);
  });

  $("#modalPreview").on("click", function (e) {
    if (e.target === this) cerrarModal(false);
  });

  window.addEventListener("beforeunload", function () {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  });

  window.tieneVideo = function () { return videoBlob !== null; };
  window.obtenerVideo = function () { return videoBlob; };
});
