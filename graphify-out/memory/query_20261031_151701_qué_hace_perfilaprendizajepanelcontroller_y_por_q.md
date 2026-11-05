---
type: "query"
date: "2026-10-31T15:17:01.819948+00:00"
question: "¿Qué hace PerfilAprendizajePanelController y por qué aparece con 91 conexiones?"
contributor: "graphify"
source_nodes: ["panel_perfilaprendizajepanelcontroller"]
---

# Q: ¿Qué hace PerfilAprendizajePanelController y por qué aparece con 91 conexiones?

## Answer

Las 91 conexiones son un ARTEFACTO: el nodo fusionó por nombre parecido 7 controladores (PerfilAprendizajePersonalizadoPanel 16 métodos, PersonalizadoConfiguracion 15, Inclusion 10, Personalizado 9, Orden 2, PersonalizadoOrden 2 + los 7 propios). La arista calls desde InstitucionSuperAdminController también viene de la fusión (inyecta PerfilAprendizajeOrdenController). Real: 278 líneas, 4 rutas panel.inclusion.perfil-aprendizaje(.estudiantes/.asignar-estudiante/.desactivar-estudiante) en web.php L398-401; index (lista de perfiles de inclusión habilitados para la institución, tabla perfil_aprendizaje_orden, con conteo de estudiantes del docente), estudiantesAsociados (JSON), asignarEstudiante (solo requiere_apoyo=si, no el perfil 1 Estándar, perfil activo en la institución; cierra el personalizado activo en transacción), desactivarEstudiante (vuelve a perfil 1). Usa EstudiantePerfilAprendizajeService, EstudiantePerfilAprendizajePersonalizadoService y ParametrosPerfilAprendizajeService. Vistas panel/inclusion/perfil-aprendizaje/{index,_lista}; JS panel/perfiles-aprendizaje.js, estudiantes-asociados-perfil-aprendizaje.js y asignar_perfil_aprendizaje.js (ficha del estudiante). Duplicación real: asegurarPersonalizacion() está en 4 controladores; la de inclusión es idéntica en Admin\PerfilAprendizajeConfiguracionController y en este; la de personalizado difiere: la versión Admin no llama a sembrarInstitucion().

## Source Nodes

- panel_perfilaprendizajepanelcontroller

## Actualización (2026-10-31)

Grafo reconstruido sin dedup difusa: el nodo ya muestra solo sus 6 métodos. asegurarPersonalizacion() se unificó en App\Services\PersonalizacionPerfilAprendizajeService (commit 855f0eb4); Admin personalizado ahora también siembra parámetros.
