---
type: "query"
date: "2026-10-31T16:48:46.761990+00:00"
question: "¿Qué es tematicas-form.js y por qué tiene 86 conexiones?"
contributor: "graphify"
source_nodes: ["assets_tematicas_form_js"]
---

# Q: ¿Qué es tematicas-form.js y por qué tiene 86 conexiones?

## Answer

Tamaño, no dependencia: 85 aristas contains (funciones propias de un archivo de 1606 líneas, IIFE jQuery) + 1 references desde la vista de admin. Es el CRUD de temáticas (Módulo→Eje→Tema) con filtros en cascada Ambiente/Módulo/Eje, listado, indicadores, DBAs y experiencias rápidas; lo cargan 3 vistas (admin/panel/superAdmin catalogo/tematicas/index) que comparten partials tematicas/_filtros,_tabla,modales pero cada una arma sus data-url-* (16 URLs) y window.TEMATICAS_ARBOL. api() envuelve $.ajax JSON. Backend: Tematicas{Admin,Panel,SuperAdmin}Controller (+ Experiencias*Controller para experiencias) y TematicaCurriculoService. SuperAdmin no tiene ruta DELETE: su vista deja data-url-eliminar-template vacío y el JS oculta el botón (intencional). Duplicación real: Admin y Panel comparten idénticos eliminar, asegurarTematicaVisible, asegurarAmbienteActivoContratado, validarTematica, buscarDbas, actualizarEstado y usuarioId (~140 líneas); SuperAdmin difiere en filtros oficial/institución.

## Source Nodes

- assets_tematicas_form_js

## Actualización (2026-10-31)

Los 7 métodos idénticos de Admin/Panel se movieron al trait App\Http\Controllers\Concerns\ManejaTematicasInstitucion (commit 8bbbdb20).
