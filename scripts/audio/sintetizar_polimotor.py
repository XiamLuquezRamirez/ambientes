"""Sintetiza el sprite de efectos del tema Polimotor (cancha) para PedniaAudio.
Salida: efectos.wav (mono, 32 kHz, 16 bit) + mapa del sprite en JSON (ms)."""
import json
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter, sosfilt, fftconvolve

SR = 32000
rng = np.random.default_rng(20261028)


def t_(dur):
    return np.arange(int(SR * dur)) / SR


def bp(x, lo, hi, order=2):
    sos = butter(order, [lo / (SR / 2), hi / (SR / 2)], btype="band", output="sos")
    return sosfilt(sos, x)


def hp(x, f, order=2):
    sos = butter(order, f / (SR / 2), btype="high", output="sos")
    return sosfilt(sos, x)


def lp(x, f, order=2):
    sos = butter(order, f / (SR / 2), btype="low", output="sos")
    return sosfilt(sos, x)


def ruido(n):
    return rng.standard_normal(n)


def env_ad(t, ataque, caida):
    e = np.exp(-t * caida)
    a = np.clip(t / max(ataque, 1e-4), 0, 1)
    return a * e


def osc(freq_t):
    fase = 2 * np.pi * np.cumsum(freq_t) / SR
    return np.sin(fase)


# Reverb de gimnasio: respuesta al impulso corta y brillante.
_ir_t = t_(0.55)
IR = ruido(len(_ir_t)) * np.exp(-_ir_t * 9.5)
IR = lp(IR, 5200)
IR[0] = 0
IR /= np.sqrt(np.sum(IR ** 2))


