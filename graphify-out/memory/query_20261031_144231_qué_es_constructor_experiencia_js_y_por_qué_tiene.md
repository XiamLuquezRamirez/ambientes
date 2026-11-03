---
type: "query"
date: "2026-10-31T14:42:31.314328+00:00"
question: "¿Qué es constructor-experiencia.js y por qué tiene 97 conexiones?"
contributor: "graphify"
source_nodes: ["assets_constructor_experiencia_js"]
---

# Q: ¿Qué es constructor-experiencia.js y por qué tiene 97 conexiones?

## Answer

Constructor de experiencias (editor de bloques, 16 tipos). 96 aristas 'contains' son sus propias funciones (un archivo de 2468 líneas) y 1 'references' desde la vista; no es un hub de dependencias. Lo cargan 3 vistas (admin/panel/superAdmin) que incluyen el partial partials/experiencias/_constructor.blade.php, el cual le pasa las URLs por data-url-*. Habla por AJAX (api()) con BloquesExperiencia{Admin,Panel,SuperAdmin}Controller. Se empareja con constructor-vista-nino.js (vista previa, también usado en layouts/ambiente para el niño).

## Source Nodes

- assets_constructor_experiencia_js