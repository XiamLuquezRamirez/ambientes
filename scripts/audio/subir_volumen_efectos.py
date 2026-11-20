"""Sube el volumen de los efectos del tema Polimotor (efectos.wav) a un nivel parejo.

Cada efecto del sprite se lleva a RMS_OBJETIVO dBFS con un limitador suave (tanh) para que los
picos no pasen de PICO_MAX. Es idempotente: repetirlo no sigue subiendo el volumen.
Ejecutar DESPUÉS de sintetizar_polimotor.py (que regenera el archivo original) y subir ?v= en
shared/pednia-audio.js.  Uso: python scripts/audio/subir_volumen_efectos.py
"""
import array, math, os, wave

RUTA = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'catalogo_juegos', 'shared', 'audio', 'polimotor', 'efectos.wav')
RMS_OBJETIVO = -15.0   # dBFS
PICO_MAX = -1.0        # dBFS
GANANCIA_MAX = 12.0    # dB, para no inflar el ruido de efectos muy suaves
SPRITE = {'bote': [0, 615], 'agarrar': [1065, 130], 'soltar': [1645, 495], 'fallo': [2590, 775],
          'regreso': [3815, 500], 'vuelo': [4765, 460], 'red': [5675, 895], 'aplausos': [7020, 1875],
          'ovacion': [9345, 3575], 'encaje': [13370, 595], 'tic': [14415, 120], 'redoble': [14985, 2475]}

w = wave.open(RUTA)
params = w.getparams()
sr = w.getframerate()
a = array.array('h')
a.frombytes(w.readframes(w.getnframes()))
w.close()

tope = 10 ** (PICO_MAX / 20)
for nombre, (ini, dur) in SPRITE.items():
    i0, i1 = int(ini * sr / 1000), min(len(a), int((ini + dur) * sr / 1000))
    seg = [v / 32768.0 for v in a[i0:i1]]
    rms = math.sqrt(sum(v * v for v in seg) / len(seg)) or 1e-9
    db = max(-6.0, min(GANANCIA_MAX, RMS_OBJETIVO - 20 * math.log10(rms)))
    g = 10 ** (db / 20)
    for k, v in enumerate(seg):
        a[i0 + k] = int(max(-1.0, min(1.0, tope * math.tanh(v * g / tope))) * 32767)
    print('%-8s %+5.1f dB' % (nombre, db))

w = wave.open(RUTA, 'wb')
w.setparams(params)
w.writeframes(a.tobytes())
w.close()
