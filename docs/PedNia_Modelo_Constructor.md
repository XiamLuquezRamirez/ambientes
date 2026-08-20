

### **2.  Diccionario JSON — campo datos por tipo de bloque**

_El campo datos de la tabla bloques_experiencia almacena un objeto JSON. Su estructura exacta depende del tipo del bloque. Los campos marcados con Req = ✓ son obligatorios para que el constructor marque el bloque como Completo. Los campos sin marca son opcionales._

#### **Bloques Narrativos**

**datos** _→ tipo = "bienvenida"_

|**Subcampo**|**Tipo JS**|**Req**<br>**Default**|**Descripción / Valores posibles**|
|---|---|---|---|
|**instruccion**|_string_|✓<br>''|Texto de audio narrado al niño al abrir la sesión. Obligatorio para que el bloque quede Completo.|
|personaje|_string_|—<br>'personaje'|Personaje narrador: 'personaje' (usa el personaje del ambiente) | 'ninguno'|
|descripcion_accesible|_string_|—<br>''|Descripción de audio para niños con discapacidad visual. Opcional en todos los bloques narratvos.|
|**Ejemplo JSON almacena**<br>_{ "instruccion": "¡Hola Vale_|**do en BD:**<br>_ntna! Hoy vamos a cono_|_cer la guitarra 🎸", "personaje": "pers_|_onaje", "descripcion_accesible": "" }_|



**datos** _→ tipo = "audio"_

|**Subcampo**|**Tipo JS**|**Req**<br>**Default**|**Descripción / Valores posibles**|
|---|---|---|---|
|**instruccion**|_string_|✓<br>''|Texto narrado al niño antes de reproducir el audio.|
|**archivo**|_string_|✓<br>''|Nombre del archivo .mp3. Obligatorio para que el bloque quede Completo. Ej: sonido_guitarra.mp3|
|repetciones|_string_|—<br>'1 vez'|Cuántas veces se reproduce: '1 vez' | '2 veces' | '3 veces' | 'Sin límite'|
|descripcion_accesible|_string_|—<br>''|Ej: 'Se escucha un tntneo metálico de objetos pequeños'. Para discapacidad visual.|
|**Ejemplo JSON almacena**<br>_{ "instruccion": "Escucha es_|**do en BD:**<br>_te sonido con atención", "_|_archivo": "sonido_llaves.mp3", "r_|_epetciones": "2 veces", "descripcion_accesible": "Tintneo metálico" }_|



**datos** _→ tipo = "video"_

|**Subcampo**|**Tipo JS**|**Req**|**Default**|**Descripción / Valores posibles**|
|---|---|---|---|---|
|**instruccion**|_string_|✓|''|Texto narrado al niño antes de reproducir el video.|
|**archivo**|_string_|✓|''|Nombre del archivo .mp4. Obligatorio. Ej: video_instrumentos.mp4|
|descripcion_accesible|_string_|—|''|Descripción del contenido del video para accesibilidad.|
|**Ejemplo JSON almacenad**<br>_{ "instruccion": "Mira este v_|**o en BD:**<br>_ideo sobre los instrume_|_ntos", "archivo": "in_|_strumentos_mus_|_icales.mp4", "descripcion_accesible": "" }_|



PedNia  ·  Modelo de Datos Constructor  ·  Becerril, Cesar  ·  2026  ·  5

**PedNia  ·  Modelo de Datos — Constructor de Experiencias** v1.0  ·  2026

|**datos**_→ tpo = "ima_|_gen"_|||
|---|---|---|---|
|**Subcampo**|**Tipo JS**|**Re**<br>**q**<br>**Default**|**Descripción / Valores posibles**|
|**instruccion**|_string_|✓<br>''|Texto narrado al niño antes de mostrar la imagen.|
|**archivo**|_string_|✓<br>''|Nombre del archivo .jpg o .png. Obligatorio. Ej: guitarra.jpg|
|descripcion|_string_|—<br>''|Descripción accesible de la imagen. Se lee en voz alta para niños con discapacidad visual. Ej: 'Una guitarra acústca café con 6 cuerdas'.|



##### **Ejemplo JSON almacenado en BD:**

_{ "instruccion": "Observa bien este instrumento", "archivo": "guitarra.jpg", "descripcion": "Una guitarra acústica café con 6 cuerdas doradas" }_

