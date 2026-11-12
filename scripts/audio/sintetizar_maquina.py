"""Sintetiza el sprite de efectos del tema "maquina" (máquina de peluches del mall) para PedniaAudio.
Lo usa Multisensorial/MemoriaAuditiva/QueEscuchaste.

Uso:  python scripts/audio/sintetizar_maquina.py public/catalogo_juegos/shared/audio/maquina/efectos.wav
Imprime el mapa del sprite en ms: copiarlo a TEMAS.maquina.sprite en shared/pednia-audio.js.
Verificar SIEMPRE: python scripts/audio/detectar_pitidos.py <wav> '<mapa>'  (todo "ok").

REGLA (audio-sin-pitidos): ningún seno por encima de ~200 Hz. Motor, pinzas, botón y brillos se
hacen con ruido filtrado y golpes graves. Aplausos, ovación, redoble y "toc toc" se reutilizan del
tema Polimotor (ya medidos).
"""
import json
import os
import sys

import numpy as np
from scipy.io import wavfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sintetizar_polimotor as P  # noqa: E402  (helpers y sonidos ya verificados)

SR = P.SR
rng = np.random.default_rng(20261112)
t_, bp, lp, hp = P.t_, P.bp, P.lp, P.hp
env_ad, osc, normalizar, fade_out, barrido = P.env_ad, P.osc, P.normalizar, P.fade_out, P.barrido


def ruido(n):
    return rng.standard_normal(n)


def sala(x, mezcla=0.08):
    """Reverb corta del mall (la de gimnasio, con poca mezcla)."""
    return P.gimnasio(x, mezcla)


def envolvente_suave(t, dur, sube=0.04, baja=0.08):
    return np.clip(t / sube, 0, 1) * np.clip((dur - t) / baja, 0, 1)


def zumbido_motor(dur, f0, f1, banda0, banda1):
    """Motor eléctrico del gancho: zumbido grave (seno < 200 Hz) + engranajes (ruido que vibra)."""
    t = t_(dur)
    f = f0 + (f1 - f0) * (t / dur)
    hum = osc(f) * 0.55 + osc(f * 0.5) * 0.25
    engranaje = barrido(dur, banda0, banda1, ancho=0.7)
    engranaje *= 0.65 + 0.35 * np.sin(2 * np.pi * 28 * t)   # traqueteo de los dientes
    x = (hum + engranaje * 0.9) * envolvente_suave(t, dur)
    return lp(x, 2400)


def motor():
    """El gancho se mueve de lado sobre el riel."""
    return normalizar(fade_out(zumbido_motor(0.42, 120, 125, 380, 520), 30), 0.07)


def bajar():
    """El gancho baja: motor que se afloja (la banda baja)."""
    return normalizar(fade_out(zumbido_motor(0.5, 130, 90, 900, 320), 40), 0.08)


def subir():
    """El gancho sube: motor que se esfuerza (la banda sube)."""
    return normalizar(fade_out(zumbido_motor(0.6, 90, 135, 300, 900), 40), 0.08)


def clic(n_ms, lo, hi, caida):
    t = t_(n_ms / 1000)
    return bp(ruido(len(t)), lo, hi) * env_ad(t, 0.0004, caida)


def clac():
    """Pinzas que se cierran: dos chasquidos metálicos (ruido ancho, sin resonar) + golpe grave."""
    t = t_(0.26)
    x = osc(95 + 60 * np.exp(-t * 35)) * env_ad(t, 0.002, 32) * 0.7
    for retraso, amp in ((0.0, 1.0), (0.032, 0.7)):
        c = clic(60, 1800, 6500, 160) * amp
        i = int(retraso * SR)
        x[i:i + len(c)] += c
    return normalizar(fade_out(sala(x, 0.06), 25), 0.12)


def abrir():
    """Pinzas que se abren: chasquido suave + soplido corto de aire."""
    t = t_(0.24)
    x = np.zeros(len(t))
    c = clic(50, 1500, 5000, 150) * 0.7
    x[:len(c)] += c
    x += bp(ruido(len(t)), 700, 2600) * env_ad(t, 0.01, 22) * 0.35
    return normalizar(fade_out(sala(x, 0.06), 25), 0.08)


def boton():
    """Botón grande de arcade: clic de plástico + golpe de resorte grave."""
    t = t_(0.16)
    x = osc(110 + 50 * np.exp(-t * 60)) * env_ad(t, 0.001, 45) * 0.8
    c = clic(35, 1400, 4200, 260)
    x[:len(c)] += c
    c2 = clic(30, 600, 1600, 200) * 0.5
    i = int(0.055 * SR)
    x[i:i + len(c2)] += c2
    return normalizar(fade_out(x, 15), 0.11)


