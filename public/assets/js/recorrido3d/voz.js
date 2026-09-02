/**
 * recorrido3d/voz.js — Narración por TTS del servidor (voz del personaje).
 * Módulo independiente con estado propio (audio + flag "narrando"). El loop
 * consulta `estaNarrando()` para animar la boca del personaje al hablar.
 *
 * crearVoz($, urlTts) → { hablar(texto, alTerminar), detener(), estaNarrando() }
 *   $      : jQuery (para $.ajax al endpoint TTS)
 *   urlTts : URL del endpoint que devuelve { data: { url } } con el audio
 */
export function crearVoz($, urlTts) {
    let audio = null;
    let narrando = false;

    function detener() {
        narrando = false;
        if (!audio) return;
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (e) { /* noop */ }
        audio = null;
    }

    // Pide el audio TTS del texto y lo reproduce; llama alTerminar al acabar
    // (o inmediatamente si no hay texto/URL/jQuery, o si algo falla).
    function hablar(texto, alTerminar) {
        const fin = () => { if (alTerminar) alTerminar(); };
        if (!texto || !urlTts || !$) { fin(); return; }

        detener();
        narrando = true;

        $.ajax({ url: urlTts, method: 'GET', data: { texto }, dataType: 'json' })
            .done(function (res) {
                const audioUrl = res && res.data && res.data.url;
                if (!audioUrl) { narrando = false; fin(); return; }
                audio = new Audio(audioUrl);
                const terminar = () => { narrando = false; audio = null; fin(); };
                audio.onended = terminar;
                audio.onerror = terminar;
                audio.play().catch(terminar);
            })
            .fail(function () { narrando = false; fin(); });
    }

    function estaNarrando() { return narrando; }

    return { hablar, detener, estaNarrando };
}