**datos** _→ tipo = "historia"_

|**Subcampo**|**Tipo JS**|**Re**<br>**q**<br>**Default**|**Descripción / Valores posibles**|
|---|---|---|---|
|**instruccion**|_string_|✓<br>''|Texto narrado al niño antes de abrir el cuento.|
|**paginas**|_string_|✓<br>'3'|Número de páginas confguradas: '2' | '3' | '4' | '5'. Controla el largo del array paginas_data.|
|**paginas_data**|_Array<{imagen,audio}>_|✓<br>[]|Array de objetos, uno por página. Cada objeto tene imagen (nombre del archivo .jpg) y audio (nombre del archivo .mp3). Todos los campos de todas las páginas<br>son obligatorios para Completo.|
|**Ejemplo JSON almac**<br>_{ "instruccion": "Escuch_|**enado en BD:**<br>_a el cuento de la guitarra", "paginas"_|_: "3", "paginas_data": [ {_|_"imagen": "pag1.jpg", "audio": "pag1_audio.mp3" }, { "imagen": "pag2.jpg", "audio": "pag2_audio.mp3" }, { "imagen": "pag3.jpg", "audio": "pag3_audio.mp3" } ] }_|



#### **Bloques Interactivos**

**datos** _→ tipo = "ra"_

|**Subcampo**|**Tipo JS**|**Re**<br>**q**<br>**Default**|**Descripción / Valores posibles**|
|---|---|---|---|
|**instruccion**|_string_|✓<br>''|Texto narrado al niño antes de actvar la RA.|
|**marcador**|_string_|✓<br>''|Número entero del marcador en la cartlla fsica. Obligatorio para Completo. Ej: '4'|
|contenido|_string_|—<br>'Animación<br>3D'|Tipo de contenido RA: 'Animación 3D' | 'Audio narrado' | 'Video LSC' | 'Animación + narración'|
|**Ejemplo JSON alma**<br>_{ "instruccion": "Apun_|**cenado en BD:**<br>_ta la tablet al marcador de la c_|_artlla", "marcador": "4", "contenido"_|_: "Animación 3D" }_|



PedNia  ·  Modelo de Datos Constructor  ·  Becerril, Cesar  ·  2026  ·  6

**PedNia  ·  Modelo de Datos — Constructor de Experiencias** v1.0  ·  2026

**datos** _→ tipo = "evidencia"_

|**Subcampo**|**Tipo JS**|**Re**<br>**q**<br>**Default**|**Descripción / Valores posibles**|
|---|---|---|---|
|**instruccion**|_string_|✓<br>''|Texto narrado al niño antes de capturar la evidencia.|
|tpo|_string_|—<br>'Foto'|Tipo de evidencia a capturar: 'Foto' | 'Audio grabado' | 'Video corto' | 'Selección de imagen'|
|**Ejemplo JSON alma**<br>_{ "instruccion": "Tom_|**cenado en BD:**<br>_a una foto de tu instrumento fa_|_vorito", "tpo": "Foto" }_||



**datos** _→ tipo = "juego"_

|**Subcampo**|**Tipo JS**|**Re**<br>**q**<br>**Default**|**Descripción / Valores posibles**|
|---|---|---|---|
|**instruccion**|_string_|✓<br>''|Texto narrado al niño antes de abrir el juego.|
|**juego_id**|_string_|✓<br>null|ID del juego seleccionado. Obligatorio para Completo: 'rompecabezas' | 'memoria' | 'colorear' | 'secuencia'. (Próximamente: 'laberinto' | 'sopa')|
|juego_nombre|_string_|—<br>''|Nombre display del juego. Ej: 'Rompecabezas'. Se guarda para mostrar en el historial sin depender del catálogo.|
|juego_imagen|_string_|—<br>''|Nombre del archivo de imagen principal del juego (rompecabezas y colorear).|
|juego_piezas|_string_|—<br>''|Difcultad para rompecabezas y colorear: '4 piezas (fácil)' | '6 piezas (medio)' | '9 piezas (difcil)'|
|imagen_1|_string_|—<br>''|Par 1 del juego Memoria. Nombre del archivo de imagen.|
|imagen_2|_string_|—<br>''|Par 2 del juego Memoria.|
|imagen_3|_string_|—<br>''|Par 3 del juego Memoria.|
|imagen_4|_string_|—<br>''|Par 4 del juego Memoria. Hasta 4 pares.|
|seq_1|_string_|—<br>''|Paso 1 del juego Secuencia. Imagen en el orden correcto.|
|seq_2|_string_|—<br>''|Paso 2 del juego Secuencia.|
|seq_3|_string_|—<br>''|Paso 3 del juego Secuencia.|
|seq_4|_string_|—<br>''|Paso 4 del juego Secuencia. Hasta 4 pasos.|



