$(document).ready(function () {
  let streamCamara = null;
  let fotoBlob = null;
  let fotoUrl = null;

  function hayNativo() { return typeof AndroidNativo !== "undefined"; }

  function abrirModal() { $("#modalPreview").addClass("activo"); }

  function cerrarModal(descartar) {
    $("#modalPreview").removeClass("activo");
    if (descartar) {
      fotoBlob = null;
      if (fotoUrl) { URL.revokeObjectURL(fotoUrl); fotoUrl = null; }
      $("#fotoPreview").attr("src", "");
      $("#infoFoto").empty();
      $("#btnAbrirCamara").text("📷 Abrir cámara");
      $("#btnTomarFoto").prop("disabled", true);
    }
  }

  function aplicarFotoDesdeBlob(blob, ancho, alto) {
    fotoBlob = blob;
    if (fotoUrl) URL.revokeObjectURL(fotoUrl);
    fotoUrl = URL.createObjectURL(fotoBlob);
    $("#fotoPreview").attr("src", fotoUrl);
    $("#infoFoto").html(
      "📷 Fotografía capturada<br>Tamaño: " + Math.round(blob.size / 1024) +
      " KB<br>Resolución: " + ancho + " × " + alto
    );
    $("#btnTomarFoto").prop("disabled", true);
    $("#btnAbrirCamara").text("📷 Abrir cámara");
    abrirModal();
  }

  window.fotoNativaLista = function () {
    fetch("http://captura.nativo/foto.jpg?t=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error("La foto no está lista"); return r.blob(); })
      .then(function (blob) {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = function () { aplicarFotoDesdeBlob(blob, img.width, img.height); URL.revokeObjectURL(url); };
        img.onerror = function () { URL.revokeObjectURL(url); alert("No se pudo leer la fotografía."); };
        img.src = url;
      })
      .catch(function (e) { alert(e.message || "No se pudo leer la fotografía."); });
  };

  window.recibirFotoBase64 = function (b64) {
    const dataUrl = (b64 && b64.indexOf("data:") === 0) ? b64 : ("data:image/jpeg;base64," + b64);
    fetch(dataUrl).then(function (r) { return r.blob(); }).then(function (blob) {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = function () { aplicarFotoDesdeBlob(blob, img.width, img.height); URL.revokeObjectURL(url); };
      img.onerror = function () { URL.revokeObjectURL(url); alert("No se pudo leer la fotografía."); };
      img.src = url;
    }).catch(function () { alert("No se pudo leer la fotografía."); });
  };

  window.errorNativo = function (mensaje) { alert(mensaje || "Error en la captura nativa."); };

  if (hayNativo()) {
    $("#video").hide();
    $("#btnTomarFoto").hide();
    $("#subtituloFoto").text("Se abrirá la cámara del teléfono.");
  }

  $("#btnAbrirCamara").on("click", async function () {
    if (hayNativo()) { AndroidNativo.tomarFoto(); return; }
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia no está disponible.");
      }
      if (streamCamara) streamCamara.getTracks().forEach(function (t) { t.stop(); });
      streamCamara = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      const video = document.getElementById("video");
      video.srcObject = streamCamara;
      video.muted = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      try { await video.play(); } catch (e) {}
      $("#btnTomarFoto").prop("disabled", false);
      $("#btnAbrirCamara").text("📷 Cámara activa");
    } catch (error) {
      alert("No fue posible acceder a la cámara.\n\n" + (error.message || "Sin información adicional."));
    }
  });

  $("#btnTomarFoto").on("click", function () {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    if (!video.videoWidth || !video.videoHeight) { alert("La cámara todavía no está lista."); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(function (blob) {
      if (!blob) { alert("No fue posible generar la fotografía."); return; }
      aplicarFotoDesdeBlob(blob, canvas.width, canvas.height);
      if (streamCamara) { streamCamara.getTracks().forEach(function (t) { t.stop(); }); streamCamara = null; }
    }, "image/jpeg", 0.9);
  });

  $("#btnCerrarPreview").on("click", function () { cerrarModal(true); });

  $("#btnGuardar").on("click", function () {
    if (!fotoBlob) { alert("Debe tomar una fotografía."); return; }
    console.log("FOTOGRAFÍA:", fotoBlob);
    alert("Fotografía guardada correctamente.");
    cerrarModal(true);
  });

  $("#modalPreview").on("click", function (e) {
    if (e.target === this) cerrarModal(false);
  });

  window.addEventListener("beforeunload", function () {
    if (streamCamara) streamCamara.getTracks().forEach(function (t) { t.stop(); });
    if (fotoUrl) URL.revokeObjectURL(fotoUrl);
  });

  window.tieneFoto = function () { return fotoBlob !== null; };
  window.obtenerFoto = function () { return fotoBlob; };
});
