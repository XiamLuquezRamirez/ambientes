"""Música de fondo del tema Polimotor ("cancha"): bucle sin cortes, sintetizado (sin licencias).

Uso:  python musica_polimotor.py <salida.wav>
116 BPM, Do mayor, 16 compases (I–vi–IV–V): sección A con marimba saltarina y sección B más
abierta con palmas de tribuna. Guitarra apagada en contratiempo, bajo rebotón, batería ligera.
Sin senos puros agudos (órgano de senos, parciales altos y campanitas sonaban a "pitido").
Mono 24 kHz / 16 bit. La cola de cada nota y de la reverb se envuelve al inicio → bucle perfecto.
"""
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 24000
BPM = 116
CORCHEA = 60 / BPM / 2
COMPAS = CORCHEA * 8
COMPASES = 16
LARGO = int(round(COMPAS * COMPASES * SR))
rng = np.random.default_rng(116)

buf = np.zeros(LARGO + SR * 3)


def hz(nota):
    nombres = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
    n = nombres[nota[0]] + (1 if '#' in nota else 0)
    octava = int(nota[-1])
    midi = 12 * (octava + 1) + n
    return 440 * 2 ** ((midi - 69) / 12)


def sos(tipo, f, orden=2):
    if tipo == 'band':
        return butter(orden, [f[0] / (SR / 2), f[1] / (SR / 2)], btype='band', output='sos')
    return butter(orden, f / (SR / 2), btype=tipo, output='sos')


def poner(x, t, vol=1.0):
    i = int(round(t * SR))
    buf[i:i + len(x)] += x * vol


def tt(d):
    return np.arange(int(d * SR)) / SR


# ---------------- Instrumentos ----------------

def bombo():
    t = tt(0.32)
    f = 45 + 85 * np.exp(-t * 32)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    x[:24] += np.linspace(0.6, 0, 24) * rng.standard_normal(24)
    return x


def palma(abierta=False):
    t = tt(0.22)
    x = np.zeros(len(t))
    for k, d in enumerate((0.0, 0.011, 0.022)):
        i = int(d * SR)
        r = rng.standard_normal(len(t) - i) * np.exp(-np.arange(len(t) - i) / SR * (70 if k < 2 else 22))
        x[i:] += r
    x = sosfilt(sos('band', (900, 3200)), x)
    return x * (1.2 if abierta else 1.0)


def platillo(dur=0.07, brillo=6500):
    t = tt(dur)
    return sosfilt(sos('high', brillo), rng.standard_normal(len(t))) * np.exp(-t * (60 if dur < 0.1 else 14))


def bajo(f, dur):
    t = tt(dur + 0.05)
    x = np.zeros(len(t))
    for h in range(1, 9):
        x += np.sin(2 * np.pi * f * h * t) / h * np.exp(-t * (3 + h * 2.2))
    env = np.clip(t / 0.004, 0, 1) * np.exp(-t * 4) * np.clip((dur + 0.05 - t) / 0.05, 0, 1)
    return sosfilt(sos('low', 900), x * env)


def marimba(f, dur):
    # Parcial alto mínimo y muy corto: antes (4·f a 0.32) sonaba a "pitido" de 4–4.7 kHz.
    t = tt(min(1.2, dur + 0.6))
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t * 4.2)
         + 0.10 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 30))
    x += 0.15 * sosfilt(sos('band', (f * 0.8, min(f * 3, 4000))), rng.standard_normal(len(t))) * np.exp(-t * 60)
    return sosfilt(sos('low', 2400), x * np.clip(t / 0.003, 0, 1))


def cuerda(f, dur, brillo=0.5):
    """Cuerda pulsada (Karplus-Strong) apagada con la mano: timbre natural, sin tonos puros."""
    from scipy.signal import lfilter
    n = int((dur + 0.08) * SR)
    periodo = max(2, int(round(SR / f)))
    excit = np.zeros(n)
    excit[:periodo] = sosfilt(sos('low', 1200 + 2500 * brillo), rng.uniform(-1, 1, periodo))
    g = 0.990
    a = np.zeros(periodo + 2)
    a[0] = 1
    a[periodo] = -g / 2
    a[periodo + 1] = -g / 2
    y = lfilter([1.0], a, excit)
    t = np.arange(n) / SR
    y *= np.exp(-t * 9) * np.clip((dur + 0.08 - t) / 0.06, 0, 1)
    return sosfilt(sos('low', 1300, 4), y)


def rasgueo(fs, dur=0.2):
    """Acorde rasgueado hacia abajo (8 ms entre cuerdas)."""
    partes = [cuerda(f, dur) for f in fs]
    n = max(len(p) for p in partes) + int(0.008 * SR * len(fs))
    x = np.zeros(n)
    for k, p in enumerate(partes):
        i = int(0.008 * SR * k)
        x[i:i + len(p)] += p
    return x


# ---------------- Partitura ----------------
ACORDES = [  # (raíz del bajo, triada de la guitarra)
    ('C2', ('E4', 'G4', 'C5')), ('A1', ('E4', 'A4', 'C5')),
    ('F2', ('F4', 'A4', 'C5')), ('G2', ('D4', 'G4', 'B4')),
]