##### **Ejemplo JSON almacenado en BD:**

_Rompecabezas: { "instruccion": "Arma el rompecabezas de la guitarra", "juego_id": "rompecabezas", "juego_nombre": "Rompecabezas", "juego_imagen": "guitarra.jpg", "juego_piezas": "6 piezas (medio)" } Memoria: { "instruccion": "Encuentra las parejas", "juego_id": "memoria", "juego_nombre": "Memoria", "imagen_1": "guitarra.jpg", "imagen_2": "violin.jpg", "imagen_3": "piano.jpg", "imagen_4": "" }_

PedNia  ·  Modelo de Datos Constructor  ·  Becerril, Cesar  ·  2026  ·  7

**PedNia  ·  Modelo de Datos — Constructor de Experiencias** v1.0  ·  2026

**datos** _→ tipo = "dibujo"_

|**Subcampo**|**Tipo JS**|**Re**<br>**q**<br>**Default**|**Descripción / Valores posibles**|
|---|---|---|---|
|**instruccion**|_string_|✓<br>''|Texto narrado al niño antes de abrir el canvas de dibujo.|
|fondo|_string_|—<br>''|Nombre del archivo de imagen de fondo opcional. Si está confgurado, el niño dibuja encima. Ej: guitarra_contorno.png|
|colores|_Array<string>_|—<br>['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#000000']|Array de colores HEX disponibles en la paleta del niño. Mínimo 3, máximo 12.|
|guardar_evidencia|_boolean_|—<br>true|true = el dibujo se guarda como PNG en el perfl del estudiante.|
|nota_evidencia|_string_|—<br>''|Descripción del docente para identfcar el dibujo en el historial. Ej: 'Sesión 1 — Mi instrumento favorito'|



##### **Ejemplo JSON almacenado en BD:**

_{ "instruccion": "Dibuja la guitarra como te la imaginas", "fondo": "", "colores": ["#FF6B6B","#4ECDC4","#45B7D1","#000000"], "guardar_evidencia": true, "nota_evidencia": "Sesión 1 — Dibuja un instrumento" }_

PedNia  ·  Modelo de Datos Constructor  ·  Becerril, Cesar  ·  2026  ·  8

**PedNia  ·  Modelo de Datos — Constructor de Experiencias** v1.0  ·  2026

#### **Bloques Evaluativos**

**datos** _→ tipo = "pregunta"_

|**Subcampo**|**Tipo JS**|**Re**<br>**q**|**Default**|**Descripción / Valores posibles**|
|---|---|---|---|---|
|**instruccion**|_string_|✓|''|Texto narrado al niño antes de mostrar la pregunta.|
|**texto**|_string_|✓|''|Texto visible de la pregunta en pantalla. Obligatorio para Completo.|
|tpo_opts|_string_|—|'emoji_texto'|Tipo de opciones: 'emoji_texto' (emoji + texto) | 'imagen_texto' (imagen + texto) | 'solo_texto'|
|**opciones**|_Array<Opcion>_|✓|[...]|Array de 2 a 4 opciones. Cada opción: { texto: string, emoji: string, imagen: string, correcta: boolean }. Exactamente una debe tener correcta=true.|
|opciones[].texto|_string_|—|''|Texto de la opción. Obligatorio en modo solo_texto. Aceptado en emoji_texto e imagen_texto.|
|opciones[].emoji|_string_|—|''|Emoji de la opción. Aceptado en emoji_texto (si no hay texto también vale).|
|opciones[].imagen|_string_|—|''|Nombre del archivo de imagen. Aceptado en imagen_texto (si no hay texto también vale).|
|**opciones[].correcta**|_boolean_|✓|—|true en exactamente una opción del array. El constructor lo valida antes de marcar Completo.|
|f_ok|_string_|—|'¡Muy bien!'|Texto de retroalimentación cuando el niño acierta.|
|f_err|_string_|—|'Inténtalo de<br>nuevo.'|Texto de retroalimentación cuando el niño falla.|
|intentos|_string_|—|'2'|Intentos permitdos: '1' | '2' | '3' | 'Sin límite'|
|al_agotar|_string_|—|'mostrar'|Acción al agotar intentos: 'Mostrar respuesta correcta' | 'Contnuar sin mostrar' | 'Repetr desde el inicio'|



