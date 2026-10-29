# Tema – Encuentra el color

**Ambiente:** Multisensorial · **Eje 1:** Percepción visual · **Tema 1**
**Juego:** `public/catalogo_juegos/Multisensorial/EncuentraElColor`

> **Fuente:** el documento *1-RESTRUCTURACIÓN MÓDULO DE JUEGOS 2 – MULTISENSORIAL* solo lista este tema en el índice del Eje 1 y no trae su contenido. Este archivo se reconstruyó **únicamente** a partir de lo implementado en `config.json`. Debe validarse contra el requerimiento original antes de tomarlo como definitivo.

## Estructura general

- Pantalla pensada para tablet en horizontal (1280×720).
- Zoe y Zeus presentan el juego en una conversación inicial y luego hacen una demostración guiada.
- En cada consigna se muestran los objetos del nivel; el niño toca el objeto del color que se le indica.
- Retroalimentación visual con animación de acierto o error, más sonido y voz.

### Conversación de bienvenida

- **Zoe:** "¡Hola! Soy Zoe. ¡Vamos a jugar! Observa muy bien los objetos y encuentra el color que te voy a indicar."
- **Zeus:** "¡Yo soy Zeus! Mira los colores: toca el objeto del color que te digamos."
- **Zoe:** "Escucha con atención, observa y toca. ¡Tú puedes!"

### Demostración

- "¡Vamos con un ejemplo! Mira cómo se hace: toca el objeto de color {color}."
- Al terminar: "¡Ahora te toca a ti! Encuentra el color que te digamos."

## Niveles por edad

| Edad | Colores | Objetos |
|------|---------|---------|
| 3 años | 3: rojo, amarillo, azul | Manzana (rojo), Sol (amarillo), Carro (azul) |
| 4 años | 5: los anteriores + verde, naranja | + Rana (verde), Zanahoria (naranja) |
| 5-6 años | 7: los anteriores + morado, rosado | + Uvas (morado), Flor (rosado) |

## Mecánica

1. **Enunciado:** "Observa muy bien y encuentra el color que te indico"
2. **Consigna por color:** "Encuentra el objeto de color {color}."
3. **Acción del niño:** toca el objeto que tiene el color pedido.
4. **Respuesta del sistema:**
   - **Correcto:** "¡Muy bien! Encontraste el color {color}." Se muestra la animación de acierto.
   - **Incorrecto:** "¡Inténtalo otra vez! Observa muy bien." Se muestra la animación de error y el niño puede volver a intentarlo.

## Cierre

- Al encontrar todos los colores del nivel: "¡Excelente! Encontraste todos los colores."
