# PROMPT MAESTRO: LA HUERTA MÁGICA DE CONTEO

## 1. Objetivo

Desarrolla un juego educativo infantil llamado **La Huerta Mágica de Conteo**, basado visualmente en la imagen de referencia proporcionada.

El juego debe enseñar conteo, correspondencia uno a uno y reconocimiento de cantidades entre 2 y 5 manzanas mediante interacción táctil, narración, animaciones y apoyos de accesibilidad.

La implementación debe integrarse en la arquitectura existente del proyecto y seguir el mismo patrón de configuración JSON utilizado por el juego «Clasifica por los sentidos».

### Restricción arquitectónica fundamental

**No crear una configuración independiente para el juego, ni un archivo adicional de configuración de accesibilidad, ni un segundo perfil de inclusión.**

La configuración propia del juego debe estar contenida en un único JSON, siguiendo la estructura existente:

- `nombre`
- `textos`
- `accesibilidad`
- `audios`
- Recursos y elementos visuales.
- `demo`
- `niveles`
- `niveles[].retos[]`
- Mensajes de presentación, preguntas, aciertos, errores y cierre.

La configuración de accesibilidad de la plataforma debe continuar obteniéndose del perfil de inclusión existente. El juego debe consumir sus parámetros sin duplicarlos dentro de su JSON.

No inventes una arquitectura nueva. Inspecciona el juego de referencia y reutiliza sus convenciones, componentes y servicios.

---

## 2. Estructura del JSON del juego

Crea un JSON propio para La Huerta Mágica de Conteo con la misma organización conceptual del JSON de «Clasifica por los sentidos».

La estructura deberá ser similar a la siguiente:

```json
{
  "nombre": "La huerta mágica de conteo",
  "textos": {
    "eligeNivel": "¡Elige tu nivel!",
    "demostracion": "¡Mira cómo contamos las manzanas!",
    "demostracionFin": "¡Ahora te toca a ti!",
    "conversacion": [
      {
        "personaje": 1,
        "texto": "¡Vamos a cosechar manzanas!"
      },
      {
        "personaje": 0,
        "texto": "Toca cada manzana para contar cuántas hay."
      }
    ]
  },
  "accesibilidad": {
    "letterSpacing": 2,
    "volumenFondo": 20,
    "rate": 5,
    "mostrarIntro": true
  },
  "audios": {
    "cierre": "../../sounds/victory.mp3",
    "fondo": "../../sounds/fondo.mp3",
    "efectos": {}
  },
  "elementos": {
    "manzana": {
      "img": "img/manzana.svg",
      "nombre": "Manzana"
    },
    "canasta": {
      "img": "img/canasta.svg",
      "nombre": "Canasta"
    },
    "arbol": {
      "img": "img/arbol.svg",
      "nombre": "Árbol"
    }
  },
  "demo": {
    "cantidadObjetos": 2,
    "piezasVisibles": 2,
    "opciones": [1, 2, 3],
    "correcto": 2
  },
  "niveles": [
    {
      "id": "3",
      "edad": "3-4 años",
      "titulo": "Pequeños recolectores",
      "escena": "huerta",
      "bienvenida": [
        {
          "personaje": 1,
          "texto": "¡Bienvenido a la huerta mágica!"
        },
        {
          "personaje": 0,
          "texto": "¡Vamos a contar las manzanas!"
        }
      ],
      "retos": [
        {
          "id": "recolecta-2",
          "titulo": "Recolecta las manzanas",
          "mecanica": "contar",
          "cantidadObjetos": 2,
          "piezasVisibles": 2,
          "opciones": [1, 2, 3],
          "correcto": 2,
          "presentacion": {
            "voz": "zoe",
            "texto": "¡Mira las manzanas del árbol!"
          },
          "pregunta": {
            "voz": "zeus",
            "texto": "Toca cada manzana para contar cuántas hay."
          },
          "acierto": {
            "voz": "zoe",
            "texto": "¡Muy bien! Contaste 2 manzanas.",
            "efecto": "recompensa"
          },
          "errorOtro": {
            "voz": "zeus",
            "texto": "¡Vamos a contar otra vez! Toca las manzanas una por una.",
            "efecto": "boing"
          }
        }
      ],
      "cierre": [
        {
          "voz": "zoe",
          "texto": "¡Excelente! ¡Has aprendido a contar las manzanas!"
        }
      ],
      "cierreEscena": "recoleccion",
      "insignia": {
        "img": "img/insignia_recolector.svg",
        "nombre": "Recolector de Manzanas"
      }
    }
  ]
}
```

