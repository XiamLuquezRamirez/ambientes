## OBJETIVO

Corrige el desfase visual de los aros del juego de precisión.

Cada aro está compuesto por DOS imágenes PNG:
- una capa trasera
- una capa frontal

Ejemplo actual:

"aros": {
    "azul": {
        "trasera": "Img/ARO_AZUL_PARTE-1.png",
        "frontal": "Img/ARO_AZUL_PARTE-2.png"
    }
}

Las dos imágenes tienen las mismas dimensiones físicas (1080x1080), pero el contenido gráfico dentro de cada PNG tiene posiciones transparentes diferentes. Por lo tanto, NO debes asumir que el centro visual del dibujo coincide con el centro geométrico de la imagen.

La corrección debe hacerse en la implementación del renderizado/composición del aro, NO modificando las coordenadas de las rutas del JSON.

---

## CONTEXTO DEL PROBLEMA

El JSON define las posiciones de los aros mediante coordenadas normalizadas:

[ x, y ]

Ejemplo:

"aros": [
    [0.32, 0.50],
    [0.52, 0.50],
    [0.72, 0.50]
]

Estas coordenadas representan la posición lógica del aro dentro del escenario.

Además, cada nivel utiliza un tamaño diferente:

Nivel 3:
"tamanoAro": 0.38

Nivel 4:
"tamanoAro": 0.28

Nivel 5-6:
"tamanoAro": 0.20

No modificar estos valores ni las coordenadas de las rutas como solución al problema.

---

## DIAGNÓSTICO QUE DEBES RESPETAR

Las imágenes:

ARO_AZUL_PARTE-1.png
ARO_AZUL_PARTE-2.png

tienen ambas 1080x1080.

Sin embargo, el contenido visible no ocupa la misma zona horizontal dentro del canvas:

- PARTE-1: contenido aproximadamente entre x=344 y x=678
- PARTE-2: contenido aproximadamente entre x=465 y x=797

Esto significa que las dos imágenes deben conservar sus dimensiones y su diseño interno.

NO recortes las imágenes.
NO cambies sus dimensiones originales.
NO alteres las coordenadas de las rutas para compensar este desfase.

El sistema debe tratar ambas imágenes como las dos capas de UNA SOLA entidad "aro".

---

# TAREA 1 — AUDITAR EL CÓDIGO ACTUAL

Antes de modificar nada, localiza:

1. El código que crea/renderiza los aros.
2. El código que calcula la posición X/Y del aro.
3. El código que aplica `tamanoAro`.
4. El código que crea la imagen trasera.
5. El código que crea la imagen frontal.
6. Cualquier `position`, `left`, `top`, `transform`, `translate`, `scale`, `width`, `height`, `z-index` o cálculo equivalente aplicado individualmente a las capas.
7. Cualquier lógica que pueda estar posicionando la imagen frontal independientemente de la trasera.

No hagas cambios todavía.

Primero determina cuál es la causa real del desfase.

---

# TAREA 2 — ESTRUCTURA CORRECTA

El aro debe comportarse como una única entidad:

aro
├── capa trasera
└── capa frontal

Debe existir un único contenedor para el aro.

Conceptualmente:

<div class="aro">
    <img class="aro-trasera">
    <img class="aro-frontal">
</div>

El contenedor es quien recibe:

- X
- Y
- width
- height

Las dos imágenes deben posicionarse dentro del mismo sistema de coordenadas del contenedor.

Conceptualmente:

.aro {
    position: absolute;
}

.aro img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
}

No copies literalmente este CSS si el proyecto utiliza otro sistema de renderizado. Adáptalo a la arquitectura existente.

---

# TAREA 3 — POSICIÓN

La posición del aro debe calcularse UNA SOLA VEZ a partir de:

[x, y]

del JSON.

Ejemplo:

[0.32, 0.50]

La posición resultante debe aplicarse al CONTENEDOR del aro.

No calcular una posición independiente para:

- trasera
- frontal

Ambas deben heredar la misma posición desde el contenedor.

Si actualmente existe algo como:

frontalX = x + offset
traseraX = x

investiga por qué existe antes de eliminarlo.

No elimines una lógica existente sin comprobar si tiene otro propósito.

---

# TAREA 4 — TAMAÑO

`tamanoAro` representa el tamaño del ARO COMPLETO.

Por ejemplo:

"tamanoAro": 0.38

El tamaño calculado debe aplicarse al contenedor:

aro.width
aro.height

Las dos imágenes deben ocupar:

width: 100%;
height: 100%;

del mismo contenedor.

No calcular tamaños diferentes para la capa trasera y frontal.

Esto debe funcionar correctamente para:

- 3 años → 0.38
- 4 años → 0.28
- 5-6 años → 0.20

No introducir offsets absolutos en píxeles que solamente funcionen para uno de estos tamaños.

---

# TAREA 5 — TRANSFORMACIONES

Revisa especialmente si actualmente existe alguna combinación como:

translate(-50%, -50%)
translate(...)
scale(...)
transform-origin
left/top

aplicada de manera diferente a la trasera y frontal.

La regla debe ser:

La transformación de posicionamiento pertenece al CONTENEDOR.

Las imágenes internas no deben utilizar transformaciones para corregir su posición salvo que exista una razón gráfica demostrada.