def gimnasio(x, mezcla=0.18):
    cola = fftconvolve(x, IR)[: len(x) + len(IR) // 2]
    seco = np.concatenate([x, np.zeros(len(cola) - len(x))])
    return seco + mezcla * cola


def normalizar(x, rms_objetivo, pico_max=0.95):
    rms = np.sqrt(np.mean(x ** 2)) + 1e-9
    y = x * (rms_objetivo / rms)
    p = np.max(np.abs(y))
    if p > pico_max:
        y *= pico_max / p
    return y


def fade_out(x, ms=25):
    n = int(SR * ms / 1000)
    x = x.copy()
    x[-n:] *= np.linspace(1, 0, n)
    return x


# ---------------- Sonidos ----------------

def bote():
    t = t_(0.34)
    f = 70 + 120 * np.exp(-t * 20)
    golpe = osc(f) * env_ad(t, 0.002, 20)
    # Sin tonos puros: antes un timbre de 540/1210 Hz + reverb sonaba a "pitido".
    # Cuerpo hueco de la pelota = ruido grave filtrado que se apaga rápido; golpe de goma = ruido medio.
    cuerpo = bp(ruido(len(t)), 120, 420) * env_ad(t, 0.001, 38) * 1.6
    goma = bp(ruido(len(t)), 500, 2600) * env_ad(t, 0.0005, 90) * 0.55
    x = golpe + cuerpo + goma
    return normalizar(fade_out(gimnasio(x, 0.12)), 0.16)


# REGLA: ningún efecto lleva senos por encima de ~200 Hz. Un seno agudo (aunque sea un barrido
# corto) se oye como "pitido"; agarrar, silbato, regreso y los silbidos de la ovación lo eran.
# Todo se hace con ruido filtrado + golpes graves. Verificar con detectar_pitidos.py.

def agarrar():
    """'Fuip' suave al tomar la pelota o una pieza: ruido que sube de banda + golpecito grave."""
    dur = 0.13
    t = t_(dur)
    x = barrido(dur, 500, 1600, ancho=0.8) * env_ad(t, 0.006, 22)
    x += osc(90 + 40 * np.exp(-t * 40)) * env_ad(t, 0.002, 45) * 0.5
    return normalizar(fade_out(x, 20), 0.09)


def soltar():
    """Golpecito al soltar: golpe grave corto + roce de goma."""
    t = t_(0.22)
    x = osc(70 + 70 * np.exp(-t * 30)) * env_ad(t, 0.002, 30)
    x += bp(ruido(len(t)), 300, 1400) * env_ad(t, 0.001, 70) * 0.5
    return normalizar(fade_out(gimnasio(x, 0.12)), 0.11)


def fallo():
    """'Toc… toc' suave (madera apagada, el segundo más grave): avisa sin chillar."""
    t = t_(0.5)
    x = np.zeros(len(t))
    for retraso, (lo, hi), amp in ((0.0, (700, 1500), 1.0), (0.17, (380, 900), 0.85)):
        i = int(retraso * SR)
        n = len(t) - i
        tk = t_(n / SR)
        x[i:] += bp(ruido(n), lo, hi) * env_ad(tk, 0.001, 55) * amp
        x[i:] += osc(np.full(n, 75.0)) * env_ad(tk, 0.002, 35) * amp * 0.6
    return normalizar(fade_out(gimnasio(x, 0.12), 40), 0.11)


def regreso():
    """La pieza/pelota vuelve: soplido que baja (ruido), sin tono."""
    dur = 0.5
    t = t_(dur)
    x = barrido(dur, 1300, 300, ancho=0.8) * np.sin(np.pi * t / dur) ** 1.5
    return normalizar(fade_out(lp(x, 2500), 50), 0.08)


def barrido(dur, f_ini, f_fin, ancho=0.45, bloque=256):
    """Ruido con un pasabanda que se desplaza (bloques con estado continuo)."""
    n = int(SR * dur)
    r = ruido(n)
    salida = np.zeros(n)
    zi = None
    for i in range(0, n, bloque):
        u = i / n
        fc = f_ini * (f_fin / f_ini) ** u
        b, a = butter(2, [fc * (1 - ancho) / (SR / 2), min(0.99, fc * (1 + ancho) / (SR / 2))], btype="band")
        if zi is None or len(zi) != max(len(a), len(b)) - 1:
            zi = np.zeros(max(len(a), len(b)) - 1)
        salida[i:i + bloque], zi = lfilter(b, a, r[i:i + bloque], zi=zi)
    return salida


def vuelo():
    # Soplido grave y ancho. Antes la banda estrecha subiendo hasta 1.9 kHz sonaba a silbido ("pitido").
    dur = 0.46
    t = t_(dur)
    x = barrido(dur, 220, 650, ancho=0.85) * np.sin(np.pi * t / dur) ** 2
    return normalizar(lp(x, 1800), 0.06)


def red():
    # "Swish" suave y corto. Antes: siseo de 2.6–7.8 kHz con vibración de 34 Hz → chillón en la
    # tablet. Ahora banda media-alta ancha, sin vibración, con el agudo recortado y más bajo.
    dur = 0.62
    t = t_(dur)
    x = bp(ruido(len(t)), 1100, 4200) + 0.5 * bp(ruido(len(t)), 500, 1100)
    env = np.clip(t / 0.03, 0, 1) * np.exp(-t * 9)
    x = lp(x * env, 4500)
    return normalizar(fade_out(gimnasio(x, 0.12), 60), 0.07)


def palmadas(dur, densidad, curva):
    n = int(SR * dur)
    x = np.zeros(n + SR // 10)
    clap_t = t_(0.03)
    tiempo = 0.0
    while tiempo < dur:
        dens = densidad * curva(tiempo / dur)
        tiempo += rng.exponential(1 / max(dens, 1))
        if tiempo >= dur:
            break
        fc = rng.uniform(900, 2300)
        c = bp(ruido(len(clap_t)), fc * 0.6, fc * 1.5) * env_ad(clap_t, 0.0008, 170)
        c *= rng.uniform(0.35, 1.0) * curva(tiempo / dur)
        i = int(tiempo * SR)
        x[i:i + len(c)] += c
    return x


def multitud(dur, curva):
    t = t_(dur + 0.1)
    base = ruido(len(t))
    voz = bp(base, 550, 900) * 0.9 + bp(base, 1050, 1500) * 0.6 + bp(base, 280, 520) * 0.5
    lento = lp(ruido(len(t)), 3) * 6
    lento = 0.75 + 0.25 * np.tanh(lento)
    return voz * lento * np.array([curva(min(1, s / dur)) for s in t])


def aplausos():
    dur = 1.5
    curva = lambda u: np.clip(u / 0.08, 0, 1) * (1 - u) ** 0.8
    x = palmadas(dur, 55, curva)
    x[: len(multitud(dur, curva))] += 0.18 * multitud(dur, curva)[: len(x)]
    return normalizar(fade_out(gimnasio(x, 0.25), 80), 0.12)


def ovacion():
    dur = 3.2
    curva = lambda u: np.clip(u / 0.12, 0, 1) * np.clip((1 - u) / 0.35, 0, 1) ** 1.2
    x = palmadas(dur, 70, curva)
    m = multitud(dur, curva)
    x[: len(m)] += 0.35 * m[: len(x)]
    # (Sin silbidos de fiesta: eran tonos puros de 2.6 kHz.)
    return normalizar(fade_out(gimnasio(x, 0.28), 150), 0.13)


def encaje():
    """Pieza que encaja: "clac-clac" de madera + golpe grave. Solo ruido filtrado (nada de pitidos)."""
    t = t_(0.32)
    golpe = osc(85 + 95 * np.exp(-t * 30)) * env_ad(t, 0.002, 30) * 0.8
    x = golpe.copy()
    for retraso, amp in ((0.0, 1.0), (0.028, 0.55)):
        i = int(retraso * SR)
        n = len(t) - i
        tk = t_(n / SR)
        clac = bp(ruido(n), 700, 2000) * env_ad(tk, 0.0005, 120) * amp
        x[i:] += clac
    return normalizar(fade_out(gimnasio(x, 0.1)), 0.12)


def tic():
    """Tic de la cuenta regresiva: bloque de madera suave."""
    t = t_(0.12)
    x = bp(ruido(len(t)), 1200, 2600) * env_ad(t, 0.0005, 200)
    x += bp(ruido(len(t)), 300, 700) * env_ad(t, 0.001, 80) * 0.6
    return normalizar(fade_out(x, 15), 0.07)


def redoble():
    """Redoble de tambor que crece + platillo: entrada de la victoria (reemplaza victory.mp3,
    cuya fanfarria eran tonos puros de 1–2.6 kHz = "pitido")."""
    dur = 1.0
    x = np.zeros(int(SR * 2.2))
    golpe_t = t_(0.06)
    tiempo, k = 0.0, 0
    while tiempo < dur:
        amp = 0.25 + 0.75 * (tiempo / dur) ** 1.5
        g = bp(ruido(len(golpe_t)), 180, 4500) * env_ad(golpe_t, 0.0005, 70) * amp * (0.85 + 0.3 * rng.random())
        g += osc(np.full(len(golpe_t), 190.0 - 40 * (k % 2))) * env_ad(golpe_t, 0.001, 60) * amp * 0.25
        i = int(tiempo * SR)
        x[i:i + len(g)] += g
        tiempo += 0.045 - 0.015 * (tiempo / dur)
        k += 1
    i = int(dur * SR)
    tc = t_(1.2)
    platillo = (bp(ruido(len(tc)), 3000, 9000) * 0.8 + bp(ruido(len(tc)), 900, 3000) * 0.4) * env_ad(tc, 0.002, 3.2)
    bombo = osc(45 + 70 * np.exp(-tc * 25)) * env_ad(tc, 0.002, 9) * 1.2
    x[i:i + len(tc)] += platillo + bombo
    return normalizar(fade_out(gimnasio(x, 0.2), 150), 0.12)


# Los nuevos sonidos van AL FINAL: así los anteriores conservan su posición y su ruido.
SONIDOS = [
    ("bote", bote), ("agarrar", agarrar), ("soltar", soltar),
    ("fallo", fallo), ("regreso", regreso), ("vuelo", vuelo),
    ("red", red), ("aplausos", aplausos), ("ovacion", ovacion),
    ("encaje", encaje), ("tic", tic), ("redoble", redoble),
]

if __name__ == "__main__":
    salida_wav = sys.argv[1]
    # Silencio amplio entre sonidos: si un sprite se pasa de su final, no alcanza al siguiente.
    hueco = np.zeros(int(SR * 0.45))
    partes, mapa, cursor = [], {}, 0
    for nombre, fn in SONIDOS:
        x = fn()
        mapa[nombre] = [round(cursor / SR * 1000), round(len(x) / SR * 1000)]
        partes += [x, hueco]
        cursor += len(x) + len(hueco)
    todo = np.concatenate(partes)
    wavfile.write(salida_wav, SR, (np.clip(todo, -1, 1) * 32767).astype(np.int16))
    print(json.dumps(mapa))