Este JSON es una plantilla ilustrativa de la estructura. Debe ampliarse con todos los niveles y retos solicitados a continuación.

No des por existentes las rutas de recursos de ejemplo: comprueba las rutas reales del proyecto y utiliza recursos existentes o crea los necesarios siguiendo sus convenciones.

---

## 3. Configuración de la cantidad en cada reto

La cantidad de manzanas debe definirse directamente en cada objeto de reto mediante `cantidadObjetos`.

Valores permitidos: 2, 3, 4 y 5.

Ejemplo:

```json
{
  "id": "recolecta-4",
  "titulo": "Recolecta las manzanas",
  "mecanica": "contar",
  "cantidadObjetos": 4,
  "piezasVisibles": 2,
  "opciones": [2, 3, 4],
  "correcto": 4
}
```

En este ejemplo:

- El reto contiene cuatro manzanas.
- Se muestran como máximo dos simultáneamente.
- El niño debe poder explorar las cuatro.
- La respuesta correcta es cuatro.

El motor debe generar la cantidad de objetos según el valor del reto.

No codifiques tres manzanas de forma permanente.

No agregues propiedades como `cantidadMinima`, `cantidadMaxima` o `cantidadObjetos` a una configuración global separada. Los valores necesarios deben residir en los propios retos, de acuerdo con el patrón de configuración del proyecto.

La propiedad `correcto` debe mantenerse sincronizada con `cantidadObjetos`. Puedes validarla durante la carga y derivar la respuesta correcta de `cantidadObjetos` en el motor para evitar inconsistencias.

---

## 4. Niveles y retos

Implementa niveles por edades y dificultad siguiendo el patrón existente de `niveles`.

### Nivel 1: pequeños recolectores

Edad sugerida: 3-4 años.

Retos:

- `recolecta-2`: dos manzanas.
- `recolecta-3`: tres manzanas.

Características:

- Objetos grandes.
- Conteo guiado.
- Instrucciones cortas.
- Pistas visuales.
- Tres opciones numéricas como máximo.
- Tiempo suficiente para responder.

### Nivel 2: exploradores de la huerta

Edad sugerida: 4-5 años.

Retos:

- `recolecta-3`: tres manzanas.
- `recolecta-4`: cuatro manzanas.

Características:

- Mayor autonomía.
- Correspondencia uno a uno.
- Opciones numéricas variables.
- Pistas progresivas cuando se necesiten.
- Posibilidad de volver a contar.

### Nivel 3: guardianes de la huerta

Edad sugerida: 5-6 años.

Retos:

- `recolecta-4`: cuatro manzanas.
- `recolecta-5`: cinco manzanas.

Características:

- Mayor independencia.
- Menor dependencia de ayudas automáticas cuando el niño demuestra dominio.
- Comprensión de la cardinalidad.
- Conteo completo antes de seleccionar una respuesta.
- Opciones numéricas sin duplicados.

Los niveles y las edades son orientativos. Si el proyecto utiliza identificadores o criterios de nivel diferentes, respeta los existentes.

Los apoyos de inclusión deben poder aplicarse en cualquier nivel. Un niño puede jugar un reto avanzado con ayudas visuales, texto ampliado o narración habilitada.

---

## 5. Propiedad `piezasVisibles`

La propiedad `piezasVisibles` se define dentro de cada reto y debe integrarse con el parámetro global `valores.juegos.dificultad.piezasVisibles`.

**No confundas el total de objetos con la cantidad de objetos visibles simultáneamente.**

La regla será:

- `cantidadObjetos`: total de manzanas que tiene el reto.
- `piezasVisibles`: máximo de manzanas que se muestran simultáneamente, sujeto a las restricciones de accesibilidad y de pantalla.

Ejemplo:

```json
{
  "id": "recolecta-5",
  "mecanica": "contar",
  "cantidadObjetos": 5,
  "piezasVisibles": 2,
  "opciones": [3, 4, 5],
  "correcto": 5
}
```

El juego debe crear cinco manzanas, presentar dos a la vez y permitir descubrir las restantes.

