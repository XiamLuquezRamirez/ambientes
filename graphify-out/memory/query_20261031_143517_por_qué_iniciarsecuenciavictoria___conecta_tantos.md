---
type: "query"
date: "2026-10-31T14:35:17.823495+00:00"
question: "¿Por qué iniciarSecuenciaVictoria() conecta tantos juegos de distintos ambientes?"
contributor: "graphify"
source_nodes: ["iniciarSecuenciaVictoria()", "iniciarVictoria()"]
---

# Q: ¿Por qué iniciarSecuenciaVictoria() conecta tantos juegos de distintos ambientes?

## Answer

Expandido desde la pregunta original con vocabulario del grafo: [iniciar, secuencia, victoria, final, terminar, confeti]. iniciarSecuenciaVictoria() (public/catalogo_juegos/final/final.js L120) es la pantalla final COMPARTIDA del catálogo: cierra las cortinas, limpia el confeti, libera la intro 3D (__intro3dDispose) y, si existe Final3d, precarga los personajes 3D; luego llama a iniciarVictoria() (L171), que abre cortinas, lanza el confeti continuo y anima a Zoe/Zeus (3D o 2D). Tiene 331 conexiones: 325 llamadas entrantes (INFERRED, función global entre archivos) desde la función de cierre de cada juego (mostrarCierre/terminarJuego/granCierre/shell.js): Multisensorial 155, Expresión Artística 107, Multisaberes 54, Polimotor 10. Verificado con grep: 326 juegos cargan final.js y los 326 lo llaman (los 8 de Expresión Artística/Quién usa qué lo hacen desde js/shell.js). Es el punto de mayor dependencia compartida: un cambio en final.js afecta a todos los juegos.

## Source Nodes

- iniciarSecuenciaVictoria()
- iniciarVictoria()