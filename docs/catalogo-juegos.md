# Catálogo de juegos (`public/catalogo_juegos`)

Referencia para tareas futuras sobre los juegos del kiosco. Análisis del 2026-10-31.

## Qué es un "juego"

- Un **paquete** = una carpeta estática (HTML + JS + CSS + `config.json`) bajo `public/catalogo_juegos/`.
- Se registra en la tabla `juegos` (modelo `App\Models\Juego`, PK `slug` kebab-case, trait `Sincronizable`).
  Campo clave: `ruta`, relativa a `public/` (ej. `catalogo_juegos/Multisaberes/EncuentraLaPareja/AbreElCastillo`).
  También `ambiente_id`, `modulo_id`, `eje_id`, `tematica_id`, `nombre`, `imagen`, `color`, `orden`, `activo`.
- Lógica PHP: `app/Services/JuegoCatalogoService.php` (filtros, edad, stub, mover carpetas, validar `index.html`).
  CRUD superAdmin: `SuperAdmin\JuegosSuperAdminController`, rutas `superadmin.catalogo_juegos.*`, vistas `superAdmin/catalogo_juegos/juegos`.
- El niño abre el paquete en un **iframe**; se le añade `?edad=N` (`public/assets/js/banco-juegos.js`, `constructor-vista-nino.js`).
- El filtro por edad sale del nombre/slug/ruta y de `config.json → niveles[].edad` (`rangosEdadDelJuego`).

## Árbol

```
catalogo_juegos/
├── .htaccess            no-cache para html/json/js/css/audio (Apache ignora ?v=)
├── texto_voz.js         TTS compartido
├── PedniaSalir.js       corta TTS/medios/*Sfx al salir del iframe
├── intro.json
├── shared/              edad-nivel.js (PedniaEdad), aplicar-perfil-juego.js, menu/pin-accesibilidad,
│                        pednia-audio.js, pednia-fx.js, audio/
├── tutorial/            PedniaTutorial (demo con mano) + css
├── final/               pantalla de victoria
├── intro3d/             intro Three.js + Phaser (css/, js/, models/) y Final3d
├── runtime/             pednia-phaser-host.js (piloto Phaser 4)
├── fonts/ images/ img/ sounds/   assets globales (Zoe, Zeus, trofeo, fondo.mp3, victory.mp3…)
├── ExpresionArtistica/  Multisaberes/  Multisensorial/  Polimotor/
│   └── img/             fondos del kiosco por ambiente (bienvenida_nino.png, fondo_juegos.png…,
│                        usados por SesionNinoService)
```

No hay carpeta para `tecnologia`.

## Dos formas de paquete

### A. Categoría → subjuegos (patrón actual, "1 reto = 1 juego")

`{Ambiente}/{Categoria}/{Subjuego}/` — cada subjuego es una fila en `juegos`.
Casi todo ExpresionArtistica, Multisensorial y parte de Multisaberes.

```
Subjuego/
├── index.html      propio (título/ids); referencias con ../../../
├── config.json     textos, accesibilidad, audios, demo, escenas, elementos, niveles[] (normalmente 1 nivel = 1 edad, 1 reto)
├── logica.js       reglas puras sin DOM (IDÉNTICO en todos los subjuegos de la categoría)
├── script.js       DOM/flujo (idéntico en la categoría)
├── sfx.js          efectos (idéntico)
├── style.css       (idéntico)
├── img/            SVG del reto (+ escenas/)
└── docs/requerimientos.md   guion pedagógico del reto (edad, mecánica, audios de Zoe/Zeus)
```

Consecuencia: **un cambio de mecánica o estilo se replica en todos los subjuegos de la categoría**
(son copias, no hay archivo compartido). Lo que varía por subjuego es `config.json`, `index.html` e `img/`.
El partido de categorías se hizo con `scripts/partir-*.js` + `scripts/manifest-partir-*.json`
y migraciones `database/migrations/2026_10_29_*partir*`.

### B. Paquete plano

`{Ambiente}/{Juego}/` con `index.html` directo.

- **Polimotor** (10 juegos): patrón antiguo; `script.js` monolítico, `*-anim.css/js`, algunos con
  `phaser-juego.js`; comparte `Polimotor/comun/` (`inicio-fondo.*`, `interfaz.css`).
  Ojo: los subjuegos de otros ambientes también cargan `Polimotor/comun/inicio-fondo.*`.
- **Stubs** (`"stub": true` en `config.json`): paquetes creados desde superAdmin sin implementar
  (EA: ClasificaYDescubre, CompletaElPatron, CualEsDiferente, EncuentraLaSombra, MemoriaDeEmociones,
  OrdenaLaHistoria; Multisaberes: CompletaElPatron, CualEsMayor, DondeVive, EncuentraLaFigura,
  MasMenosOIgual, MiCuerpo, MiFamilia, QueTransporteEs, QuienSoy).
  `crearStubPaquete` genera index/script/style/config; al borrar, solo elimina carpetas con `stub: true`.

## Shell común (subjuegos)

Detallado en `catalogo_juegos/Multisaberes/PATRON.md` (referencia canónica:
`Multisensorial/EncuentraElSonido/`). Resumen:

- Orden de scripts: `texto_voz` → `shared/edad-nivel` → `tutorial` → `final` → `shared/aplicar-perfil-juego`
  → `logica.js` + `sfx.js` → Phaser → `intro3d/js/config.js` + `ambientes-tema.js` → importmap Three + módulos
  (`three-scene`, `final-scene`, `tutorial-3d`, `personajes-juego`) → `intro.js` → `pin/menu-accesibilidad` → `script.js`.
- Flujo: `#pantalla-inicio` → intro3d → `PedniaEdad.iniciarNivel` → demo (`accesibilidad.mostrarIntro`)
  → bienvenida → retos → victoria + Final3d.
- Edad: `PedniaEdad` lee `__PEDNIA_PERFIL__`/`#kiosco-perfil-params` del padre o `?edad=`; en preview superAdmin, Swal de edad.
- Perfil de aprendizaje: `aplicar-perfil-juego.js` superpone `localStorage['pednia.perfilJuego']` sobre `config.json`.
- `mostrarFeedBack: false` por defecto; personajes Zoe (0) y Zeus (1).
- Cache-bust con `?v=AAAAMMDDx` al cambiar archivos.
- Vendors: `/assets/vendor/phaser`, `/assets/vendor/three`, jQuery 4, SweetAlert, Bootstrap, FontAwesome.

## Herramientas en `scripts/`

- `barrido-*.php`: validación por categoría (`php scripts/barrido-catalogo-juegos.php` = global; arranca Laravel).
- `probar-*.js`: pruebas de `logica.js` con node.
- `generar-assets-*.php`, `realinear-nombres-desde-doc.js`, `reparar-logica-*-partidos.js`.

## Checklist para un juego/subjuego nuevo

1. Copiar un subjuego hermano (misma categoría) o el canónico de Multisensorial.
2. Ajustar `config.json` (nombre, `niveles[].edad`, retos, textos, `stub: false`) e `img/`.
3. Si cambia la mecánica: editar `logica.js`/`script.js` y replicar en todos los hermanos.
4. Registrar en `juegos` (superAdmin o migración siguiendo las `partir_*`); la `ruta` debe tener `index.html`.
5. Probar con `?edad=4` y `?edad=6`, `node --check`, y el `barrido-*`/`probar-*` correspondiente.