def tic():
    """Palanca: tic muy corto (madera/plástico)."""
    t = t_(0.06)
    x = bp(ruido(len(t)), 1100, 3200) * env_ad(t, 0.0004, 230)
    x += bp(ruido(len(t)), 250, 600) * env_ad(t, 0.001, 90) * 0.4
    return normalizar(fade_out(x, 10), 0.05)


def aparece():
    """Un objeto cae sobre su pedestal: soplido que sube + 'pof' grave."""
    dur = 0.32
    t = t_(dur)
    x = barrido(dur, 350, 1300, ancho=0.8) * np.sin(np.pi * np.clip(t / 0.22, 0, 1)) ** 2 * 0.6
    i = int(0.2 * SR)
    tk = t_(dur - 0.2)
    x[i:] += osc(80 + 60 * np.exp(-tk * 40)) * env_ad(tk, 0.002, 30)
    x[i:] += bp(ruido(len(tk)), 200, 900) * env_ad(tk, 0.001, 50) * 0.6
    return normalizar(fade_out(sala(x, 0.08), 30), 0.09)


def cae():
    """El peluche cae por la rampa al cajón: golpe blando + tres botecitos que se apagan."""
    t = t_(0.75)
    x = np.zeros(len(t))
    for retraso, amp in ((0.0, 1.0), (0.2, 0.55), (0.33, 0.32), (0.42, 0.18)):
        i = int(retraso * SR)
        n = len(t) - i
        tk = t_(n / SR)
        x[i:] += osc(65 + 55 * np.exp(-tk * 30)) * env_ad(tk, 0.002, 28) * amp
        x[i:] += bp(ruido(n), 180, 700) * env_ad(tk, 0.001, 45) * amp * 0.9
    return normalizar(fade_out(sala(x, 0.1), 60), 0.13)


def brillo():
    """Destello de estrellas: granitos de ruido agudo y ancho que caen (sin ninguna nota)."""
    dur = 0.7
    x = np.zeros(int(SR * (dur + 0.1)))
    g_t = t_(0.025)
    tiempo = 0.0
    while tiempo < dur:
        u = tiempo / dur
        fc = 7000 - 3500 * u + rng.uniform(-600, 600)
        g = bp(ruido(len(g_t)), fc * 0.55, min(fc * 1.45, SR / 2 * 0.95)) * env_ad(g_t, 0.0005, 180)
        g *= (1 - u) ** 1.2 * rng.uniform(0.5, 1.0)
        i = int(tiempo * SR)
        x[i:i + len(g)] += g
        tiempo += rng.exponential(0.018)
    x += bp(ruido(len(x)), 2000, 6000) * np.exp(-t_(len(x) / SR) * 6) * 0.12
    return normalizar(fade_out(sala(x, 0.12), 80), 0.06)


def vuelo():
    """El premio vuela a la vitrina: soplido ancho (el de Polimotor, un poco más largo)."""
    dur = 0.55
    t = t_(dur)
    x = barrido(dur, 240, 700, ancho=0.85) * np.sin(np.pi * t / dur) ** 2
    return normalizar(lp(x, 1800), 0.06)


def vitrina():
    """El premio se acomoda en la repisa: golpecito de madera + brillo corto."""
    t = t_(0.4)
    x = osc(90 + 60 * np.exp(-t * 40)) * env_ad(t, 0.002, 38) * 0.6
    x += bp(ruido(len(t)), 600, 1800) * env_ad(t, 0.0008, 90) * 0.7
    b = brillo()[: len(t)] * 0.5
    i = int(0.06 * SR)
    x[i:] += b[: len(x) - i]
    return normalizar(fade_out(sala(x, 0.1), 40), 0.09)


# Orden fijo: los nuevos van AL FINAL (los anteriores conservan su posición en el sprite).
SONIDOS = [
    ("motor", motor), ("bajar", bajar), ("subir", subir), ("clac", clac), ("abrir", abrir),
    ("boton", boton), ("tic", tic), ("aparece", aparece), ("cae", cae), ("brillo", brillo),
    ("vuelo", vuelo), ("vitrina", vitrina),
    ("fallo", P.fallo), ("aplausos", P.aplausos), ("ovacion", P.ovacion), ("redoble", P.redoble),
]

if __name__ == "__main__":
    salida = sys.argv[1]
    os.makedirs(os.path.dirname(salida), exist_ok=True)
    hueco = np.zeros(int(SR * 0.45))
    partes, mapa, cursor = [], {}, 0
    for nombre, fn in SONIDOS:
        x = fn()
        mapa[nombre] = [round(cursor / SR * 1000), round(len(x) / SR * 1000)]
        partes += [x, hueco]
        cursor += len(x) + len(hueco)
    todo = np.concatenate(partes)
    wavfile.write(salida, SR, (np.clip(todo, -1, 1) * 32767).astype(np.int16))
    print(json.dumps(mapa))
