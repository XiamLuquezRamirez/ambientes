# Header del panel docente — logo y nombre de institución

## Resumen

El layout `resources/views/layouts/panel.blade.php` muestra en el header la institución del docente autenticado (logo + nombre). Se corrigió la resolución de datos, el fallback visual y el diseño CSS.

## Comportamiento

1. Se obtiene el id de institución desde `session('institucion_id')`, con respaldo a `$usuarioAuth->institucion_id`.
2. Se carga un único registro con `Institucion::find(...)` (antes se usaba `get()` + `@foreach`).
3. La URL pública del logo se resuelve con `InstitucionLogoService::urlPublica()`.
4. Si no hay logo (o la imagen falla al cargar), se muestran las iniciales vía `InstitucionLogoService::iniciales()`.
5. Si hay municipio/departamento, se muestra como subtítulo debajo del nombre.
6. Si no hay institución en sesión ni en el usuario, el bloque no se renderiza.

## Diseño

| Elemento | Detalle |
|----------|---------|
| Contenedor | `.header-institucion` — flex, a la izquierda del header (`margin-right: auto`) |
| Logo | Cuadro 40×40, bordes redondeados, fondo suave; imagen con `object-fit: contain` |
| Fallback | Iniciales centradas en el mismo cuadro cuando no hay logo |
| Nombre | Tipografía sans del sistema, negrita, con ellipsis si es largo |
| Lugar | Texto secundario más pequeño (`municipio, departamento`) |

Estilos en `public/assets/css/index.css` (clases `header-institucion*`). Se mantiene `.header-title` como compatibilidad con marcado anterior.

## Problemas corregidos

- **Consulta incorrecta:** colección + bucle para un solo id.
- **CSS ajeno:** se reutilizaba `.card-logo-img` (definida solo en la vista de instituciones del superadmin), por lo que el logo del header no tenía tamaño/estilos propios.
- **Sin fallback:** si `logo` era null, la imagen se ocultaba y no quedaba marca visual.
- **Sin manejo de error de imagen:** ruta rota dejaba un icono roto; ahora `onerror` pasa al fallback.
- **Nombre sin truncado:** nombres largos podían empujar el chip de perfil; ahora hay `max-width` + ellipsis.
- **Tipografía:** el nombre usaba `--font-display` (título decorativo); ahora usa `--font-sans` para lectura en header.

## Archivos tocados

- `resources/views/layouts/panel.blade.php` — markup y lógica PHP
- `public/assets/css/index.css` — estilos del bloque institución
- `docs/panel-header-institucion.md` — esta nota