Por ejemplo, es correcto conceptualmente:

.aro {
    transform: translate(-50%, -50%);
}

.aro img {
    inset: 0;
}

Pero no queremos algo equivalente a:

.trasera {
    transform: translate(-50%, -50%);
}

.frontal {
    transform: translate(-48%, -50%);
}

sin una justificación.

---

# TAREA 6 — NO MODIFICAR EL JSON DE RUTAS

NO cambies:

"aros": [
    [0.32, 0.50],
    [0.52, 0.50],
    [0.72, 0.50]
]

ni ninguna otra coordenada solamente para solucionar el desfase visual.

Las coordenadas representan la ubicación lógica del aro en el recorrido.

Modificar estas coordenadas mezclaría dos problemas diferentes:

1. posición del aro dentro del escenario
2. composición visual de las dos capas del aro

Estos problemas deben permanecer separados.

---

# TAREA 7 — NO MODIFICAR LAS PNG

No:

- recortes las PNG
- cambies sus dimensiones
- generes nuevas versiones
- alteres los transparentes
- edites manualmente los archivos de imagen

La solución debe realizarse desde el código de renderizado.

---

# TAREA 8 — PRUEBA VISUAL

Implementa temporalmente, si es necesario, una herramienta de diagnóstico visual.

Por ejemplo:

- borde alrededor del contenedor del aro
- mostrar X/Y calculados
- mostrar width/height
- permitir visualizar las dos capas con transparencia

La finalidad es comprobar que:

1. el contenedor está centrado en [x,y]
2. ambas imágenes ocupan exactamente el mismo contenedor
3. ambas tienen exactamente el mismo width/height
4. ninguna capa tiene un left/top independiente
5. ninguna capa tiene un transform independiente inesperado

Una vez comprobado, elimina cualquier herramienta de diagnóstico que no sea necesaria para producción.

---

# TAREA 9 — COMPATIBILIDAD

La corrección debe funcionar para TODOS los colores:

- azul
- amarillo
- morado
- rosado

y para TODOS los niveles:

- 3 años
- 4 años
- 5-6 años

No hagas una solución específica para el aro azul.

La configuración actual de colores debe seguir funcionando:

"coloresAro": [
    "azul",
    "amarillo",
    "rosado",
    "morado"
]

---

# TAREA 10 — INTERACCIÓN DEL JUEGO

No rompas la lógica existente de interacción.

Después del cambio deben seguir funcionando:

- detección del cohete dentro del aro
- tolerancia
- recorrido
- orden de los aros
- validación del aro actual
- detección de acierto/error
- animaciones
- feedback
- escalado responsive
- diferentes tamaños de aro por edad

IMPORTANTE:

Si la lógica de colisión/detección utiliza la posición del aro, asegúrate de que siga utilizando el MISMO centro lógico definido por [x,y].

No sustituyas la lógica de colisión por los bordes transparentes de las PNG.

---

# TAREA 11 — RESPONSIVE

La solución no debe depender de un tamaño fijo como:

translate(-3px, 2px)

porque el juego cambia de tamaño según la pantalla.

El sistema debe seguir funcionando cuando el escenario:

- aumenta de tamaño
- disminuye de tamaño
- cambia de relación de aspecto
- se ejecuta en diferentes resoluciones

Si realmente se necesita un ajuste gráfico interno entre capas, debe expresarse de forma proporcional al tamaño del aro, no como un desplazamiento fijo en píxeles.

Pero NO introduzcas ese offset hasta demostrar que realmente es necesario.

---

# CRITERIO DE ACEPTACIÓN

La implementación será correcta cuando:

1. Cada aro tenga un único contenedor.
2. El contenedor sea el responsable de X/Y.
3. El contenedor sea el responsable del tamaño.
4. Trasera y frontal estén exactamente superpuestas a nivel de canvas.
5. Ambas capas tengan el mismo width/height.
6. No haya posiciones independientes para trasera/frontal.
7. Las coordenadas del JSON permanezcan intactas.
8. `tamanoAro` permanezca intacto.
9. No se modifiquen las PNG.
10. Los cuatro colores funcionen.
11. Los tres niveles funcionen.
12. La detección/interacción del juego siga funcionando.
13. El resultado sea responsive.

---

# MUY IMPORTANTE

No empieces modificando el JSON.

No empieces cambiando las coordenadas de los aros.

No empieces agregando offsets arbitrarios.

Primero encuentra en el código dónde se está creando y posicionando cada capa del aro.

Después implementa una composición donde:

POSICIÓN LÓGICA
        ↓
CONTENEDOR DEL ARO
        ↓
┌───────────────────┐
│  TRASERA          │
│  FRONTAL          │
└───────────────────┘

Una vez implementado, prueba al menos:

- nivel 3
- nivel 4
- nivel 5-6
- aro azul
- aro amarillo
- aro morado
- aro rosado
- recorrido horizontal
- recorrido diagonal

Finalmente, entrega un resumen de:
1. causa exacta encontrada
2. archivos modificados
3. cambios realizados
4. por qué la solución corrige el problema
5. pruebas realizadas
6. cualquier riesgo o comportamiento que deba revisarse

No hagas cambios fuera del alcance de este problema.
