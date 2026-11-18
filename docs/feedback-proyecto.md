# Feedback de producto y código — PedNia

**Fecha:** 2026-11-18  
**Alcance:** auditoría basada en rutas, controladores, vistas y menús del repositorio.  
**No incluye:** entrevistas con docentes/admin, métricas de uso, ni pruebas E2E en tablets reales.

---

## Veredicto

PedNia es un producto **amplio y coherente en dominio** (ambientes fijos, multi-institución, kiosco del niño, currículo Módulo→Eje→Temática→Experiencia, inclusión, clases).  
También es un producto **desigualmente terminado**: el menú promete módulos que todavía responden “Pendiente de implementación”, y hay rutas sensibles sin el mismo nivel de protección que el resto del staff.

Si el objetivo es vender o capacitar colegios **hoy**, el cuello de botella no es “falta de features en el menú”; es **cerrar o esconder lo incompleto** y asegurar el flujo crítico: configurar institución → matrícula/asignación → clase activa → PIN del niño → recorrido/juegos → resultados.

---

## Fortalezas

1. **Modelo de dominio claro.** Los 5 ambientes, la carga docente (ambiente + grado + grupo + año), matrícula vs `estudiante_ambiente`, y el currículo jerárquico están bien nombrados y alineados con el uso escolar colombiano (DBA, PIAR, inclusión).
2. **Separación por roles usable.** SuperAdmin (plataforma), Admin (colegio), Docente (aula) y Kiosco (niño) tienen layouts, prefijos y middleware distintos. Eso reduce confusión operativa si se documenta bien.
3. **Kiosco con identidad propia.** PIN de 3 figuras, resolución de ambiente por IP/`AMBIENTE_SLUG`, recorrido/experiencias, catálogo de juegos Phaser/HTML y adaptación por perfil: es el diferenciador real del producto.
4. **Constructor de experiencias.** Bloques, TTS, publicación y flujo de estados existen en SuperAdmin, Admin y Panel: el contenido no depende solo de desarrollo.
5. **Sincronización pensada para nodos.** Trait `Sincronizable` + API `/api/sync/*` encajan con despliegue por ambiente en red local.
6. **Inclusión con profundidad.** Perfiles formales, personalizados y parámetros de adaptación están cableados en los tres paneles de staff (con distinta autoridad).

---

## Fallas graves (producto y riesgo)

### 1. El menú miente

Estas pantallas existen en navegación o rutas pero **no están implementadas** (vista o acción con “Pendiente de implementación”):

| Área | Qué ve el usuario |
|------|-------------------|
| Admin → Reportes | Placeholder |
| Admin → Sync Log | Placeholder |
| Admin → Conflictos | Placeholder (ruta; no destaca en menú) |
| Panel → Planeación | Placeholder |
| Panel → Portafolio → exportar | Stub |
| Panel → Inclusión → ajustes por estudiante | Guardar ajustes es stub |

**Impacto:** capacitación y confianza. Un admin que abre “Reportes” en la primera semana asume que el sistema está a medias — y tiene razón.

**Recomendación dura:** quitar del menú o marcar “En desarrollo” hasta que haya datos reales. No documentarlos como funcionales.

### 2. PIAR expuesto

Las rutas `/piar`, `estudiantes/diligenciar-piar/...`, exportar, etc. están **fuera** del grupo `middleware(['es.admin'])`.  
Es deuda conocida en `AGENTS.md` y sigue abierta. Para un software escolar con datos sensibles, esto no es “detalle técnico”: es riesgo de cumplimiento y de abuso.

### 3. Rutas de laboratorio en `web.php`

Siguen rutas como `/__preview-camino`, `/prueba-phaser`, `/prueba-phaser4`.  
En producción, eso es superficie innecesaria y señal de que el árbol de rutas no se limpia antes de desplegar.

### 4. Features “casi listas” pero ocultas o rotas en UX

- **Asistencia** y **Sesión/monitor** viven como acciones rápidas en el inicio del docente, **no** en el sidebar. Quien no pase por Inicio no las descubre.
- **PIAR** se menciona en estadísticas del panel y en ficha del estudiante, pero el wizard completo no tiene un ítem claro y seguro en el menú admin autenticado.

---

## Puntos ciegos de diseño

1. **Triple copia del catálogo** (SuperAdmin / Admin / Panel). Misma jerarquía DBA→módulos→ejes→temáticas→experiencias con controladores casi espejo. Acelera features por rol, pero multiplica bugs y divergencias de permisos. Pregunta sin responder en el código: ¿quién es dueño de qué contenido y qué pasa si Admin y Docente editan la misma temática?
2. **Año lectivo = `date('Y')` en muchos listados.** En enero, o con instituciones que cierran año en otro calendario, el sistema se comporta mal sin un “año lectivo activo” explícito por institución (aunque exista cierre de año).
3. **Ambiente `tecnologia` sin catálogo de juegos** al nivel de los otros. El producto vende 5 ambientes; el contenido jugable no está simétrico.
4. **Juegos por copia de carpetas** (categoría → N subjuegos con `script.js` duplicado). Escalar mecánicas cuesta caro; los stubs generados desde SuperAdmin ensucian el inventario.
5. **Poco HTTP testing.** Casi no hay Feature tests; los Unit cubren asignación/estadísticas. Regresiones en auth, kiosco y PIAR no están blindadas.
6. **Sync Log / Conflictos vacíos** mientras el trait ya encola. La infra de sync existe; la operación visible para el colegio no.

---

## Calidad de ingeniería (resumen)

| Aspecto | Estado |
|---------|--------|
| Stack (Laravel 10, Blade, Bootstrap, jQuery) | Adecuado al contexto escolar / kiosco; no forzar SPA |
| Capas Services | Presentes en flujos críticos (kiosco, clases, sync) |
| Consistencia de nombres | Mejorable (`Seguridadlog`, `figurasModel`, etc.) |
| Seguridad de rutas staff | Buena en prefijos; **mala en PIAR** |
| Deuda visible en UI | Alta (placeholders en menú) |
| Documentación interna | Fuerte en agentes/juegos; débil en usuario final |

---

## Priorización sugerida (si el objetivo es producto usable)

1. Proteger PIAR con auth + rol; o deshabilitar rutas públicas.
2. Quitar o etiquetar placeholders del menú (Reportes, Sync Log, Planeación).
3. Cerrar el camino feliz documentable: clase del día → alumnos → PIN → recorrido → resultados en panel.
4. Unificar discovery de Asistencia (menú o flujo de clase).
5. Limpiar rutas de preview/lab en despliegues.
6. Definir dueño de contenido curricular por rol (evitar tres CRUDs iguales sin política).
7. Completar Sync Log / Conflictos **solo si** la red multi-nodo ya está en producción; si no, no mostrarlos.

---

## Sobre este feedback

Es un **feedback de inventario de software**, no de satisfacción de usuario.  
Si necesitás validar adopción, hay que medir: % de docentes que crean clase, % de niños que completan recorrido, tiempo hasta primer PIN configurado, y cuántas veces abren pantallas stub. Sin eso, priorizar “más catálogo” o “más reportes” es conjetura.