El perfil de inclusión existente tiene prioridad como fuente de preferencias globales. El valor específico del reto puede definir la configuración pedagógica de la ronda, pero no debe ignorar las restricciones de accesibilidad de la plataforma.

Establece una precedencia clara:

1. Las preferencias globales de accesibilidad.
2. La configuración específica del reto.
3. Los valores predeterminados del juego cuando una propiedad opcional no exista.

Si el reto solicita un número de objetos visibles superior al permitido por la configuración efectiva, respeta el límite efectivo sin alterar la cantidad total de manzanas.

Si `piezasVisibles` no está definido en el reto, utiliza el valor del perfil global `valores.juegos.dificultad.piezasVisibles`.

Si tampoco está definido en el perfil, aplica el valor predeterminado establecido por el proyecto.

---

## 6. Integración con el perfil de inclusión existente

El juego debe utilizar el perfil que contiene:

```json
{
  "tipo": "inclusion",
  "perfil_id": 2,
  "valores": {
    "btn_size": 80,
    "btn_spacing": 16,
    "font_size": 16,
    "lectura_facil": false,
    "subtitulos": false,
    "audio_instruc": "automático",
    "audio_fondo": true,
    "audio_btn": true,
    "trans_ms": 200,
    "anim_speed": 100,
    "anim_decorativas": false,
    "gestos": "toque y swipe",
    "auto_avance": false,
    "opciones_max": 3,
    "intentos_max": 5,
    "refuerzo": "cada 2 pasos",
    "progreso": "barra prominente",
    "ra_inicio": "automático",
    "ra_velocidad": 100,
    "ra_contenido": "animación",
    "contraste": "estándar",
    "modo_color": "normal",
    "fondo_pantalla": "crema",
    "elementos_flotantes": false,
    "cursor_grande": false,
    "refuerzo_visual": true,
    "refuerzo_sonido": false,
    "refuerzo_tipo": "animación",
    "error_visible": true,
    "feedback_demora_ms": 0,
    "tiempo_max_bloque": 45,
    "pausa_entre_bloques": true,
    "duracion_pausa_seg": 3,
    "idioma": "español",
    "voz_narradora": "infantil_femenina",
    "velocidad_voz": 100,
    "repeticion_audio": false
  }
}
```

El fragmento anterior es solo una referencia abreviada. Debe consumirse el perfil completo real, incluyendo `valores.juegos.visual`, `valores.juegos.texto`, `valores.juegos.tamano`, `valores.juegos.audio`, `valores.juegos.apoyo`, `valores.juegos.interaccion`, `valores.juegos.tiempo` y `valores.juegos.dificultad`.

No copies este fragmento dentro del JSON del juego.

No crees un nuevo perfil de inclusión.

No dupliques los parámetros globales en `accesibilidad`. Esa sección debe mantener únicamente los campos propios del formato del juego que ya utilice la aplicación, como `letterSpacing`, `volumenFondo`, `rate` o `mostrarIntro`, si son necesarios para la compatibilidad con el motor existente.

Cuando un parámetro ya esté disponible en el perfil global, utiliza ese valor como fuente de verdad.

---

## 7. Interfaz visual

Reproduce el concepto de la imagen de referencia:

- Huerta colorida.
- Árbol central.
- Manzanas rojas.
- Canasta de recolección.
- Zoe y Zeus.
- Pregunta en un globo de diálogo.
- Tarjetas numéricas grandes en la parte inferior.
- Botones de ayuda, audio y repetición.
- Indicador de progreso.

La distribución debe adaptarse a tabletas y pantallas pequeñas.

Las manzanas deben estar separadas, ser fáciles de identificar y tener una zona táctil amplia.

Los elementos decorativos no deben competir visualmente con los objetos que se cuentan.

Respeta las opciones de alto contraste, tamaño, tipografía, bordes, fondo y reducción de animaciones del perfil de inclusión.

No dependas únicamente del color para indicar estados.

---

## 8. Mecánica del conteo

Cuando el niño toca una manzana no contada:

1. Identifica su ID.
2. Marca la manzana como contada.
3. Asigna el siguiente número de conteo.
4. Resalta el objeto.
5. Reproduce la animación permitida.
6. Pronuncia el número si el audio está habilitado.
7. Actualiza el progreso.

Ejemplo con cuatro manzanas:

- Primera manzana: «¡Uno!».
- Segunda manzana: «¡Dos!».
- Tercera manzana: «¡Tres!».
- Cuarta manzana: «¡Cuatro!».

