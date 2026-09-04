# Adaptación de la experiencia del estudiante según su perfil de aprendizaje

Necesito que analices el proyecto actual para diseñar e implementar una funcionalidad que permita **adaptar la experiencia de aprendizaje de cada estudiante según su perfil de aprendizaje o condición**.

## 1. Analiza primero el proyecto

Antes de modificar cualquier código, realiza un análisis del funcionamiento actual y determina:

- Cómo está modelado el **estudiante**.
- Cómo se almacena y relaciona su **condición o perfil de aprendizaje**.
- Qué modelos, tablas y relaciones intervienen.
- Cómo se crean y almacenan actualmente las **configuraciones asociadas a cada perfil**.
- Dónde y cómo se cargan actualmente esas configuraciones.
- Cómo está construida la **vista/interfaz que utiliza el niño**.
- Qué controladores, servicios, componentes, Blade, JavaScript, CSS, rutas y endpoints participan.
- Si ya existe alguna lógica de personalización que podamos reutilizar.
- Qué información está disponible actualmente desde backend y cuál tendría que incorporarse.

**No asumas que algo debe crearse desde cero. Primero busca y reutiliza la arquitectura existente.**

---

## 2. Analiza la relación estudiante → perfil → configuración

Debes determinar claramente cuál debería ser el flujo de datos:

**Estudiante → Condición/Perfil de aprendizaje → Configuración → Experiencia del niño**

Para cada perfil existente, identifica:

- Qué configuración tiene actualmente.
- Qué aspectos de la interfaz puede modificar.
- Qué aspectos de la experiencia de aprendizaje debería afectar.
- Cómo se identifica el perfil del estudiante.
- En qué momento debe cargarse la configuración.
- Si la configuración debe resolverse una sola vez o durante diferentes etapas de la experiencia.

El sistema **ya crea las configuraciones para los perfiles**, por lo que no quiero duplicar esta lógica ni crear un segundo sistema de configuración.

---

## 3. Define cómo debe adaptarse la vista del niño

Analiza qué elementos de la experiencia del niño deberían comportarse de manera diferente según la configuración de su perfil.

Considera, entre otros:

- Tamaños de texto.
- Contraste y colores.
- Tipografía.
- Espaciado.
- Cantidad de información mostrada.
- Elementos visuales.
- Audio o apoyo sonoro.
- Velocidad o duración de actividades.
- Animaciones y transiciones.
- Navegación.
- Botones y controles.
- Mensajes e instrucciones.
- Presentación de contenidos.
- Nivel de estímulos visuales.
- Accesibilidad.
- Cualquier otra adaptación que ya esté contemplada por las configuraciones existentes.

**No inventes configuraciones que no existan sin justificar por qué serían necesarias.**

---

## 4. Busca la solución que mejor encaje con el proyecto

Una vez entendido el proyecto, propón la arquitectura más adecuada para implementar esta funcionalidad.

Prioriza:

1. Reutilización del código existente.
2. Bajo acoplamiento.
3. Buen rendimiento.
4. Facilidad de mantenimiento.
5. Escalabilidad para agregar nuevos perfiles en el futuro.
6. Separación clara entre lógica de negocio y presentación.
7. Evitar consultas innecesarias a la base de datos.
8. Evitar duplicación de lógica entre vistas.
9. Mantener los patrones y convenciones que ya utiliza el proyecto.

Determina si la solución debería implementarse mediante:

- Relaciones Eloquent.
- Services.
- ViewModels / DTOs.
- Middleware.
- Variables globales de configuración.
- Configuración cargada en sesión.
- API/endpoint.
- JavaScript.
- CSS mediante variables/clases.
- Blade.
- O una combinación de estas opciones.

No elijas una solución simplemente porque sea sencilla. **Compárala contra las alternativas y explica por qué es la más adecuada para este proyecto.**

---

## 5. Considera especialmente el rendimiento

La vista del niño puede ser utilizada constantemente, por lo que debes evitar que cada interacción genere consultas innecesarias.