A1 = [(0, 'E5', 1), (1, 'G5', 1), (2, 'C6', 2), (4, 'G5', 1), (5, 'E5', 1), (6, 'G5', 2)]
A2 = [(0, 'A5', 1), (1, 'G5', 1), (2, 'E5', 2), (4, 'C5', 1), (5, 'E5', 1), (6, 'A5', 2)]
A3 = [(0, 'F5', 1), (1, 'A5', 1), (2, 'C6', 2), (4, 'A5', 1), (5, 'F5', 1), (6, 'A5', 2)]
A4 = [(0, 'G5', 1), (1, 'B5', 1), (2, 'D6', 2), (4, 'B5', 1), (5, 'G5', 1), (6, 'D5', 2)]
A8 = [(0, 'G5', 2), (2, 'F5', 1), (3, 'E5', 1), (4, 'D5', 2)]
B1 = [(0, 'C6', 3), (3, 'B5', 1), (4, 'G5', 4)]
B2 = [(0, 'A5', 3), (3, 'G5', 1), (4, 'E5', 4)]
B3 = [(0, 'F5', 2), (2, 'A5', 2), (4, 'C6', 2), (6, 'A5', 2)]
B4 = [(0, 'B5', 4), (4, 'D6', 4)]
B7 = [(0, 'A5', 2), (2, 'C6', 2), (4, 'D6', 2), (6, 'C6', 2)]
B8 = [(0, 'B5', 2), (2, 'G5', 2), (4, 'D5', 2), (6, 'G5', 1), (7, 'B5', 1)]
MELODIA = [A1, A2, A3, A4, A1, A2, A3, A8, B1, B2, B3, B4, B1, B2, B7, B8]

for c in range(COMPASES):
    t0 = c * COMPAS
    raiz, triada = ACORDES[c % 4]
    seccion_b = c >= 8
    fin_frase = c % 8 == 7

    # Batería
    for e in (0, 3, 4) if not seccion_b else (0, 4, 5):
        poner(bombo(), t0 + e * CORCHEA, 0.95)
    for e in (2, 6):
        poner(palma(seccion_b), t0 + e * CORCHEA, 0.45 if not seccion_b else 0.6)
    for e in range(8):
        swing = 0.018 if e % 2 else 0
        poner(platillo(), t0 + e * CORCHEA + swing, 0.16 if e % 2 else 0.09)
    for s in range(16):  # shaker suave
        poner(platillo(0.04, 4500), t0 + s * CORCHEA / 2, 0.04)
    if seccion_b:  # tribuna: palmas extra al final del compás
        for e in (7, 7.5):
            poner(palma(True), t0 + e * CORCHEA, 0.35)
    if fin_frase:  # redoble corto que lleva al siguiente compás
        for s in range(12, 16):
            poner(palma(), t0 + s * CORCHEA / 2, 0.18 + 0.06 * (s - 12))
        poner(platillo(0.9, 5000), t0 + 8 * CORCHEA - 0.002, 0.12)

    # Bajo saltarín (raíz, quinta, octava)
    f = hz(raiz)
    for e, mult in ((0, 1), (2, 1), (3, 1.5), (4, 1), (6, 2), (7, 1.5)):
        poner(bajo(f * mult, CORCHEA * 0.9), t0 + e * CORCHEA, 0.55)

    # Guitarra rasgueada y apagada en contratiempo (antes: órgano de senos puros → "pitido").
    fs = [hz(n) for n in triada]
    for e in (1, 3, 5, 7):
        poner(rasgueo(fs), t0 + e * CORCHEA, 0.22)

    # Melodía una octava más grave (más cálida, nada chillona). Sin campanitas.
    # (El "pitido iiiii" continuo que se atribuyó a la melodía era el fallo del bucle en Chrome;
    # se corrige en pednia-audio.js terminando el bucle 5 ms antes del final.)
    for e, nota, dur in MELODIA[c]:
        poner(marimba(hz(nota) / 2, dur * CORCHEA), t0 + e * CORCHEA, 0.5)

# Bucle: la cola que sobra se suma al inicio.
cola = buf[LARGO:]
x = buf[:LARGO].copy()
x[:len(cola)] += cola

# Reverb ligera de gimnasio en modo circular (también sin corte en el bucle).
ir_t = np.arange(int(0.45 * SR)) / SR
ir = sosfilt(sos('low', 4000), rng.standard_normal(len(ir_t))) * np.exp(-ir_t * 10)
ir /= np.sqrt(np.sum(ir ** 2))
n = 1 << int(np.ceil(np.log2(LARGO + len(ir))))
humedo = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)
envuelto = humedo[:LARGO].copy()
envuelto[:n - LARGO] += humedo[LARGO:n][:LARGO]
x = x + 0.12 * envuelto[:LARGO]

# Un poco de compresión suave y nivel de masterización.
x = np.tanh(x / np.percentile(np.abs(x), 99.5) * 0.9)
x *= 0.18 / np.sqrt(np.mean(x ** 2))
x = np.clip(x, -0.97, 0.97)

wavfile.write(sys.argv[1], SR, (x * 32767).astype(np.int16))
print('duracion_s', round(LARGO / SR, 3), 'pico', round(float(np.max(np.abs(x))), 3),
      'rms', round(float(np.sqrt(np.mean(x ** 2))), 3), 'salto_bucle', round(float(abs(x[0] - x[-1])), 4))