Cada manzana solo puede incrementar el conteo una vez.

Si el niño vuelve a tocar una manzana contada, no debe incrementarse el contador.

Si `piezasVisibles` limita la presentación, el estado de cada manzana debe mantenerse al navegar entre grupos.

Cuando todas las manzanas hayan sido contadas, Zeus debe preguntar:

«¡Genial! ¿Cuántas manzanas contamos en total?».

---

## 9. Opciones de respuesta

Las opciones se definen en cada reto mediante `opciones`, siguiendo el patrón del juego de referencia.

Ejemplo:

```json
{
  "cantidadObjetos": 4,
  "opciones": [2, 3, 4],
  "correcto": 4
}
```

El motor debe validar que:

- La respuesta correcta esté presente.
- No existan opciones repetidas.
- La cantidad de opciones no supere `valores.opciones_max`.
- Todas las opciones sean números válidos.
- La respuesta correcta coincida con el total de objetos.

Si el número de opciones definido en el reto supera el máximo permitido por el perfil, ajusta la presentación de forma coherente sin eliminar la respuesta correcta.

Si la respuesta correcta está mal configurada, utiliza `cantidadObjetos` como fuente de verdad y registra o comunica el problema de configuración según las convenciones del proyecto.

La posición de la respuesta correcta puede variar cuando el juego utilice aleatorización.

No coloques siempre la respuesta correcta en la tarjeta central.

---

## 10. Retroalimentación

### Respuesta correcta

Zoe dice:

«¡Muy bien! Contaste 4 manzanas».

El número debe obtenerse dinámicamente.

Las manzanas caen en la canasta mediante una animación accesible.

Si el movimiento está deshabilitado, muestra una confirmación visual equivalente.

Registra el acierto y permite continuar según la configuración de avance.

### Respuesta incorrecta

Zeus dice:

«¡Vamos a intentarlo otra vez! Toca las manzanas una por una para contar cuántas hay».

Conserva el progreso y ofrece la posibilidad de volver a contar.

Respeta:

- `intentos_max`
- `error_visible`
- `feedback_demora_ms`
- `juegos.apoyo.mostrarFeedBack`
- `juegos.apoyo.feedback.duracion`
- `juegos.apoyo.feedback.acierto`
- `juegos.apoyo.feedback.error`
- `juegos.apoyo.pistaPorFallos`

No castigues al niño ni reinicies automáticamente todo el reto ante un error.

---

## 11. Sistema de pistas

Utiliza los umbrales existentes:

- `erroresAntesDePista`
- `fallosPista1`
- `fallosPista2`
- `respuestasMaximasAntesDeAtenuar`

Implementa una progresión de ayudas:

1. Resaltar una manzana no contada.
2. Invitar a tocar las manzanas una por una.
3. Mostrar cuántas manzanas se han contado.
4. Realizar una demostración de conteo.

Las pistas deben activarse de acuerdo con la lógica existente del proyecto, sin duplicar umbrales ni ejecutar varias pistas simultáneamente.

Si las pistas automáticas están desactivadas, ofrece ayuda bajo demanda cuando exista un mecanismo para ello.