Analiza:

- Qué información debe consultarse una sola vez.
- Qué relaciones deben utilizar `with()` / eager loading.
- Qué información puede almacenarse temporalmente.
- Qué configuración puede resolverse en backend antes de renderizar la vista.
- Qué debería llegar al frontend como JSON.
- Qué lógica debe permanecer en backend.
- Qué lógica puede manejarse eficientemente en frontend.
- Cómo evitar N+1 queries.
- Cómo evitar repetir la misma configuración en múltiples requests.

Si propones cache, sesión, localStorage u otro mecanismo, explica sus ventajas, riesgos y cuándo debería invalidarse.

---

## 6. Mantén el patrón actual del proyecto

La implementación debe seguir la arquitectura y convenciones existentes.

No quiero introducir una arquitectura completamente nueva si el proyecto actual ya tiene un patrón adecuado.

Antes de crear:

- nuevos modelos,
- servicios,
- endpoints,
- componentes,
- tablas,
- migraciones,
- archivos JavaScript,
- clases CSS,

verifica si existe una estructura equivalente que pueda reutilizarse.

---

## 7. Entrega primero un plan antes de modificar el código

Después del análisis, presenta:

### A. Diagnóstico actual
Explica cómo funciona actualmente el flujo del estudiante y su configuración.

### B. Problema identificado
Explica exactamente qué falta para que la experiencia del niño pueda adaptarse según su perfil.

### C. Arquitectura propuesta
Describe el flujo completo:

**Estudiante → Perfil/Condición → Configuración → Backend → Vista del niño**

### D. Archivos que deberían modificarse
Indica los archivos existentes que deberían intervenir y qué cambio tendría cada uno.

### E. Archivos nuevos
Solo si realmente son necesarios.

### F. Base de datos
Indica si es necesario modificar tablas, relaciones o migraciones.

### G. Flujo de datos
Muestra cómo viajará la configuración desde la base de datos hasta la interfaz.

### H. Rendimiento
Explica cómo evitarás consultas y procesamiento innecesario.

### I. Compatibilidad
Asegúrate de que los estudiantes que no tengan una condición o configuración específica continúen utilizando la experiencia normal.

### J. Casos límite
Analiza qué ocurre cuando:

- El estudiante no tiene perfil.
- Tiene más de una condición.
- La condición no tiene configuración.
- La configuración está incompleta.
- La configuración está desactivada.
- La configuración cambia.
- El estudiante cambia de grupo, grado o ambiente.
- Se agregan nuevos perfiles en el futuro.

---

## 8. Implementación

Solo después de presentar el análisis y el plan, implementa la solución.

Durante la implementación:

- Respeta la estructura actual del proyecto.
- Reutiliza código existente.
- Evita duplicación.
- Mantén nombres y convenciones existentes.
- No modifiques funcionalidades que no estén relacionadas.
- No reemplaces una solución existente sin justificarlo.
- Mantén compatibilidad con estudiantes sin configuración.
- Optimiza las consultas.
- Valida que la configuración realmente corresponda al estudiante que está utilizando la experiencia.

Al finalizar, explica:

1. Qué modificaste.
2. Qué archivos modificaste.
3. Qué archivos creaste.
4. Cómo funciona ahora el flujo.
5. Cómo se determina el perfil del estudiante.
6. Cómo se obtiene su configuración.
7. Cómo llega la configuración a la vista del niño.
8. Qué medidas de rendimiento aplicaste.
9. Qué casos límite fueron contemplados.
10. Qué pruebas deberían realizarse para validar la funcionalidad.

### Regla importante

**No empieces a programar inmediatamente. Primero entiende la arquitectura actual y presenta el camino recomendado.**

El objetivo no es simplemente hacer que la funcionalidad funcione, sino integrarla correctamente al proyecto existente, aprovechando lo que ya está construido y evitando crear una solución difícil de mantener o costosa en rendimiento.