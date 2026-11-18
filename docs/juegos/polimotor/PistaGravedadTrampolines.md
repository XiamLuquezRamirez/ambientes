# La Pista de Gravedad y Trampolines

Polimotor · Transición (5-6 años) · Eje *Coordinación y orientación* (Juego 3) · Temática 32 *Laberintos de coordinación*
Carpeta: `public/catalogo_juegos/Polimotor/PistaGravedadTrampolines/`
Slug: `pista-gravedad-trampolines` (ambiente 7, eje 17, temática 32, módulo 9, orden 28, imagen `pista-gravedad.png`, color `#db2777`)

El niño guía una esfera mágica por una pista elevada en el espacio, en 3D real (three.js): rampas que bajan y suben,
curvas, puentes estrechos, agujeros con profundidad, trampolines amarillos que saltan muros de energía y la plataforma
de meta. Tres recorridos cada vez más largos; el tercero tiene 2 agujeros, 2 trampolines (uno cambia de nivel), un poste,
rampas a los dos lados y un puente.

## Pedidos del usuario (2026-11-18)

- Guiarse solo por `docs/juegos/polimotor/estructura.md`; sin rama nueva; sin SQL nuevo (una fila en
  `database/ambientes.sql` y la misma en la BD local).
- Solo escritorio y tableta horizontal (se quitó la regla de tableta vertical del CSS).
- **Sin títulos**: ni en la cabecera (`.hud-titulo` oculto), ni en la portada (kicker oculto), ni cartel de título.

## Archivos

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `ReglasGravedad` | Puro (`module.exports`). Construye la pista con una "tortuga" (`recto`, `curva`, `salto`, `meta`) desde `config.pistas`; superficie con altura, física (`paso`: dirección hacia el dedo, aceleración y frenado suaves, gravedad en rampas, bordes que detienen y deslizan, postes que se rodean), agujeros, trampolines con parábola fija (`puntoSalto`), puntos seguros, ruta y `validar`. |
| `escenario-3d.js` | `EscenarioPista` | Módulo three.js: losas extruidas (agujeros perforados de verdad), barandas de cristal con neón, sin pilares (pista flotante), espacio lleno de nebulosas, islas con cristales, asteroides, planetas, estaciones y cometas, esfera que rueda con sombra y luz, caída + rayo tractor + rescate, salto con sombra de aterrizaje, meta, cámara que sigue con zona muerta, presentación y cinemática final (podio, la esfera se abre, trofeo, láseres, confeti, giro de cámara). |
| `control.js` | `ControlEsfera` | Dedo/ratón: la esfera rueda hacia el punto tocado y sigue al dedo; teclado: flechas o WASD. |
| `demo.js` | `GravedadDemo` | Demo automática en `config.demoPista` con la mano del tutorial y el control real. |
| `sonidos.js` | `SonidosGravedad` | Web Audio sin archivos: rodar, alerta, caída, rescate, trampolín, salto, aterrizaje, meta, trofeo, láser, música. |
| `guia-3d.js` | `Guia3D`, `Guia3DZeus` | Zoe y Zeus 3D (mismo módulo que los demás). |
| `script.js` | — | Flujo, voces, ayudas progresivas, indicador de recorrido, final y resumen. |

## Recorridos al azar (pedido del usuario, 2026-11-18)

- Cada partida (y cada VOLVER A JUGAR) genera tres recorridos nuevos: `ReglasGravedad.generarPartida` arma los tramos con
  bloques al azar (rampa, agujero, trampolín con muro, trampolín que sube de nivel, puente, poste, recto) y curvas de
  60°/90° que nunca hacen volver la pista hacia la izquierda. Empieza siempre con una rampa de bajada; el trampolín que
  sube va en la segunda mitad.
- La dificultad de cada nivel está en `config.pistas[].aleatorio` (bloques, agujeros, trampolines, cambiosNivel,
  puentes, postes, rampas, curvas, curvasRampa). Nivel 3: 2 agujeros y 2 trampolines (uno cambia de nivel).
- Una pista se acepta solo si pasa `validar` (sin piezas pisadas, carriles libres junto a los agujeros, aterrizajes
  seguros) y el piloto automático (`recorrer`) llega a la meta sin caer usando todos los trampolines; además cada
  recorrido es más largo que el anterior. Se reintenta hasta 60 veces; si nada sirve, se usan los `tramos` fijos del
  mismo nivel como respaldo (en 200 partidas de prueba no hizo falta). La demo sigue siendo fija.

## Mecánica

- Sin vidas. Caer en un agujero: la esfera se hunde, baja un rayo tractor, la sube y la deja en el último punto seguro
  (hexágonos que se encienden al pasar). El avance no se pierde.
- Ayudas: aviso del agujero (borde que late y señal "!") al acercarse; Zoe "¡Mueve la esfera suavemente…" (cada 14 s
  como mucho); Zeus "¡Apunta al trampolín amarillo…" al acercarse a cada trampolín o al empujar contra el muro; si se
  mueve sin avanzar 9 s, un orbe de luz recorre el siguiente tramo (no hay flechas fijas).
- Prueba: `node scripts/probar-pista-gravedad-trampolines.js` (900/900: pistas fijas y 60 partidas al azar; valida y
  recorre cada pista con piloto automático sin caer).
- Servidor de pruebas `juegos-gravedad` (8033) en `.claude/launch.json`.