No reveles directamente la respuesta final salvo que la modalidad de ayuda configurada lo permita.
## 12. Accesibilidad integral
### Visual
Integrar:
- `altoContraste`
- `altoContrasteEstilo`
- `mostrarNombres`
- `resaltarObjetivo`
- `resaltarDestino`
- `juego_bordes`
- `fondo_pantalla`
- `modo_color`
- `cursor_grande`
- `tamanoImagen`
- `tamanoImagenOpcion`
- `tamanoImagenPista`
- `anchoOpcion`
- `altoOpcion`
- `hitboxExtra`
Los controles deben tener tamaños adecuados, contornos visibles y estados distinguibles.
### Texto y cognición
Integrar:
- `font_size`
- `letterSpacing`
- `tamanoLetraBotones`
- `lectura_facil`
- `mostrarIntro`
- `mostrarProgreso`
- `verBotonRepetir`
- `verBotonVerDeNuevo`
El texto debe adaptarse al tamaño disponible y evitar recortes.
Las instrucciones deben ser breves, predecibles y apropiadas para la edad.
### Audio
Integrar:
- `audio_instruc`
- `audio_fondo`
- `audio_btn`
- `subtitulos`
- `voz_narradora`
- `velocidad_voz`
- `repeticion_audio`
- `volumenFondo`
- `efectosSonido`
- `rate`
No reproduzcas varios mensajes de voz importantes al mismo tiempo.
Cuando el audio esté deshabilitado, proporciona alternativas visuales.
### Motora
Integrar:
- `btn_size`
- `btn_spacing`
- `gestos`
- `modoTap`
- `zoomLongPress`
Evita exigir arrastrar objetos, movimientos rápidos o gestos complejos para completar el conteo.
### Movimiento
Integrar:
- `trans_ms`
- `anim_speed`
- `anim_decorativas`
- `animaciones_opciones`
- `refuerzo_visual`
- `refuerzo_sonido`
- `refuerzo_tipo`
Si las animaciones decorativas están deshabilitadas, no las ejecutes.
Mantén una alternativa estática para los efectos esenciales.
### Tiempo y descanso
Integrar:
- `tiempo_max_bloque`
- `barraTiempo`
- `cuentaRegresiva`
- `tiempoMostrarCompleto`
- `tiempoVerDeNuevo`
- `pausa_entre_bloques`
- `duracion_pausa_seg`
No fuerces una respuesta rápida ni penalices al niño por necesitar más tiempo.
Respeta la política temporal de la plataforma.
--
## 13. Estados internos
Implementa una máquina de estados coherente con el motor del proyecto.
Estados sugeridos:
- `inicio`
- `presentacion`
- `en_conteo`
- `conteo_completo`
- `seleccion_respuesta`
- `respuesta_incorrecta`
- `respuesta_correcta`
- `celebracion`
- `reto_completado`
- `pausado`
Cada ronda debe mantener:
- Cantidad total de manzanas.
- IDs de las manzanas.
- Estado contado/no contado.
- Orden de conteo.
- Progreso.
- Intentos.
- Pistas utilizadas.
- Respuesta seleccionada.
- Estado actual.
No crees un archivo de configuración adicional para guardar estos datos. Son estados de ejecución, no configuración.
## 14. Pruebas obligatorias
Verifica como mínimo:
1. Dos manzanas: se generan dos y la respuesta correcta es 2.
2. Tres manzanas: se generan tres y la respuesta correcta es 3.
3. Cuatro manzanas: se generan cuatro y la respuesta correcta es 4.
4. Cinco manzanas: se generan cinco y la respuesta correcta es 5.
5. `piezasVisibles: 2`: pueden explorarse todas las manzanas sin perder progreso.
6. Un doble toque no cuenta dos veces la misma manzana.
7. Las opciones no se duplican.
8. La respuesta correcta siempre está disponible.
9. Un error no reinicia innecesariamente el conteo.
10. Las pistas respetan los umbrales existentes.
11. El audio y los subtítulos respetan el perfil.
12. El alto contraste y el tamaño de texto funcionan.
13. Las animaciones respetan las preferencias.
14. La actividad se puede completar con las modalidades de entrada soportadas.
15. El juego funciona aunque falte un recurso opcional.
16. Las preferencias de inclusión no se sobrescriben al cambiar de nivel.
## 15. Reglas finales de implementación
- Reutiliza el patrón de configuración del juego «Clasifica por los sentidos».
- Mantén toda la configuración propia del juego en su JSON.
- Define `cantidadObjetos`, `piezasVisibles`, `opciones` y `correcto` dentro de cada reto cuando corresponda.
- No crees una configuración separada de accesibilidad.
- No dupliques el perfil global de inclusión.
- Obtén los valores globales del perfil real de la plataforma.
- Mantén `piezasVisibles` independiente del total de manzanas.
- Deriva la respuesta correcta de la cantidad real de objetos.
- Reutiliza los componentes, servicios, rutas y convenciones existentes.
- Comprueba los recursos antes de utilizarlos.
- No inventes archivos ni integraciones.
- No rompas el funcionamiento de otros juegos.
- Implementa las pruebas y documenta las limitaciones reales.
Al finalizar, entrega un resumen de los archivos modificados, el JSON del juego, la integración con el perfil global, las pruebas ejecutadas y cualquier recurso pendiente.
**Resultado esperado:** un juego funcional y accesible, con una configuración JSON propia siguiendo el patrón existente, niveles y retos de 2 a 5 manzanas, y una integración directa con el sistema de inclusión compartido de la plataforma.
