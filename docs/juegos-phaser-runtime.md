# Runtime Phaser en juegos PedNia

## Decisiones vigentes

| Tema | Elección |
|------|----------|
| Motor en catálogo / intro / piloto | **Phaser 4.2.1** (`public/assets/vendor/phaser/phaser.min.js`) |
| GSAP | Disponible en `public/assets/vendor/gsap/` para HUD/DOM; **no** autoinyectado en todos los paquetes. En canvas preferir `Phaser.Tweens` |
| Entrega | Scripts estáticos en `public/` (como el resto del catálogo), no Vite por juego |
| Animación en canvas | `Phaser.Tweens` (un solo dueño de props del display object) |
| Renderer intro | `Phaser.AUTO` (WebGL) transparente — `Phaser.CANVAS` quedó deprecado en v4 |

## Vendors

| Ruta | Rol |
|------|-----|
| `public/assets/vendor/phaser/phaser.min.js` | Phaser **4.2.1** — intro3d + catálogo + sandboxes |
| `public/assets/vendor/phaser/phaser-arcade-physics.min.js` | Build Arcade Physics (opcional) |
| `public/assets/vendor/gsap/*.min.js` | GSAP core + plugins licencia estándar |
| `public/assets/vendor/phaser4/` | **Obsoleto** (redirige a `vendor/phaser`) |

Alineado con `package.json` (`phaser@^4.2.1`, `gsap@^3.15.0`). No versionar repos completos (src/tests/docs) bajo `public/`.

## Archivos del runtime

| Ruta | Rol |
|------|-----|
| `public/catalogo_juegos/runtime/pednia-phaser-host.js` | Create/destroy intro + gameplay |
| `public/assets/js/juegos/prueba-phaser.js` | Sandbox ciclo de vida |
| `resources/views/juegos/prueba-phaser.blade.php` | UI sandbox |
| `GET /prueba-phaser` | Ruta sandbox |
| `GET /prueba-phaser4` | Lab Phaser + GSAP HUD |
| `resources/views/partials/_scripts-lab-phaser4-gsap.blade.php` | Include lab |

## Piloto: Arrastrar y soltar objetos

Paquete: `public/catalogo_juegos/Polimotor/ArrastrarYSoltarObjetos/`

| Pieza | Rol |
|-------|-----|
| `phaser-juego.js` | Escena Phaser: tablero, drag, tweens, API `PedniaArrastrePhaser` |
| `script.js` | Shell (inicio, intro, edad, TTS, feedback, victoria) |
| `index.html` | `#phaser-juego` + scripts host / phaser-juego / script |

Flujo: intro3d destruye `__introPhaser` → `PedniaArrastrePhaser.montar` vía host → `cargarRonda` → drop valida con `pares` → feedback DOM/Swal existente.

## Segundo piloto: Encuentra El Rojo

Paquetes: `Multisensorial/EncuentraElColor/EncuentraElRojo{34,56}Anos/` (capa compartida en `EncuentraElColor/comun/`).

| Pieza | Rol |
|-------|-----|
| `comun/phaser-tablero.js` | Tablero de toque Phaser 4.2.1, API `PedniaEncuentraColorPhaser` |
| `comun/encuentra-color-anim.js` | HUD GSAP (consigna/muestra) + celebración vía `PedniaFx` |
| `script.js` | Shell (escenas, TTS, Swal, demo); fallback DOM si Phaser no monta |
| `index.html` | `#phaser-tablero` + host / gsap / pednia-fx / comun / script |

Flujo: intro3d off → `PedniaEncuentraColorPhaser.montar` → `cargarEscena` → toque → tweens Phaser + HUD GSAP → Swal existente.

## Contrato de ciclo de vida

1. **Intro activa:** solo `__introPhaser` (intro3d). No crear gameplay todavía.
2. **Al empezar a jugar:** `PedniaPhaserHost.destruirIntro()` (o el `destroy` que ya hacen los `script.js`), luego opcionalmente `PedniaPhaserHost.crear(config)`.
3. **Una** instancia de gameplay: `__pedniaPhaserGame`.
4. **Al salir / reiniciar:** `PedniaPhaserHost.destruirTodo()`.
5. En `shutdown`/`destroy` de cada escena: detener tweens propios.

## Cómo probar

1. `/prueba-phaser` — intro → gameplay → destroy.
2. `/prueba-phaser4` — gameplay + HUD GSAP.
3. Piloto kiosco: ArrastrarYSoltarObjetos (intro Three + overlay Phaser 4).

## Qué no hacer

- No mezclar dos builds de Phaser en el mismo `index.html`.
- No animar el mismo display object con GSAP y `Phaser.Tweens` a la vez.
- No commitear el zip completo de Phaser/GSAP (src, tests, Club plugins sin licencia).
