# Patrón Multisensorial en Multisaberes

Armazón compartido para paquetes del catálogo en `public/catalogo_juegos/Multisaberes/`.
Referencia canónica de Multisensorial: `Multisensorial/EncuentraElSonido/`.
Ejemplos vivos en Multisaberes: `DescubreLasVocales/`, `ConQueVocalComienza/`, `ConstruyeLaVocal/`, `EncuentraLaPareja/` y `ElRetoDeLasVocales/`.

Los stubs restantes deben seguir este patrón al implementarse.

## Checklist del shell

En cada paquete nuevo, copiar el armazón (no el tema visual del parque):

| Pieza | Qué incluir |
|-------|-------------|
| CSS | `style.css` propio + `../../tutorial/tutorial.css` + `../../shared/menu-accesibilidad.css` + `../../final/final.css` + `../../intro3d/css/intro.css` |
| `#pantalla-inicio` | Tema propio (isla/jardín/lab…); personajes en `../../img/zoe_normal.gif` y `../../img/zeus_normal.gif` |
| `#intro3d-root` | `#three-container`, `#phaser-container`, `#btn-omitir-intro3d`, `#intro3d-continuar` + `#btn-continuar-intro3d` |
| `#final` | Victoria + `#final-acciones` (Sí / No) |
| `#principal` | HUD, escenario, diálogos, botones del juego |
| Tutoriales | `#tutorial-zoe`, `#tutorial-3d` |
| Menús | `#menu-acc`, `#menu-vol` |
| `config.json` | `stub: false` cuando esté listo; `accesibilidad.mostrarIntro`; bloque `demo` + textos de demostración |

Mantener la mecánica y el `logica.js` del reto; no reescribir validación solo por el shell.

## Orden de scripts

Igual que Multisensorial (al final de `index.html`):

1. `../../texto_voz.js`
2. `../../shared/edad-nivel.js`
3. `../../tutorial/tutorial.js`
4. `../../final/final.js`
5. `../../shared/aplicar-perfil-juego.js`
6. `logica.js` + `sfx.js` del paquete
7. Phaser (`../../../assets/vendor/phaser/phaser.min.js`)
8. `../../intro3d/js/config.js`
9. `../../intro3d/js/ambientes-tema.js` (carteles Multisaberes: `A a` …)
10. importmap Three + módulos: `three-scene.js`, `final-scene.js`, `tutorial-3d.js`, `personajes-juego.js`
11. `../../intro3d/js/intro.js`
12. `../../shared/pin-accesibilidad.js` + `menu-accesibilidad.js`
13. `script.js` (cache-bust al cambiar)

## Flujo de arranque

```
pantalla-inicio → intro3d → PedniaEdad.iniciarNivel → [demo] → bienvenida → retos → victoria + Final3d
```

1. Tap en `#btn-empecemos` → desbloquear audio / precargar TTS → disolver inicio → `mostrarIntro3d`.
2. Omitir / CONTINUAR / evento `victory-continue` → `empezarJuegoTrasIntro` → `PedniaEdad.iniciarNivel`.
3. Preview catálogo = Swal de edad; kiosco = edad de sesión.
4. `confirmarNivel` → si `PedniaTutorial.mostrarIntroActiva(acc())` → `iniciarDemo`; si no → bienvenida + `presentar`.
5. Al terminar retos → `iniciarSecuenciaVictoria` (insignia + Final3d).

En `script.js` enlazar explícitamente:

- `#btn-omitir-intro3d` → `omitirIntro3d`
- `#btn-continuar-intro3d` → `empezarJuegoTrasIntro`
- `window.addEventListener("victory-continue", empezarJuegoTrasIntro)`
- `window.cerrar_anuncio` → `empezarJuegoTrasIntro`

No cortar artificialmente la bienvenida TTS: con intro3d el audio ya está desbloqueado.

## Demo (`PedniaTutorial`)

- Activar solo si `accesibilidad.mostrarIntro` (vía `PedniaTutorial.mostrarIntroActiva`).
- Usar un par/objeto **fuera** del primer reto real (p. ej. Descubre: `o`/`u`; ConQue: `iglu`).
- Secuencia típica: mano en escuchar → TTS → mano en la opción correcta → frases `demostracion` / `demostracionAcierto` / `demostracionFin` → limpiar escena → bienvenida del nivel → retos.
- Config: `demo: { … }` + `textos.demostracion*`.

## Reglas de producto

- `mostrarFeedBack: false` por defecto (sin texto dirigido al niño en acierto/fallo en pantalla; el feedback verbal va por TTS/diálogos cuando el config lo pide).
- Tipografía en minúsculas: pendiente de decisión global; no asumir cambio en stubs.
- `stub: false` solo cuando el paquete esté jugable de punta a punta.
- Tema visual del inicio/escenario es propio del juego; intro3d y victoria 3D son compartidos.
- Personajes de escenario: `../../img/`; assets de diálogo pueden seguir en `../../images/` según el paquete.

## Verificación rápida

- `?edad=4` y `?edad=6`: inicio → intro3d (omitir y CONTINUAR) → juego → victoria.
- Preview superadmin: Swal de edad tras intro.
- Apagar “Mostrar intro” en accesibilidad: salta la demo.
- `node --check` en `script.js` y `logica.js`.