##### **Ejemplo JSON almacenado en BD:**

_{ "instruccion": "¿Cuál tiene cuerdas?", "texto": "¿Cuál de estos instrumentos tiene cuerdas?", "tipo_opts": "emoji_texto", "opciones": [ {"texto":"Guitarra","emoji":"🎸","imagen":"","correcta":true}, {"texto":"Tambor","emoji":"🎸","imagen":"","correcta":false}, {"texto":"Trompeta","emoji":"_ 🪗 **_","imagen":"","correcta":false}_** _, {"text ], "fb__ **_o_** _k": "¡Correcto! La guitarra tiene cuerdas 🎸", "fb_err": "Mira bien el instrumento 🎸", "intentos": "2", "al_agotar": "Mostrar respuesta correcta" }":"Acordeón","emoji":"🎸_

**datos** _→ tipo = "emparejar"_

|**Subcampo**|**Tipo JS**|**Req**<br>**Default**|**Descripción / Valores posibles**|
|---|---|---|---|
|**instruccion**|_string_|✓<br>''|Texto narrado al niño antes de mostrar los pares.|
|modo|_string_|—<br>'texto'|Modo de los elementos: 'texto' (texto↔texto) | 'imagen_texto' (imagen↔texto) | 'imagen' (imagen↔imagen)|
|**pares**|_Array<Par>_|✓<br>[{},{}]|Array de pares. Mínimo 2. Cada par: { izq, izqImg, der, derImg }.|
|pares[].izq|_string_|—<br>''|Texto del lado A. Usado en modo texto e imagen_texto.|
|pares[].izqImg|_string_|—<br>''|Nombre del archivo de imagen del lado A. Usado en modo imagen_texto e imagen.|
|pares[].der|_string_|—<br>''|Texto del lado B. Usado en modo texto e imagen_texto.|



PedNia  ·  Modelo de Datos Constructor  ·  Becerril, Cesar  ·  2026  ·  9

**PedNia  ·  Modelo de Datos — Constructor de Experiencias** v1.0  ·  2026

**datos** _→ tipo = "emparejar"_

|**Subcampo**|**Tipo JS**|**Req**|**Default**|**Descripción / Valores posibles**|
|---|---|---|---|---|
|pares[].derImg|_string_|—|''|Nombre del archivo de imagen del lado B. Usado SOLO en modo imagen.|
|f_ok|_string_|—|'¡Correcto! 🎉'|Retroalimentación al acertar un par.|
|f_err|_string_|—|'Ese no va<br>ahí...'|Retroalimentación al fallar un par.|
|intentos|_string_|—|'Sin límite'|Intentos permitdos por par: '1' | '2' | '3' | 'Sin límite'|



##### **Ejemplo JSON almacenado en BD:**

_Modo imagen: { "instruccion": "Conecta cada instrumento con su sombra", "modo": "imagen", "pares": [ {"izq":"","izqImg":"guitarra.jpg","der":"","derImg":"sombra_guitarra.jpg"}, {"izq":"","izqImg":"violin.jpg","der":"","derImg":"sombra_violin.jpg"} ], "fb_ok": "¡Muy bien! 🎸", "fb_err": "Esas no van juntas 🎸", "intentos": "2" }_

**datos** _→ tipo = "clasificacion"_

|**Subcampo**|**Tipo JS**|**Req**<br>**Default**|**Descripción / Valores posibles**|
|---|---|---|---|
|**instruccion**|_string_|✓<br>''|Texto narrado al niño antes de mostrar la clasifcación.|
|**categorias**|_Array<string>_|✓<br>['Cat 1','Cat<br>2']|Array de nombres de las categorías. Mínimo 2. Ej: ['Cuerda','Viento','Percusión']|
|**items**|_Array<Item>_|✓<br>[{}]|Array de elementos a clasifcar. Mínimo 2. Cada item: { texto: string, imagen: string, categoria: string }.|
|items[].texto|_string_|—<br>''|Texto del elemento. Válido si no hay imagen (o complementa la imagen).|
|items[].imagen|_string_|—<br>''|Nombre del archivo de imagen del elemento. Válido aunque no haya texto.|
|**items[].categoria**|_string_|✓<br>—|Categoría correcta a la que pertenece este elemento. Debe coincidir con un valor del array categorias.|



##### **Ejemplo JSON almacenado en BD:**

_{ "instruccion": "Clasifica cada instrumento en su familia", "categorias": ["Cuerda","Viento","Percusión"], "items": [ {"texto":"Guitarra","imagen":"guitarra.jpg","categoria":"Cuerda"}, {"texto":"Flauta","imagen":"flauta.jpg","categoria":"Viento"}, {"texto":"Tambor","imagen":"tambor.jpg","categoria":"Percusión"} ] }_

**datos** _→ tipo = "arrastrar"_

|**Subcampo**|**Tipo JS**|**Req**|**Default**|**Descripción / Valores posibles**|
|---|---|---|---|---|
|**instruccion**|_string_|✓|''|Texto narrado al niño antes de mostrar el ejercicio de arrastre.|
|**zonas**|_Array<Zona>_|✓|[{},{} ]|Array de zonas destno. Mínimo 2. Cada zona: { nombre: string, color: string }.|



PedNia  ·  Modelo de Datos Constructor  ·  Becerril, Cesar  ·  2026  ·  10

**PedNia  ·  Modelo de Datos — Constructor de Experiencias** v1.0  ·  2026

**datos** _→ tipo = "arrastrar"_

|**Subcampo**|**Tipo JS**|**Req**<br>**Default**|**Descripción / Valores posibles**|
|---|---|---|---|
|**zonas[].nombre**|_string_|✓<br>''|Nombre de la zona. Se muestra como etqueta en la zona destno.|
|zonas[].color|_string_|—<br>'#0F6E56'|Color HEX de la zona destno. Se usa para diferenciar visualmente las zonas en pantalla.|
|**items**|_Array<Item>_|✓<br>[{}]|Array de elementos a arrastrar. Mínimo 2. Cada item: { texto: string, imagen: string, zona: string }.|
|items[].texto|_string_|—<br>''|Texto del elemento. Válido aunque no haya imagen.|
|items[].imagen|_string_|—<br>''|Nombre del archivo de imagen del elemento. Válido aunque no haya texto.|
|**items[].zona**|_string_|✓<br>—|Nombre de la zona destno correcta. Debe coincidir con un valor de zonas[].nombre.|



##### **Ejemplo JSON almacenado en BD:**

_{ "instruccion": "Arrastra cada instrumento al tipo correcto", "zonas": [{"nombre":"Acústico","color":"#0F6E56"},{"nombre":"Eléctrico","color":"#534AB7"}], "items": [{"texto":"Guitarra acústica","imagen":"g_acustica.jpg","zona":"Acústico"},{"texto":"Guitarra eléctrica","imagen":"g_electrica.jpg","zona":"Eléctrico"},{"texto":"Piano de cola","imagen":"piano.jpg","zona":"Acústico"}] }_

**datos** _→ tipo = "reto"_

|**Subcampo**|**Tipo JS**|**Req**<br>**Default**|**Descripción / Valores posibles**|
|---|---|---|---|
|**instruccion**|_string_|✓<br>''|Texto narrado al niño al inicio del reto.|
|descripcion|_string_|—<br>''|Nombre del reto mostrado en pantalla. Ej: '¡Manos limpias!'|
|**pasos**|_Array<Paso>_|✓<br>[{},{}]|Array de pasos del reto. Mínimo 2. Cada paso: { pregunta: string, opciones: Opcion[] }. El niño los completa en orden — el siguiente se desbloquea solo al<br>acertar el anterior.|
|**pasos[].pregunta**|_string_|✓<br>''|Pregunta del paso mostrada en pantalla. Obligatorio para que el paso quede válido.|
|**pasos[].opciones**|_Array<Opcion>_|✓<br>[×4]|Array de 4 opciones visuales para el paso. Exactamente una debe tener correcta=true.|
|pasos[].opciones[].emoji|_string_|—<br>''|Emoji de la opción. Se muestra en grande (44px) en el grid 2×2 de la tablet.|
|pasos[].opciones[].label|_string_|—<br>''|Texto del botón de la opción. Se muestra debajo del emoji.|
|pasos[].opciones[].imagen|_string_|—<br>''|Nombre del archivo de imagen. Alternatva o complemento al emoji.|
|**pasos[].opciones[].correct**<br>**a**|_boolean_|✓<br>—|true en exactamente una opción por paso. Al agotar intentos el sistema muestra esta opción y avanza.|
|f_ok|_string_|—<br>'¡Correcto! 🎉'|Retroalimentación mostrada al acertar un paso.|
|f_err|_string_|—<br>'Casi... 🎉'|Retroalimentación mostrada al fallar un paso.|
|intentos|_string_|—<br>'2'|Intentos por paso antes de mostrar la respuesta y avanzar: '1' | '2' | '3' | 'Sin límite'|



PedNia  ·  Modelo de Datos Constructor  ·  Becerril, Cesar  ·  2026  ·  11

**PedNia  ·  Modelo de Datos — Constructor de Experiencias** v1.0  ·  2026

|**datos**_→ tpo = "reto"_||
|---|---|
|**Subcampo**<br>**Tipo JS**<br>**Req**<br>**Default**<br>**Ejemplo JSON almacenado en BD:**<br>_{ "instruccion": "Elige la imagen correcta en cada paso", "descripcion": "¡Manos limpias!",_<br>_jabón","imagen":"","correcta":false}, {"emoji":"🎸","label":"Mojar manos","imagen":"","cor_<br>_jabón","imagen":"","correcta":false}, {"emoji":"🎸","label":"Mojar las manos","imagen":"",_<br>_bien 🎸", "intentos": "2" }_<br>**Bloques de Cierre**|**Descripción / Valores posibles**<br>_"pasos": [ { "pregunta": "¿Qué hacemos primero?", "opciones": [ {"emoji":"🎸","label":"Abrir el grifo","imagen":"","correcta":true}, {"emoji":"🎸","label":"Echar_<br>_recta":false}, {"emoji":"🎸","label":"Secar manos","imagen":"","correcta":false} ] }, { "pregunta": "Ahora el grifo está abierto. ¿Qué sigue?", "opciones": [ {"emoji":"🎸","label":"Echar_<br>_"correcta":true}, {"emoji":"🎸","label":"Secar manos","imagen":"","correcta":false}, {"emoji":"🎸","label":"Ducharse","imagen":"","correcta":false} ] } ], "f_ok": "¡Correcto! 🎸", "f_err": "Mira_|
|**datos**_→ tpo = "emocion"_||
|**Subcampo**<br>**Tipo JS**<br>**Re**<br>**q**<br>**Default**|**Descripción / Valores posibles**|
|**instruccion**<br>_string_<br>✓<br>''|Texto narrado al niño al llegar al bloque de emoción.|
|cantdad<br>_string_<br>—<br>'6'|Número de emociones disponibles para el niño: '4' | '6'. Con 4: feliz, emocionado, tranquilo, confundido. Con 6: agrega cansado y nervioso.|
|**Ejemplo JSON almacenado en BD:**<br>_{ "instruccion": "¿Cómo te sentste hoy?", "cantdad": "6" }_||
|**datos**_→ tpo = "recompensa"_<br>**Subcampo**<br>**Tipo JS**<br>**Re**<br>**q**<br>**Default**|**Descripción / Valores posibles**|
|**instruccion**<br>_string_<br>✓<br>''|Texto narrado al niño al recibir su recompensa.|
|tpo<br>_string_<br>—<br>'Trofeo'|Tipo de animación de recompensa: 'Trofeo' | 'Medalla' | 'Estrella dorada' | 'Insignia especial'|
|insignia<br>_string_<br>—<br>''|Nombre del archivo de imagen de la insignia personalizada. Solo aplica cuando tpo='Insignia especial'.|
|**Ejemplo JSON almacenado en BD:**<br>_{ "instruccion": "¡Lo lograste! Eres increíble 🎸", "tpo": "Trofeo", "insignia": "" }_||



_PedNia  ·  Modelo de Datos Constructor  ·  Becerril, Cesar  ·  2026_

PedNia  ·  Modelo de Datos Constructor  ·  Becerril, Cesar  ·  2026  ·  12
