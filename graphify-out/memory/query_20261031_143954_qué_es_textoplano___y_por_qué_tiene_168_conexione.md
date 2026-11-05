---
type: "query"
date: "2026-10-31T14:39:54.034470+00:00"
question: "¿Qué es textoPlano() y por qué tiene 168 conexiones?"
contributor: "graphify"
source_nodes: ["textoPlano()", "sincronizarDialogoIntro3d()"]
---

# Q: ¿Qué es textoPlano() y por qué tiene 168 conexiones?

## Answer

Expandido con vocabulario del grafo: [texto, plano, sincronizar, dialogo, intro]. El grafo muestra textoPlano() de public/catalogo_juegos/texto_voz.js (L29) con 164 llamadas INFERRED desde sincronizarDialogoIntro3d() de cada juego. VERIFICADO CON EL CÓDIGO: esas 164 aristas son FALSOS POSITIVOS por choque de nombres. texto_voz.js es un IIFE y no expone textoPlano en su API (TextoVoz.textoPlano se usa 0 veces); solo lo usan internamente hablar(), claveTts() y obtenerUrlTts() (3 aristas EXTRACTED reales). Cada juego define SU PROPIA textoPlano anidada dentro de sincronizarDialogoIntro3d(): 164 copias (Multisensorial 135, Expresión Artística 19, Polimotor 10) y las 164 son IDÉNTICAS (mismo hash 422bcd55). sincronizarDialogoIntro3d tiene 15 variantes. Hallazgo real: duplicación de código (candidato a helper compartido); el grafo agrupa por nombre funciones globales/anidadas homónimas, así que las aristas INFERRED entre archivos deben verificarse.

## Source Nodes

- textoPlano()
- sincronizarDialogoIntro3d()

## Actualización (2026-10-31)

164 copias locales eliminadas (commit 8438c920): los juegos llaman a TextoVoz.textoPlano(). El grafo ya no muestra esas llamadas porque el AST no enlaza llamadas a miembro (obj.metodo()); verificar con grep.
