"""Detecta tonos puros ("pitidos") en un sprite de efectos o en una música.

Uso:
  python detectar_pitidos.py efectos.wav '{"bote":[0,615], ...}'   → informe por efecto
  python detectar_pitidos.py musica.wav                              → informe del archivo completo

Un cuadro (32 ms) cuenta como "pitido" si su pico por encima de 250 Hz sobresale más de
25 dB de su entorno espectral (±1 kHz) y está a menos de 30 dB del máximo del sonido.
El ruido filtrado (botes, aplausos, golpes) no cumple eso; un seno o un silbido sí.
"""
import json
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import stft


def cuadros_tonales(s, sr):
    if len(s) < 1024:
        s = np.pad(s, (0, 1024 - len(s)))
    f, _, Z = stft(s, sr, nperseg=1024, noverlap=768)
    M = 20 * np.log10(np.abs(Z) + 1e-9)
    tope = M.max()
    vecinos = int(1000 / (f[1] - f[0]))
    sel = f > 250
    n, peor = 0, None
    for j in range(M.shape[1]):
        col = M[:, j]
        i = np.argmax(np.where(sel, col, -1e9))
        med = np.median(col[max(0, i - vecinos):i + vecinos])
        prom = col[i] - med
        if col[i] - tope > -30 and prom > 25:
            n += 1
            if not peor or prom > peor[1]:
                peor = (int(f[i]), round(float(prom), 1))
    return n, M.shape[1], peor


if __name__ == '__main__':
    sr, x = wavfile.read(sys.argv[1])
    x = x / 32768.0
    if len(sys.argv) > 2:
        mapa = json.loads(sys.argv[2])
        for nombre, (ini, dur) in mapa.items():
            seg = x[int(ini * sr / 1000):int((ini + dur) * sr / 1000)]
            n, tot, peor = cuadros_tonales(seg, sr)
            marca = 'PITIDO' if n else 'ok'
            print(f'{nombre:10s} {marca:7s} cuadros tonales {n:3d}/{tot:3d}  peor {peor}')
    else:
        n, tot, peor = cuadros_tonales(x, sr)
        print(f'{sys.argv[1]}: cuadros tonales {n}/{tot}  peor {peor}')
